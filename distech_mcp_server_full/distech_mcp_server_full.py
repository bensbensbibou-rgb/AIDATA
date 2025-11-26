#!/usr/bin/env python3
"""
Serveur FastMCP Distech ECY – lecture/écriture REST API complet et structuré
============================================================================
- Toutes les fonctions locales (ECY)
- Toutes les fonctions distantes (BACnet remote)
"""

import logging
from typing import Any, Optional, Dict, List, Tuple, Union
import httpx
import uvicorn
from fastapi import HTTPException
from fastmcp import FastMCP
from pydantic import Field
from datetime import datetime
import xml.etree.ElementTree as ET
import asyncio
import sys

# ---------------------------------------------------------------------------
# CONFIGURATION ECY
# ---------------------------------------------------------------------------
DEFAULT_API_CONFIG = {
    "base_url": "https://192.168.1.7/api/rest/v1",
    "user": "admin",
    "password": "Bensalem01!",
    "verify_ssl": False,
}

client = httpx.AsyncClient(
    base_url=DEFAULT_API_CONFIG["base_url"],
    auth=httpx.BasicAuth(DEFAULT_API_CONFIG["user"], DEFAULT_API_CONFIG["password"]),
    verify=DEFAULT_API_CONFIG["verify_ssl"],
    timeout=10.0,
    follow_redirects=False,
)

async def _request(
    method: str,
    path: str,
    json: Optional[Dict[str, Any]] = None,
) -> Any:
    path = path if path.startswith("/") else "/" + path
    resp = await client.request(method, path, json=json)
    try:
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        # ✅ f-string sur UNE SEULE ligne
        raise HTTPException(status_code=exc.response.status_code, detail=f"{exc}\n{exc.response.text}") from exc
    if resp.content:
        try:
            return resp.json()
        except ValueError:
            return {"raw": resp.text}
    return {"status": "ok"}

# ---------------------------------------------------------------------------
# MCP MINIMAL
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
mcp = FastMCP(name="Distech ECY Full Server")
app = mcp.http_app(path="/")

# ---------------------------------------------------------------------------
# Shutdown propre du client HTTPX quand l'app s'arrête
# ---------------------------------------------------------------------------
@app.on_event("shutdown")
async def _close_httpx_client():
    try:
        await client.aclose()
        print("✅ Client HTTPX fermé proprement (shutdown event).")
    except Exception as e:
        print(f"⚠️ Erreur fermeture httpx : {e}")

# ===========================================================================
# UTILITAIRES
# ===========================================================================
def to_human(ts):
    try:
        return datetime.fromtimestamp(ts / 1000).isoformat()
    except Exception:
        return ts

def _infer_type_and_value(v: Any) -> Tuple[str, Any]:
    """Mapping générique valeur Python -> (type BACnet, value) pour enveloppe Distech."""
    if isinstance(v, bool):
        return "boolean", v
    if isinstance(v, str):
        vl = v.strip().lower()
        if vl in ("true", "false"):
            return "boolean", (vl == "true")
        try:
            return "real", float(vl)
        except Exception:
            return "characterString", v
    if isinstance(v, (int, float)):
        return "real", float(v)
    return "characterString", str(v)

def _build_write_payload(
    obj_type: str,
    instance: int,
    property: str,
    value: Any,
    bool_value: Optional[bool],
    priority: int,
    encode: str
) -> Dict[str, Any]:
    """Construit le payload Distech pour write-property-multiple avec values[{type,value}]."""
    if bool_value is not None:
        vtype, vval = "boolean", bool(bool_value)
    else:
        if value is None:
            raise ValueError("Aucune valeur fournie : 'bool_value' ou 'value' requis.")
        if obj_type in ("binaryValue", "binaryInput") and property == "presentValue":
            if value in (0, 1):
                vtype, vval = "boolean", bool(value)
            elif isinstance(value, str) and value.strip() in ("0", "1"):
                vtype, vval = "boolean", (value.strip() == "1")
            elif isinstance(value, str) and value.strip().lower() in ("true", "false"):
                vtype, vval = "boolean", (value.strip().lower() == "true")
            else:
                vtype, vval = _infer_type_and_value(value)
        else:
            vtype, vval = _infer_type_and_value(value)

    return {
        "encode": encode,
        "propertyReferences": [{
            "type": obj_type,
            "instance": instance,
            "property": property,
            "values": [{"type": vtype, "value": vval}],
            "priority": priority
        }]
    }

# ===========================================================================
# BACnet LOCAL (sur l'ECY)
# ===========================================================================
@mcp.tool()
async def acknowledge_binaryValue_alarm(instance: int) -> dict:
    """
    Acquitte manuellement les transitions d'alarme OffNormal et Fault
    d'un objet BinaryValue via la propriété 'ackedTransitions'.
    Cela simule AcknowledgeAlarm en écrivant un bitString : [true, true, false]
    """
    path = f"/protocols/bacnet/local/objects/binaryValue/{instance}/properties/ackedTransitions"
    headers = {"accept": "application/json", "content-type": "application/json"}
    data = {"values": [{"type": "bitString", "value": [True, True, False]}]}

    try:
        write_resp = await client.post(path, headers=headers, json=data)
        write_resp.raise_for_status()
        read_path = f"/protocols/bacnet/local/objects/binaryValue/{instance}/properties"
        read_resp = await client.get(read_path, headers={"accept": "application/json"})
        read_resp.raise_for_status()
        obj = read_resp.json()
        if isinstance(obj, list):
            obj = next((item for item in obj if isinstance(item, dict)), {})
        return {
            "instance": instance,
            "eventState": obj.get("eventState"),
            "presentValue": obj.get("presentValue"),
            "ackedTransitions": obj.get("ackedTransitions"),
            "action": "acknowledged (bitString: [true, true, false])",
            "write_status": write_resp.status_code
        }
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=f"{exc}\n{exc.response.text}") from exc
    except Exception as e:
        return {"error": str(e)}

@mcp.tool()
async def read_local_property(object_type: str = "analogValue", object_instance: int = 1, property_name: str = "presentValue") -> Any:
    path = f"/protocols/bacnet/local/objects/{object_type}/{object_instance}/properties/{property_name}"
    return await _request("GET", path)

@mcp.tool()
async def read_property_multiple_local_grouped_text(
    object_type: str = Field(..., description="Type d'objet BACnet (ex: analogValue)"),
    instances: str = Field(..., description="Instances séparées par virgule, ex: 1,2,3"),
    properties: str = Field(..., description="Propriétés séparées par virgule, ex: presentValue,description"),
    encode: str = Field("text", description="Encodage text ou asn")
) -> Any:
    # Parse
    try:
        parsed_instances = [int(i.strip()) for i in instances.split(",") if i.strip()]
        parsed_properties = [p.strip() for p in properties.split(",") if p.strip()]
    except Exception as e:
        return {"error": f"Erreur de parsing : {str(e)}"}

    # Payload
    objects = [
        {"type": object_type, "instance": inst, "property": prop, "arrayIndex": -1}
        for inst in parsed_instances
        for prop in parsed_properties
    ]
    data = {"encode": encode, "propertyReferences": objects}

    headers = {"accept": "application/json", "content-type": "application/json"}
    path = "/protocols/bacnet/local/objects/read-property-multiple"
    resp = await client.post(path, json=data, headers=headers)

    # Traitement
    try:
        resp.raise_for_status()
        result = resp.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"{exc}\n{resp.text}") from exc
    except Exception:
        return {"raw": resp.text}

    grouped = {}
    for entry in result:
        key = (entry["type"], entry["instance"])
        if key not in grouped:
            grouped[key] = {"type": entry["type"], "instance": entry["instance"]}
        grouped[key][entry["property"]] = entry.get("value")
    return list(grouped.values())

@mcp.tool()
async def read_available_properties_for_object(
    object_type: str = "analogValue",
    instance: int = 1,
    encode: str = "text"
) -> Any:
    """Retourne les propriétés disponibles (sans UnknownProperty) sur un objet local."""
    all_properties = [
        "description", "presentValue", "objectName", "objectType", "outOfService",
        "priorityArray", "relinquishDefault", "maxPresValue", "minPresValue",
        "highLimit", "lowLimit", "deadband", "covIncrement", "eventState",
        "notificationClass", "ackedTransitions", "units", "statusFlags",
        "activeText", "alarmValue", "changeOfStateCount", "defaultFadeTime",
        "defaultStepIncrement", "deviceType", "feedbackValue", "inactiveText",
        "numberOfStates", "resolution", "stateText", "updateInterval",
        "defaultRampRate", "engineeringUnits", "timeOfLastStateChange"
    ]

    property_refs = [
        {"type": object_type, "instance": instance, "property": prop, "arrayIndex": -1}
        for prop in all_properties
    ]
    payload = {"encode": encode, "propertyReferences": property_refs}

    headers = {"accept": "application/json", "content-type": "application/json"}
    path = "/protocols/bacnet/local/objects/read-property-multiple"
    resp = await client.post(path, json=payload, headers=headers)

    try:
        resp.raise_for_status()
        result = resp.json()
    except Exception as e:
        return {"error": f"Erreur requête Distech : {str(e)}"}

    valid_props = [
        entry["property"]
        for entry in result
        if not str(entry.get("value", "")).startswith("errorClass=")
    ]
    return {"object_type": object_type, "instance": instance, "valid_properties": valid_props}

@mcp.tool()
async def write_property_multiple_local_fields(
    obj_type: str = Field(..., description="Type d'objet BACnet, ex: analogValue"),
    instance: int = Field(..., description="Instance de l'objet BACnet"),
    property: str = Field(..., description="Nom de la propriété à écrire, ex: presentValue"),
    value: Any = Field(..., description="Valeur à écrire (float, int, str, bool)"),
    priority: Optional[Union[int, str]] = Field(None, description="Priorité (1..16). Accepte int ou texte, ex: 8 ou '8'"),
    encode: str = "text"
) -> Any:
    """
    Écriture BACnet d’une propriété unique avec support des types dynamiques (float/int/str/bool).
    - Accepte priority en int **ou** str; convertit vers int et valide 1..16.
    """

    # -- Conversion/validation de priority --
    prio_int: Optional[int] = None
    if priority is not None:
        try:
            prio_int = int(priority) if not isinstance(priority, int) else priority
        except Exception:
            return {"error": f"Priorité non numérique: {priority!r}"}
        if not (1 <= prio_int <= 16):
            return {"error": f"Priorité hors plage: {prio_int}. Attendu 1..16."}

    # -- Conversion valeur -> string (selon ton implémentation actuelle) --
    if isinstance(value, (int, float, bool)):
        value_str = str(value)
    elif isinstance(value, str):
        value_str = value
    else:
        raise HTTPException(status_code=422, detail=f"Type de valeur non pris en charge : {type(value)}")

    write = {
        "type": obj_type,
        "instance": instance,
        "property": property,
        "value": value_str
    }
    if prio_int is not None:
        write["priority"] = prio_int

    data = {
        "encode": encode,
        "propertyReferences": [write]
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json"
    }
    path = "/protocols/bacnet/local/objects/write-property-multiple"

    try:
        resp = await client.post(path, json=data, headers=headers)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"{exc}\n{resp.text}"
        ) from exc
    except Exception:
        return {"raw": resp.text}@mcp.tool()
async def reset_selected_priorities_local_text(
    object_types: str = Field(..., description="Types d'objets séparés par virgule, ex: analogValue,binaryValue"),
    instances: str = Field(..., description="Instances correspondantes séparées par virgule, ex: 1,42"),
    priorities: str = Field("8", description="Priorités séparées par virgule, ex: 8 ou 1,2,3"),
    encode: str = Field("text", description="Encodage (text ou asn)")
) -> Any:
    """
    Réinitialise les priorités spécifiées (présentValue) sur plusieurs objets BACnet.
    Entrée simple via texte, pas de JSON.
    """

    try:
        types = [t.strip() for t in object_types.split(",")]
        insts = [int(i.strip()) for i in instances.split(",")]
        prios = [int(p.strip()) for p in priorities.split(",")]
    except Exception as e:
        return {"error": f"Erreur parsing champs : {str(e)}"}

    if len(types) != len(insts):
        return {"error": "Le nombre de types et d’instances doit être identique."}

    writes = []
    for obj_type, inst in zip(types, insts):
        for prio in prios:
            writes.append({
                "type": obj_type,
                "instance": inst,
                "property": "presentValue",
                "value": "null",
                "priority": prio
            })

    if not writes:
        return {"status": "ok", "details": "Aucun reset demandé."}

    data = {
        "encode": encode,
        "propertyReferences": writes
    }

    print("DEBUG JSON envoyé (reset sélection):", data)

    headers = {"accept": "application/json", "content-type": "application/json"}
    path = "/protocols/bacnet/local/objects/write-property-multiple"

    try:
        response = await client.post(path, json=data, headers=headers)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Erreur reset priorités choisies: {exc}\n{response.text}"
        ) from exc
    except Exception:
        return {"raw": response.text}
@mcp.tool()
async def get_event_notifications_local(encode: str = "xml") -> Any:
    """Récupère les notifications d’événements BACnet en local et les parse."""
    headers = {"accept": "application/xml" if encode == "xml" else "application/json"}
    params = {"encode": encode}
    path = "/protocols/bacnet/local/event-notifications"

    try:
        resp = await client.get(path, headers=headers, params=params)
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"{exc}\n{resp.text}") from exc

    xml_content = resp.text
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        return {"error": f"Erreur lors du parsing XML : {e}"}

    events = []
    for evt in root.findall("./EventNotification"):
        event_info = evt.find("EventInfo")
        if event_info is None:
            continue
        event = {
            "Uuid": evt.findtext("Uuid"),
            "TimeStamp": event_info.findtext("TimeStamp"),
            "EventObjectType": None,
            "EventObjectInstance": None,
            "EventType": event_info.findtext("EventType"),
            "MessageText": event_info.findtext("MessageText"),
            "NotifyType": event_info.findtext("NotifyType"),
            "AckRequired": event_info.findtext("AckRequired"),
            "FromState": event_info.findtext("FromState"),
            "ToState": event_info.findtext("ToState"),
            "Priority": event_info.findtext("Priority"),
            "NotificationClass": event_info.findtext("NotificationClass"),
        }
        evt_obj_id = event_info.findtext("EventObjectIdentifier")
        if evt_obj_id and "," in evt_obj_id:
            parts = evt_obj_id.split(",")
            event["EventObjectType"] = parts[0].strip()
            try:
                event["EventObjectInstance"] = int(parts[1].strip())
            except ValueError:
                event["EventObjectInstance"] = None
        events.append(event)

    return {"raw_xml": xml_content, "parsed_events": events}

@mcp.tool()
async def acknowledge_all_offnormal_alarms() -> Any:
    """
    Récupère les événements, filtre OffNormal avec AckRequired=true,
    mappe vers eventEnrollment et acquitte (bitString [True, True, False]).
    """
    # 1) Récup évènements
    path_events = "/protocols/bacnet/local/event-notifications"
    resp = await client.get(path_events, headers={"accept": "application/xml"}, params={"encode": "xml"})
    try:
        resp.raise_for_status()
        xml_content = resp.text
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"{exc}\n{resp.text}") from exc

    # 2) Parse
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        return {"error": f"Erreur parsing XML: {e}"}

    events = []
    for evt in root.findall("./EventNotification"):
        info = evt.find("EventInfo")
        if info is None:
            continue
        evt_obj_id = info.findtext("EventObjectIdentifier")
        obj_type, obj_inst = None, None
        if evt_obj_id and "," in evt_obj_id:
            parts = evt_obj_id.split(",")
            obj_type = parts[0].strip()
            try:
                obj_inst = int(parts[1].strip())
            except ValueError:
                obj_inst = None
        events.append({
            "Uuid": evt.findtext("Uuid"),
            "TimeStamp": info.findtext("TimeStamp"),
            "EventObjectType": obj_type,
            "EventObjectInstance": obj_inst,
            "EventType": info.findtext("EventType"),
            "MessageText": info.findtext("MessageText"),
            "NotifyType": info.findtext("NotifyType"),
            "AckRequired": info.findtext("AckRequired"),
            "FromState": info.findtext("FromState"),
            "ToState": info.findtext("ToState"),
            "Priority": info.findtext("Priority"),
            "NotificationClass": info.findtext("NotificationClass"),
        })

    to_ack = [e for e in events if e.get("FromState") == "OffNormal" and e.get("AckRequired") == "true"]

    # 3) Lister eventEnrollment
    path_ee = "/protocols/bacnet/local/objects/eventEnrollment"
    resp_ee = await client.get(path_ee, headers={"accept": "application/json"})
    try:
        resp_ee.raise_for_status()
        event_enrollments = resp_ee.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp_ee.status_code, detail=f"{exc}\n{resp_ee.text}") from exc

    def find_eventEnrollment_instance(obj_type, obj_instance):
        for ee in event_enrollments:
            eo = ee.get("eventObjectIdentifier", {})
            if eo.get("type") == obj_type and eo.get("instance") == obj_instance:
                return ee.get("instance")
        return None

    # 4) Ack
    results = []
    for evt in to_ack:
        obj_type = evt["EventObjectType"]
        obj_instance = evt["EventObjectInstance"]
        ee_instance = find_eventEnrollment_instance(obj_type, obj_instance)
        if ee_instance is None:
            results.append({"object": f"{obj_type},{obj_instance}", "status": "eventEnrollment not found"})
            continue

        path_write = f"/protocols/bacnet/local/objects/eventEnrollment/{ee_instance}/properties/acknowledgedTransitions"
        data_write = {"values": [{"type": "bitString", "value": [True, True, False]}]}  # TO_OFFNORMAL, TO_FAULT
        try:
            resp_write = await client.post(path_write, headers={"accept": "application/json", "content-type": "application/json"}, json=data_write)
            resp_write.raise_for_status()
            results.append({"object": f"{obj_type},{obj_instance}", "eventEnrollment": ee_instance, "status": "acknowledged"})
        except httpx.HTTPStatusError as exc:
            results.append({"object": f"{obj_type},{obj_instance}", "eventEnrollment": ee_instance, "status": f"error: {exc.response.status_code} {exc.response.text}"})

    return {"acknowledged_alarms": results}

@mcp.tool()
async def get_local_overrides(encode: str = "json") -> Any:
    params = {"encode": encode}
    headers = {"accept": "application/json"}
    path = "/protocols/bacnet/local/objects/overrides"
    resp = await client.get(path, params=params, headers=headers)
    try:
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"{exc}\n{resp.text}") from exc
    except Exception:
        return {"raw": resp.text}

@mcp.tool()
async def get_event_notification_by_uuid(uuid: str, accept: str = "application/xml") -> Any:
    headers = {"accept": accept}
    path = f"/protocols/bacnet/local/event-notifications/{uuid}"
    resp = await client.get(path, headers=headers)
    try:
        resp.raise_for_status()
        xml_content = resp.text
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"{exc}\n{resp.text}") from exc
    except Exception:
        return {"raw": resp.text}

    def parse_event_notification(xml_text):
        try:
            root = ET.fromstring(xml_text)
        except Exception as e:
            return {"error": f"Erreur parsing XML: {e}"}
        info = root.find("EventInfo")
        notif = {
            "Uuid": root.findtext("Uuid"),
            "ProcessIdentifier": info.findtext("ProcessIdentifier"),
            "InitiatingDeviceIdentifier": info.findtext("InitiatingDeviceIdentifier"),
            "EventObjectIdentifier": info.findtext("EventObjectIdentifier"),
            "TimeStamp": info.findtext("TimeStamp"),
            "NotificationClass": info.findtext("NotificationClass"),
            "Priority": info.findtext("Priority"),
            "EventType": info.findtext("EventType"),
            "MessageText": info.findtext("MessageText"),
            "NotifyType": info.findtext("NotifyType"),
            "AckRequired": info.findtext("AckRequired"),
            "FromState": info.findtext("FromState"),
            "ToState": info.findtext("ToState"),
            "EventValues": []
        }
        for et in info.findall("./EventValues/EventType"):
            notif["EventValues"].append({
                "Value": et.findtext("Value"),
                "NewState": et.findtext("NewState"),
                "StatusFlags": et.findtext("StatusFlags"),
                "ExceedingValue": et.findtext("ExceedingValue"),
                "ExceedingLimit": et.findtext("ExceedingLimit"),
                "DeadBand": et.findtext("DeadBand"),
            })
        return notif

    parsed = parse_event_notification(xml_content)
    return {"raw_xml": xml_content, "parsed": parsed}

@mcp.tool()
async def reset_all_values_local(accept: str = "application/json") -> Any:
    """Réinitialise toutes les valeurs et remplacements BACnet locaux sur l'ECY (clear-values)."""
    headers = {"accept": accept}
    path = "/protocols/bacnet/local/objects/clear-values"
    try:
        resp = await client.post(path, headers=headers)
        resp.raise_for_status()
        return {"status": "success", "details": "Toutes les valeurs ont été réinitialisées."}
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"Erreur clear-values: {exc}\n{resp.text}") from exc
    except Exception as e:
        return {"error": str(e)}

@mcp.tool()
async def read_trend_log(object_instance: int = 300001, encode: str = "json") -> Any:
    """Lecture des données d’un trendLog local."""
    path = f"/protocols/bacnet/local/objects/trendLog/{object_instance}/trend"
    headers = {"accept": f"application/{encode}"}
    params = {"encode": encode}
    try:
        resp = await client.get(path, params=params, headers=headers)
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=f"{exc}\n{resp.text}") from exc

    try:
        data = resp.json()
    except Exception as e:
        return {"error": f"Erreur parsing JSON : {str(e)}", "raw": resp.text}

    trend_list = data if isinstance(data, list) else data.get("trend") or data.get("samples") or []
    result = []
    for entry in trend_list:
        ts = entry.get("timestamp") or entry.get("timeStamp")
        val = entry.get("value")
        if ts is None or val is None:
            continue
        if isinstance(val, dict):
            val = val.get("value", val)
        result.append({"timestamp": ts, "timestamp_human": to_human(ts), "value": val})

    if not result:
        return {"object_instance": object_instance, "count": 0, "samples": [], "message": "Aucun échantillon enregistré pour ce trend log."}
    return {"object_instance": object_instance, "count": len(result), "samples": result}

@mcp.tool()
async def read_schedule_full(object_instance: int = 1, encode: str = "json") -> Any:
    path_weekly = f"/protocols/bacnet/local/objects/schedule/{object_instance}/properties/weekly-schedule"
    path_exceptions = f"/protocols/bacnet/local/objects/schedule/{object_instance}/properties/exception-schedule"
    headers = {"accept": f"application/{encode}"}
    params = {"encode": encode}
    weekly_resp, exceptions_resp = await asyncio.gather(
        client.get(path_weekly, headers=headers, params=params),
        client.get(path_exceptions, headers=headers, params=params)
    )
    try:
        weekly_resp.raise_for_status()
        exceptions_resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=f"{exc}\n{exc.response.text}") from exc
    weekly = weekly_resp.json() if encode == "json" else weekly_resp.text
    exceptions = exceptions_resp.json() if encode == "json" else exceptions_resp.text
    return {"weeklySchedule": weekly, "exceptionSchedule": exceptions}

@mcp.tool()
async def write_weekly_schedule_local_text(
    object_instance: int = Field(..., description="Instance BACnet de l'objet Schedule (ex: 1)"),
    lundi: str = Field("", description='Ex: "08:00,2;09:00,null;14:00,4"'),
    mardi: str = Field("", description='Ex: "08:00,2"'),
    mercredi: str = Field("", description=''),
    jeudi: str = Field("", description=''),
    vendredi: str = Field("", description=''),
    samedi: str = Field("", description=''),
    dimanche: str = Field("", description=''),
    encode: str = Field("json", description="Encodage de la requête (json ou xml)")
) -> Any:
    """Écriture horaire hebdomadaire simplifiée via CSV texte."""
    def parse_day_string(day_str):
        time_values = []
        entries = [e.strip() for e in day_str.split(";") if e.strip()]
        for entry in entries:
            try:
                time_str, val_str = entry.split(",")
                time_str = time_str.strip()
                val_str = val_str.strip().lower()
                if val_str == "null":
                    tv = {"time": time_str, "type": "null", "value": None}
                else:
                    tv = {"time": time_str, "type": "enumerated", "value": int(val_str)}
                time_values.append(tv)
            except Exception as e:
                return {"error": f"Erreur parsing '{entry}': {e}"}
        return time_values

    days_input = [lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche]
    schedule = []
    for day in days_input:
        parsed = parse_day_string(day)
        if isinstance(parsed, dict) and "error" in parsed:
            return parsed
        if parsed:
            schedule.append({"timeValues": parsed})
    if not schedule:
        return {"error": "Aucune valeur d'horaire fournie."}

    data = {"value": schedule}
    path = f"/protocols/bacnet/local/objects/schedule/{object_instance}/properties/weekly-schedule"
    headers = {"accept": f"application/{encode}", "content-type": "application/json"}
    params = {"encode": encode}
    try:
        resp = await client.post(path, json=data, headers=headers, params=params)
        resp.raise_for_status()
        return {"status": "ok", "details": "Horaire hebdomadaire envoyé avec succès."}
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"Erreur Distech : {exc}\n{resp.text}") from exc
    except Exception as e:
        return {"raw": str(e)}

# ===========================================================================
# BACnet DISTANT (remote, via BACnet/IP)
# ===========================================================================
@mcp.tool()
async def read_property_multiple_remote_flexible_text(
    instances_csv: str = Field(..., description="Instances séparées par virgule, ex: 1,2,3"),
    properties_csv: str = Field(..., description="Propriétés séparées par virgule, ex: presentValue,objectName"),
    remoteDeviceId: int = 1234,
    object_type: str = Field("analogValue", description="Type d'objet BACnet (ex: analogValue, binaryInput)"),
    encode: str = Field("text", description="Encodage text ou asn")
) -> Any:
    try:
        instances = [int(i.strip()) for i in instances_csv.split(",") if i.strip()]
        properties = [p.strip() for p in properties_csv.split(",") if p.strip()]
    except Exception as e:
        return {"error": f"Erreur parsing des champs texte : {str(e)}"}

    if not instances or not properties:
        return {"error": "instances_csv et properties_csv ne doivent pas être vides."}

    objects = [
        {"type": object_type, "instance": inst, "property": prop, "arrayIndex": -1}
        for inst in instances
        for prop in properties
    ]
    data = {"encode": encode, "propertyReferences": objects}

    headers = {"accept": "application/json", "content-type": "application/json"}
    path = f"/protocols/bacnet/remote/devices/{remoteDeviceId}/objects/read-property-multiple"

    try:
        resp = await client.post(path, json=data, headers=headers)
        resp.raise_for_status()
        result = resp.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"{exc}\n{resp.text}") from exc
    except Exception as e:
        return {"error": f"Erreur de communication : {str(e)}"}

    grouped = {}
    for entry in result:
        key = (entry["type"], entry["instance"])
        if key not in grouped:
            grouped[key] = {"type": entry["type"], "instance": entry["instance"]}
        value = entry.get("value")
        if isinstance(value, dict) and "errorClass" in value:
            grouped[key][entry["property"]] = f"Erreur : {value['errorClass']}, {value['errorCode']}"
        else:
            grouped[key][entry["property"]] = value
    return list(grouped.values())

@mcp.tool()
async def write_property_multiple_remote_text(
    remoteDeviceId: int,
    instances_csv: str = Field(..., description="Instances séparées par virgule, ex: 1,2,3"),
    value: str = Field(..., description="Valeur à écrire, ex: 22.5"),
    object_type: str = Field("analogValue", description="Type BACnet, ex: analogValue, binaryValue"),
    property_name: str = Field("presentValue", description="Propriété à écrire, ex: presentValue"),
    priority: int = Field(8, description="Priorité d’écriture (1–16)"),
    encode: str = Field("text", description="Encodage text ou asn")
) -> Any:
    try:
        instances = [int(i.strip()) for i in instances_csv.split(",") if i.strip()]
    except Exception as e:
        return {"error": f"Erreur parsing des instances : {str(e)}"}
    if not instances:
        return {"error": "Aucune instance fournie."}

    writes = [{"type": object_type, "instance": inst, "property": property_name, "value": value, "priority": priority} for inst in instances]
    data = {"encode": encode, "propertyReferences": writes}

    headers = {"accept": "application/json", "content-type": "application/json"}
    path = f"/protocols/bacnet/remote/devices/{remoteDeviceId}/objects/write-property-multiple"

    try:
        resp = await client.post(path, json=data, headers=headers)
        resp.raise_for_status()
        result = resp.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"{exc}\n{resp.text}") from exc
    except Exception as e:
        return {"error": str(e)}

    feedback = []
    for ref, entry in zip(writes, result):
        status = entry.get("status")
        if "errorClass" in str(entry.get("value", "")):
            feedback.append({**ref, "status": "erreur", "detail": str(entry["value"])})
        else:
            feedback.append({**ref, "status": status or "ok"})
    return feedback

@mcp.tool()
async def reset_selected_priorities_remote_text(
    object_types: str = Field(..., description="Types BACnet séparés par virgule, ex: analogValue,binaryValue"),
    instances: str = Field(..., description="Instances séparées par virgule, ex: 1,42"),
    remoteDeviceId: int = 3178725,
    priorities: str = Field("8", description="Priorités séparées par virgule, ex: 8 ou 1,2,3"),
    encode: str = Field("text", description="Encodage BACnet (text ou asn)")
) -> Any:
    try:
        types = [t.strip() for t in object_types.split(",") if t.strip()]
        insts = [int(i.strip()) for i in instances.split(",") if i.strip()]
        prios = [int(p.strip()) for p in priorities.split(",") if p.strip()]
    except Exception as e:
        return {"error": f"Erreur parsing des champs texte : {str(e)}"}

    if len(types) != len(insts):
        return {"error": "Le nombre de types doit correspondre au nombre d’instances."}

    writes = []
    for obj_type, inst in zip(types, insts):
        for prio in prios:
            writes.append({"type": obj_type, "instance": inst, "property": "presentValue", "value": "null", "priority": prio})
    if not writes:
        return {"status": "ok", "details": "Aucun reset demandé."}

    data = {"encode": encode, "propertyReferences": writes}
    headers = {"accept": "application/json", "content-type": "application/json"}
    path = f"/protocols/bacnet/remote/devices/{remoteDeviceId}/objects/write-property-multiple"

    try:
        resp = await client.post(path, json=data, headers=headers)
        resp.raise_for_status()
        result = resp.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"Erreur reset priorités distantes: {exc}\n{resp.text}") from exc
    except Exception as e:
        return {"error": str(e)}

    feedback = []
    for ref, entry in zip(writes, result):
        status = entry.get("status")
        if "errorClass" in str(entry.get("value", "")):
            feedback.append({**ref, "status": "erreur", "detail": str(entry["value"])})
        else:
            feedback.append({**ref, "status": status or "ok"})
    return feedback

@mcp.tool()
async def read_trend_log_remote(remoteDeviceId: int, object_instance: int, encode: str = "json") -> Any:
    path = f"/protocols/bacnet/remote/devices/{remoteDeviceId}/objects/trendLog/{object_instance}/trend"
    headers = {"accept": f"application/{encode}"}
    params = {"encode": encode}
    resp = await client.get(path, params=params, headers=headers)
    resp.raise_for_status()
    data = resp.json()

    trend_list = data if isinstance(data, list) else data.get("trend", [])
    result = []
    for entry in trend_list:
        ts = entry.get("timestamp", "N/A")
        val = entry.get("value", "N/A")
        if isinstance(val, dict) and "value" in val:
            val = val["value"]
        result.append({"timestamp": ts, "value": val})

    return {"remoteDeviceId": remoteDeviceId, "object_instance": object_instance, "count": len(result), "samples": result}

@mcp.tool()
async def read_schedule_full_remote(remoteDeviceId: int = 3178725, object_instance: int = 1, encode: str = "json") -> Any:
    path_weekly = f"/protocols/bacnet/remote/devices/{remoteDeviceId}/objects/schedule/{object_instance}/properties/weekly-schedule"
    path_exceptions = f"/protocols/bacnet/remote/devices/{remoteDeviceId}/objects/schedule/{object_instance}/properties/exception-schedule"
    headers = {"accept": f"application/{encode}"}
    params = {"encode": encode}
    weekly_resp, exceptions_resp = await asyncio.gather(
        client.get(path_weekly, headers=headers, params=params),
        client.get(path_exceptions, headers=headers, params=params)
    )
    try:
        weekly_resp.raise_for_status()
        exceptions_resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=f"{exc}\n{exc.response.text}") from exc
    weekly = weekly_resp.json() if encode == "json" else weekly_resp.text
    exceptions = exceptions_resp.json() if encode == "json" else exceptions_resp.text
    return {"weeklySchedule": weekly, "exceptionSchedule": exceptions}

@mcp.tool()
async def write_weekly_schedule_remote_text(
    remoteDeviceId: int = Field(..., description="ID de l'appareil BACnet distant"),
    object_instance: int = Field(..., description="Instance BACnet de l'objet Schedule"),
    lundi: str = Field("", description='Ex: "08:00,2;09:00,null;14:00,4"'),
    mardi: str = Field("", description=''),
    mercredi: str = Field("", description=''),
    jeudi: str = Field("", description=''),
    vendredi: str = Field("", description=''),
    samedi: str = Field("", description=''),
    dimanche: str = Field("", description=''),
    encode: str = Field("json", description="Encodage de la réponse")
) -> Any:
    """Initialise l’horaire hebdomadaire d’un Schedule distant via saisie texte."""
    def parse_day_string(day_str):
        time_values = []
        entries = [e.strip() for e in day_str.split(";") if e.strip()]
        for entry in entries:
            try:
                time_str, val_str = entry.split(",")
                val_str = val_str.strip().lower()
                if val_str == "null":
                    time_values.append({"time": time_str, "type": "null", "value": None})
                else:
                    time_values.append({"time": time_str, "type": "enumerated", "value": int(val_str)})
            except Exception as e:
                return {"error": f"Erreur parsing '{entry}': {e}"}
        return time_values

    schedule_days = [lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche]
    weekly_schedule = []
    for day_str in schedule_days:
        parsed = parse_day_string(day_str)
        if isinstance(parsed, dict) and "error" in parsed:
            return parsed
        if parsed:
            weekly_schedule.append({"timeValues": parsed})
    if not weekly_schedule:
        return {"error": "Aucun jour avec horaire valide n'a été fourni."}

    payload = {"value": weekly_schedule}
    path = f"/protocols/bacnet/remote/devices/{remoteDeviceId}/objects/schedule/{object_instance}/properties/weekly-schedule"
    headers = {"accept": f"application/{encode}", "content-type": "application/json"}
    params = {"encode": encode}
    try:
        resp = await client.post(path, json=payload, headers=headers, params=params)
        resp.raise_for_status()
        return {"status": "ok", "details": "Horaire hebdomadaire distant mis à jour avec succès."}
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"Erreur écriture remote: {exc}\n{resp.text}") from exc
    except Exception as e:
        return {"raw": str(e)}

@mcp.tool()
async def start_bacnet_discovery_remote(low_limit: int = 0, high_limit: int = 60000, network_address: int = 1, timeout_ms: int = 10000, clear_cache: bool = False) -> dict:
    """Démarre la découverte des appareils BACnet distants via REST API Distech."""
    data = {
        "deviceInstanceRangeLowLimit": low_limit,
        "deviceInstanceRangeHighLimit": high_limit,
        "networkAddress": network_address,
        "timeout": timeout_ms,
        "clearCache": clear_cache
    }
    headers = {"accept": "application/json", "content-type": "application/json"}
    path = "/protocols/bacnet/remote/devices/start-discovery"
    resp = await client.post(path, json=data, headers=headers)
    try:
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"{exc}\n{resp.text}") from exc
    except Exception:
        return {"raw": resp.text}

@mcp.tool()
async def get_job_status(job_id: str, accept: str = "application/json") -> dict:
    """Récupère le statut d'un job (ex: découverte BACnet) via son jobId."""
    headers = {"accept": accept}
    path = f"/jobs/{job_id}"
    resp = await client.get(path, headers=headers)
    try:
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=resp.status_code, detail=f"{exc}\n{resp.text}") from exc
    except Exception:
        return {"raw": resp.text}

@mcp.tool()
async def list_and_info_remote_devices(encode: str = "json") -> Any:
    """Combine la découverte des périphériques distants avec récupération d'infos détaillées par device."""
    headers = {"accept": "application/json"}
    params = {"encode": encode}
    try:
        list_resp = await client.get("/protocols/bacnet/remote/devices", params=params, headers=headers)
        list_resp.raise_for_status()
        devices = list_resp.json()

        details = []
        for dev in devices:
            try:
                dev_id = int(dev["name"])
                info_resp = await client.get(f"/protocols/bacnet/remote/devices/{dev_id}", params=params, headers=headers)
                info_resp.raise_for_status()
                details.append(info_resp.json())
            except Exception as err:
                details.append({"id": dev.get("name"), "error": str(err)})
        return details
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=list_resp.status_code, detail=f"{exc}\n{list_resp.text}") from exc
    except Exception:
        return {"raw": list_resp.text}

@mcp.tool()
async def discover_object_types_present_remote(remoteDeviceId: int, encode: str = "json") -> str:
    """Découvre dynamiquement les types d'objets présents sur un périphérique BACnet distant et en lit quelques propriétés."""
    object_types = [
        "analogInput", "analogOutput", "analogValue",
        "binaryInput", "binaryOutput", "binaryValue",
        "multiStateInput", "multiStateOutput", "multiStateValue",
        "device", "calendar", "command", "eventEnrollment", "file", "group", "loop",
        "notificationClass", "program", "schedule", "trendLog", "accumulator",
        "pulseConverter", "eventLog", "globalGroup", "trendLogMultiple",
        "loadControl", "structuredView", "accessDoor"
    ]
    headers = {"accept": "application/json"}
    params = {"encode": encode}
    lines = [f"Types d'objets détectés sur le périphérique {remoteDeviceId} :"]

    for obj_type in object_types:
        try:
            path = f"/protocols/bacnet/remote/devices/{remoteDeviceId}/objects/{obj_type}"
            resp = await client.get(path, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list) and data:
                lines.append(f"- {obj_type} : {len(data)} objets")
                instances = [obj["instance"] for obj in data if "instance" in obj]
                if instances:
                    properties = ["objectName", "presentValue", "description", "units"]
                    read_data = {
                        "encode": encode,
                        "propertyReferences": [
                            {"type": obj_type, "instance": inst, "property": prop, "arrayIndex": -1}
                            for inst in instances for prop in properties
                        ]
                    }
                    read_resp = await client.post(
                        f"/protocols/bacnet/remote/devices/{remoteDeviceId}/objects/read-property-multiple",
                        json=read_data,
                        headers={"accept": "application/json", "content-type": "application/json"}
                    )
                    read_resp.raise_for_status()
                    results = read_resp.json()

                    info_map: Dict[int, Dict[str, Any]] = {}
                    for item in results:
                        key = item["instance"]
                        info_map.setdefault(key, {})[item["property"]] = item.get("value")

                    for inst, props in info_map.items():
                        name = props.get("objectName", "?")
                        val = props.get("presentValue", "?")
                        desc = props.get("description", "")
                        unit = props.get("units", "")
                        line = f"  - {obj_type}-{inst} : {name} = {val}"
                        if unit:
                            line += f" {unit}"
                        if desc:
                            line += f" ({desc})"
                        lines.append(line)
        except Exception:
            continue
    return "\n".join(lines)

# ---------------------------------------------------------------------------
# MODE SELF-TEST (hors réseau) – exécution avec:  python script.py --selftest
# ---------------------------------------------------------------------------
def _run_selftests():
    # Test 1: to_human
    ms = 1_700_000_000_000
    iso = to_human(ms)
    assert "T" in iso and len(iso) >= 19, f"to_human invalid: {iso}"

    # Test 2: payload binaire via bool_value
    p = _build_write_payload("binaryValue", 3, "presentValue", None, True, 8, "json")
    v = p["propertyReferences"][0]["values"][0]
    assert v["type"] == "boolean" and v["value"] is True, f"bool_value mapping failed: {v}"

    # Test 3: payload binaire via '1' string
    p = _build_write_payload("binaryInput", 1, "presentValue", "1", None, 8, "json")
    v = p["propertyReferences"][0]["values"][0]
    assert v["type"] == "boolean" and v["value"] is True, f"'1' mapping failed: {v}"

    # Test 4: analogique '22.5'
    p = _build_write_payload("analogValue", 1, "presentValue", "22.5", None, 8, "json")
    v = p["propertyReferences"][0]["values"][0]
    assert v["type"] == "real" and abs(v["value"] - 22.5) < 1e-9, f"real mapping failed: {v}"

    print("✅ SELFTESTS PASSED")

# ---------------------------------------------------------------------------
# LANCEMENT
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    if "--selftest" in sys.argv:
        _run_selftests()
    else:
        uvicorn.run(app, host="0.0.0.0", port=8080)
