#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Serveur MCP BACnet — notifications (Notification Class), réception d'alarmes & COV,
lecture/affichage des destinataires, déduplication, acquittement, TrendLog et Schedule.

Tout est pré-rempli pour tester sans fournir d'arguments aux tools MCP.
"""
from decode import format_readrange_ack
from typing import Optional, List, Dict, Any, Set, Tuple, Union
import asyncio
import logging
import sys
import traceback
from typing import Optional, List, Dict, Any

from fastmcp import FastMCP
from fastmcp.prompts.prompt import Message

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


#                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
# Ajoute Union à ta ligne existante

import sys
import asyncio
import logging
from collections import deque
from datetime import datetime
import inspect
import json # ✅ CORRECTION: Importation manquante ajoutée
import os

def parse_hosts(env_name: str = "TARGET_HOSTS"):
    raw = os.getenv(env_name, "") or ""
    return [h.strip() for h in raw.split(",") if h.strip()]

KNOWN_HOSTS = parse_hosts()


# ---------- BACpypes3 ----------
import bacpypes3
from bacpypes3.app import Application
from bacpypes3.argparse import SimpleArgumentParser
from bacpypes3.pdu import Address
from bacpypes3.primitivedata import ObjectIdentifier, Unsigned, Null, Time
from bacpypes3.apdu import (
    UnconfirmedEventNotificationRequest,
    UnconfirmedCOVNotificationRequest,
    ReadPropertyRequest,
    WritePropertyRequest,
    AcknowledgeAlarmRequest,
    ReadRangeRequest,
)
from bacpypes3.basetypes import (
    Recipient, Destination, DeviceObjectReference, TimeStamp,
    Range, RangeByPosition, RangeBySequenceNumber, TimeValue
)
from bacpypes3.constructeddata import ArrayOf

# Dates / Périodes pour Schedule
try:
    from bacpypes3.primitivedata import Date
except Exception:
    class Date: ...
try:
    from bacpypes3.basetypes import DateRange
except Exception:
    class DateRange: ...

# AnyAtomic (valeurs Schedule polymorphes)
try:
    from bacpypes3.constructeddata import AnyAtomic
except Exception:
    class AnyAtomic: ...

from bacpypes3.primitivedata import Time  # <— utilisé pour construire l'heure

# Ces types sont utilisés dans bacnet_to_json / AnyAtomic
try:
    from bacpypes3.primitivedata import Enumerated, BitString, Date
except Exception:
    class Enumerated: ...
    class BitString: ...
    class Date: ...
try:
    from bacpypes3.basetypes import DateRange, PriorityValue, TimeStamp, ObjectPropertyReference
except Exception:
    DateRange = PriorityValue = TimeStamp = ObjectPropertyReference = object
# ---- ReadRange types (compat toutes versions bacpypes3) ----
try:
    # Noms "classiques"
    from bacpypes3.basetypes import Range, RangeByPosition, RangeBySequenceNumber, RangeByTime, DateTime
except Exception:
    # Certaines versions utilisent des alias différents
    from bacpypes3.basetypes import DateTime  # requis par byTime
    # On essaie de retrouver les classes sous d'autres noms
    Range = getattr(__import__("bacpypes3.basetypes", fromlist=["*"]), "Range", None)
    RangeByPosition = getattr(__import__("bacpypes3.basetypes", fromlist=["*"]), "RangeByPosition", None)
    RangeBySequenceNumber = getattr(__import__("bacpypes3.basetypes", fromlist=["*"]), "RangeBySequenceNumber", None)
    RangeByTime = getattr(__import__("bacpypes3.basetypes", fromlist=["*"]), "RangeByTime", None)

from bacpypes3.primitivedata import Date, Time  # nécessaires pour construire DateTime


# ---------- FastMCP ----------
from fastmcp import FastMCP
from fastmcp.server.auth.providers.jwt import JWTVerifier

# ---------- Logging & buffers ----------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
_received_alarms: deque = deque(maxlen=500)
_active_cov_subscriptions: Set[str] = set()

# ---------- Config ----------
class Auth:
    def __init__(self, key: Optional[str] = None):
        self.key = key

class BACnetConfig:
    def __init__(self):
        self.host = "192.168.1.149"
        self.port = 47808
        self.device_instance = 19149
        self.target_host = "192.168.1.7"
        self.target_port = 47808
        self.default_nc_instance = 1
        self.discovery_timeout = 10.0

class Settings:
    def __init__(self):
        self.auth = Auth()
        self.bacnet = BACnetConfig()

settings = Settings()

# ---------- FastMCP ----------
mcp = FastMCP(
    name="BACnet MCP Server",
    auth=JWTVerifier(public_key=settings.auth.key) if settings.auth.key else None,
)
app = mcp.http_app()

# ---------- Helpers ----------
__version__ = "1.4.2"

def _safe_str(x: Any) -> str:
    try:
        return str(x)
    except Exception:
        return repr(x)

def _parse_value_for_write(value: Any) -> Any:
    """Convertit une chaîne de caractères en type BACnet/Python approprié pour une écriture."""
    if not isinstance(value, str):
        return value # Déjà un type correct (int, bool, etc.)
    s = value.strip().lower()
    if s in {"null", "none", "release"}: return Null()
    if s in {"true", "on", "active"}: return True
    if s in {"false", "off", "inactive"}: return False
    try:
        if "." in s or "e" in s: return float(s)
        return int(s)
    except ValueError:
        return value # Renvoyer la chaîne originale si ce n'est pas un type connu

def _cast_out_timestamp(ts: Optional[TimeStamp]) -> Tuple[str, Any]:
    if ts is None:
        return ("none", None)
    try:
        k, v = ts.cast_out()
        return (k, v)
    except Exception:
        if getattr(ts, "dateTime", None) is not None:
            return ("dateTime", ts.dateTime)
        if getattr(ts, "sequenceNumber", None) is not None:
            return ("sequenceNumber", int(ts.sequenceNumber))
        if getattr(ts, "time", None) is not None:
            return ("time", ts.time)
        return ("unknown", _safe_str(ts))

def _mac_to_hex(mac) -> str:
    if mac is None:
        return ""
    try:
        b = bytes(mac)
    except Exception:
        b = bytes(getattr(mac, "value", b""))
    return "-".join(f"{x:02X}" for x in b)

def _recipient_fingerprint(dest) -> str:
    rec = getattr(dest, "recipient", None)
    pi = int(getattr(dest, "processIdentifier", 0) or 0)
    if rec is None:
        return f"none|pi={pi}"
    dev = getattr(rec, "device", None)
    if dev and getattr(dev, "deviceIdentifier", None):
        return f"device|{dev.deviceIdentifier}|pi={pi}"
    addr = getattr(rec, "address", None)
    if addr:
        net = int(getattr(addr, "networkNumber", 0) or 0)
        mac_hex = _mac_to_hex(getattr(addr, "macAddress", None))
        return f"addr|net={net}|mac={mac_hex}|pi={pi}"
    return f"unknown|pi={pi}"

def _normalize_obj_type(obj_type: str) -> str:
    """Corrige les abréviations et tolère minuscules/majuscules."""
    obj_type = obj_type.strip().lower()
    aliases = {
        "av": "analogValue", "ai": "analogInput", "ao": "analogOutput",
        "bv": "binaryValue", "bi": "binaryInput", "bo": "binaryOutput",
        "mv": "multiStateValue", "mi": "multiStateInput", "mo": "multiStateOutput",
        "nc": "notificationClass", "tl": "trendLog", "dev": "device",
    }
    if obj_type in aliases:
        return aliases[obj_type]
    mapping = {
        "analogvalue": "analogValue",
        "analoginput": "analogInput",
        "analogoutput": "analogOutput",
        "binaryvalue": "binaryValue",
        "binaryinput": "binaryInput",
        "binaryoutput": "binaryOutput",
        "multistatevalue": "multiStateValue",
        "multistateinput": "multiStateInput",
        "multistateoutput": "multiStateOutput",
        "notificationclass": "notificationClass",
        "trendlog": "trendLog",
        "device": "device",
    }
    return mapping.get(obj_type, obj_type)

def _format_error_details(e: Exception) -> str:
    return f"{type(e).__name__}: {e}"

async def _read_trend_log_records(app_bac, address, object_id, request) -> List[Dict[str, Any]]:
    try:
        response = await app_bac.request(request)
        if not hasattr(response, "result") or not response.result:
            return []
        records = []
        for item in response.result.elements:
            ts = getattr(item, "timestamp", None)
            ts_kind, ts_val = _cast_out_timestamp(ts)
            records.append({
                "timestamp_kind": ts_kind,
                "timestamp_value": str(ts_val),
                "value": _safe_str(getattr(item, "value", None)),
                "statusFlags": _safe_str(getattr(item, "statusFlags", None)),
            })
        return records
    except Exception as e:
        logger.error(f"Erreur lecture TrendLog: {e}")
        return []

# ===== ENUM MAPPINGS (fallback si le device renvoie des int bruts) =====
EVENT_STATE_MAP = {
    0: "normal",
    1: "fault",
    2: "offnormal",
    3: "high-limit",
    4: "low-limit",
    5: "life-safety-alarm",
}
RELIABILITY_MAP = {
    0: "no-fault-detected",
    1: "no-sensor",
    2: "over-range",
    3: "under-range",
    4: "open-loop",
    5: "shorted-loop",
    6: "no-output",
    7: "uncalibrated",
    8: "device-fault",
    9: "configuration-error",
}
NOTIFY_TYPE_MAP = {
    0: "alarm",
    1: "event",
    2: "ack-notification",
}
ENGINEERING_UNITS_MAP = {
    62: "degreesCelsius",
    63: "degreesFahrenheit",
    64: "degreesKelvin",
    95: "no-units",
    98: "percent",
    160: "no-units-percent",
}

# ===== HELPERS JSON GÉNÉRIQUES =====
try:
    from bacpypes3.primitivedata import Enumerated, BitString
except Exception:
    class Enumerated: ...
    class BitString: ...

try:
    from bacpypes3.basetypes import PriorityValue, ObjectPropertyReference
except Exception:
    PriorityValue = ObjectPropertyReference = object

def _propkey(key: str) -> str:
    return key.lower().replace("-", "").replace("_", "")

def _extract_priority_value(pv: Any) -> Any:
    for getter in ("cast_out", "get_value"):
        try:
            return getattr(pv, getter)()
        except Exception:
            pass
    for attr in ("value", "presentValue"):
        try:
            return getattr(pv, attr)
        except Exception:
            pass
    return None

def _priority_array_to_dict(arr: Any) -> Dict[str, Any]:
    try:
        values = list(arr)
    except Exception:
        return {}
    out: Dict[str, Any] = {}
    for idx in range(16):
        key = f"p{idx+1}"
        try:
            pv = values[idx]
        except Exception:
            out[key] = None
            continue
        out[key] = bacnet_to_json(_extract_priority_value(pv))
    return out

def _enum_to_name(v: Any) -> str:
    for attr in ("get_long_name", "get_name", "name"):
        if hasattr(v, attr):
            try:
                val = getattr(v, attr)
                return val() if callable(val) else str(val)
            except Exception:
                pass
    return str(v)

def _bitstring_to_named_dict(bits: List[Any], names: List[str]) -> Dict[str, bool]:
    try:
        seq = list(bits)
    except Exception:
        seq = []
    return {name: bool(seq[i]) if i < len(seq) else False for i, name in enumerate(names)}

def _post_process_known_bits(prop_id: str, raw_value: Any) -> Dict[str, bool] | None:
    key = _propkey(prop_id)
    if key in ("ackedtransitions", "eventenable"):
        return _bitstring_to_named_dict(raw_value, ["to-offnormal", "to-fault", "to-normal"])
    if key == "statusflags":
        return _bitstring_to_named_dict(raw_value, ["in-alarm", "fault", "overridden", "out-of-service"])
    if key == "limitenable":
        return _bitstring_to_named_dict(raw_value, ["low-limit-enable", "high-limit-enable"])
    return None

def _post_process_known_enums(prop_id: str, converted_value: Any) -> Any:
    key = _propkey(prop_id)
    if isinstance(converted_value, int):
        if key == "eventstate":
            return EVENT_STATE_MAP.get(converted_value, converted_value)
        if key == "reliability":
            return RELIABILITY_MAP.get(converted_value, converted_value)
        if key == "notifytype":
            return NOTIFY_TYPE_MAP.get(converted_value, converted_value)
        if key == "units":
            return ENGINEERING_UNITS_MAP.get(converted_value, converted_value)
    return converted_value

# ---- conversions scalaires utiles (pour strings "0","1","3.5","true") ----
def _coerce_scalar(v: Any) -> Any:
    if isinstance(v, str):
        s = v.strip()
        sl = s.lower()
        if sl in {"true", "false"}:
            return sl == "true"
        try:
            if "." in s or "e" in sl:
                f = float(s)
                if f == float("inf") or f == float("-inf") or f != f:
                    return s
                return f
            return int(s)
        except Exception:
            return v
    return v
# ===== TREND LOG HELPERS (à mettre une seule fois dans server.py) =====
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

# bacpypes3
from bacpypes3.pdu import Address
from bacpypes3.primitivedata import ObjectIdentifier
from bacpypes3.apdu import ReadRangeRequest, ReadPropertyRequest
from bacpypes3.basetypes import (
    Range, RangeByPosition, RangeBySequenceNumber, RangeByTime, DateTime,
)
from bacpypes3.primitivedata import Date, Time

# decode.py (fourni précédemment)
from decode import format_readrange_ack

def _make_trendlog_oid(instance: int) -> ObjectIdentifier:
    try:
        return ObjectIdentifier(f"trendLog,{instance}")
    except Exception:
        return ObjectIdentifier(f"trend-log,{instance}")

def _ack_snapshot(ack: Any) -> Dict[str, Any]:
    snap = {"ack_class": ack.__class__.__name__ if ack else "None", "attrs": []}
    if not ack:
        return snap
    for a in ("itemData","listOfRecords","logRecords","result","values","elements","value"):
        try:
            if hasattr(ack, a):
                v = getattr(ack, a)
                snap["attrs"].append(a)
                try:
                    snap[f"{a}_len"] = (len(v) if v is not None else 0)
                except Exception:
                    snap[f"{a}_len"] = None
        except Exception as e:
            snap[f"{a}_error"] = str(e)
    return snap

def _build_by_position(start: int, count: int) -> Range:
    return Range(byPosition=RangeByPosition(referenceIndex=int(max(1,start)), count=int(max(1,count))))

def _build_by_sequence(start: int, count: int) -> Range:
    return Range(bySequenceNumber=RangeBySequenceNumber(referenceSequenceNumber=int(max(1,start)), count=int(max(1,count))))

def _build_by_time(hours: int) -> Range:
    now = datetime.now()
    start = now - timedelta(hours=max(1, int(hours)))
    d1 = Date(start.year, start.month, start.day, 255)   # weekday=255 (joker)
    t1 = Time(start.hour, start.minute, start.second, 0)
    d2 = Date(now.year, now.month, now.day, 255)
    t2 = Time(now.hour, now.minute, now.second, 0)
    return Range(byTime=RangeByTime(beginningTime=DateTime(d1, t1), endingTime=DateTime(d2, t2)))

def _extract_items_any_path(ack: Any) -> List[Any]:
    """
    Essaie d'extraire des 'items' quelle que soit la structure de l'ACK (itemData / listOfRecords / result.elements …).
    Renvoie une liste (éventuellement vide).
    """
    if ack is None:
        return []
    # 1) itemData → décodé par decode.py (on le traite à part dans l'appelant)
    if getattr(ack, "itemData", None) is not None:
        return [("itemData", ack.itemData)]
    # 2) chemins alternatifs (fabricants / versions bacpypes3)
    for path in [
        ("listOfRecords",),
        ("logRecords",),
        ("result","elements"),
        ("result",),
        ("values",),
        ("elements",),
        ("value",),
    ]:
        cur = ack
        ok = True
        for p in path:
            if hasattr(cur, p):
                cur = getattr(cur, p)
            else:
                ok = False
                break
        if ok and cur is not None:
            try:
                # le caller fera str() dessus si besoin
                return list(cur)
            except Exception:
                return [cur]
    return []

async def _read_property_int(app_bac, addr: Address, oid: ObjectIdentifier, pid: str) -> Optional[int]:
    """
    Lecture 'record-count', 'buffer-size', 'total-record-count' avec tolérance (convertit en int si possible).
    """
    try:
        req = ReadPropertyRequest(objectIdentifier=oid, propertyIdentifier=pid)
        req.pduDestination = addr
        ack = await app_bac.request(req)
        val = getattr(ack, "propertyValue", getattr(ack, "value", None))
        if val is None:
            return None
        # Essais successifs pour extraire un entier
        for attr in ("value", ):
            try:
                v = getattr(val, attr)
                if isinstance(v, (int, float)):
                    return int(v)
            except Exception:
                pass
        try:
            return int(str(val))
        except Exception:
            return None
    except Exception:
        return None
# ===== /TREND LOG HELPERS =====

# ===== Parser simple (sans introspection) =====
def _parse_oid_simple(val):
    """
    Parse une valeur OID (souvent Any) en (type:int, instance:int) via sa représentation texte.
    Exemples: "analogValue,2", "trendLog:300001", "('analog-input', 1)", "2:1".
    """
    try:
        s = str(val)
        if not s:
            return (None, None)
        s2 = s.strip().strip("()").replace("'", "").replace('"', '')
        if "," in s2:
            tpart, ipart = s2.split(",", 1)
        elif ":" in s2:
            tpart, ipart = s2.split(":", 1)
        else:
            return (None, None)
        tpart = tpart.strip()
        ipart = ipart.strip()
        tmap = {
            "analogInput": 0, "analog-input": 0, "ai": 0, "0": 0,
            "analogOutput": 1, "analog-output": 1, "ao": 1, "1": 1,
            "analogValue": 2, "analog-value": 2, "av": 2, "2": 2,
            "binaryInput": 3, "binary-input": 3, "bi": 3, "3": 3,
            "binaryOutput": 4, "binary-output": 4, "bo": 4, "4": 4,
            "binaryValue": 5, "binary-value": 5, "bv": 5, "5": 5,
            "device": 8, "8": 8,
            "schedule": 17, "17": 17,
            "multistateValue": 19, "multiStateValue": 19, "multistate-value": 19, "msv": 19, "19": 19,
            "trendLog": 20, "trend-log": 20, "trendlog": 20, "tl": 20, "20": 20,
        }
        try:
            tnum = int(tpart)
        except Exception:
            tnum = tmap.get(tpart, None)
        inum = int(ipart)
        if tnum is None:
            return (None, None)
        return (tnum, inum)
    except Exception:
        return (None, None)

# ===== SCHEDULE HELPERS =====
DAY_NAMES_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

def _anyatomic_to_value(v: Any) -> Any:
    """Extrait la valeur d'un AnyAtomic et la convertit en scalaire si possible."""
    for getter in ("cast_out", "get_value"):
        try:
            return getattr(v, getter)()
        except Exception:
            pass
    for attr in ("appValue", "app_value", "value", "presentValue", "appTag", "app_tag"):
        if hasattr(v, attr):
            try:
                raw = getattr(v, attr)
                raw = raw() if callable(raw) else raw
                return _coerce_scalar(raw)
            except Exception:
                pass
    try:
        pub = {k: val for k, val in getattr(v, "__dict__", {}).items() if not str(k).startswith("_")}
        if len(pub) == 1:
            return _coerce_scalar(list(pub.values())[0])
        if pub:
            return {k: _coerce_scalar(val) for k, val in pub.items()}
    except Exception:
        pass
    return str(v)

def _coerce_time_value(item: Any) -> Dict[str, Any]:
    """
    Décode un TimeValue BACnet -> {'time': 'HH:MM:SS.xx', 'value': ...}.
    Utilise cast_out() en priorité, et normalise [] -> None.
    """
    # 1) Chemin normal (cast_out)
    try:
        if hasattr(item, "cast_out"):
            t, v = item.cast_out()   # -> (Time, valeur)
            val = bacnet_to_json(v)
            if val == []:
                val = None
            return {"time": _time_to_string(t), "value": val}
    except Exception as e:
        logger.warning(f"Échec cast_out sur {item}: {e}")

    # 2) Fallback sur attributs
    t_raw = getattr(item, "time", None)
    t_raw = t_raw() if callable(t_raw) else t_raw
    v_raw = getattr(item, "value", None)
    v_raw = v_raw() if callable(v_raw) else v_raw

    val = bacnet_to_json(v_raw) if v_raw is not None else None
    if val == []:
        val = None

    return {"time": _time_to_string(t_raw) if t_raw is not None else "*", "value": val}

def _clean_exception_schedule(exc_raw: Any) -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []
    seq = list(exc_raw) if isinstance(exc_raw, (list, tuple)) else [exc_raw]
    for ent in seq:
        if ent is None:
            continue
        try:
            priority = getattr(ent, "priority", getattr(ent, "Priority", "N/A"))
            priority = priority() if callable(priority) else priority
        except Exception:
            priority = "N/A"
        try:
            cal = getattr(ent, "calendarEntry", getattr(ent, "CalendarEntry", None))
            cal = cal() if callable(cal) else cal
        except Exception:
            cal = None
        actions = []
        try:
            act = getattr(ent, "listOfTimeValues", getattr(ent, "actions", []))
            act = act() if callable(act) else act
            act_list = list(act) if isinstance(act, (list, tuple)) else [act]
            actions = [_coerce_time_value(a) for a in act_list if a is not None]
        except Exception:
            pass
        entries.append({
            "priority": bacnet_to_json(priority) if priority is not None else "N/A",
            "calendarEntry": bacnet_to_json(cal) if cal is not None else None,
            "actions": actions,
        })
    return entries

def _parse_time_string(s: str) -> Time:
    """
    bacpypes3.Time attend 1 seul argument ('HH:MM:SS.hh') ou un tuple (hh,mm,ss,hs).
    """
    s = str(s).strip() or "00:00:00.00"
    if s == "*":
        s = "00:00:00.00"

    # assure qu'il y a bien des centièmes
    if "." not in s:
        s = f"{s}.00"
    hhmmss, _, hs = s.partition(".")
    parts = hhmmss.split(":")
    if len(parts) != 3:
        raise ValueError(f"Heure invalide: {s}")
    hh, mm, ss = (int(parts[0]), int(parts[1]), int(parts[2]))
    hs = int(hs) if hs.isdigit() else 0

    # 1) via string
    try:
        return Time(f"{hh:02d}:{mm:02d}:{ss:02d}.{hs:02d}")
    except Exception:
        pass
    # 2) fallback tuple
    try:
        return Time((hh, mm, ss, hs))
    except Exception:
        pass
    # 3) dernier recours (anciennes versions)
    return Time(hh, mm, ss, hs)


def _time_to_string(t: Any) -> str:
    """Sécurise la conversion d'un objet Time en 'HH:MM:SS.hh'."""
    try:
        return str(t)
    except Exception:
        pass
    # si t est un tuple/sequence (hh,mm,ss,hs)
    try:
        hh, mm, ss, hs = list(t)
        return f"{int(hh):02d}:{int(mm):02d}:{int(ss):02d}.{int(hs):02d}"
    except Exception:
        return "*"

# ===== Conversion centrale =====
def bacnet_to_json(value: Any) -> Any:
    # Enumerated
    try:
        if isinstance(value, Enumerated):
            return _enum_to_name(value)
    except Exception:
        pass

    # BitString
    try:
        if isinstance(value, BitString):
            try:
                return [bool(b) for b in list(value)]
            except Exception:
                return str(value)
    except Exception:
        pass

    # AnyAtomic (Schedule)
    if isinstance(value, AnyAtomic):
        try:
            inner = _anyatomic_to_value(value)
            return bacnet_to_json(inner)
        except Exception:
            return str(value)

    # Date
    if isinstance(value, Date):
        try:
            return {
                "year": getattr(value, "year", "*"),
                "month": getattr(value, "month", "*"),
                "day": getattr(value, "day", "*"),
                "weekday": getattr(value, "dayOfWeek", "*"),
            }
        except Exception:
            return str(value)

    # DateRange
    if isinstance(value, DateRange):
        try:
            sd = getattr(value, "startDate", None)
            ed = getattr(value, "endDate", None)
            return {"startDate": bacnet_to_json(sd), "endDate": bacnet_to_json(ed)}
        except Exception:
            return str(value)

    # scalaires simples
    if value is None or isinstance(value, (int, float, str, bool)):
        # essaye de convertir les strings "0","1","3.5","true"/"false"
        return _coerce_scalar(value)

    # PriorityValue
    try:
        if isinstance(value, PriorityValue):
            return bacnet_to_json(_extract_priority_value(value))
    except Exception:
        pass

    # TimeStamp
    try:
        if isinstance(value, TimeStamp):
            for attr in ("dateTime", "datetime", "date_time"):
                if hasattr(value, attr):
                    dt = getattr(value, attr)
                    if isinstance(dt, datetime):
                        return dt.isoformat()
                    return str(dt)
            for attr in ("time", "sequenceNumber", "sequence_number"):
                if hasattr(value, attr):
                    v = getattr(value, attr)
                    try:
                        return int(v) if "sequence" in attr else str(v)
                    except Exception:
                        return str(v)
            return str(value)
    except Exception:
        pass

    # Référence d'objet/propriété
    try:
        if isinstance(value, ObjectPropertyReference):
            try:
                return {
                    "objectIdentifier": str(getattr(value, "objectIdentifier", "")),
                    "propertyIdentifier": str(getattr(value, "propertyIdentifier", "")),
                    "arrayIndex": getattr(value, "arrayIndex", None),
                    "deviceIdentifier": str(getattr(value, "deviceIdentifier", "")) if hasattr(value, "deviceIdentifier") else None,
                }
            except Exception:
                return str(value)
    except Exception:
        pass

    # séquences / mappings
    if isinstance(value, (list, tuple, set)):
        return [bacnet_to_json(v) for v in value]
    if isinstance(value, dict):
        return {str(k): bacnet_to_json(v) for k, v in value.items()}

    return str(value)

# ---------- Application BACnet ----------
class AlarmReceiverApplication(Application):
    async def do_UnconfirmedEventNotificationRequest(self, apdu: UnconfirmedEventNotificationRequest) -> None:
        logger.info(f"🚨 Alarme BACnet reçue de {apdu.pduSource}")
        try:
            ts_kind, ts_val = _cast_out_timestamp(getattr(apdu, "timeStamp", None))
            _received_alarms.append({
                "type": "event",
                "source": _safe_str(getattr(apdu, "pduSource", "")),
                "eventObjectIdentifier": _safe_str(getattr(apdu, "eventObjectIdentifier", "")),
                "messageText": _safe_str(getattr(apdu, "messageText", "")),
                "timestamp_kind": ts_kind,
                "timestamp_value": _safe_str(ts_val),
            })
        except Exception as e:
            logger.error(f"Erreur traitement alarme: {e}", exc_info=True)

    async def do_UnconfirmedCOVNotificationRequest(self, apdu: UnconfirmedCOVNotificationRequest) -> None:
        logger.info(f"🔔 Notification COV reçue de {apdu.pduSource}")
        try:
            cov_values = []
            for v in (getattr(apdu, "listOfValues", None) or []):
                cov_values.append({
                    "propertyIdentifier": _safe_str(getattr(v, "propertyIdentifier", None)),
                    "value": _safe_str(getattr(v, "value", None)),
                })
            _received_alarms.append({
                "type": "cov",
                "source": _safe_str(getattr(apdu, "pduSource", "")),
                "monitoredObject": _safe_str(getattr(apdu, "monitoredObjectIdentifier", "")),
                "values": cov_values,
            })
        except Exception as e:
            logger.error(f"Erreur traitement COV: {e}", exc_info=True)

_bacnet_app: Optional[Application] = None

async def get_bacnet_app() -> Application:
    global _bacnet_app
    if _bacnet_app is None:
        logger.info(f"Initialisation BACnet sur {settings.bacnet.host}:{settings.bacnet.port} avec Device ID {settings.bacnet.device_instance}")
        original_argv = sys.argv.copy()
        try:
            sys.argv = [sys.argv[0], "--instance", str(settings.bacnet.device_instance), "--address", f"{settings.bacnet.host}/24"]
            args = SimpleArgumentParser().parse_args()
            _bacnet_app = AlarmReceiverApplication.from_args(args)
            if hasattr(_bacnet_app, "startup"):
                await _bacnet_app.startup()
        finally:
            sys.argv = original_argv
    return _bacnet_app

# ---------- TOOLS MCP ----------
@mcp.tool
def ping() -> str:
    return f"MCP BACnet v{__version__} actif"

@mcp.tool
def version() -> Dict[str, str]:
    return {"version": __version__}


# ===== OUTIL MCP: READ ALL PROPERTIES =====
@mcp.tool
async def read_all_properties(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    obj_type: str = "analogValue",
    obj_instance: int = 1,
) -> Dict[str, Any]:
    """
    Lit toutes les propriétés d'un objet BACnet une par une (propertyList),
    puis convertit en JSON propre : enums libellées, bitstrings nommés, PriorityArray p1..p16, etc.
    """
    obj_type = _normalize_obj_type(obj_type.strip())
    obj_repr = f"{obj_type},{obj_instance}"
    try:
        app_bac = await get_bacnet_app()
        object_id = ObjectIdentifier(obj_repr)
        address = Address(f"{host.strip()}:{port}")

        logger.info(f"Étape 1/2: Lecture de la propertyList de {object_id}...")
        property_list_raw = await app_bac.read_property(address, object_id, "propertyList")
        property_list = [str(p) for p in (property_list_raw or []) if p is not None]

        logger.info(f"Étape 2/2: Lecture des valeurs de {len(property_list)} propriétés (peut être lent)...")
        results: Dict[str, Any] = {}

        for i, prop_id in enumerate(property_list):
            if (i + 1) % 10 == 0:
                logger.info(f"  -> Lecture propriété {i+1}/{len(property_list)}: {prop_id}")
            try:
                value = await app_bac.read_property(address, object_id, prop_id)
                norm = _propkey(prop_id)
                if norm == "priorityarray":
                    results[prop_id] = _priority_array_to_dict(value)
                else:
                    converted = bacnet_to_json(value)
                    named_bits = _post_process_known_bits(prop_id, value)
                    results[prop_id] = _post_process_known_enums(prop_id, named_bits if named_bits is not None else converted)
            except BaseException as e:
                results[prop_id] = f"[Erreur: {_format_error_details(e)}]"

        return {"status": "success", "object": str(object_id), "properties": results}

    except BaseException as e:
        message = f"Impossible de lire toutes les propriétés de '{obj_repr}'"
        logger.error(f"{message}: {e}", exc_info=True)
        return {"status": "error", "message": message, "details": _format_error_details(e)}
@mcp.tool
async def read_property(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    obj_type: str = "analogOutput",
    obj_instance: int = 1,
) -> Dict[str, Any]:
    """Lit la valeur et les propriétés principales de n'importe quel type d'objet."""
    obj_type = _normalize_obj_type(obj_type.strip())
    obj_repr = f"{obj_type},{obj_instance}"
    try:
        app_bac = await get_bacnet_app()
        object_id = ObjectIdentifier(obj_repr)
        address = Address(f"{host.strip()}:{port}")
        props_to_read = ["presentValue", "objectName", "description", "units", "priorityArray"]
        results = {}
        for prop in props_to_read:
            try:
                value = await app_bac.read_property(address, object_id, prop)
                if prop == "priorityArray":
                    priorities = {f"p{i+1}": str(pv.cast_out()) if pv.cast_out() is not None else "Inactive" for i, pv in enumerate(value)}
                    results[prop] = priorities
                elif isinstance(value, float):
                    results[prop] = round(value, 2)
                else:
                    results[prop] = str(value)
            except BaseException: 
                results[prop] = "N/A"
        return {"status": "success", "object": str(object_id), "properties": results}
    except BaseException as e:
        message = f"Impossible de lire les propriétés de '{obj_repr}'"
        logger.error(f"{message}: {e}", exc_info=True)
        return {"status": "error", "message": message, "details": _format_error_details(e)}

@mcp.tool
async def write_property(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    obj_type: str = "analogValue",
    obj_instance: int = 1,
    property_name: str = "presentValue",
    value: str = "0",
    priority: Optional[int] = None,
) -> Dict[str, Any]:
    """Écrit une valeur sur n'importe quel type d'objet commandable."""
    obj_type = _normalize_obj_type(obj_type.strip())
    obj_repr = f"{obj_type},{obj_instance}"
    try:
        app_bac = await get_bacnet_app()
        object_id = ObjectIdentifier(obj_repr)
        address = Address(f"{host.strip()}:{port}")
        try:
            object_name = await app_bac.read_property(address, object_id, "objectName")
        except Exception:
            object_name = str(object_id)
        value_stripped = value.strip().lower()
        value_parsed: Any
        if value_stripped == "null":
            value_parsed = Null()
        elif obj_type.startswith('binary'):
            if value_stripped in ("active", "1", "on", "true"):
                value_parsed = "active"
            elif value_stripped in ("inactive", "0", "off", "false"):
                value_parsed = "inactive"
            else:
                return {"status": "error", "message": f"Valeur '{value}' invalide pour un objet binaire. Utilisez 'active' ou 'inactive'."}
        else:
            try:
                value_parsed = float(value_stripped)
            except ValueError:
                value_parsed = value.strip()
        await app_bac.write_property(address, object_id, property_name.strip(), value_parsed, priority=priority)
        message = f"Valeur '{value}' écrite sur '{object_name}' (priorité={priority or 'N/A'})"
        return {"status": "success", "message": message}
    except BaseException as e:
        message = f"Impossible d'écrire sur la propriété {obj_repr}.{property_name.strip()}"
        logger.error(f"{message}: {e}", exc_info=True)
        return {"status": "error", "message": message, "details": _format_error_details(e)}

@mcp.tool
async def who_has(object_name: str, timeout: int = 5) -> Dict[str, Any]:
    """Recherche sur le réseau quel appareil possède un objet avec un nom spécifique."""
    try:
        app_bac = await get_bacnet_app()
        logger.info(f"Recherche de l'objet nommé '{object_name.strip()}' sur le réseau...")
        i_have_responses = await asyncio.wait_for(app_bac.who_has(object_identifier=None, object_name=object_name.strip()), timeout=timeout)
        if not i_have_responses:
            return {"status": "success", "found": False, "message": f"Aucun appareil n'a répondu pour l'objet '{object_name}'."}
        results = [{"device": str(i_have.deviceIdentifier), "object": str(i_have.objectIdentifier), "address": str(i_have.pduSource)} for i_have in i_have_responses]
        return {"status": "success", "found": True, "results": results}
    except asyncio.TimeoutError:
         return {"status": "success", "found": False, "message": f"Timeout ({timeout}s) - Aucun appareil n'a répondu."}
    except BaseException as e:
        logger.error(f"Erreur lors de la recherche Who-Has: {e}", exc_info=True)
        return {"status": "error", "message": f"Une erreur est survenue pendant la recherche", "details": _format_error_details(e)}

@mcp.tool
async def read_active_cov_subscriptions(host: str, device_instance: int) -> Dict[str, Any]:
    """Lit la liste des abonnements COV (Change of Value) actifs sur un appareil."""
    try:
        app_bac = await get_bacnet_app()
        address = Address(host.strip())
        device_oid = ObjectIdentifier(f"device,{device_instance}")
        subscriptions = await app_bac.read_property(address, device_oid, "activeCovSubscriptions")
        if not subscriptions:
            return {"status": "success", "subscriptions": []}
        formatted_subscriptions = [{"recipient": str(sub.recipient.address), "monitoredObject": str(sub.monitoredObjectIdentifier), "remainingTime": f"{sub.timeRemaining} secondes", "increment": sub.covIncrement if sub.covIncrement is not None else "N/A"} for sub in subscriptions]
        return {"status": "success", "subscriptions": formatted_subscriptions}
    except BaseException as e:
        return {"status": "error", "message": f"Impossible de lire les abonnements COV de device,{device_instance}", "details": _format_error_details(e)}
# ===== OUTIL MCP : READ SCHEDULE =====
# ===== OUTILS MCP : ECRITURE SCHEDULE (CHAMPS PRE-REMPLIS) =====
from typing import Any, Dict, List
from bacpypes3.apdu import WritePropertyRequest, ReadPropertyRequest
from bacpypes3.basetypes import TimeValue
from bacpypes3.primitivedata import Time, Null
from bacpypes3.constructeddata import AnyAtomic

# Si _coerce_scalar n'existe pas déjà, on en fournit un simple
try:
    _coerce_scalar
except NameError:
    def _coerce_scalar(val: Any) -> Any:
        if isinstance(val, str):
            s = val.strip()
            sl = s.lower()
            if sl in {"true", "false"}:
                return sl == "true"
            if sl in {"null", "none", ""}:
                return None
            try:
                if "." in s or "e" in sl:
                    return float(s)
                return int(s)
            except Exception:
                return s
        return val

def _parse_time_string(s: str) -> Time:
    """
    'HH:MM:SS' ou 'HH:MM:SS.xx' -> Time(hour, minute, second, hundredth)
    """
    s = str(s).strip()
    hms, dot, hund = s.partition(".")
    parts = hms.split(":")
    if len(parts) != 3:
        raise ValueError(f"Heure invalide: {s}")
    h, m, sec = (int(parts[0]), int(parts[1]), int(parts[2]))
    hundredth = int(hund) if dot and hund.isdigit() else 0
    return Time(h, m, sec, hundredth)

def _to_anyatomic(value: Any) -> Any:
    """
    Convertit une valeur Python/str en type BACnet approprié pour Schedule:
    - 'null' / None -> Null()
    - 'true'/'false' -> bool
    - '0','1','3.5' -> int/float
    - sinon: tente AnyAtomic, sinon renvoie tel quel.
    """
    if value is None:
        return Null()
    if isinstance(value, str):
        s = value.strip()
        sl = s.lower()
        if sl in {"null", "none", ""}:
            return Null()
        if sl in {"true", "false"}:
            return sl == "true"
        try:
            if "." in s or "e" in sl:
                return float(s)
            return int(s)
        except Exception:
            pass
    try:
        return AnyAtomic(value)
    except Exception:
        return value

DAY_TO_INDEX = {"Lundi":1,"Mardi":2,"Mercredi":3,"Jeudi":4,"Vendredi":5,"Samedi":6,"Dimanche":7}

# Presets pré-remplis (par défaut: ton planning actuel)
PRESETS = {
    "bureau_11h15_15h": {
        "Lundi":    [{"time":"00:00:00.00","value":0},{"time":"11:15:00.00","value":1},{"time":"11:15:00.00","value":"null"},{"time":"15:00:00.00","value":"null"},{"time":"15:00:00.00","value":0}],
        "Mardi":    [{"time":"00:00:00.00","value":0},{"time":"11:15:00.00","value":1},{"time":"11:15:00.00","value":"null"},{"time":"15:00:00.00","value":"null"},{"time":"15:00:00.00","value":0}],
        "Mercredi": [{"time":"00:00:00.00","value":0},{"time":"11:15:00.00","value":1},{"time":"11:15:00.00","value":"null"},{"time":"15:00:00.00","value":"null"},{"time":"15:00:00.00","value":0}],
        "Jeudi":    [{"time":"00:00:00.00","value":0},{"time":"11:15:00.00","value":1},{"time":"11:15:00.00","value":"null"},{"time":"15:00:00.00","value":"null"},{"time":"15:00:00.00","value":0}],
        "Vendredi": [{"time":"00:00:00.00","value":0},{"time":"11:15:00.00","value":1},{"time":"11:15:00.00","value":"null"},{"time":"15:00:00.00","value":"null"},{"time":"15:00:00.00","value":0}],
        "Samedi":   [{"time":"00:00:00.00","value":0}],
        "Dimanche": [{"time":"00:00:00.00","value":1}],
    },
    "always_on": {d:[{"time":"00:00:00.00","value":1}] for d in DAY_TO_INDEX},
    "always_off": {d:[{"time":"00:00:00.00","value":0}] for d in DAY_TO_INDEX},
    "open_6_22_weekdays": {
        "Lundi":    [{"time":"00:00:00.00","value":0},{"time":"06:00:00.00","value":1},{"time":"22:00:00.00","value":0}],
        "Mardi":    [{"time":"00:00:00.00","value":0},{"time":"06:00:00.00","value":1},{"time":"22:00:00.00","value":0}],
        "Mercredi": [{"time":"00:00:00.00","value":0},{"time":"06:00:00.00","value":1},{"time":"22:00:00.00","value":0}],
        "Jeudi":    [{"time":"00:00:00.00","value":0},{"time":"06:00:00.00","value":1},{"time":"22:00:00.00","value":0}],
        "Vendredi": [{"time":"00:00:00.00","value":0},{"time":"06:00:00.00","value":1},{"time":"22:00:00.00","value":0}],
        "Samedi":   [{"time":"00:00:00.00","value":0}],
        "Dimanche": [{"time":"00:00:00.00","value":0}],
    },
}

# ===== OUTIL MCP : READ SCHEDULE (LECTURE INDEXÉE PAR JOUR) =====
# Lecture robuste de weeklySchedule[1..7] via ReadPropertyRequest.propertyArrayIndex

from bacpypes3.apdu import ReadPropertyRequest

INDEX_TO_DAY_FR = {
    1: "Lundi",
    2: "Mardi",
    3: "Mercredi",
    4: "Jeudi",
    5: "Vendredi",
    6: "Samedi",
    7: "Dimanche",
}

async def _read_weekly_day_via_index(app_bac, address, object_id, day_index: int):
    """
    Lit weeklySchedule[day_index] via ReadPropertyRequest(propertyArrayIndex=day_index).
    Retourne une liste de {'time': 'HH:MM:SS.xx', 'value': JSON}.
    """
    try:
        req = ReadPropertyRequest(
            objectIdentifier=object_id,
            propertyIdentifier="weeklySchedule",
            propertyArrayIndex=day_index,
        )
        req.pduDestination = address
        ack = await app_bac.request(req)

        # ack.propertyValue.value est généralement un ArrayOf(TimeValue)
        pv = getattr(ack, "propertyValue", None)
        inner = getattr(pv, "value", pv)

        items = []
        try:
            iterable = list(inner)
        except Exception:
            iterable = [inner] if inner is not None else []

        for it in iterable:
            # _coerce_time_value sait lire TimeValue/AnyAtomic et normalise {'time','value'}
            items.append(_coerce_time_value(it))

        # Option : virer les placeholders vides
        if len(items) == 1 and items[0].get("time") == "*" and items[0].get("value") is None:
            return []
        return items

    except BaseException as e:
        # On remonte une erreur lisible pour ce jour précis
        return [{"time": "*", "value": f"[Erreur: {_format_error_details(e)}]"}]
# ===== OUTIL MCP : READ SCHEDULE WEEKLY (SIMPLE) =====
from bacpypes3.apdu import ReadPropertyRequest

# ===== OUTIL MCP : WRITE PRESENT VALUE =====
@mcp.tool
async def write_present_value(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    obj_type: str = "analogValue",
    obj_instance: int = 1,
    value: Any = 24.0,
    priority: int | None = 16,
) -> Dict[str, Any]:
    """
    Écrit presentValue avec gestion Null() pour libération + readback.
    value peut être: nombre, bool, None, ou str ('24.5','true','false','null','release').
    """
    def _parse_value_for_write(v: Any) -> Any:
        if v is None:
            return Null()
        if isinstance(v, Null):
            return v
        if isinstance(v, (int, float, bool)):
            if isinstance(v, float) and (v != v or v in (float("inf"), float("-inf"))):
                raise ValueError("Valeur flottante non valide (NaN/Inf).")
            return v
        if isinstance(v, str):
            s = v.strip().lower()
            if s in {"null", "none", "release"}:
                return Null()
            if s in {"true", "false"}:
                return s == "true"
            try:
                if "." in s or "e" in s:
                    f = float(s)
                    if f != f or f in (float("inf"), float("-inf")):
                        raise ValueError
                    return f
                return int(s)
            except Exception:
                return v
        return v

    obj_type = _normalize_obj_type(obj_type.strip())
    obj_repr = f"{obj_type},{obj_instance}"

    if priority is not None:
        try:
            priority = int(priority)
        except Exception:
            return {"status": "error", "message": "Priority invalide", "details": {"priority": priority}}
        if not (1 <= priority <= 16):
            return {"status": "error", "message": "Priority doit être entre 1 et 16.", "details": {"priority": priority}}

    try:
        app_bac = await get_bacnet_app()
        object_id = ObjectIdentifier(obj_repr)
        address = Address(f"{host.strip()}:{port}")

        val = _parse_value_for_write(value)

        if priority is None:
            await app_bac.write_property(address, object_id, "presentValue", val)
        else:
            await app_bac.write_property(address, object_id, "presentValue", val, priority=priority)

        pv = await app_bac.read_property(address, object_id, "presentValue")
        pa = await app_bac.read_property(address, object_id, "priorityArray")
        rd = await app_bac.read_property(address, object_id, "relinquishDefault")

        return {
            "status": "success",
            "write": {"object": str(object_id), "value_written": bacnet_to_json(val), "priority": priority},
            "readback": {
                "present-value": bacnet_to_json(pv),
                "priority-array": _priority_array_to_dict(pa),
                "relinquish-default": bacnet_to_json(rd),
            },
        }

    except BaseException as e:
        message = f"Échec d'écriture presentValue sur '{obj_repr}'"
        logger.error(f"{message}: {e}", exc_info=True)
        return {"status": "error", "message": message, "details": _format_error_details(e)}

@mcp.tool
async def list_object_properties(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    obj_type: str = "analogValue",
    obj_instance: int = 1
) -> Dict[str, Any]:
    """Liste toutes les propriétés disponibles pour un objet donné."""
    obj_type = _normalize_obj_type(obj_type.strip())
    obj_repr = f"{obj_type},{obj_instance}"
    try:
        app_bac = await get_bacnet_app()
        object_id = ObjectIdentifier(obj_repr)
        address = Address(f"{host.strip()}:{port}")
        result = await app_bac.read_property(address, object_id, "propertyList")
        return {"status": "success", "object": str(object_id), "properties": [str(prop) for prop in result]}
    except BaseException as e:
        message = f"Impossible de lire la liste des propriétés de {obj_repr}"
        logger.error(f"{message}: {e}", exc_info=True)
        return {"status": "error", "message": message, "details": _format_error_details(e)}

@mcp.tool
async def read_object_info(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    obj_type: str = "analogValue",
    obj_instance: int = 1
) -> Dict[str, Any]:
    """Lit les propriétés principales d'un objet (nom, description, unités...)."""
    obj_type = _normalize_obj_type(obj_type.strip())
    obj_repr = f"{obj_type},{obj_instance}"
    try:
        app_bac = await get_bacnet_app()
        object_id = ObjectIdentifier(obj_repr)
        address = Address(f"{host.strip()}:{port}")
        props = ["objectName", "description", "presentValue", "units", "statusFlags"]
        results: Dict[str, Optional[str]] = {}
        for prop in props:
            try:
                value = await app_bac.read_property(address, object_id, prop)
                results[prop] = str(value)
            except Exception:
                results[prop] = "N/A"
        return {"status": "success", "object": str(object_id), "info": results}
    except BaseException as e:
        message = f"Erreur en lisant les informations de {obj_repr}"
        logger.error(f"{message}: {e}", exc_info=True)
        return {"status": "error", "message": message, "details": _format_error_details(e)}

@mcp.tool
async def debug_bacpypes_version() -> Dict[str, Any]:
    """Fournit des informations de diagnostic sur la bibliothèque BACnet."""
    try:
        app_bac = await get_bacnet_app()
        info = {"bacpypes3_version": getattr(bacpypes3, "__version__", "inconnue"), "app_class": str(type(app_bac)), "write_property_signature": str(inspect.signature(app_bac.write_property)),}
        return {"status": "success", "debug_info": info}
    except Exception as e:
        return {"status": "error", "message": "Erreur durant la collecte des informations de debug.", "details": str(e)}

@mcp.tool
async def clear_received_alarms() -> Dict[str, Any]:
    """Vide le buffer local d'alarmes/COV (pour tests)."""
    _received_alarms.clear()
    return {"status": "success", "message": "Buffer d'alarmes vidé."}

@mcp.tool
async def list_nc_recipients(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    nc_instance: int = settings.bacnet.default_nc_instance,
    timeout: float = 5.0,
) -> Dict[str, Any]:
    """Affiche la recipientList de la Notification Class (net/mac lisibles)."""
    try:
        app_bac = await get_bacnet_app()
        remote = Address(f"{host}:{port}")
        rp = ReadPropertyRequest(
            objectIdentifier=("notificationClass", nc_instance),
            propertyIdentifier="recipientList",
        )
        rp.pduDestination = remote
        rsp = await asyncio.wait_for(app_bac.request(rp), timeout=timeout)
        recipients = rsp.propertyValue.cast_out(ArrayOf(Destination)) or []
        pretty = []
        for d in recipients:
            rec = getattr(d, "recipient", None)
            if not rec:
                continue
            dev = getattr(rec, "device", None)
            addr = getattr(rec, "address", None)
            if dev and getattr(dev, "deviceIdentifier", None):
                pretty.append({
                    "type": "device",
                    "deviceIdentifier": _safe_str(dev.deviceIdentifier),
                    "processIdentifier": _safe_str(getattr(d, "processIdentifier", "")),
                    "confirmed": bool(getattr(d, "issueConfirmedNotifications", False)),
                })
            elif addr:
                net = int(getattr(addr, "networkNumber", 0) or 0)
                mac_hex = _mac_to_hex(getattr(addr, "macAddress", None))
                pretty.append({
                    "type": "address",
                    "net": net,
                    "mac": mac_hex,
                    "processIdentifier": _safe_str(getattr(d, "processIdentifier", "")),
                    "confirmed": bool(getattr(d, "issueConfirmedNotifications", False)),
                })
        return {
            "status": "success",
            "host": host, "port": port, "nc_instance": nc_instance,
            "recipients": pretty,
            "raw_count": len(recipients),
        }
    except asyncio.TimeoutError:
        return {"status": "error", "message": f"Timeout ({timeout}s) lecture recipientList."}
    except Exception as e:
        logger.error(f"Erreur list_nc_recipients: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}

# ---- Impl interne pour éviter "FunctionTool is not callable"
async def _subscribe_notifications_class_address_impl(
    host: str,
    port: int,
    nc_instance: int,
    timeout: float = 5.0,
) -> Dict[str, Any]:
    """
    Ajoute CE MCP (via son adresse IP:port local) dans recipientList de la NC donnée.
    Anti-doublon inclus (par processIdentifier).
    """
    try:
        app_bac = await get_bacnet_app()
        remote = Address(f"{host}:{port}")

        # Lire la liste existante
        read_req = ReadPropertyRequest(
            objectIdentifier=("notificationClass", nc_instance),
            propertyIdentifier="recipientList",
        )
        read_req.pduDestination = remote
        read_rsp = await asyncio.wait_for(app_bac.request(read_req), timeout=timeout)
        recipients = read_rsp.propertyValue.cast_out(ArrayOf(Destination)) or []
        logger.info(f"RecipientList actuelle (NC {nc_instance}): {recipients}")

        # Construire destination par adresse = IP:port de NOTRE MCP
        local_addr = Address(f"{settings.bacnet.host}:{settings.bacnet.port}")

        # Garde-fou simple : éviter doublon pour le même processIdentifier
        if any(int(getattr(x, "processIdentifier", 0) or 0) == int(settings.bacnet.device_instance)
               for x in recipients):
            return {"status": "success", "message": f"Déjà présent (processIdentifier={settings.bacnet.device_instance})."}

        new_dest = Destination(
            recipient=Recipient(address=local_addr),
            processIdentifier=Unsigned(int(settings.bacnet.device_instance)),
            issueConfirmedNotifications=False,      # non-confirmé par défaut (plus léger)
            transitions=[True, True, True],         # to-offnormal, to-fault, to-normal
            validDays=[True]*7,                     # tous les jours
            fromTime=(0,0,0,0), toTime=(23,59,59,99),
        )
        recipients.append(new_dest)

        # Écriture
        write_req = WritePropertyRequest(
            objectIdentifier=("notificationClass", nc_instance),
            propertyIdentifier="recipientList",
            propertyValue=ArrayOf(Destination)(recipients),
        )
        write_req.pduDestination = remote
        await asyncio.wait_for(app_bac.request(write_req), timeout=timeout)

        # Vérif
        verify_req = ReadPropertyRequest(
            objectIdentifier=("notificationClass", nc_instance),
            propertyIdentifier="recipientList",
        )
        verify_req.pduDestination = remote
        verify_rsp = await asyncio.wait_for(app_bac.request(verify_req), timeout=timeout)
        verified = verify_rsp.propertyValue.cast_out(ArrayOf(Destination)) or []

        # Présence via PI
        present = any(int(getattr(v, "processIdentifier", 0) or 0) == int(settings.bacnet.device_instance)
                      for v in verified)
        return {
            "status": "success" if present else "error",
            "present": present,
            "verified_len": len(verified),
            "note": f"Ajout via address {local_addr}",
        }
    except asyncio.TimeoutError:
        return {"status": "error", "message": f"Timeout ({timeout}s) lecture/écriture recipientList."}
    except Exception as e:
        logger.error(f"Erreur subscribe_notifications_class_address: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}

@mcp.tool
async def subscribe_notifications_class_address(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    nc_instance: int = settings.bacnet.default_nc_instance,
    timeout: float = 5.0,
) -> Dict[str, Any]:
    """Ajoute CE MCP (IP:port) comme destinataire dans la NC (par défaut: NC=1 de l'automate cible)."""
    return await _subscribe_notifications_class_address_impl(host, port, nc_instance, timeout)

# Alias rétrocompatible (utilise les défauts)
@mcp.tool
async def subscribe_notifications_class(
    nc_instance: int = settings.bacnet.default_nc_instance,
) -> Dict[str, Any]:
    """Alias: ajoute CE MCP à la NC de l'automate cible par défaut."""
    return await _subscribe_notifications_class_address_impl(
        host=settings.bacnet.target_host,
        port=settings.bacnet.target_port,
        nc_instance=nc_instance,
        timeout=5.0,
    )

@mcp.tool
async def dedupe_nc_recipients(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    nc_instance: int = settings.bacnet.default_nc_instance,
    timeout: float = 5.0,
) -> Dict[str, Any]:
    """Supprime les doublons dans recipientList de la NC."""
    try:
        app_bac = await get_bacnet_app()
        remote = Address(f"{host}:{port}")

        # Lire
        rp = ReadPropertyRequest(
            objectIdentifier=("notificationClass", nc_instance),
            propertyIdentifier="recipientList",
        )
        rp.pduDestination = remote
        rsp = await asyncio.wait_for(app_bac.request(rp), timeout=timeout)
        recipients = rsp.propertyValue.cast_out(ArrayOf(Destination)) or []

        # Dédup (on garde le 1er de chaque empreinte)
        seen = set()
        uniques = []
        for d in recipients:
            fp = _recipient_fingerprint(d)
            if fp in seen:
                continue
            seen.add(fp)
            uniques.append(d)

        removed = len(recipients) - len(uniques)
        if removed > 0:
            wp = WritePropertyRequest(
                objectIdentifier=("notificationClass", nc_instance),
                propertyIdentifier="recipientList",
                propertyValue=ArrayOf(Destination)(uniques),
            )
            wp.pduDestination = remote
            await asyncio.wait_for(app_bac.request(wp), timeout=timeout)

        return {"status": "success", "removed": removed, "remaining": len(uniques)}
    except asyncio.TimeoutError:
        return {"status": "error", "message": f"Timeout ({timeout}s) sur lecture/écriture recipientList."}
    except Exception as e:
        logger.error(f"dedupe_nc_recipients error: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}

@mcp.tool
async def acknowledge_alarm(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    event_object_identifier: str = "binaryValue,2",
    state_to_ack: str = "offnormal",
    timestamp_kind: str = "dateTime",
    timestamp_value: str = "2025-08-23 Sat 15:23:32.75",
    ack_message: str = "Acquitté par MCP",
    timeout: float = 5.0,
) -> Dict[str, Any]:
    """Acquitte une alarme en donnant les infos manuelles (support du format avec jour et fractions)."""
    try:
        app_bac = await get_bacnet_app()
        remote = Address(f"{host}:{port}")
        obj_id = ObjectIdentifier(event_object_identifier)

        ts: Optional[TimeStamp] = None
        if timestamp_kind == "dateTime":
            dt = None
            # Formats supportés, y compris avec jour en anglais (Sat) et fractions (.75)
            possible_formats = [
                "%Y-%m-%d %H:%M:%S.%f",
                "%Y-%m-%d %H:%M:%S",
                "%d/%m/%Y %H:%M:%S",
                "%d/%m/%y %H:%M:%S",
                "%Y-%m-%d %a %H:%M:%S.%f",  # <-- gère "2025-08-23 Sat 15:23:32.75"
                "%Y-%m-%d %a %H:%M:%S",     # <-- gère "2025-08-23 Sat 15:23:32"
            ]
            for fmt in possible_formats:
                try:
                    dt = datetime.strptime(timestamp_value, fmt)
                    break
                except Exception:
                    continue
            if dt is not None:
                ts = TimeStamp(dateTime=dt)

        elif timestamp_kind == "sequenceNumber":
            try:
                ts = TimeStamp(sequenceNumber=int(timestamp_value))
            except Exception:
                ts = None

        if ts is None:
            return {"status": "error", "message": f"Timestamp non valide: {timestamp_kind} {timestamp_value}"}

        req = AcknowledgeAlarmRequest(
            acknowledgingProcessIdentifier=settings.bacnet.device_instance,
            eventObjectIdentifier=obj_id,
            eventStateAcknowledged=state_to_ack,
            timeStamp=ts,
            acknowledgmentSource=ack_message,
            timeOfAcknowledgment=TimeStamp(dateTime=datetime.now()),
        )
        req.pduDestination = remote
        await asyncio.wait_for(app_bac.request(req), timeout=timeout)

        return {"status": "success", "message": f"Alarme acquittée {event_object_identifier}"}
    except asyncio.TimeoutError:
        return {"status": "error", "message": f"Timeout ({timeout}s) sur l'acquittement."}
    except Exception as e:
        logger.error(f"Erreur acknowledge_alarm: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}

# ===== OUTIL MCP : READ SCHEDULE WEEKLY (ROBUSTE) =====
from bacpypes3.apdu import ReadPropertyRequest

def _tv_to_pair(tv: Any) -> Dict[str, Any]:
    """
    Décode un TimeValue -> {'time': 'HH:MM:SS.xx', 'value': ...}
    avec normalisation: "0"/"1" -> 0/1, [] -> None.
    """
    # 1) cast_out() quand dispo (le plus fiable)
    try:
        if hasattr(tv, "cast_out"):
            t, v = tv.cast_out()  # (Time, AnyAtomic/primitive)
            val = bacnet_to_json(v)
            # normalisation
            if val == []:
                val = None
            else:
                val = _coerce_scalar(val)  # "0"/"1"/"true"/"3.5" -> types natifs
            return {"time": str(t), "value": val}
    except Exception:
        pass

    # 2) fallback sur attributs
    t_raw = getattr(tv, "time", None)
    t_raw = t_raw() if callable(t_raw) else t_raw
    v_raw = getattr(tv, "value", None)
    v_raw = v_raw() if callable(v_raw) else v_raw

    val = bacnet_to_json(v_raw)
    if val == []:
        val = None
    else:
        val = _coerce_scalar(val)

    return {"time": str(t_raw) if t_raw is not None else "*", "value": val}


# (la fonction suivante commence ici, sur une NOUVELLE ligne)

def _weekly_to_days(weekly_raw: Any) -> List[Any]:
    """
    Extrait la liste des 7 'daily' à partir de weeklySchedule brut.
    weekly_raw peut être:
      - une liste/tuple de longueur 7
      - un objet avec .elements/.value/.cast_out renvoyant une séquence
    """
    # déjà séquence
    if isinstance(weekly_raw, (list, tuple)):
        return list(weekly_raw)

    # attributs classiques
    for attr in ("elements", "value"):
        if hasattr(weekly_raw, attr):
            try:
                val = getattr(weekly_raw, attr)
                val = val() if callable(val) else val
                if isinstance(val, (list, tuple)):
                    return list(val)
                try:
                    return list(val)
                except Exception:
                    pass
            except Exception:
                pass

    # cast_out global
    try:
        if hasattr(weekly_raw, "cast_out"):
            out = weekly_raw.cast_out()
            if isinstance(out, (list, tuple)):
                return list(out)
            try:
                return list(out)
            except Exception:
                pass
    except Exception:
        pass

    # itérable ?
    try:
        return list(weekly_raw)
    except Exception:
        pass

    return []
# --- Helpers pour déplier weeklySchedule ---

def _daily_to_timevalues(daily: Any) -> List[Any]:
    """
    Retourne la liste brute de TimeValue pour un jour.
    'daily' peut être:
      - list/tuple/ArrayOf(TimeValue)
      - objet avec .daySchedule / .listOfTimeValues / .elements / .value
      - objet dont .cast_out() renvoie une séquence
    """
    # Déjà une séquence ?
    if isinstance(daily, (list, tuple)):
        return list(daily)

    # Attributs courants
    for attr in ("daySchedule", "listOfTimeValues", "elements", "value"):
        if hasattr(daily, attr):
            try:
                val = getattr(daily, attr)
                val = val() if callable(val) else val
                if isinstance(val, (list, tuple)):
                    return list(val)
                try:
                    return list(val)  # ArrayOf-like
                except Exception:
                    pass
            except Exception:
                pass

    # Parfois .cast_out() renvoie directement une séquence
    try:
        if hasattr(daily, "cast_out"):
            out = daily.cast_out()
            if isinstance(out, (list, tuple)):
                return list(out)
            try:
                return list(out)
            except Exception:
                pass
    except Exception:
        pass

    # Dernier recours : itérable ?
    try:
        return list(daily)
    except Exception:
        pass

    return []


def _weekly_to_days(weekly_raw: Any) -> List[Any]:
    """
    Extrait la liste des 7 'daily' à partir du weeklySchedule brut.
    'weekly_raw' peut être:
      - list/tuple de 7 éléments
      - objet avec .elements / .value
      - objet dont .cast_out() renvoie une séquence
    """
    if isinstance(weekly_raw, (list, tuple)):
        return list(weekly_raw)

    for attr in ("elements", "value"):
        if hasattr(weekly_raw, attr):
            try:
                val = getattr(weekly_raw, attr)
                val = val() if callable(val) else val
                if isinstance(val, (list, tuple)):
                    return list(val)
                try:
                    return list(val)
                except Exception:
                    pass
            except Exception:
                pass

    try:
        if hasattr(weekly_raw, "cast_out"):
            out = weekly_raw.cast_out()
            if isinstance(out, (list, tuple)):
                return list(out)
            try:
                return list(out)
            except Exception:
                pass
    except Exception:
        pass

    try:
        return list(weekly_raw)
    except Exception:
        pass

    return []

# ===== WRITE WEEKLY SCHEDULE — TOUTES VARIANTES + DIAGNOSTIC DÉTAILLÉ =====
from typing import Any, Dict, List, Optional
import inspect, traceback

from bacpypes3.pdu import Address
from bacpypes3.apdu import ReadPropertyRequest, WritePropertyRequest
from bacpypes3.primitivedata import ObjectIdentifier, Time, Null, Boolean, Integer, Real, CharacterString
from bacpypes3.basetypes import TimeValue, DailySchedule
from bacpypes3.constructeddata import Any as CAny
try:
    from bacpypes3.constructeddata import AnyAtomic
except Exception:
    class AnyAtomic:
        def __init__(self, v): self.value = v

try:
    from bacpypes3.basetypes import BinaryPV
    _WST_HAS_BINARY_PV = True
except Exception:
    BinaryPV = None
    _WST_HAS_BINARY_PV = False

_WST_DAY_ORDER = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
_WST_DAY_TO_INDEX = {d: i + 1 for i, d in enumerate(_WST_DAY_ORDER)}

# ---------- utils parsing ----------
def _wst_strip_quotes(s) -> str:
    return "" if s is None else str(s).strip().strip(' "\'\u201C\u201D\u2018\u2019')

def _wst_parse_time(t: str) -> Time:
    s = _wst_strip_quotes(t)
    parts = [_wst_strip_quotes(p) for p in s.split(":")]
    if len(parts) < 2:
        raise ValueError(f"Heure invalide '{t}' (attendu HH:MM[,SS[.cc]])")

    h = int(parts[0])
    m = int(parts[1])
    sec = 0
    hund = 0  # hundredths (0..99)

    if len(parts) >= 3:
        secpart = parts[2]
        if "." in secpart:
            ss, scc = secpart.split(".", 1)
            sec = int(ss or 0)
            hund = int((scc + "00")[:2])  # max 2 digits
        else:
            sec = int(secpart or 0)

    if not (0 <= h <= 23 and 0 <= m <= 59 and 0 <= sec <= 59 and 0 <= hund <= 99):
        raise ValueError(f"Heure hors bornes: '{t}'")

    # ✅ bacpypes3.Time attend UN SEUL argument: un tuple (h, m, s, hund)
    return Time((h, m, sec, hund))

def _wst_token_to_primitive(tok: Optional[str], allow_null: bool):
    """
    Convertit la valeur texte en *atome BACpypes* (pas bool/int Python).
    """
    if tok is None:
        return None
    s = _wst_strip_quotes(tok)
    if s == "":
        return None
    sl = s.lower()

    # null / release
    if sl in {"null", "none", "release"}:
        return Null() if allow_null else None

    # on/off -> instancier BinaryPV ou retomber sur Boolean
    if sl in {"on", "off"}:
        try:
            from bacpypes3.basetypes import BinaryPV  # import local pour éviter clash
            return BinaryPV("active" if sl == "on" else "inactive")  # ✅ instance Atomic
        except Exception:
            from bacpypes3.primitivedata import Boolean
            return Boolean(sl == "on")  # ✅ instance Atomic

    # true/false -> Boolean BACpypes
    if sl in {"true", "false"}:
        from bacpypes3.primitivedata import Boolean
        return Boolean(sl == "true")  # ✅ instance Atomic

    # nombres -> Integer/Real BACpypes
    from bacpypes3.primitivedata import Integer, Real, CharacterString
    try:
        if "." in s or "e" in sl:
            return Real(float(s))        # ✅ instance Atomic
        return Integer(int(s))           # ✅ instance Atomic
    except Exception:
        return CharacterString(s)        # ✅ instance Atomic

def _wst_build_day_variants(day_text: Optional[str], allow_null: bool) -> List[DailySchedule]:
    """
    Construit deux variantes:
      - ds_prim : TimeValue(time=<Time>, value=<primitive/BinaryPV/Null>)
      - ds_any  : TimeValue(time=<Time>, value=AnyAtomic(<primitive/...>))
    ⚠️ IMPORTANT: utiliser des kwargs pour TimeValue (pas de positionnels).
    """
    text = _wst_strip_quotes(day_text)
    tvs_prim: List[TimeValue] = []
    tvs_any: List[TimeValue]  = []
    if text:
        for evt in text.split(";"):
            evt = _wst_strip_quotes(evt)
            if not evt:
                continue
            if "," in evt:
                t_str, v_str = evt.split(",", 1)
            elif "=" in evt:
                t_str, v_str = evt.split("=", 1)
            else:
                raise ValueError(f"Événement invalide '{evt}' (attendu HH:MM,val)")
            t = _wst_parse_time(t_str)
            prim = _wst_token_to_primitive(v_str, allow_null=allow_null)
            if prim is None:
                continue
            # ✅ kwargs obligatoires avec cette version de bacpypes3
            tvs_prim.append(TimeValue(time=t, value=prim))
            tvs_any.append(TimeValue(time=t, value=AnyAtomic(prim)))
    return [DailySchedule(daySchedule=tvs_prim), DailySchedule(daySchedule=tvs_any)]

# ---------- readback ----------
def _wst_val_to_json(v: Any):
    try:
        from bacpypes3.constructeddata import Any as _CAny
    except Exception:
        class _CAny: ...
    if v is None or isinstance(v, (bool, int, float, str)):
        return v
    try:
        if isinstance(v, _CAny):
            inner = getattr(v, "value", None)
            if inner is not None and inner is not v:
                return _wst_val_to_json(inner)
            for cls in (Boolean, Integer, Real):
                try:
                    return v.cast_out(cls)
                except Exception:
                    pass
            return str(v)
    except Exception:
        pass
    try:
        return v.cast_out()
    except TypeError:
        for cls in (Boolean, Integer, Real):
            try:
                return v.cast_out(cls)
            except Exception:
                continue
        return str(v)
    except Exception:
        pass
    for attr in ("value", "presentValue"):
        if hasattr(v, attr):
            try:
                vv = getattr(v, attr)
                vv = vv() if callable(vv) else vv
                return _wst_val_to_json(vv)
            except Exception:
                continue
    return str(v)

async def _wst_read_day_clean(app_bac, address: Address, sched_oid, day_index: int) -> List[Dict[str, Any]]:
    """
    Readback normalisé d'un jour: liste de {time, value}.
    Gère le cas où weeklySchedule[i] renvoie un DailySchedule avec .daySchedule.
    """
    req = ReadPropertyRequest(
        objectIdentifier=sched_oid,
        propertyIdentifier="weeklySchedule",
        propertyArrayIndex=day_index,
    )
    req.pduDestination = address
    ack = await app_bac.request(req)

    # extraire la valeur
    pv = getattr(ack, "propertyValue", None)
    val = getattr(pv, "value", pv)

    # si val est encapsulé (constructeddata.Any), sortir l'intérieur
    try:
        from bacpypes3.constructeddata import Any as CAny
        if isinstance(val, CAny):
            val = getattr(val, "value", val)
    except Exception:
        pass

    # récupérer la séquence de TimeValue
    tv_list = []
    try:
        from bacpypes3.basetypes import DailySchedule
        if isinstance(val, DailySchedule):
            seq = getattr(val, "daySchedule", None)
            if seq is not None:
                try:
                    tv_list = list(seq)
                except Exception:
                    tv_list = []
        else:
            # certaines piles renvoient directement une séquence de TimeValue
            tv_list = list(val) if val is not None else []
    except Exception:
        tv_list = []

    out: List[Dict[str, Any]] = []
    for tv in tv_list:
        try:
            t_obj = getattr(tv, "time", None)
            v_obj = getattr(tv, "value", None)
            t_str = str(t_obj) if t_obj is not None else "*"
            v_json = _wst_val_to_json(v_obj)
            out.append({"time": t_str, "value": v_json})
        except Exception as e:
            out.append({"time": "*", "value": f"[{type(e).__name__}: {e}]"})
    return out

# ---------- écriture (toutes variantes + trace) ----------
def _sig_kwargs_write_property(app_bac) -> Dict[str, bool]:
    kw = {"array_index": False, "property_array_index": False, "propertyArrayIndex": False, "arrayIndex": False, "index": False}
    try:
        sig = inspect.signature(app_bac.write_property)
        for name in kw.keys():
            if name in sig.parameters:
                kw[name] = True
    except Exception:
        kw = {k: True for k in kw}
    return kw

async def _write_weekly_day_try_all(app_bac, address: Address, sched_oid, idx: int, ds_variants: List[DailySchedule]) -> str:
    """
    Essaie dans cet ordre, en accumulant une trace détaillée en cas d'échec :
      A) write_property(..., value=ds_prim,   index=idx) avec toutes variantes d'index
      B) write_property(..., value=CAny(ds_prim), index=idx)
      C) write_property(..., value=ds_any,    index=idx)
      D) write_property(..., value=CAny(ds_any),  index=idx)
      E) APDU WritePropertyRequest(propertyValue = ds_prim)
      F) APDU WritePropertyRequest(propertyValue = CAny(ds_prim))
      G) APDU WritePropertyRequest(propertyValue = ds_any)
      H) APDU WritePropertyRequest(propertyValue = CAny(ds_any))
    Renvoie un label de la variante gagnante ou lève une Exception avec la trace concaténée.
    """
    trace = []
    accepted = _sig_kwargs_write_property(app_bac)

    def _push(errlabel: str):
        tb = traceback.format_exc()
        trace.append(errlabel + " :: " + tb.strip())

    # unpack variants
    ds_prim, ds_any = (ds_variants + [None, None])[:2]

    # helpers pour write_property
    async def _try_wp(val, tag: str):
        for key in ["array_index", "property_array_index", "propertyArrayIndex", "arrayIndex", "index"]:
            if not accepted.get(key, True):
                continue
            try:
                await app_bac.write_property(address, sched_oid, "weeklySchedule", val, **{key: idx})
                return f"write_property[{key}]/{tag}"
            except Exception:
                _push(f"wp {key}/{tag}")
        return None

    # A/B/C/D
    for val, tag in ((ds_prim, "raw-prim"), (CAny(ds_prim), "CAny-prim"),
                     (ds_any, "raw-any"), (CAny(ds_any), "CAny-any")):
        if val is None:
            pass
        ok = await _try_wp(val, tag)
        if ok:
            return ok

    # E/F/G/H : APDU direct
    for val, tag in ((ds_prim, "WPR raw-prim"), (CAny(ds_prim), "WPR CAny-prim"),
                     (ds_any, "WPR raw-any"), (CAny(ds_any), "WPR CAny-any")):
        if val is None:
            pass
        try:
            req = WritePropertyRequest(
                objectIdentifier=sched_oid,
                propertyIdentifier="weeklySchedule",
                propertyArrayIndex=idx,
                propertyValue=val,
            )
            req.pduDestination = address
            await app_bac.request(req)
            return tag
        except Exception:
            _push(tag)

    raise TypeError("All write attempts failed:\n" + "\n".join(trace))

# ---------- TOOL principal ----------
@mcp.tool
async def write_weekly_schedule_text(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    obj_instance: int = 1,
    lundi: str = "",
    mardi: str = "",
    mercredi: str = "",
    jeudi: str = "",
    vendredi: str = "",
    samedi: str = "",
    dimanche: str = "",
    allow_null: bool = False,
    clear_missing_days: bool = False,
) -> Dict[str, Any]:
    """
    Écrit weeklySchedule[jour] depuis 'HH:MM,val;...'.
    - Ignore les jours vides (sauf si clear_missing_days=True -> vide le jour).
    - Essaie toutes les combinaisons d'encapsulage (prim/AnyAtomic, CAny ou non) et d'index.
    - Renvoie la variante gagnante ou la trace détaillée de tous les essais échoués.
    """
    try:
        app_bac = await get_bacnet_app()
        address = Address(f"{host.strip()}:{port}")
        sched_oid = ObjectIdentifier(f"schedule,{int(obj_instance)}")

        inputs = {
            "lundi": lundi, "mardi": mardi, "mercredi": mercredi, "jeudi": jeudi,
            "vendredi": vendredi, "samedi": samedi, "dimanche": dimanche,
        }

        report: Dict[str, Any] = {}
        for dname in _WST_DAY_ORDER:
            idx = _WST_DAY_TO_INDEX[dname]
            dtext = (inputs[dname] or "").strip()
            try:
                if not dtext and not clear_missing_days:
                    report[dname] = {"status": "skipped", "reason": "empty_input"}
                    continue

                ds_variants = _wst_build_day_variants(dtext, allow_null=allow_null)

                api_used = await _write_weekly_day_try_all(app_bac, address, sched_oid, idx, ds_variants)

                rb = await _wst_read_day_clean(app_bac, address, sched_oid, idx)
                report[dname] = {"status": "ok", "api": api_used, "count": len(rb), "entries": rb}

            except BaseException as e:
                # renvoyer exception + stack pour diagnostic
                report[dname] = {
                    "status": "error",
                    "details": f"{type(e).__name__}: {e}",
                    "trace": traceback.format_exc().splitlines()[-10:],  # dernières lignes utiles
                }

        return {"status": "success", "object": str(sched_oid), "writeReport": report}

    except BaseException as e:
        msg = f"Échec écriture weeklySchedule sur 'schedule,{obj_instance}'"
        logger.error(f"{msg}: {e}", exc_info=True)
        return {"status": "error", "message": msg, "details": f"{type(e).__name__}: {e}"}

# ===== OUTIL MCP : READ SCHEDULE (weekly + exceptionSchedule + meta lisibles) =====
from typing import Any, Dict, List, Optional

from bacpypes3.pdu import Address
from bacpypes3.apdu import ReadPropertyRequest
from bacpypes3.primitivedata import ObjectIdentifier

# Compat: si certaines classes n'existent pas dans ta version, on stub
try:
    from bacpypes3.basetypes import DailySchedule, TimeValue, DateRange
except Exception:
    class DailySchedule: ...
    class TimeValue: ...
    class DateRange: ...

# Jours FR
_SCH_DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

# ---------- Helpers de décodage ----------

def _sch_enum_to_name(v: Any) -> Any:
    """Enum → libellé lisible si possible."""
    for attr in ("get_long_name", "get_name", "name"):
        if hasattr(v, attr):
            try:
                val = getattr(v, attr)
                return val() if callable(val) else str(val)
            except Exception:
                pass
    return str(v)

def _sch_any_to_inner(v: Any) -> Any:
    """
    Si v est constructeddata.Any / AnyAtomic et que .value est accessible, renvoie l'intérieur.
    Sinon renvoie v tel quel.
    """
    try:
        from bacpypes3.constructeddata import Any as CAny
        if isinstance(v, CAny):
            inner = getattr(v, "value", None)
            if inner is not None and inner is not v:
                return inner
    except Exception:
        pass
    try:
        from bacpypes3.constructeddata import AnyAtomic
        if isinstance(v, AnyAtomic):
            inner = getattr(v, "value", None)
            if inner is not None and inner is not v:
                return inner
    except Exception:
        pass
    return v

def _sch_cast_anyatomic(v: Any) -> Any:
    """
    Si v est Any/AnyAtomic : essaie des cast_out vers types BACpypes usuels.
    Renvoie un JSON simple si possible, sinon None pour poursuivre ailleurs.
    """
    try:
        from bacpypes3.constructeddata import Any as CAny, AnyAtomic
        from bacpypes3.primitivedata import Boolean, Integer, Unsigned, Real, CharacterString, Null, Enumerated, BitString
        # Double peut ne pas exister selon versions ; on l'importe à part
        try:
            from bacpypes3.primitivedata import Double
            _HAS_DOUBLE = True
        except Exception:
            Double = None
            _HAS_DOUBLE = False
    except Exception:
        return str(v)

    if not isinstance(v, (CAny, AnyAtomic)):
        return None

    # 1) primitives (⚠️ Null -> None JSON)
    prim_classes = [Boolean, Integer, Unsigned, Real]
    if 'Double' in locals() and Double is not None:
        prim_classes.append(Double)  # type: ignore
    prim_classes += [CharacterString, Null]
    for cls in prim_classes:
        try:
            out = v.cast_out(cls)  # type: ignore
            if cls is Null:        # Null -> None JSON
                return None
            return out
        except Exception:
            pass

    # 2) Enumerated (ex. BinaryPV -> "active"/"inactive")
    try:
        enum_val = v.cast_out(Enumerated)
        try:
            return _sch_enum_to_name(enum_val)
        except Exception:
            try:
                return int(enum_val)
            except Exception:
                return str(enum_val)
    except Exception:
        pass

    # 3) BitString
    try:
        bs = v.cast_out(BitString)
        try:
            return [bool(b) for b in list(bs)]
        except Exception:
            return str(bs)
    except Exception:
        pass

    # 4) Dernier recours: .value ou str
    inner = getattr(v, "value", None)
    if inner is not None and inner is not v:
        return _sch_val_to_json(inner)
    return str(v)

def _sch_val_to_json(v: Any) -> Any:
    """
    Convertit valeurs BACpypes (incl. Any/AnyAtomic, Enum, BitString, DateRange) en JSON lisible.
    + Coercition des chaînes numériques ("0"/"1"/"3.5") vers int/float.
    """
    # Déballer un niveau (si .value direct)
    v = _sch_any_to_inner(v)

    # Directement JSON
    if v is None or isinstance(v, (bool, int, float)):
        return v
    if isinstance(v, str):
        s = v.strip()
        if s.isdigit():
            return int(s)
        try:
            return float(s) if ("." in s or "e" in s.lower()) else s
        except Exception:
            return s

    # Any/AnyAtomic → essais de cast
    casted = _sch_cast_anyatomic(v)
    if casted is not None:
        return _sch_val_to_json(casted)

    # Enumerated "nu"
    try:
        from bacpypes3.primitivedata import Enumerated
        if isinstance(v, Enumerated):
            try:
                return _sch_enum_to_name(v)
            except Exception:
                try:
                    return int(v)
                except Exception:
                    return str(v)
    except Exception:
        pass

    # BitString "nu"
    try:
        from bacpypes3.primitivedata import BitString
        if isinstance(v, BitString):
            try:
                return [bool(b) for b in list(v)]
            except Exception:
                return str(v)
    except Exception:
        pass

    # DateRange → dict
    if isinstance(v, DateRange):
        try:
            sd = getattr(v, "startDate", None)
            ed = getattr(v, "endDate", None)
            def _iso(d):
                if not d: return {"year":"*","month":"*","day":"*","weekday":"*"}
                return {
                    "year": str(getattr(d, "year", "*")),
                    "month": str(getattr(d, "month", "*")),
                    "day": str(getattr(d, "day", "*")),
                    "weekday": str(getattr(d, "weekday", "*")),
                }
            return {"startDate": _iso(sd), "endDate": _iso(ed)}
        except Exception:
            return {"raw": str(v)}

    # Séquences / mappings
    if isinstance(v, (list, tuple)):
        return [_sch_val_to_json(x) for x in v]
    if isinstance(v, dict):
        return {str(k): _sch_val_to_json(val) for k, val in v.items()}

    # Dernier recours
    return str(v)

def _sch_tv_to_dict(tv: Any) -> Dict[str, Any]:
    """TimeValue -> {time, value}."""
    try:
        t_obj = getattr(tv, "time", None)
        v_obj = getattr(tv, "value", None)
        t_str = str(t_obj) if t_obj is not None else "*"
        return {"time": t_str, "value": _sch_val_to_json(v_obj)}
    except Exception as e:
        return {"time": "*", "value": f"[{type(e).__name__}: {e}]"}

# ---------- Helpers calendrier & périodes ----------

def _sch_is_all_wildcards(dr: Any) -> bool:
    try:
        sd = getattr(dr, "startDate", None)
        ed = getattr(dr, "endDate", None)
        def _is_star(d):
            if not d: 
                return True
            return str(getattr(d, "year", "*")) == "*" \
               and str(getattr(d, "month", "*")) == "*" \
               and str(getattr(d, "day", "*")) == "*" \
               and str(getattr(d, "weekday", "*")) == "*"
        return _is_star(sd) and _is_star(ed)
    except Exception:
        return False

def _sch_iso_dateobj(d: Any) -> str:
    try:
        y = getattr(d, "year", "*"); m = getattr(d, "month", "*"); day = getattr(d, "day", "*")
        if str(y) == "*" or str(m) == "*" or str(day) == "*":
            return f"{y}-{m}-{day}"
        return f"{int(y):04d}-{int(m):02d}-{int(day):02d}"
    except Exception:
        return str(d)

def _sch_humanize_weeknday(wn: Any) -> str:
    """Affichage compact d'un motif WeekNDay."""
    try:
        mo = getattr(wn, "month", "*")
        wom = getattr(wn, "weekOfMonth", "*")
        dow = getattr(wn, "dayOfWeek", "*")
        return f"WeekNDay(month={mo}, week={wom}, dow={dow})"
    except Exception:
        return str(wn)

async def _sch_try_read_object_name(app_bac, address, oid_like) -> Optional[str]:
    """
    Lit objectName d'un objet (souvent Calendar) référencé dans un événement spécial.
    oid_like peut être un ObjectIdentifier, une chaîne "calendar,5", ou un objet contenant objectIdentifier.
    """
    try:
        from bacpypes3.primitivedata import ObjectIdentifier as OID
    except Exception:
        OID = None  # type: ignore

    obj_id = None
    try:
        from bacpypes3.primitivedata import ObjectIdentifier as _OID
        if isinstance(oid_like, _OID):
            obj_id = oid_like
    except Exception:
        pass
    if obj_id is None:
        # champs possibles contenant l'OID
        for attr in ("objectIdentifier", "calendarObjectIdentifier", "calendarIdentifier", "calendarObject"):
            if hasattr(oid_like, attr):
                try:
                    val = getattr(oid_like, attr)
                    val = val() if callable(val) else val
                    if val:
                        obj_id = val
                        break
                except Exception:
                    pass
        if obj_id is None and hasattr(oid_like, "calendarReference"):
            try:
                cref = getattr(oid_like, "calendarReference")
                cref = cref() if callable(cref) else cref
                if hasattr(cref, "objectIdentifier"):
                    obj_id = getattr(cref, "objectIdentifier")
            except Exception:
                pass
    if obj_id is None and isinstance(oid_like, str):
        try:
            from bacpypes3.primitivedata import ObjectIdentifier as _OID2
            obj_id = _OID2(oid_like)
        except Exception:
            obj_id = None

    if obj_id is None:
        return None

    try:
        name = await app_bac.read_property(address, obj_id, "objectName")
        return _sch_val_to_json(name) if name is not None else None
    except Exception:
        return None

# ---------- Lecture weekly ----------

async def _sch_read_weekly_day(app_bac, address: Address, sched_oid, day_index: int) -> List[Dict[str, Any]]:
    """
    Lit weeklySchedule[day_index] — gère DailySchedule.daySchedule et séquence directe.
    """
    req = ReadPropertyRequest(
        objectIdentifier=sched_oid,
        propertyIdentifier="weeklySchedule",
        propertyArrayIndex=day_index,
    )
    req.pduDestination = address
    ack = await app_bac.request(req)

    pv = getattr(ack, "propertyValue", None)
    val = getattr(pv, "value", pv)
    val = _sch_any_to_inner(val)

    # Si DailySchedule → .daySchedule
    if isinstance(val, DailySchedule):
        seq = getattr(val, "daySchedule", None)
        try:
            tvs = list(seq) if seq is not None else []
        except Exception:
            tvs = []
    else:
        # Certaines piles renvoient directement une séquence de TimeValue
        try:
            tvs = list(val) if val is not None else []
        except Exception:
            tvs = []

    return [_sch_tv_to_dict(tv) for tv in tvs]

async def _sch_read_weekly_all(app_bac, address: Address, sched_oid) -> Dict[str, List[Dict[str, Any]]]:
    """Essaie d'abord par index 1..7, sinon lecture globale et dispatch."""
    out: Dict[str, List[Dict[str, Any]]] = {d: [] for d in _SCH_DAY_NAMES}

    # 1) Lecture par index 1..7
    try:
        got_any = False
        for idx, day in enumerate(_SCH_DAY_NAMES, start=1):
            items = await _sch_read_weekly_day(app_bac, address, sched_oid, idx)
            if items:
                got_any = True
            out[day] = items
        if got_any:
            return out
    except Exception:
        pass

    # 2) Lecture globale (sans index)
    try:
        val = await app_bac.read_property(address, sched_oid, "weeklySchedule")
        val = _sch_any_to_inner(val)
        seq = list(val) if isinstance(val, (list, tuple)) else list(val or [])
        for i, day in enumerate(_SCH_DAY_NAMES):
            try:
                ds = seq[i]
            except Exception:
                out[day] = []
                continue
            if isinstance(ds, DailySchedule):
                try:
                    tvs = list(getattr(ds, "daySchedule", []))
                except Exception:
                    tvs = []
            else:
                try:
                    tvs = list(ds or [])
                except Exception:
                    tvs = []
            out[day] = [_sch_tv_to_dict(tv) for tv in tvs]
    except Exception:
        pass

    return out

# ---------- Lecture exceptionSchedule (événements spéciaux) ----------

async def _sch_read_exception_schedule(app_bac, address: Address, sched_oid) -> List[Dict[str, Any]]:
    """
    Lit exceptionSchedule (liste de SpecialEvent) avec résolution du nom du calendrier référencé
    et humanisation de calendarEntry (date / dateRange / weekNDay / référence calendrier).
    """
    out: List[Dict[str, Any]] = []
    try:
        val = await app_bac.read_property(address, sched_oid, "exceptionSchedule")
    except Exception:
        return out

    val = _sch_any_to_inner(val)
    try:
        seq = list(val) if isinstance(val, (list, tuple)) else list(val or [])
    except Exception:
        seq = []

    for ent in seq:
        if ent is None:
            continue

        # priority
        try:
            prio = getattr(ent, "priority", None)
            prio = prio() if callable(prio) else prio
        except Exception:
            prio = None

        # calendarEntry / period
        cal = None
        for attr in ("calendarEntry", "period", "CalendarEntry", "Period"):
            if hasattr(ent, attr):
                try:
                    cal = getattr(ent, attr)
                    cal = cal() if callable(cal) else cal
                    break
                except Exception:
                    pass

        # Humanisation du "calendarEntry"
        cal_info: Dict[str, Any] = {}
        cal_inner = _sch_any_to_inner(cal)

        try:
            # (a) date unique
            if hasattr(cal_inner, "date"):
                d = getattr(cal_inner, "date")
                cal_info = {"kind": "date", "label": _sch_iso_dateobj(d)}

            # (b) plage de dates
            elif hasattr(cal_inner, "dateRange"):
                dr = getattr(cal_inner, "dateRange")
                s = getattr(dr, "startDate", None)
                e = getattr(dr, "endDate", None)
                cal_info = {
                    "kind": "dateRange",
                    "start": _sch_iso_dateobj(s),
                    "end": _sch_iso_dateobj(e),
                    "label": f"{_sch_iso_dateobj(s)} → {_sch_iso_dateobj(e)}",
                }

            # (c) motif semaine/jour
            elif hasattr(cal_inner, "weekNDay"):
                wn = getattr(cal_inner, "weekNDay")
                cal_info = {"kind": "weekNDay", "label": _sch_humanize_weeknday(wn)}

            # (d) référence calendrier (ObjectIdentifier / DeviceObjectReference…)
            else:
                oid_cand = None
                for attr in ("objectIdentifier", "calendarObjectIdentifier", "calendarObject", "calendarReference"):
                    if hasattr(cal_inner, attr):
                        try:
                            oid_cand = getattr(cal_inner, attr)
                            oid_cand = oid_cand() if callable(oid_cand) else oid_cand
                            if oid_cand:
                                break
                        except Exception:
                            pass
                if oid_cand is not None:
                    name = await _sch_try_read_object_name(app_bac, address, oid_cand)
                    cal_info = {
                        "kind": "calendar-ref",
                        "objectIdentifier": str(oid_cand),
                        "calendarName": name or None,
                        "label": name or str(oid_cand),
                    }
                else:
                    cal_info = {"kind": "unknown", "label": _sch_val_to_json(cal_inner)}
        except Exception:
            cal_info = {"kind": "unknown", "label": _sch_val_to_json(cal_inner)}

        # actions (liste de TimeValue)
        actions: List[Dict[str, Any]] = []
        actions_raw = None
        for attr in ("listOfTimeValues", "timeValues", "actions"):
            if hasattr(ent, attr):
                try:
                    actions_raw = getattr(ent, attr)
                    actions_raw = actions_raw() if callable(actions_raw) else actions_raw
                    break
                except Exception:
                    pass
        try:
            for tv in (list(actions_raw) if isinstance(actions_raw, (list, tuple)) else list(actions_raw or [])):
                actions.append(_sch_tv_to_dict(tv))
        except Exception:
            pass

        out.append({
            "priority": _sch_val_to_json(prio) if prio is not None else "N/A",
            "calendar": cal_info,              # <-- lisible: label, type, nom de calendrier s'il y a
            "actions": actions,
        })
    return out

# ---------- TOOL principal ----------

@mcp.tool
async def read_schedule(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    obj_instance: int = 1,
) -> Dict[str, Any]:
    """
    Lecture complète d'un objet Schedule:
      - weeklySchedule (par jours) {time,value}
      - exceptionSchedule (événements spéciaux, avec nom du calendrier/label)
      - presentValue, scheduleDefault, effectivePeriod (+ effectivePeriodLabel), objectName, targets
    """
    try:
        app_bac = await get_bacnet_app()
        address = Address(f"{host.strip()}:{port}")
        sched_oid = ObjectIdentifier(f"schedule,{int(obj_instance)}")

        # Métadonnées
        try:
            object_name = await app_bac.read_property(address, sched_oid, "objectName")
        except Exception:
            object_name = None
        try:
            present_value = await app_bac.read_property(address, sched_oid, "presentValue")
        except Exception:
            present_value = None
        try:
            schedule_default = await app_bac.read_property(address, sched_oid, "scheduleDefault")
        except Exception:
            schedule_default = None
        try:
            effective_period = await app_bac.read_property(address, sched_oid, "effectivePeriod")
        except Exception:
            effective_period = None
        try:
            targets = await app_bac.read_property(address, sched_oid, "listOfObjectPropertyReferences")
        except Exception:
            try:
                targets = await app_bac.read_property(address, sched_oid, "weeklyScheduleReference")
            except Exception:
                targets = None

        # Libellé humain de la période d'effet
        try:
            eff_label = None
            if effective_period is not None:
                # Si effective_period est un vrai DateRange
                try:
                    if isinstance(effective_period, DateRange):
                        is_star = _sch_is_all_wildcards(effective_period)
                        if is_star:
                            eff_label = "Toujours actif"
                        else:
                            sd = getattr(effective_period, "startDate", None)
                            ed = getattr(effective_period, "endDate", None)
                            eff_label = f"{_sch_iso_dateobj(sd)} → {_sch_iso_dateobj(ed)}"
                    else:
                        # via JSON déjà normalisé
                        eff_json = _sch_val_to_json(effective_period)
                        sd = eff_json.get("startDate", {})
                        ed = eff_json.get("endDate", {})
                        is_star = all(str(sd.get(k, "*")) == "*" for k in ("year","month","day","weekday")) \
                               and all(str(ed.get(k, "*")) == "*" for k in ("year","month","day","weekday"))
                        if is_star:
                            eff_label = "Toujours actif"
                        else:
                            eff_label = f"{sd.get('year','*')}-{sd.get('month','*')}-{sd.get('day','*')} → {ed.get('year','*')}-{ed.get('month','*')}-{ed.get('day','*')}"
                except Exception:
                    eff_label = None
            else:
                eff_label = None
        except Exception:
            eff_label = None

        # Weekly + Exceptions
        weekly = await _sch_read_weekly_all(app_bac, address, sched_oid)
        exceptions = await _sch_read_exception_schedule(app_bac, address, sched_oid)

        return {
            "status": "success",
            "object": str(sched_oid),
            "objectName": _sch_val_to_json(object_name),
            "presentValue": _sch_val_to_json(present_value),
            "effectivePeriod": _sch_val_to_json(effective_period),
            "effectivePeriodLabel": eff_label,                 # <── lisible
            "scheduleDefault": _sch_val_to_json(schedule_default),
            "weeklySchedule": weekly,
            "exceptionSchedule": exceptions,                   # <── avec calendar.label / calendarName
            "targets": _sch_val_to_json(targets) or [],
        }

    except BaseException as e:
        msg = f"Impossible de lire le schedule 'schedule,{obj_instance}'"
        logger.error(f"{msg}: {e}", exc_info=True)
        return {"status": "error", "message": msg, "details": _format_error_details(e)}
# ======== TrendLog : LECTURE SANS READ_PROPERTY (only ReadRange) ========
from typing import Any, Dict, List, Tuple, Optional
from datetime import datetime, timedelta

from bacpypes3.pdu import Address
from bacpypes3.apdu import ReadRangeRequest
from bacpypes3.primitivedata import ObjectIdentifier, Date, Time

try:
    from bacpypes3.basetypes import Range, RangeByPosition, RangeBySequenceNumber, RangeByTime, DateTime
except Exception:
    Range = RangeByPosition = RangeBySequenceNumber = RangeByTime = DateTime = None  # stubs

# --- mini-helpers (robustes, pas de read_property) ------------------------
def _listify(v: Any) -> List[Any]:
    if v is None:
        return []
    if isinstance(v, (list, tuple)):
        return list(v)
    for attr in ("elements", "value", "values", "listOfRecords", "logRecords", "logRecord", "itemData"):
        if hasattr(v, attr):
            try:
                vv = getattr(v, attr)
                return _listify(vv)
            except Exception:
                pass
    return []

def _looks_like_log_item(x: Any) -> bool:
    for a in ("timestamp", "sequenceNumber", "value", "logDatum", "statusFlags"):
        if hasattr(x, a):
            return True
    return False

def _deep_find_items(obj: Any, max_depth: int = 6, path: str = "root") -> Tuple[List[Any], List[str]]:
    visited = set()
    stack = [(obj, path, 0)]
    while stack:
        cur, p, d = stack.pop()
        if cur is None or d > max_depth:
            continue
        key = (id(cur), p)
        if key in visited:
            continue
        visited.add(key)

        seq = _listify(cur)
        if seq and any(_looks_like_log_item(x) for x in seq):
            return seq, [p]

        # explore attrs publics
        for attr in dir(cur):
            if attr.startswith("_"):
                continue
            try:
                val = getattr(cur, attr)
            except Exception:
                continue
            seq = _listify(val)
            if seq and any(_looks_like_log_item(x) for x in seq):
                return seq, [p, attr]
            if hasattr(val, "__dict__") or isinstance(val, (list, tuple)):
                stack.append((val, f"{p}.{attr}", d + 1))

        for attr in ("elements", "itemData", "value", "values", "listOfRecords", "logRecords", "logRecord"):
            if hasattr(cur, attr):
                try:
                    val = getattr(cur, attr)
                except Exception:
                    continue
                seq = _listify(val)
                if seq and any(_looks_like_log_item(x) for x in seq):
                    return seq, [p, attr]
                if hasattr(val, "__dict__") or isinstance(val, (list, tuple)):
                    stack.append((val, f"{p}.{attr}", d + 1))
    return [], []

def _cast_ts_safe(ts):
    try:
        k, v = _cast_out_timestamp(ts)  # ton helper si dispo
        return k, v
    except Exception:
        return "raw", str(ts)

def _to_records(elements: List[Any]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for it in (elements or []):
        rec: Dict[str, Any] = {}
        ts = getattr(it, "timestamp", None)
        kind, val = _cast_ts_safe(ts)
        rec["timestamp_kind"] = kind
        rec["timestamp_value"] = str(val)
        datum = getattr(it, "value", getattr(it, "logDatum", None))
        try:
            rec["value"] = bacnet_to_json(datum)
        except Exception:
            rec["value"] = str(datum)
        try:
            rec["statusFlags"] = bacnet_to_json(getattr(it, "statusFlags", None))
        except Exception:
            pass
        try:
            rec["sequenceNumber"] = int(getattr(it, "sequenceNumber", None))
        except Exception:
            pass
        out.append(rec)
    return out

def _ts_from_dt(dt: datetime):
    """DateTime(Date, Time) en positionnel (pas de kwargs) pour bacpypes3."""
    try:
        weekday = dt.isoweekday()  # 1..7
        bd = Date(dt.year, dt.month, dt.day, weekday)
        hundredth = dt.microsecond // 10000
        bt = Time(dt.hour, dt.minute, dt.second, hundredth)
        return ("dateTime", DateTime(bd, bt)) if DateTime is not None else ("raw", f"{dt.isoformat()}")
    except Exception:
        return ("raw", f"{dt.isoformat()}")

def _mk_by_time(reference_dt: datetime, n: int, backward: bool) -> Optional[Range]:
    if RangeByTime is None or Range is None:
        return None
    kind, ts = _ts_from_dt(reference_dt)
    if kind != "dateTime":
        return None
    cnt = -abs(n) if backward else abs(n)
    try:
        return Range(byTime=RangeByTime(ts, cnt))  # positionnel
    except Exception:
        return None

def _mk_by_sequence(start_seq: int, n: int) -> Optional[Range]:
    if RangeBySequenceNumber is None or Range is None:
        return None
    try:
        return Range(bySequenceNumber=RangeBySequenceNumber(int(start_seq), int(n)))
    except Exception:
        return None

def _mk_by_position(start_idx: int, n: int) -> Optional[Range]:
    if RangeByPosition is None or Range is None:
        return None
    try:
        return Range(byPosition=RangeByPosition(int(start_idx), int(n)))
    except Exception:
        return None

def _get_defaults_host_port():
    try:
        return settings.bacnet.target_host, settings.bacnet.target_port
    except Exception:
        return "127.0.0.1", 47808

# ======================= TREND LOG: LECTURE + DÉCODAGE =======================
from typing import Any, Dict, List
from decode import format_readrange_ack

from bacpypes3.primitivedata import ObjectIdentifier
from bacpypes3.pdu import Address
from bacpypes3.apdu import ReadRangeRequest
from bacpypes3.basetypes import Range, RangeByPosition, RangeBySequenceNumber

def _make_oid_trendlog(instance: int) -> ObjectIdentifier:
    try:
        return ObjectIdentifier(f"trendLog,{int(instance)}")
    except Exception:
        return ObjectIdentifier(f"trend-log,{int(instance)}")

def _build_by_position(start: int, count: int) -> Range:
    return Range(byPosition=RangeByPosition(referenceIndex=int(start), count=int(count)))

def _build_by_sequence(start: int, count: int) -> Range:
    return Range(bySequenceNumber=RangeBySequenceNumber(referenceSequenceNumber=int(start), count=int(count)))

async def _rr_try_once(app_bac, addr: Address, oid: ObjectIdentifier, pid: Any, rng: Range) -> Dict[str, Any]:
    req = ReadRangeRequest(objectIdentifier=oid, propertyIdentifier=pid, range=rng)
    req.pduDestination = addr
    ack = await app_bac.request(req)
    parsed = format_readrange_ack(
        ack,
        obj_str=str(oid),
        mode=("byPosition" if (hasattr(rng, "byPosition") and rng.byPosition is not None) else "bySequence"),
    )
    return {
        "attempt": {
            "pid": pid if isinstance(pid, str) else int(pid),
            "mode": "position" if (hasattr(rng, "byPosition") and rng.byPosition is not None) else "sequence",
            "start": getattr(rng.byPosition, "referenceIndex", getattr(rng.bySequenceNumber, "referenceSequenceNumber", None)),
            "count": getattr(rng.byPosition, "count", getattr(rng.bySequenceNumber, "count", None)),
            "got": parsed.get("count") if isinstance(parsed, dict) else None,
        },
        "parsed": parsed,
    }
# =================== TREND LOG : LECTURE + DÉCODAGE (YABE-style) ===================

from typing import Any, Dict, List
from bacpypes3.pdu import Address
from bacpypes3.primitivedata import ObjectIdentifier
from bacpypes3.apdu import ReadRangeRequest
from bacpypes3.basetypes import Range, RangeByPosition, RangeBySequenceNumber

def _make_trendlog_oid(instance: int) -> ObjectIdentifier:
    try:
        return ObjectIdentifier(f"trendLog,{int(instance)}")
    except Exception:
        return ObjectIdentifier(f"trend-log,{int(instance)}")

def _range_by_position(start: int, count: int) -> Range:
    return Range(byPosition=RangeByPosition(referenceIndex=int(max(1, start)),
                                           count=int(max(1, count))))

def _range_by_sequence(start: int, count: int) -> Range:
    return Range(bySequenceNumber=RangeBySequenceNumber(referenceSequenceNumber=int(max(1, start)),
                                                       count=int(max(1, count))))

async def _try_read_and_decode(app_bac, addr: Address, oid: ObjectIdentifier,
                               pid: Any, rng: Range, mode_name: str) -> Dict[str, Any]:
    req = ReadRangeRequest(objectIdentifier=oid, propertyIdentifier=pid, range=rng)
    req.pduDestination = addr
    ack = await app_bac.request(req)

    parsed = format_readrange_ack(
        ack,
        obj_str=str(oid),
        mode=f"{mode_name}(start={getattr(rng.byPosition,'referenceIndex', getattr(rng.bySequenceNumber,'referenceSequenceNumber', None))},"
             f" count={getattr(rng.byPosition,'count', getattr(rng.bySequenceNumber,'count', None))})"
    )
    parsed.setdefault("attempts", [])
    parsed["attempts"].append({
        "pid": str(pid),
        "mode": mode_name,
        "start": getattr(rng.byPosition, "referenceIndex",
                         getattr(rng.bySequenceNumber, "referenceSequenceNumber", None)),
        "count": getattr(rng.byPosition, "count",
                         getattr(rng.bySequenceNumber, "count", None)),
        "has_itemData": hasattr(ack, "itemData"),
    })
    return parsed

# Ancienne version supprimée - remplacée par _read_trend_log_decoded_impl

# ================= /TREND LOG : LECTURE + DÉCODAGE (YABE-style) =================

# =================== TREND LOG : LECTURE + DÉCODAGE (VERSION CORRIGÉE) ===================

from typing import Any, Dict, List, Optional
from bacpypes3.pdu import Address
from bacpypes3.primitivedata import ObjectIdentifier
from bacpypes3.apdu import ReadRangeRequest, ReadPropertyRequest
from bacpypes3.basetypes import Range, RangeByPosition, RangeBySequenceNumber

def _make_trendlog_oid(instance: int) -> ObjectIdentifier:
    """Crée un ObjectIdentifier pour TrendLog avec tolérance aux variantes de nom."""
    try:
        return ObjectIdentifier(f"trendLog,{int(instance)}")
    except Exception:
        try:
            return ObjectIdentifier(f"trend-log,{int(instance)}")
        except Exception:
            return ObjectIdentifier(f"trendlog,{int(instance)}")

def _range_by_position(start: int, count: int) -> Range:
    """Crée un Range byPosition avec validation."""
    start = max(1, int(start))
    count = max(1, int(count))
    return Range(byPosition=RangeByPosition(referenceIndex=start, count=count))

def _range_by_sequence(start: int, count: int) -> Range:
    """Crée un Range bySequenceNumber avec validation."""
    start = max(1, int(start))
    count = max(1, int(count))
    return Range(bySequenceNumber=RangeBySequenceNumber(referenceSequenceNumber=start, count=count))

async def _read_trendlog_metadata(app_bac, addr: Address, oid: ObjectIdentifier) -> Dict[str, Any]:
    """Lit les métadonnées du TrendLog pour diagnostic."""
    metadata = {}
    
    # Propriétés importantes pour comprendre le TrendLog
    props_to_try = [
        "objectName", "description", "logBuffer", "logBufferSize", 
        "totalRecordCount", "recordCount", "statusFlags", "reliability"
    ]
    
    for prop in props_to_try:
        try:
            value = await app_bac.read_property(addr, oid, prop)
            metadata[prop] = bacnet_to_json(value)
        except Exception as e:
            metadata[prop] = f"Erreur: {type(e).__name__}"
            # Si c'est un read-access-denied, on peut arrêter là
            if "read-access-denied" in str(e):
                # Ne pas lever l'exception, juste arrêter la boucle et continuer
                print(f"⚠️  Accès refusé à la propriété {prop}, arrêt de la lecture des métadonnées")
                break
    
    return metadata

async def _try_read_range_simple(app_bac, addr: Address, oid: ObjectIdentifier, 
                                pid: Any, rng: Range, mode_name: str) -> Dict[str, Any]:
    """Tentative simple de ReadRange avec gestion d'erreur basique."""
    try:
        req = ReadRangeRequest(objectIdentifier=oid, propertyIdentifier=pid, range=rng)
        req.pduDestination = addr
        ack = await app_bac.request(req)
        
        # Vérifier si on a des données
        has_itemdata = hasattr(ack, "itemData") and ack.itemData is not None
        
        return {
            "success": True,
            "has_itemdata": has_itemdata,
            "ack_type": type(ack).__name__,
            "pid": str(pid),
            "mode": mode_name,
            "ack": ack
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"{type(e).__name__}: {e}",
            "pid": str(pid),
            "mode": mode_name
        }

async def _try_decode_with_format(app_bac, addr: Address, oid: ObjectIdentifier,
                                pid: Any, rng: Range, mode_name: str) -> Dict[str, Any]:
    """Tentative de ReadRange avec décodage via format_readrange_ack."""
    try:
        req = ReadRangeRequest(objectIdentifier=oid, propertyIdentifier=pid, range=rng)
        req.pduDestination = addr
        ack = await app_bac.request(req)
        
        # Utiliser le décodage existant
        parsed = format_readrange_ack(
            ack,
            obj_str=str(oid),
            mode=f"{mode_name}(start={getattr(rng.byPosition,'referenceIndex', getattr(rng.bySequenceNumber,'referenceSequenceNumber', None))},"
                 f" count={getattr(rng.byPosition,'count', getattr(rng.bySequenceNumber,'count', None))})"
        )
        
        return {
            "success": True,
            "parsed": parsed,
            "pid": str(pid),
            "mode": mode_name,
            "has_itemdata": hasattr(ack, "itemData") and ack.itemData is not None
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"{type(e).__name__}: {e}",
            "pid": str(pid),
            "mode": mode_name
        }

async def _read_trend_log_decoded_impl(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    obj_instance: str = "300001",      # accepte "300001" ou "trend-log,300001"
    start: int = 1,
    count: int = 50,
    mode: str = "position",     # "position", "sequence" ou "auto"
    pid_variant: str = "auto"  # "131", "logBuffer", "log-buffer" ou "auto"
) -> Dict[str, Any]:
    """
    Lecture robuste d'un TrendLog avec décodage amélioré.
    Version corrigée avec gestion des objets Any et format de tags.
    """
    try:
        app_bac = await get_bacnet_app()
        if app_bac is None:
            return {"status": "error", "message": "Application BACnet non initialisée"}
    except Exception as e:
        return {"status": "error", "message": f"Erreur d'initialisation BACnet: {e}"}

        # Parsing de l'instance
        s = str(obj_instance).strip()
        if "," in s: 
            s = s.split(",")[-1].strip()
        if ":" in s: 
            s = s.split(":")[-1].strip()
        
        try:
            inst = int(s)
        except Exception:
            return {"status": "error", "message": f"obj_instance invalide: '{obj_instance}' (doit être un entier)"}

        # Construction de l'adresse et OID
    try:
        addr = Address(f"{host.strip()}:{int(port)}")
    except Exception as e:
        return {"status": "error", "message": "Adresse BACnet invalide", "details": str(e)}

        try:
            oid = _make_trendlog_oid(inst)
        except Exception as e:
            return {"status": "error", "message": "Impossible de construire l'OID TrendLog", "details": str(e)}

        # Lecture des métadonnées pour diagnostic avec gestion d'erreur robuste
        metadata = None
        try:
            metadata = await _read_trendlog_metadata(app_bac, addr, oid)
        except Exception as metadata_error:
            error_msg = str(metadata_error)
            if "read-access-denied" in error_msg:
                print(f"⚠️  Accès refusé aux métadonnées du TrendLog {inst}, continuation sans métadonnées")
                metadata = {"error": "read-access-denied", "message": error_msg}
            else:
                print(f"⚠️  Erreur lors de la lecture des métadonnées: {error_msg}, continuation sans métadonnées")
                metadata = {"error": "metadata_error", "message": error_msg}

        # PIDs candidats (propriété à lire)
        if pid_variant.lower() == "131":
            pids = [131]
        elif pid_variant.lower() in ("logbuffer", "log-buffer"):
            pids = ["logBuffer"]
        else:
            pids = [131, "logBuffer"]

        # Ranges candidats (mode de lecture)
        ranges = []
        if mode in ("position", "auto"):
            try:
                ranges.append((_range_by_position(start, count), "byPosition"))
            except Exception as e:
                pass
        if mode in ("sequence", "auto"):
            try:
                ranges.append((_range_by_sequence(start, count), "bySequence"))
            except Exception as e:
                pass
        
        if not ranges:
            return {"status": "error", "message": "Impossible de construire un Range (position/sequence)."}

        attempts_all: List[Dict[str, Any]] = []

        # Essayer toutes les combinaisons PID/Range
        for pid in pids:
            for rng, mname in ranges:
                try:
                    # Créer la requête ReadRange
                    req = ReadRangeRequest(
                        objectIdentifier=oid,
                        propertyIdentifier=pid,
                        range=rng
                    )
                    req.pduDestination = addr
                    
                    # Envoyer la requête
                    ack = await app_bac.request(req)
                    
                    # Vérifier si on a des données
                    if hasattr(ack, "itemData") and ack.itemData is not None:
                        # Décoder avec format_readrange_ack (version corrigée)
                        result = format_readrange_ack(
                            ack,
                            obj_str=str(oid),
                            mode=f"{mname}(start={start}, count={count})"
                        )
                        
                        if result.get("status") == "success" and result.get("count", 0) > 0:
                            # Succès ! Retourner les données
                            return {
                                "status": "success",
                                "object": str(oid),
                                "count": result.get("count", 0),
                                "records": result.get("records", []),
                                "metadata": metadata,
                                "meta": {
                                    **result.get("meta", {}),
                                    "pidUsed": str(pid),
                                    "modeUsed": mname,
                                    "host": host,
                                    "port": port,
                                    "instance": obj_instance
                                }
                            }
                        else:
                            # Décodage échoué mais données reçues
                            attempts_all.append({
                                "pid": str(pid), "mode": mname,
                                "success": True,
                                "has_itemdata": True,
                                "decode_error": result.get("message", "unknown"),
                                "ack_type": type(ack).__name__
                            })
                    else:
                        # Pas de données
                        attempts_all.append({
                            "pid": str(pid), "mode": mname,
                            "success": True,
                            "has_itemdata": False,
                            "ack_type": type(ack).__name__
                        })
                        
                except Exception as e:
                    error_msg = str(e)
                    if "read-access-denied" in error_msg:
                        attempts_all.append({
                            "pid": str(pid), "mode": mname,
                            "success": False,
                            "error": "Accès refusé - Vérifiez les permissions BACnet",
                            "details": error_msg
                        })
                    else:
                        attempts_all.append({
                            "pid": str(pid), "mode": mname,
                            "success": False,
                            "error": f"{type(e).__name__}: {e}"
                        })

        # Si on arrive ici, aucune méthode n'a fonctionné
        return {
            "status": "success",
            "object": str(oid),
            "count": 0,
            "records": [],
            "metadata": metadata,
            "attempts": attempts_all,
            "message": "Aucun record trouvé avec les méthodes disponibles"
        }

    except Exception as e:
        return {
            "status": "error", 
            "message": f"Erreur générale: {type(e).__name__}", 
            "details": str(e)
        }

# ================= /TREND LOG : LECTURE + DÉCODAGE (VERSION CORRIGÉE) =================

# ================= /TREND LOG : LECTURE + DÉCODAGE (VERSION SÛRE) =================
from typing import Any, Dict, List
from bacpypes3.pdu import Address
from bacpypes3.primitivedata import ObjectIdentifier
from bacpypes3.apdu import ReadRangeRequest
from bacpypes3.basetypes import Range, RangeByPosition, RangeBySequenceNumber
from decode import format_readrange_ack

def _tl_make_oid(instance: int) -> ObjectIdentifier:
    try:
        return ObjectIdentifier(f"trendLog,{int(instance)}")
    except Exception:
        return ObjectIdentifier(f"trend-log,{int(instance)}")

def _tl_by_position(start: int, count: int) -> Range:
    start = int(max(1, start)); count = int(max(1, count))
    return Range(byPosition=RangeByPosition(referenceIndex=start, count=count))

def _tl_by_sequence(start: int, count: int) -> Range:
    start = int(max(1, start)); count = int(max(1, count))
    return Range(bySequenceNumber=RangeBySequenceNumber(referenceSequenceNumber=start, count=count))

def _ack_preview(ack: Any) -> Dict[str, Any]:
    snap = {"ack_class": type(ack).__name__ if ack else "None", "attrs": []}
    if not ack:
        return snap
    for a in ("itemData","listOfRecords","logRecords","result","values","elements","value"):
        try:
            if hasattr(ack, a):
                v = getattr(ack, a)
                snap["attrs"].append(a)
                try:
                    snap[f"{a}_len"] = (len(v) if v is not None else 0)
                except Exception:
                    snap[f"{a}_len"] = None
        except Exception as e:
            snap[f"{a}_error"] = str(e)
    return snap

@mcp.tool
async def read_trend_log_decoded(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    obj_instance: str = "300001",   # accepte "300001", "trend-log,300001", "trendLog:300001"
    start: int = 1,
    count: int = 50,
    mode: str = "auto",             # "position", "sequence", ou "auto"
    pid_variant: str = "auto"       # "131", "logBuffer", "log-buffer", ou "auto"
) -> Dict[str, Any]:
    """
    Lecture TrendLog (logBuffer / 131) + décodage via decode.format_readrange_ack.
    Ne plante pas si itemData est opaque : renvoie un aperçu d'ACK et les tentatives.
    """
    try:
        app_bac = await get_bacnet_app()
        if app_bac is None:
            return {"status": "error", "message": "Application BACnet non initialisée"}
    except Exception as e:
        return {"status": "error", "message": f"Erreur d'initialisation BACnet: {e}"}

    # --- parse instance robuste (évite 300001 → 30000) ---
    s = str(obj_instance).strip()
    for sep in (",", ":"):
        if sep in s:
            s = s.split(sep)[-1].strip()
    try:
        inst = int(s)
    except Exception:
        return {"status": "error", "message": f"obj_instance invalide: '{obj_instance}' (entier attendu)"}

    # --- adresse & OID ---
    try:
        addr = Address(f"{host.strip()}:{int(port)}")
    except Exception as e:
        return {"status": "error", "message": "Adresse BACnet invalide", "details": str(e)}
    try:
        oid = _tl_make_oid(inst)
    except Exception as e:
        return {"status": "error", "message": "Impossible de construire l'OID TrendLog", "details": str(e)}

    # --- variantes PID ---
    if str(pid_variant).lower() == "131":
        pids: List[Any] = [131]
    elif str(pid_variant).lower() in ("logbuffer", "log-buffer"):
        pids = [pid_variant]
    else:
        pids = [131, "logBuffer", "log-buffer"]

    # --- variantes Range ---
    ranges: List[tuple[Range, str]] = []
    if mode in ("position", "auto"):
        try: 
            ranges.append((_tl_by_position(start, count), "byPosition"))
        except Exception: 
            pass
    if mode in ("sequence", "auto"):
        try: 
            ranges.append((_tl_by_sequence(start, count), "bySequence"))
        except Exception: 
            pass
    if not ranges:
        return {"status": "error", "message": "Impossible de construire un Range (position/sequence)."}

    attempts: List[Dict[str, Any]] = []

    # --- boucles d'essais ---
    for pid in pids:
        for rng, mode_name in ranges:
            try:
                req = ReadRangeRequest(objectIdentifier=oid, propertyIdentifier=pid, range=rng)
                req.pduDestination = addr
                ack = await app_bac.request(req)

                # Décodage "safe"
                result = {}
                try:
                    result = format_readrange_ack(
                        ack,
                        obj_str=str(oid),
                        mode=f"{mode_name}(start={getattr(rng.byPosition, 'referenceIndex', getattr(rng.bySequenceNumber, 'referenceSequenceNumber', None))},"
                             f" count={getattr(rng.byPosition, 'count', getattr(rng.bySequenceNumber, 'count', None))})"
                    )
                except Exception as de:
                    result = {
                        "status": "error",
                        "message": f"Décodage impossible: {type(de).__name__}: {de}",
                        "meta": {"pid": str(pid), "mode": mode_name}
                    }

                # Succès décodé ?
                if isinstance(result, dict) and result.get("status") == "success" and result.get("count", 0) > 0:
                    return {
                        "status": "success",
                        "object": str(oid),
                        "count": result.get("count", 0),
                        "records": result.get("records", []),
                        "meta": {
                            **result.get("meta", {}),
                            "pidUsed": str(pid),
                            "modeUsed": mode_name,
                            "host": host, "port": port, "instance": inst
                        }
                    }

                # Sinon, on trace la tentative
                attempts.append({
                    "pid": str(pid),
                    "mode": mode_name,
                    "start": getattr(rng.byPosition, "referenceIndex",
                                     getattr(rng.bySequenceNumber, "referenceSequenceNumber", None)),
                    "count": getattr(rng.byPosition, "count",
                                     getattr(rng.bySequenceNumber, "count", None)),
                    "has_itemData": hasattr(ack, "itemData") and getattr(ack, "itemData") is not None,
                    "ack_preview": _ack_preview(ack),
                    "decode_status": result.get("status") if isinstance(result, dict) else "n/a",
                    "decode_message": result.get("message") if isinstance(result, dict) else "n/a",
                    })

            except Exception as e:
                    attempts.append({
                        "pid": str(pid),
                        "mode": mode_name,
                    "start": getattr(rng.byPosition, "referenceIndex",
                                     getattr(rng.bySequenceNumber, "referenceSequenceNumber", None)),
                    "count": getattr(rng.byPosition, "count",
                                     getattr(rng.bySequenceNumber, "count", None)),
                        "error": f"{type(e).__name__}: {e}"
                })
                    pass

        # Rien de décodé : renvoyer les tentatives (et l’aperçu d’ACK) au lieu de planter
    return {
        "status": "success",
        "object": str(oid),
        "count": 0,
        "records": [],
            "attempts": attempts,
            "message": "Aucun record décodé via ReadRange (voir attempts/ack_preview)."
        }

# ================= /TREND LOG : LECTURE + DÉCODAGE (VERSION SÛRE) =================

# ================= /TREND LOG : LECTURE + DÉCODAGE (VERSION CORRIGÉE) =================

@mcp.tool
async def get_trendlog_info(
    host: str = settings.bacnet.target_host,
    port: int = settings.bacnet.target_port,
    obj_instance: str = "300001"
) -> Dict[str, Any]:
    """
    Récupère les informations de base d'un TrendLog.
    Version améliorée avec gestion d'erreurs robuste.
    """
    try:
        app_bac = await get_bacnet_app()
        if app_bac is None:
            return {"status": "error", "message": "Application BACnet non initialisée"}

        # Parsing de l'instance
        s = str(obj_instance).strip()
        if "," in s: 
            s = s.split(",")[-1].strip()
        if ":" in s: 
            s = s.split(":")[-1].strip()
        
        try:
            inst = int(s)
        except Exception:
            return {"status": "error", "message": f"obj_instance invalide: '{obj_instance}' (doit être un entier)"}

        # Construction de l'adresse et OID
        try:
            addr = Address(f"{host.strip()}:{int(port)}")
        except Exception as e:
            return {"status": "error", "message": "Adresse BACnet invalide", "details": str(e)}

        try:
            oid = _make_trendlog_oid(inst)
        except Exception as e:
            return {"status": "error", "message": "Impossible de construire l'OID TrendLog", "details": str(e)}

        # Lire les propriétés de base
        properties = {}
        basic_props = ["objectName", "logBufferSize", "recordCount", "totalRecordCount"]
        
        for prop in basic_props:
            try:
                value = await app_bac.read_property(addr, oid, prop)
                properties[prop] = bacnet_to_json(value)
            except Exception as e:
                properties[prop] = f"Erreur: {type(e).__name__}"

        return {
            "status": "success",
            "object": str(oid),
            "host": host,
            "port": port,
            "instance": obj_instance,
            "properties": properties
        }
        
    except Exception as e:
        return {"status": "error", "message": f"Erreur générale: {type(e).__name__}", "details": str(e)}

{
  "status": "success",
  "device": "device,1007",
  "total_objects": 73,
  "listed": 10,
  "objects": [
    {
      "object": "analogValue,1",
      "objectName": "Température Salle",
      "description": "Capteur Température",
      "presentValue": 22.5
    },
    ...
  ]
}

# ================= /TREND LOG : LECTURE + DÉCODAGE (VERSION CORRIGÉE) =================
# ======================= DISCOVER OBJECTS (YABE-like) =======================
from typing import Any, Dict, List, Optional, Tuple

try:
    from bacpypes3.pdu import Address
    from bacpypes3.primitivedata import ObjectIdentifier, Unsigned
    from bacpypes3.apdu import ReadPropertyRequest, ReadPropertyMultipleRequest, WhoIsRequest
    from bacpypes3.basetypes import PropertyReference, ReadAccessSpecification
except Exception as _e:
    raise RuntimeError(f"BACpypes3 requis pour discover_objects: {_e}")

# ===== Helper simple : parse ObjectIdentifier en (type:int, instance:int) =====
def _parse_object_identifier_flex(oid_val):
    """Retourne (objectType:int, instance:int) ou (None, None) depuis diverses représentations."""
    
    # 1) Déjà un tuple (t, i)
    if isinstance(oid_val, tuple) and len(oid_val) == 2:
        try:
            return int(oid_val[0]), int(oid_val[1])
        except:
            pass
    
    # 2) ObjectIdentifier bacpypes3 - méthode simple
    try:
        from bacpypes3.primitivedata import ObjectIdentifier as _OID
        if isinstance(oid_val, _OID):
            # Parser la représentation string: "(<ObjectType: device>, 1007)"
            s = str(oid_val)
            if "(" in s and ")" in s and "," in s:
                s2 = s.strip("()")
                tpart, ipart = s2.split(",", 1)
                
                # Extraire le type depuis "<ObjectType: device>"
                if "ObjectType:" in tpart:
                    type_name = tpart.split("ObjectType:")[1].strip().strip("<>")
                    # Mapping simple des types
                    type_map = {
                        "device": 8, "analogValue": 2, "analogInput": 0,
                        "analogOutput": 1, "binaryInput": 3, "binaryOutput": 4,
                        "binaryValue": 5, "schedule": 17, "trendLog": 20
                    }
                    t = type_map.get(type_name, 0)
                    i = int(ipart.strip())
                    return int(t), int(i)
    except:
        pass
    
    # 3) Objets Any - ignorer les vides
    try:
        from bacpypes3.constructeddata import Any as CAny
        if isinstance(oid_val, CAny):
            # Si value=None, c'est un objet Any vide
            if hasattr(oid_val, 'value') and oid_val.value is None:
                return (None, None)
            # Sinon essayer de parser le contenu
            if hasattr(oid_val, 'value') and oid_val.value is not None:
                return _parse_object_identifier_flex(oid_val.value)
    except:
        pass
    
    # 4) Dernière chance : parser une chaîne
    try:
        s = str(oid_val)
        if s and "," in s:
            tpart, ipart = s.split(",", 1)
            # Mapping simple
            type_map = {
                "device": 8, "analogValue": 2, "analogInput": 0,
                "analogOutput": 1, "binaryInput": 3, "binaryOutput": 4,
                "binaryValue": 5, "schedule": 17, "trendLog": 20
            }
            t = type_map.get(tpart.strip(), 0)
            i = int(ipart.strip())
            return int(t), int(i)
    except:
        pass
    
    return (None, None)

# -- Helpers BACnet ---------------------------------------------

def _make_device_oid(inst: int) -> ObjectIdentifier:
    # Les deux variantes sont généralement acceptées
    try:
        return ObjectIdentifier(f"device,{int(inst)}")
    except Exception:
        return ObjectIdentifier(("device", int(inst)))  # tuple fallback

async def _safe_read_property(app, addr: Address, oid: ObjectIdentifier,
                             pid: Any, array_index: Optional[int] = None) -> Tuple[Optional[Any], Optional[str]]:
    """
    Lecture robuste d'une propriété. Retourne (valeur, erreur_str) où erreur_str est None si OK.
    """
    try:
        req = ReadPropertyRequest(objectIdentifier=oid, propertyIdentifier=pid)
        if array_index is not None:
            # BACpypes3 expose propertyArrayIndex sur la requête
            req.propertyArrayIndex = Unsigned(int(array_index))
        req.pduDestination = addr
        ack = await app.request(req)
        # Réponse typique: ReadPropertyACK avec .propertyValue
        val = getattr(ack, "propertyValue", None)
        if hasattr(val, "cast_out"):
            try:
                return val.cast_out(), None
            except Exception:
                # fallback string
                return str(val), None
        return val, None
    except BaseException as e:
        return None, f"{type(e).__name__}: {e}"

def _pv_supported(obj_type: int) -> bool:
    """
    'present-value' n'existe pas pour tous les types. On filtre quelques cas connus.
    """
    # obj_type BACnet standard: 0=analog-input,1=analog-output,2=analog-value,3=binary-input,4=binary-output,5=binary-value...
    # Device(8) n'a pas present-value ; Schedule(17) non plus ; TrendLog(20) non plus, etc.
    without_pv = {8, 17, 19, 20, 21, 22, 23, 24, 25}  # device/schedule/notification/TrendLog/...
    return obj_type not in without_pv

def _to_json_scalar(x: Any) -> Any:
    """
    Convertit une valeur BACpypes en JSON safe.
    """
    if x is None:
        return None
    try:
        if hasattr(x, "cast_out"):
            return x.cast_out()
    except Exception:
        pass
    # Primitifs ou tuples
    if isinstance(x, (int, float, str, bool, dict, list)):
        return x
    try:
        return str(x)
    except Exception:
        return repr(x)

async def _discover_device_instance_unicast(app, addr: Address, timeout: float = 1.0) -> Optional[int]:
    """
    Tentative légère de résolution du device_instance via Who-Is unicast.
    Nécessite que l'Application capture les I-Am (selon ta config bacpypes3).
    Si indisponible, retourne None (on te dira de fournir device_instance).
    """
    try:
        # Envoi Who-Is ciblé
        wi = WhoIsRequest()
        wi.pduDestination = addr
        await app.request(wi)  # Unconfirmed -> pas d'ACK

        # Certains Application bacpypes3 gardent les I-Am en cache (ex: app.device_info_cache)
        # On essaie plusieurs emplacements courants pendant 'timeout'
        import asyncio, time
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            for attr in ("device_info_cache", "deviceInfoCache", "iam_cache", "_iam_cache"):
                cache = getattr(app, attr, None)
                if isinstance(cache, dict) and cache:
                    # chercher une entrée pour addr
                    for _k, info in cache.items():
                        # info peut être (address, device_id) ou objet
                        device_id = None
                        if isinstance(info, dict):
                            device_id = info.get("device_id") or info.get("deviceIdentifier")
                        elif hasattr(info, "deviceIdentifier"):
                            device_id = getattr(info, "deviceIdentifier")
                        elif isinstance(info, tuple) and len(info) >= 2:
                            device_id = info[1]
                        if device_id is not None:
                            try:
                                return int(str(device_id))
                            except Exception:
                                continue
            await asyncio.sleep(0.05)
    except Exception:
        pass
    return None
# --- Helpers manquants pour decouverte_objects(_special) ---

from typing import Any, Dict, List, Tuple, Optional
from bacpypes3.pdu import Address
from bacpypes3.primitivedata import ObjectIdentifier

# Aliases kebab -> canon BACnet (camelCase)
_OBJ_TYPE_ALIASES = {
    "analog-input": "analogInput",
    "analog-output": "analogOutput",
    "binary-input": "binaryInput",
    "binary-output": "binaryOutput",
    "multi-state-input": "multiStateInput",
    "multi-state-output": "multiStateOutput",
    "analog-value": "analogValue",
    "binary-value": "binaryValue",
    "multi-state-value": "multiStateValue",
    "large-analog-value": "largeAnalogValue",
    "integer-value": "integerValue",
    "positive-integer-value": "positiveIntegerValue",
    "loop": "loop",
    "accumulator": "accumulator",
    "pulse-converter": "pulseConverter",
    "trend-log": "trendLog",
    "notification-class": "notificationClass",
    "network-port": "networkPort",
    "file": "file",
    "program": "program",
    "device": "device",
    "schedule": "schedule",
}

def _to_kebab(s: str) -> str:
    out = []
    for i, ch in enumerate(s):
        if ch.isupper() and i > 0 and (s[i-1].islower() or (i+1 < len(s) and s[i+1].islower())):
            out.append('-')
        out.append(ch.lower())
    return ''.join(out)

def _normalize_obj_type(t: str) -> str:
    """'analog-value' -> 'analogValue' ; sinon retourne tel quel."""
    return _OBJ_TYPE_ALIASES.get(t, t)

def _parse_oid_from_objectlist_item(oid: Any) -> Optional[Tuple[str, int, Any]]:
    """
    Convertit un item d'objectList en (type_canon, instance, oid_pour_lecture).
    - Si l'item est déjà un ObjectIdentifier bacpypes3, on le réutilise.
    - Sinon on reconstruit un ObjectIdentifier canonique.
    """
    try:
        if hasattr(oid, "objectType"):
            t_raw = str(oid.objectType)                    # ex: 'analog-value' ou 'analogValue'
            t = _normalize_obj_type(t_raw) if "-" in t_raw else t_raw
            inst = int(getattr(oid, "instanceNumber", getattr(oid, "objectInstance")))
            return t, inst, oid
        if isinstance(oid, (tuple, list)) and len(oid) == 2:
            t_raw, i = oid
            t = _normalize_obj_type(str(t_raw))
            inst = int(i)
            return t, inst, ObjectIdentifier(f"{t},{inst}")
        if isinstance(oid, str) and "," in oid:
            t_raw, i = oid.split(",", 1)
            t = _normalize_obj_type(t_raw.strip())
            inst = int(i.strip())
            return t, inst, ObjectIdentifier(f"{t},{inst}")
    except Exception:
        return None
    return None

async def _list_all_pairs_with_oid(app_bac, address: Address, device_instance: int) -> List[Tuple[str, int, Any]]:
    """
    Relit device,objectList et retourne une liste triée:
      [(type_canon, instance, oid_pour_lecture), ...]
    """
    device_oid = ObjectIdentifier(f"device,{device_instance}")
    object_list = await app_bac.read_property(address, device_oid, "objectList")

    triples: List[Tuple[str, int, Any]] = []
    seen = set()
    for item in object_list or []:
        parsed = _parse_oid_from_objectlist_item(item)
        if not parsed:
            continue
        t, inst, oid_for_read = parsed
        key = (t, inst)
        if key in seen:
            continue
        seen.add(key)
        triples.append((t, inst, oid_for_read))

    triples.sort(key=lambda x: (x[0], x[1]))
    return triples

@mcp.tool
async def discover_devices(
    timeout: Optional[float] = None,
    low_instance: Optional[int] = None,
    high_instance: Optional[int] = None,
    target_host: Optional[str] = None,
    use_broadcast: bool = True,
    as_text: bool = True,
) -> Union[List[str], Dict[str, Any]]:
    """
    Découvre des devices BACnet via Who-Is.

    - use_broadcast=True  -> Who-Is broadcast (par défaut)
    - use_broadcast=False + target_host="IP:PORT" -> Who-Is unicast ciblé (utile si le broadcast est bloqué)
    - low/high_instance : filtre d'instances (sinon on prend une plage large)
    - as_text=True       : renvoie une liste de chaînes lisibles
      as_text=False      : renvoie un dict structuré {status, items:[{instance, source,...}]}
    """
    import asyncio
    import traceback
    from typing import Optional, Union, List, Dict, Any

    try:
        app = await get_bacnet_app()

        # Timeout par défaut
        if timeout is None:
            timeout = getattr(settings.bacnet, "discovery_timeout", 5.0)

        # Plage d'instances par défaut si non définie dans settings
        low = low_instance if low_instance is not None else getattr(settings.bacnet, "device_instance_low", 0)
        high = high_instance if high_instance is not None else getattr(settings.bacnet, "device_instance_high", 4194303)  # plage max BACnet

        # Adresse : None = broadcast ; sinon unicast vers l'hôte cible
        # target_host peut être "192.168.1.7" ou "192.168.1.7:47808"
        address = None
        if not use_broadcast and target_host:
            try:
                address = Address(target_host)
            except Exception:
                # Si l'utilisateur a donné juste une IP, on ajoute le port paramétré
                address = Address(f"{target_host}:{getattr(settings.bacnet, 'target_port', 47808)}")

        # Who-Is (attend des I-Am)
        responses = await asyncio.wait_for(
            app.who_is(address=address, low_limit=low, high_limit=high),
            timeout=timeout
        )

        # Normalisation des résultats
        items = []
        for r in (responses or []):
            # iAmDeviceIdentifier est un ObjectIdentifier(device, instance) la plupart du temps
            inst = None
            obj_type = None
            dev_id = getattr(r, "iAmDeviceIdentifier", None)
            if dev_id is not None:
                try:
                    if hasattr(dev_id, "cast_out"):
                        obj_type, inst = dev_id.cast_out()  # (8, instance) normalement pour "device"
                    elif isinstance(dev_id, tuple) and len(dev_id) == 2:
                        obj_type, inst = int(dev_id[0]), int(dev_id[1])
                    else:
                        # fallback: parse texte "device,1234" ou "8:1234"
                        from bacpypes3.primitivedata import ObjectIdentifier as _OID
                        try:
                            obj_type, inst = _OID(str(dev_id)).cast_out()
                        except Exception:
                            obj_type, inst = None, None
                except Exception:
                    obj_type, inst = None, None

            src = _safe_str(getattr(r, "pduSource", None))
            items.append({
                "objectType": obj_type,
                "device_instance": inst,
                "source": src,
            })

        if as_text:
            # Liste lisible
            if not items:
                mode = "broadcast" if use_broadcast else f"unicast vers {target_host}"
                return [f"Aucun dispositif trouvé (mode {mode}, plage {low}-{high}, timeout {timeout}s)."]
            out = []
            for it in items:
                inst = it.get("device_instance")
                src = it.get("source")
                if inst is None:
                    out.append(f"Dispositif (instance inconnue) à {src}")
                else:
                    out.append(f"Dispositif {inst} à {src}")
            return out

        # Version structurée
        return {
            "status": "success",
            "mode": "broadcast" if use_broadcast else "unicast",
            "target": target_host if not use_broadcast else None,
            "low_instance": low,
            "high_instance": high,
            "timeout": timeout,
            "count": len(items),
            "items": items,
        }

    except asyncio.TimeoutError:
        msg = f"Timeout ({timeout}s) - aucune réponse Who-Is."
        return [msg] if as_text else {"status": "timeout", "message": msg}
    except Exception as e:
        traceback.print_exc()
        msg = f"Erreur de découverte BACnet : {type(e).__name__}: {e}"
        # On renvoie aussi bien texte que structuré selon le mode
        return [msg] if as_text else {"status": "error", "message": msg}
# Enum BACnet minimal pour AIAOBIBOMV (utile en fallback numérique)
_TYPE_ENUM = {
    "analogInput": 0,
    "analogOutput": 1,
    "binaryInput": 3,
    "binaryOutput": 4,
    "multiStateValue": 19,
}

# ================== DROP-IN MONOBLOC: découverte robuste (FR) ==================
# Dépendances externes attendues:
# - get_bacnet_app()
# - logger
# - _format_error_details(e)
# ==============================================================================

from typing import Any, Dict, List, Tuple, Optional
from collections import defaultdict
import asyncio

from bacpypes3.pdu import Address
from bacpypes3.primitivedata import ObjectIdentifier

# ----- Aliases kebab -> canon BACnet (camelCase)
_OBJ_TYPE_ALIASES = {
    "analog-input": "analogInput",
    "analog-output": "analogOutput",
    "binary-input": "binaryInput",
    "binary-output": "binaryOutput",
    "multi-state-input": "multiStateInput",
    "multi-state-output": "multiStateOutput",
    "analog-value": "analogValue",
    "binary-value": "binaryValue",
    "multi-state-value": "multiStateValue",
    "large-analog-value": "largeAnalogValue",
    "integer-value": "integerValue",
    "positive-integer-value": "positiveIntegerValue",
    "loop": "loop",
    "accumulator": "accumulator",
    "pulse-converter": "pulseConverter",
    "trend-log": "trendLog",
    "notification-class": "notificationClass",
    "network-port": "networkPort",
    "file": "file",
    "program": "program",
    "device": "device",
    "schedule": "schedule",
}

def _to_kebab(s: str) -> str:
    out = []
    for i, ch in enumerate(s):
        if ch.isupper() and i > 0 and (s[i-1].islower() or (i+1 < len(s) and s[i+1].islower())):
            out.append('-')
        out.append(ch.lower())
    return ''.join(out)

def _normalize_obj_type(t: str) -> str:
    return _OBJ_TYPE_ALIASES.get(t, t)

# ----- Ensemble COEUR demandé: MV, AV, BV, BO, AO (pour decouverte_objects)
_SET_CORE = {"multiStateValue", "analogValue", "binaryValue", "binaryOutput", "analogOutput"}

# ----- Propriétés lourdes à éviter par défaut (special)
_HEAVY_PROPS = {
    "logBuffer", "weeklySchedule", "exceptionSchedule", "recipientList",
    "activeCovSubscriptions", "objectList", "fileRecordData"
}

# ----- Enum objectType → code numérique (fallback)
_TYPE_ENUM = {
    # Base
    "analogInput": 0,
    "analogOutput": 1,
    "analogValue": 2,
    "binaryInput": 3,
    "binaryOutput": 4,
    "binaryValue": 5,
    "device": 8,
    "file": 10,
    "loop": 12,
    "multiStateInput": 13,
    "multiStateOutput": 14,
    "notificationClass": 15,
    "program": 16,
    "schedule": 17,
    "multiStateValue": 19,
    "trendLog": 20,
    "accumulator": 23,
    "pulseConverter": 24,
    # Étendus (selon firmware)
    "largeAnalogValue": 50,
    "integerValue": 51,
    "positiveIntegerValue": 52,
    "networkPort": 56,
}

# ----- Helpers OID (parsing + liste + lecture safe + résolution robuste)

def _parse_oid_from_objectlist_item(oid: Any) -> Optional[Tuple[str, int, Any]]:
    """
    Convertit un item d'objectList en (type_canon, instance, oid_pour_lecture).
    - Réutilise l'OID bacpypes3 original quand disponible (meilleure compat).
    - Sinon reconstruit un ObjectIdentifier canonique "type,instance".
    """
    try:
        if hasattr(oid, "objectType"):
            t_raw = str(oid.objectType)  # parfois 'analog-value', parfois 'analogValue'
            t = _normalize_obj_type(t_raw) if "-" in t_raw else t_raw
            inst = int(getattr(oid, "instanceNumber", getattr(oid, "objectInstance")))
            return t, inst, oid
        if isinstance(oid, (tuple, list)) and len(oid) == 2:
            t_raw, i = oid
            t = _normalize_obj_type(str(t_raw))
            inst = int(i)
            return t, inst, ObjectIdentifier(f"{t},{inst}")
        if isinstance(oid, str) and "," in oid:
            t_raw, i = oid.split(",", 1)
            t = _normalize_obj_type(t_raw.strip())
            inst = int(i.strip())
            return t, inst, ObjectIdentifier(f"{t},{inst}")
    except Exception:
        return None
    return None

async def _list_all_pairs_with_oid(app_bac, address: Address, device_instance: int) -> List[Tuple[str, int, Any]]:
    """
    Relit device,objectList et retourne liste triée:
      [(type_canon, instance, oid_pour_lecture), ...]
    """
    device_oid = ObjectIdentifier(f"device,{device_instance}")
    object_list = await app_bac.read_property(address, device_oid, "objectList")

    triples: List[Tuple[str, int, Any]] = []
    seen = set()
    for item in object_list or []:
        parsed = _parse_oid_from_objectlist_item(item)
        if not parsed:
            continue
        t, inst, oid_for_read = parsed
        key = (t, inst)
        if key in seen:
            continue
        seen.add(key)
        triples.append((t, inst, oid_for_read))

    triples.sort(key=lambda x: (x[0], x[1]))
    return triples

async def _safe_read(app_bac, address: Address, oid_for_read: Any, prop: str) -> str:
    try:
        val = await app_bac.read_property(address, oid_for_read, prop)
        return str(val)
    except Exception as e:
        return f"N/A ({type(e).__name__})"

async def _resolve_oid_for_read(app_bac, address: Address, t_canon: str, inst: int, oid_from_list: Any):
    """
    Retourne (oid_ok, objectName_val, error_text) après validation via une lecture 'objectName'.
    Essaie: OID original -> "type,instance" -> "(enum,instance)".
    """
    async def _try_read_objname(oid_for_read):
        try:
            val = await app_bac.read_property(address, oid_for_read, "objectName")
            return True, str(val)
        except Exception as e:
            return False, f"N/A ({type(e).__name__})"

    candidates = []
    if hasattr(oid_from_list, "objectType"):
        candidates.append(oid_from_list)
    try:
        candidates.append(ObjectIdentifier(f"{t_canon},{inst}"))
    except Exception:
        pass
    if t_canon in _TYPE_ENUM:
        try:
            candidates.append(ObjectIdentifier((_TYPE_ENUM[t_canon], inst)))
        except Exception:
            pass

    last_err = None
    for cand in candidates:
        ok, name_val = await _try_read_objname(cand)
        if ok:
            return cand, name_val, None
        last_err = name_val
    return None, None, last_err or "N/A (ResolutionFailed)"

# ----- Fallback de propriétés (special)
_KNOWN_PROPS_FALLBACK: Dict[str, List[str]] = {
    "analogValue": ["objectName","description","presentValue","units","statusFlags","outOfService","reliability"],
    "binaryValue": ["objectName","description","presentValue","inactiveText","activeText","statusFlags","outOfService","reliability"],
    "multiStateInput": ["objectName","description","presentValue","stateText","numberOfStates","statusFlags","outOfService","reliability"],
    "multiStateOutput": ["objectName","description","presentValue","stateText","numberOfStates","statusFlags","outOfService","reliability"],
    "trendLog": ["objectName","description","bufferSize","recordCount","logInterval","stopWhenFull","enable"],
    "device": ["objectName","description","vendorName","modelName","firmwareRevision","protocolVersion","protocolServicesSupported"],
    "schedule": ["objectName","description","effectivePeriod","scheduleDefault"],
    "notificationClass": ["objectName","description","priority","ackRequired"],
    "networkPort": ["objectName","description","networkType","protocolLevel","macAddress"],
    "file": ["objectName","description","fileSize","fileType"],
    "program": ["objectName","description","programState","reasonForHalt"],
    "loop": ["objectName","description","presentValue","statusFlags","reliability"],
    "accumulator": ["objectName","description","presentValue","units","scale","maxPresValue"],
    "pulseConverter": ["objectName","description","presentValue","units"],
}

# ===================== 1) decouverte_objects (MV/AV/BV/BO/AO minimal) =====================
@mcp.tool
async def decouverte_objects(
    host: str,
    device_instance: int,
    offset: int = 0,
    limit: int = 10,
    concurrency: int = 6,
) -> Dict[str, Any]:
    """
    Découverte (MV/AV/BV/BO/AO).
    Lit SEULEMENT: objectName, description, presentValue (pagination).
    Résolution OID robuste (original -> canon -> numérique). Erreurs au niveau item.
    """
    try:
        app_bac = await get_bacnet_app()
        address = Address(host.strip())

        all_triples = await _list_all_pairs_with_oid(app_bac, address, device_instance)
        # Filtre sur l'ensemble COEUR
        all_triples = [(t, i, oid) for (t, i, oid) in all_triples if t in _SET_CORE]

        total = len(all_triples)
        start = max(0, int(offset))
        end   = min(total, start + int(limit))
        page  = all_triples[start:end]

        if total == 0 or not page:
            return {"status":"success","host":host,"device_instance":device_instance,
                    "total":total,"items":[],"offset":start,"limit":limit,"next_offset":None}

        sem = asyncio.Semaphore(concurrency)

        async def _read_one(t_canon: str, inst: int, oid_from_list: Any) -> Dict[str, Any]:
            disp_type = _to_kebab(t_canon)
            base_out = {"type": disp_type, "instance": inst}
            try:
                async with sem:
                    oid_ok, objname_val, err = await _resolve_oid_for_read(app_bac, address, t_canon, inst, oid_from_list)
                    if oid_ok is None:
                        return {**base_out, "objectName":"N/A", "description":"N/A", "presentValue":"N/A", "error": err}
                    desc = await _safe_read(app_bac, address, oid_ok, "description")
                    pval = await _safe_read(app_bac, address, oid_ok, "presentValue")
                    return {**base_out, "objectName": objname_val, "description": desc, "presentValue": pval}
            except Exception as e:
                return {**base_out, "objectName":"N/A", "description":"N/A", "presentValue":"N/A", "error": f"{type(e).__name__}"}

        items = await asyncio.gather(*[_read_one(t, i, oid) for (t, i, oid) in page])
        next_offset = end if end < total else None

        return {"status":"success","host":host,"device_instance":device_instance,
                "total":total,"items":items,"offset":start,"limit":limit,"next_offset":next_offset}

    except BaseException as e:
        logger.error(f"Erreur decouverte_objects: {e}", exc_info=True)
        return {"status":"error","message":f"decouverte_objects échec (offset={offset}, limit={limit})",
                "details": _format_error_details(e)}

# ===================== 2) decouverte_objects_special (autres, toutes props) =====================
async def _read_all_properties_for_oid(app_bac, address: Address, oid_ok: Any, t_canon: str,
                                       include_heavy: bool, prop_concurrency: int = 12) -> Dict[str, str]:
    """
    Lit toutes les propriétés disponibles (propertyList si possible, sinon fallback).
    Évite _HEAVY_PROPS si include_heavy=False.
    """
    props: List[str] = []
    try:
        plist = await app_bac.read_property(address, oid_ok, "propertyList")
        for p in list(plist):
            pn = str(p)
            if not include_heavy and pn in _HEAVY_PROPS:
                continue
            props.append(pn)
        props = sorted(set(props))
    except Exception:
        props = _KNOWN_PROPS_FALLBACK.get(t_canon, ["objectName","description"])

    out: Dict[str, str] = {}
    sem = asyncio.Semaphore(prop_concurrency)

    async def _read_prop(p: str):
        async with sem:
            out[p] = await _safe_read(app_bac, address, oid_ok, p)

    await asyncio.gather(*[_read_prop(p) for p in props])
    return out

@mcp.tool
async def decouverte_objects_special(
    host: str,
    device_instance: int,
    offset: int = 0,
    limit: int = 10,
    type_filter: Optional[str] = None,   # ex: "trend-log", "loop", etc. (kebab ou canon)
    include_heavy: bool = False,         # True pour inclure logBuffer, weeklySchedule, objectList, ...
    concurrency: int = 3,                # objets traités en parallèle
    prop_concurrency: int = 12,          # lectures de propriétés en parallèle par objet
) -> Dict[str, Any]:
    """
    Découverte SPÉCIALE — tous les objets SAUF (MV/AV/BV/BO/AO).
    - Résolution OID robuste (original -> canon -> numérique)
    - Lecture via propertyList (fallback sur liste connue)
    - Évite les props lourdes par défaut (include_heavy=False)
    - Erreurs renvoyées au niveau item (la page n'échoue pas)
    """
    try:
        app_bac = await get_bacnet_app()
        address = Address(host.strip())

        all_triples = await _list_all_pairs_with_oid(app_bac, address, device_instance)
        # Exclure le cœur (MV/AV/BV/BO/AO)
        others = [(t, i, oid) for (t, i, oid) in all_triples if t not in _SET_CORE]

        # Filtre optionnel
        if type_filter:
            tf = _normalize_obj_type(type_filter.strip()) if "-" in type_filter else type_filter.strip()
            others = [(t, i, oid) for (t, i, oid) in others if t == tf]

        total = len(others)
        start = max(0, int(offset))
        end   = min(total, start + int(limit))
        page  = others[start:end]

        if total == 0 or not page:
            return {"status":"success","host":host,"device_instance":device_instance,
                    "total":total,"items":[],"offset":start,"limit":limit,
                    "next_offset":None,"include_heavy":include_heavy}

        sem_items = asyncio.Semaphore(concurrency)

        async def _read_one(t_canon: str, inst: int, oid_from_list: Any) -> Dict[str, Any]:
            disp_type = _to_kebab(t_canon)
            base_out = {"type": disp_type, "instance": inst}
            try:
                async with sem_items:
                    oid_ok, objname_val, err = await _resolve_oid_for_read(app_bac, address, t_canon, inst, oid_from_list)
                    if oid_ok is None:
                        return {**base_out, "properties": {"objectName":"N/A","description":"N/A"}, "error": err}
                    props = await _read_all_properties_for_oid(app_bac, address, oid_ok, t_canon, include_heavy, prop_concurrency)
                    # Si objectName déjà lu lors de la résolution, l'injecter si absent
                    if objname_val:
                        props.setdefault("objectName", objname_val)
                    return {**base_out, "properties": props}
            except Exception as e:
                return {**base_out, "properties": {"objectName":"N/A","description":"N/A"}, "error": f"{type(e).__name__}"}

        items = await asyncio.gather(*[_read_one(t, i, oid) for (t, i, oid) in page])
        next_offset = end if end < total else None

        return {"status":"success","host":host,"device_instance":device_instance,
                "total":total,"items":items,"offset":start,"limit":limit,
                "next_offset":next_offset,"include_heavy":include_heavy}

    except BaseException as e:
        logger.error(f"Erreur decouverte_objects_special: {e}", exc_info=True)
        return {"status":"error","message":f"decouverte_objects_special échec (offset={offset}, limit={limit})",
                "details": _format_error_details(e)}
# ================== WHO-IS / I-AM discovery ==================
from typing import Any, Dict, List, Optional
import asyncio, time

from bacpypes3.pdu import Address
from bacpypes3.primitivedata import ObjectIdentifier
from bacpypes3.apdu import WhoIsRequest  # fallback en APDU brut

# Petit cache en mémoire (instance -> info)
_DEVICE_CACHE: Dict[int, Dict[str, Any]] = {}
_DEVICE_CACHE_EXP: Dict[int, float] = {}  # expiration par instance

def _now() -> float:
    return time.monotonic()

def _cache_get_all() -> List[Dict[str, Any]]:
    now = _now()
    out = []
    dead = []
    for inst, info in _DEVICE_CACHE.items():
        if _DEVICE_CACHE_EXP.get(inst, 0) > now:
            out.append(info)
        else:
            dead.append(inst)
    for inst in dead:
        _DEVICE_CACHE.pop(inst, None)
        _DEVICE_CACHE_EXP.pop(inst, None)
    return out

def _cache_put(info: Dict[str, Any], ttl: float):
    inst = int(info["instance"])
    _DEVICE_CACHE[inst] = info
    _DEVICE_CACHE_EXP[inst] = _now() + max(1.0, float(ttl))

def _parse_addr(addr: Any) -> Dict[str, Any]:
    """
    Convertit une Address bacpypes3 en (ip, port, raw).
    """
    s = str(addr)  # ex "192.168.1.7:47808" ou "192.168.1.7"
    if ":" in s:
        ip, p = s.rsplit(":", 1)
        try:
            port = int(p)
        except Exception:
            port = 47808
    else:
        ip, port = s, 47808
    return {"ip": ip, "port": port, "raw": s}

@mcp.tool
async def discover_devices_IAM(
    timeout: float = 3.0,
    low: Optional[int] = None,
    high: Optional[int] = None,
    broadcast: str = "255.255.255.255",
    port: int = 47808,
    use_cache: bool = True,
    cache_ttl: float = 3600.0,           # 1 h
    refresh: bool = False,               # True => ignore cache et renvoie uniquement les nouveaux I-Am
    directed_targets: Optional[List[str]] = None,  # ex: ["192.168.1.7", "192.168.1.8:47808"]
) -> Dict[str, Any]:
    """
    Découverte d'équipements via Who-Is / I-Am.
    - Envoie Who-Is en broadcast (et éventuellement en unicast dirigé)
    - Écoute les I-Am pendant `timeout` secondes
    - Retourne une liste unique (par instance) avec IP, port, vendor, segmentation, maxAPDU
    - Cache TTL pour limiter le trafic
    """
    try:
        app = await get_bacnet_app()

        # --- Collecteur I-Am (patch non-invasif & réversible)
        iam_events: Dict[int, Dict[str, Any]] = {}
        orig_indication = getattr(app, "indication", None)

        async def patched_indication(apdu, pdu_address):
            """
            Capture les I-Am, puis chaîne vers l'indication originale.
            """
            try:
                cname = apdu.__class__.__name__.lower()
                if "iam" in cname or "i_am" in cname:
                    # Champs standard I-Am
                    try:
                        dev_id = getattr(apdu, "iAmDeviceIdentifier", None)
                        if dev_id is not None:
                            # dev_id = (objectType, instance)release_priority
                            instance = int(dev_id[1])
                        else:
                            # fallback (rare)
                            instance = int(getattr(apdu, "deviceInstance", getattr(apdu, "device_identifier", 0)))
                    except Exception:
                        instance = 0

                    try:
                        max_apdu = int(getattr(apdu, "maxAPDULengthAccepted", 0))
                    except Exception:
                        max_apdu = 0
                    try:
                        segmentation = str(getattr(apdu, "segmentationSupported", "unknown"))
                    except Exception:
                        segmentation = "unknown"
                    try:
                        vendor = int(getattr(apdu, "vendorID", -1))
                    except Exception:
                        vendor = -1

                    addr = _parse_addr(pdu_address)
                    iam_events[instance] = {
                        "instance": instance,
                        "ip": addr["ip"],
                        "port": addr["port"],
                        "max_apdu": max_apdu,
                        "segmentation": segmentation,
                        "vendor_id": vendor,
                        "address": addr["raw"],
                        "ts": time.time(),
                    }
            except Exception:
                pass

            if orig_indication:
                if asyncio.iscoroutinefunction(orig_indication):
                    await orig_indication(apdu, pdu_address)
                else:
                    orig_indication(apdu, pdu_address)

        # Patch
        setattr(app, "indication", patched_indication)

        # --- Envoi Who-Is (broadcast + unicast ciblé si fourni)
        bcast_addr = Address(f"{broadcast}:{port}") if ":" not in broadcast else Address(broadcast)

        async def send_whois_to(addr: Address):
            # 1) Si l'app expose une méthode high-level
            for variant in ("who_is", "whois", "WhoIs"):
                fn = getattr(app, variant, None)
                if fn and asyncio.iscoroutinefunction(fn):
                    try:
                        await fn(low, high, addr)  # signature (low, high, address) fréquente
                        return
                    except TypeError:
                        try:
                            await fn(address=addr, low_limit=low, high_limit=high)  # autre signature
                            return
                        except Exception:
                            pass
                    except Exception:
                        pass
            # 2) Fallback APDU brut
            req = WhoIsRequest()
            if low is not None:
                try:
                    req.deviceInstanceRangeLowLimit = int(low)
                except Exception:
                    pass
            if high is not None:
                try:
                    req.deviceInstanceRangeHighLimit = int(high)
                except Exception:
                    pass
            try:
                await app.request(req, addr)
            except Exception:
                # dernier essai : certains stacks prennent Address("ip:port") ou juste "ip"
                try:
                    await app.request(req, Address(str(addr)))
                except Exception:
                    pass

        # Broadcast principal (deux impulsions légères pour robustesse)
        await send_whois_to(bcast_addr)
        await asyncio.sleep(0.3)
        await send_whois_to(bcast_addr)

        # Unicast dirigé (si précisé)
        if directed_targets:
            for target in directed_targets:
                taddr = Address(target if ":" in target else f"{target}:{port}")
                await send_whois_to(taddr)

        # --- Fenêtre d'écoute
        await asyncio.sleep(max(0.05, float(timeout)))

        # Restaure l'indication d'origine
        setattr(app, "indication", orig_indication)

        # --- Fusion avec le cache
        out_map: Dict[int, Dict[str, Any]] = {}
        # 1) Start from cache (si autorisé)
        if use_cache and not refresh:
            for info in _cache_get_all():
                out_map[int(info["instance"])] = dict(info)

        # 2) Merge nouveaux I-Am (cache + sortie)
        for inst, info in iam_events.items():
            _cache_put(info, cache_ttl)
            out_map[int(inst)] = dict(info)

        # --- Sortie ordonnée par instance
        items = list(sorted(out_map.values(), key=lambda x: int(x["instance"])))
        return {
            "status": "success",
            "received": len(iam_events),
            "cached": len(items) - len(iam_events) if use_cache and not refresh else 0,
            "items": items,
            "low": low,
            "high": high,
            "broadcast": f"{broadcast}:{port}",
            "timeout": timeout,
        }

    except BaseException as e:
        # Essayer de restaurer l'indication si besoin
        try:
            if 'app' in locals():
                orig_indication = locals().get('orig_indication', None)
                if orig_indication is not None:
                    setattr(app, "indication", orig_indication)
        except Exception:
            pass

        logger.error(f"Erreur discover_devices: {e}", exc_info=True)
        return {"status": "error", "message": "Erreur de découverte BACnet", "details": _format_error_details(e)}
# ================== end discovery ==================
# ---------- HTTP wrapper autour de FastMCP ----------
try:
    from fastapi import FastAPI
    from fastapi.staticfiles import StaticFiles
except Exception as e:
    raise

main_app = FastAPI(title='BACnet MCP', version=__version__)
@main_app.get('/health')
def _health(): return {'status':'ok','version': __version__}

# (optionnel) servir /static si le dossier existe
try:
    main_app.mount('/static', StaticFiles(directory='static'), name='static')
except Exception:
    pass

# Monter FastMCP sous /mcp
_mcp_http = mcp.http_app()
main_app.mount('/mcp', _mcp_http)

# ============================================================================== end monobloc
# ---------- HTTP wrapper autour de FastMCP ----------
try:
    from fastapi import FastAPI
    from fastapi.staticfiles import StaticFiles
except Exception:
    raise

main_app = FastAPI(title='BACnet MCP', version=__version__)
@main_app.get('/health')
def _health(): return {'status':'ok','version': __version__}

# (optionnel) servir /static si le dossier existe
try:
    main_app.mount('/static', StaticFiles(directory='static'), name='static')
except Exception:
    pass

# Monter FastMCP sous /mcp
_mcp_http = mcp.http_app()
main_app.mount('/mcp', _mcp_http)

# Exposer l'app finale
app = main_app
# ---------- HTTP wrapper autour de FastMCP ----------
try:
    from fastapi import FastAPI
    from fastapi.staticfiles import StaticFiles
except Exception:
    raise

main_app = FastAPI(title='BACnet MCP', version=__version__)
@main_app.get('/health')
def _health(): return {'status':'ok','version': __version__}

# (optionnel) servir /static si le dossier existe
try:
    main_app.mount('/static', StaticFiles(directory='static'), name='static')
except Exception:
    pass

# Exposer l'app finale

if __name__ == "__main__":
    print(f"🚀 Démarrage du serveur MCP BACnet v{__version__}")
    print("📍 Interface web: http://0.0.0.0:8050")
    print("🔧 Serveur MCP: http://0.0.0.0:8050/mcp/")
    print("📚 Documentation API: http://0.0.0.0:8050/docs")
    print("💚 Santé: http://0.0.0.0:8050/health")
    print("=" * 60)
    
    mcp.run(
        transport="http",
        host="0.0.0.0",
        port=8050,
        path="/mcp/",
        log_level="info"
    )
