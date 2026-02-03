import json
import os
import glob
import sqlite3
import csv
import io
import re
from typing import Dict, List, Any, Optional

# =====================================================
# COMPLETE HAYSTACK 4 TAG LIBRARY
# For Auto-Tagging and Manual UI
# =====================================================
HAYSTACK_TAG_GROUPS = {
    "structure": {"label_fr": "Structure", "label_en": "Structure"},
    "pointType": {"label_fr": "Type de Point", "label_en": "Point Type"},
    "medium": {"label_fr": "M\u00E9dium / Fluide", "label_en": "Medium / Fluid"},
    "function": {"label_fr": "Fonction / Mesure", "label_en": "Function / Measure"},
    "position": {"label_fr": "Position", "label_en": "Position"},
    "state": {"label_fr": "\u00C9tat / Mode", "label_en": "State / Mode"},
    "equipment": {"label_fr": "\u00C9quipement", "label_en": "Equipment"},
    "bacnetObject": {"label_fr": "Type BACnet", "label_en": "BACnet Type"}
}

HAYSTACK_TAGS_LIBRARY = {
    "structure": {
        "tags": [
            {"value": "site", "label_fr": "\ud83c\udfe2 Site (B\u00E2timent)", "label_en": "\ud83c\udfe2 Site (Building)", "keywords": ["site", "batiment", "building", "immeuble", "campus"]},
            {"value": "floor", "label_fr": "\ud83d\uddfa Floor (\u00C9tage)", "label_en": "\ud83d\uddfa Floor", "keywords": ["floor", "etage", "niveau", "level", "rez", "rdc", "ss"]},
            {"value": "space", "label_fr": "\ud83c\udfe0 Space (Espace)", "label_en": "\ud83c\udfe0 Space", "keywords": ["space", "room", "local", "piece", "zone", "corridor", "hall"]},
        ]
    },
    "pointType": {
        "tags": [
            {"value": "sensor", "label_fr": "\ud83d\udcca Sensor (Capteur)", "label_en": "\ud83d\udcca Sensor", "keywords": ["sensor", "sonde", "mesure", "capteur", "input", "ai", "bi"]},
            {"value": "cmd", "label_fr": "\ud83c\udf9b\ufe0f Command (Commande)", "label_en": "\ud83c\udf9b\ufe0f Command", "keywords": ["cmd", "command", "commande", "ordre", "output", "ao", "bo"]},
            {"value": "sp", "label_fr": "\ud83c\udfaf Setpoint (Consigne)", "label_en": "\ud83c\udfaf Setpoint", "keywords": ["sp", "setpoint", "consigne", "stp", "target"]},
            {"value": "writable", "label_fr": "\u270f\ufe0f Writable", "label_en": "\u270f\ufe0f Writable", "keywords": ["writable", "write", "ecriture"]},
            {"value": "his", "label_fr": "\ud83d\udcc8 Historized", "label_en": "\ud83d\udcc8 Historized", "keywords": ["his", "history", "historique", "trend", "log"]},
            {"value": "cur", "label_fr": "\ud83d\udd34 Current Value", "label_en": "\ud83d\udd34 Current Value", "keywords": ["cur", "current", "actuel", "live"]},
        ]
    },
    "medium": {
        "tags": [
            {"value": "air", "label_fr": "\ud83d\udca8 Air", "label_en": "\ud83d\udca8 Air", "keywords": ["air", "vent", "ventil", "souffl"]},
            {"value": "water", "label_fr": "\ud83d\udca7 Water (Eau)", "label_en": "\ud83d\udca7 Water", "keywords": ["water", "eau", "ecs", "efs", "hydro"]},
            {"value": "chilled", "label_fr": "\u2744\ufe0f Chilled Water (Eau glac\u00E9e)", "label_en": "\u2744\ufe0f Chilled Water", "keywords": ["chilled", "glacee", "froid", "chw", "cwh"]},
            {"value": "hot", "label_fr": "\ud83d\udd25 Hot Water (Eau chaude)", "label_en": "\ud83d\udd25 Hot Water", "keywords": ["hot", "chaude", "hhw", "hw", "chaud"]},
            {"value": "condenser", "label_fr": "\ud83c\udf21\ufe0f Condenser Water", "label_en": "\ud83c\udf21\ufe0f Condenser Water", "keywords": ["condenser", "condenseur", "cw"]},
            {"value": "steam", "label_fr": "\u2668\ufe0f Steam (Vapeur)", "label_en": "\u2668\ufe0f Steam", "keywords": ["steam", "vapeur", "stm"]},
            {"value": "elec", "label_fr": "\u26a1 Electricity", "label_en": "\u26a1 Electricity", "keywords": ["elec", "electr", "courant", "power", "puissance"]},
            {"value": "gas", "label_fr": "\ud83d\udd25 Gas (Gaz)", "label_en": "\ud83d\udd25 Gas", "keywords": ["gas", "gaz", "methane"]},
            {"value": "naturalGas", "label_fr": "\ud83d\udd25 Natural Gas", "label_en": "\ud83d\udd25 Natural Gas", "keywords": ["natural", "naturel", "gn"]},
            {"value": "refrig", "label_fr": "\ud83e\ ice Refrigerant", "label_en": "\ud83e\ ice Refrigerant", "keywords": ["refrig", "frigo", "r410", "r22", "r134"]},
            {"value": "oil", "label_fr": "\ud83d\udee2\ufe0f Oil (Fioul)", "label_en": "\ud83d\udee2\ufe0f Oil", "keywords": ["oil", "fioul", "fuel", "huile"]},
            {"value": "domestic", "label_fr": "\ud83d\udebf Domestic Water", "label_en": "\ud83d\udebf Domestic Water", "keywords": ["domestic", "potable", "sanitaire"]},
        ]
    },
    "function": {
        "tags": [
            {"value": "temp", "label_fr": "🌡️ Temperature", "label_en": "🌡️ Temperature", "keywords": ["temp", "température", "t°", "degre", "celsius"]},
            {"value": "humidity", "label_fr": "💧 Humidity (Humidité)", "label_en": "💧 Humidity", "keywords": ["humidity", "humidite", "rh", "hr", "hygro"]},
            {"value": "pressure", "label_fr": "📏 Pressure (Pression)", "label_en": "📏 Pressure", "keywords": ["pressure", "pression", "bar", "pascal", "psi", "dp", "filtre", "filter"]},
            {"value": "flow", "label_fr": "🌊 Flow (Débit)", "label_en": "🌊 Flow", "keywords": ["flow", "debit", "volume", "l/s", "m3/h"]},
            {"value": "level", "label_fr": "📊 Level (Niveau)", "label_en": "📊 Level", "keywords": ["level", "niveau", "tank", "reservoir"]},
            {"value": "speed", "label_fr": "⚡ Speed (Vitesse)", "label_en": "⚡ Speed", "keywords": ["speed", "vitesse", "rpm", "hz", "frequence"]},
            {"value": "energy", "label_fr": "⚡ Energy (Énergie)", "label_en": "⚡ Energy", "keywords": ["energy", "energie", "kwh", "mwh", "conso"]},
            {"value": "co2", "label_fr": "🌿 CO2", "label_en": "🌿 CO2", "keywords": ["co2", "carbone", "dioxyde"]},
            {"value": "power", "label_fr": "🔌 Power (Puissance)", "label_en": "🔌 Power", "keywords": ["power", "puissance", "kw", "watt"]},
        ]
    },
    "position": {
        "tags": [
            {"value": "discharge", "label_fr": "➡️ Discharge (Soufflage)", "label_en": "➡️ Discharge", "keywords": ["discharge", "soufflage", "supply", "sortie", "pulsion", "pulsa", "sa"]},
            {"value": "return", "label_fr": "⬅️ Return (Reprise)", "label_en": "⬅️ Return", "keywords": ["return", "reprise", "retour", "ret", "ra"]},
            {"value": "mixed", "label_fr": "🔀 Mixed (Mélange)", "label_en": "🔀 Mixed", "keywords": ["mixed", "melange", "mix", "ma"]},
            {"value": "outside", "label_fr": "🌳 Outside (Extérieur)", "label_en": "🌳 Outside", "keywords": ["outside", "outdoor", "ext", "exterieur", "oat", "oa"]},
            {"value": "zone", "label_fr": "🏠 Zone (Local)", "label_en": "🏠 Zone", "keywords": ["zone", "local", "room", "piece", "ambiance"]},
        ]
    },
    "state": {
        "tags": [
            {"value": "run", "label_fr": "▶️ Run (Marche)", "label_en": "▶️ Run", "keywords": ["run", "marche", "running", "on", "active", "enable", "start"]},
            {"value": "alarm", "label_fr": "🚨 Alarm (Alarme)", "label_en": "🚨 Alarm", "keywords": ["alarm", "alarme", "alm", "alert"]},
            {"value": "fault", "label_fr": "⚠️ Fault (Défaut)", "label_en": "⚠️ Fault", "keywords": ["fault", "defaut", "flt", "erreur", "panne", "security", "securite"]},
        ]
    },
    "equipment": {
        "tags": [
            {"value": "ahu", "label_fr": "🏭 AHU (CTA)", "label_en": "🏭 AHU", "keywords": ["ahu", "cta", "centrale", "air handling"]},
            {"value": "vav", "label_fr": "📦 VAV (Boîte VAV)", "label_en": "📦 VAV", "keywords": ["vav", "variable", "terminal"]},
            {"value": "fcu", "label_fr": "🌬️ FCU (Ventilo-conv.)", "label_en": "🌬️ FCU", "keywords": ["fcu", "ventilo", "convecteur", "fan coil", "fancoil"]},
            {"value": "chiller", "label_fr": "❄️ Chiller (Gr. froid)", "label_en": "❄️ Chiller", "keywords": ["chiller", "groupe froid", "refroidisseur", "gf"]},
            {"value": "boiler", "label_fr": "🔥 Boiler (Chaudière)", "label_en": "🔥 Boiler", "keywords": ["boiler", "chaudiere", "chaud"]},
            {"value": "fan", "label_fr": "🛸 Fan (Ventilateur)", "label_en": "🛸 Fan", "keywords": ["fan", "ventilateur", "ventilo", "extraction", "pulsation"]},
            {"value": "pump", "label_fr": "🔄 Pump (Pompe)", "label_en": "🔄 Pump", "keywords": ["pump", "pompe", "circulateur"]},
        ]
    },
    "bacnetObject": {
        "tags": [
            {"value": "analogInput", "label_fr": "AI - Analog Input", "label_en": "AI - Analog Input", "keywords": ["ai", "analog input", "analoginput"]},
            {"value": "analogOutput", "label_fr": "AO - Analog Output", "label_en": "AO - Analog Output", "keywords": ["ao", "analog output", "analogoutput"]},
            {"value": "analogValue", "label_fr": "AV - Analog Value", "label_en": "AV - Analog Value", "keywords": ["av", "analog value", "analogvalue"]},
            {"value": "binaryInput", "label_fr": "BI - Binary Input", "label_en": "BI - Binary Input", "keywords": ["bi", "binary input", "binaryinput"]},
            {"value": "binaryOutput", "label_fr": "BO - Binary Output", "label_en": "BO - Binary Output", "keywords": ["bo", "binary output", "binaryoutput"]},
            {"value": "binaryValue", "label_fr": "BV - Binary Value", "label_en": "BV - Binary Value", "keywords": ["bv", "binary value", "binaryvalue"]},
        ]
    }
}

def get_grouped_library(lang: str = "fr") -> Dict[str, Any]:
    """Returns the library grouped by category with the selected language labels."""
    result = {}
    for cat_id, cat_meta in HAYSTACK_TAG_GROUPS.items():
        tags = []
        lib_data = HAYSTACK_TAGS_LIBRARY.get(cat_id, {"tags": []})
        for t in lib_data["tags"]:
            tags.append({
                "value": t["value"],
                "label": t.get(f"label_{lang}", t.get("label_en", t["value"])),
                "keywords": t["keywords"]
            })
        result[cat_id] = {
            "label": cat_meta.get(f"label_{lang}", cat_meta.get("label_en", cat_id)),
            "tags": tags
        }
    return result

def get_all_tag_keywords() -> Dict[str, List[str]]:
    """Build a flat mapping of tag value -> keywords for auto-tagging."""
    result = {}
    for category in HAYSTACK_TAGS_LIBRARY.values():
        for tag in category["tags"]:
            result[tag["value"]] = tag["keywords"]
    return result



class HaystackService:
    def __init__(self, lib_path: str = "xeto/lib", db_path: str = "data/haystack.db"):
        self.lib_path = lib_path
        self.db_path = db_path
        self.schemas: Dict[str, Dict[str, Any]] = {}
        self._init_db()
        self._load_schemas()
        self._seed_if_empty()

    def clear_all_tagging(self):
        """Clear all persistent tags in the database."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM entities")
            conn.commit()
        print("[Haystack] Cleared all persistent tagging.")

    def export_library_to_csv(self) -> str:
        """Export the tag library to a CSV string (Excel compatible)."""
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        writer.writerow(["Category", "Value", "Label_FR", "Label_EN", "Keywords"])
        
        for cat_id, data in HAYSTACK_TAGS_LIBRARY.items():
            for t in data["tags"]:
                writer.writerow([
                    cat_id, 
                    t["value"], 
                    t.get("label_fr", ""), 
                    t.get("label_en", ""), 
                    ",".join(t.get("keywords", []))
                ])
        return output.getvalue()

    def import_library_from_csv(self, csv_content: str):
        """Import/Update the tag library from a CSV string."""
        global HAYSTACK_TAGS_LIBRARY
        new_lib = {}
        
        f = io.StringIO(csv_content)
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            cat = row["Category"]
            if cat not in new_lib:
                new_lib[cat] = {"tags": []}
            
            new_lib[cat]["tags"].append({
                "value": row["Value"],
                "label_fr": row["Label_FR"],
                "label_en": row["Label_EN"],
                "keywords": [k.strip() for k in row["Keywords"].split(",") if k.strip()]
            })
        
        if new_lib:
            HAYSTACK_TAGS_LIBRARY = new_lib
            print(f"[Haystack] Library updated from CSV ({sum(len(c['tags']) for c in new_lib.values())} tags).")

    def _init_db(self):
        """Initialize SQLite database."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS entities (
                    id TEXT PRIMARY KEY,
                    tags_json TEXT
                )
            """)
            conn.commit()


    def _load_schemas(self):
        """
        Simulate loading Xeto schemas. 
        In a real implementation, this would use a proper Xeto parser.
        Here we define a robust mapping based on our .xeto files.
        """
        # Parsing .xeto files is complex. We will implement a simplified registry 
        # that matches the logic we defined in the .xeto files.
        self.schemas = {
            "DashboardSite": {
                "base": "ph::Site",
                "required": ["id", "site", "dis", "geoAddr", "tz"],
                "optional": ["code", "clientName", "area"]
            },
            "Ahu": {
                "base": "ph::Ahu",
                "required": ["id", "equip", "ahu", "siteRef"],
                "optional": ["dis"]
            },
            "Vav": {
                "base": "ph::Vav",
                "required": ["id", "equip", "vav", "siteRef", "ahuRef"],
                "optional": ["dis"]
            },
            "ZoneTemp": {
                "base": "ph::ZoneAirTempSensor",
                "required": ["id", "point", "sensor", "zone", "air", "temp", "equipRef", "kind", "unit"],
                "validation": {"unit": "°C", "kind": "Number"}
            },
            "ZoneSetpoint": {
                "base": "ph::ZoneAirTempSp",
                "required": ["id", "point", "cmd", "zone", "air", "temp", "equipRef", "kind", "unit"],
                "validation": {"unit": "°C", "kind": "Number"}
            }
        }
        print(f"[Haystack] Loaded {len(self.schemas)} Xeto schemas.")

    # =====================================================
    # AI / AUTO-TAGGING
    # =====================================================
    # =====================================================
    # AI / AUTO-TAGGING
    # =====================================================
    def generate_tags_from_name(self, name: str, unit: str = "", description: str = "", object_name: str = "", commandable: bool = False) -> Dict[str, Any]:
        """
        Enhanced heuristic function to guess tags based on name, unit, description.
        Returns a dictionary containing matched tags and metadata.
        """
        # Initialize result with metadata
        result = {
            "id": name, 
            "dis": name,
            "kind": "Number", # Default kind
            "_is_marker": set() # Internal helper to distinguish marker tags
        }
        
        # Build combined text for analysis (lowercase)
        combined_text = f"{name} {description} {object_name}".lower()
        
        # Helper to check keywords
        def check_keywords(keywords):
            for k in keywords:
                # Use relaxed REGEX: allow matching if not surrounded by LETTERS.
                # This allows "building" to match "building_0" or "AHU_1" (underscore/digit are ok separators)
                # Pattern: Not preceded by a letter AND Not followed by a letter
                pattern = r'(?<![a-z])' + re.escape(k.lower()) + r'(?![a-z])'
                if re.search(pattern, combined_text):
                    return True
            return False

        # Scan for all matching tags from library
        for category_key, category in HAYSTACK_TAGS_LIBRARY.items():
            for tag_def in category["tags"]:
                if check_keywords(tag_def.get("keywords", [])):
                    tag_val = tag_def["value"]
                    result[tag_val] = True
                    result["_is_marker"].add(tag_val)
        
        # Hierarchy classification (Site/Equip/Point)
        if "site" in result["_is_marker"]:
            pass # already set
        elif "floor" in result["_is_marker"]:
            pass # already set
        elif any(eq in result["_is_marker"] for eq in ["ahu", "vav", "fcu", "rtu", "chiller", "boiler", "pump", "fan", "meter", "panel"]):
            result["equip"] = True
            result["_is_marker"].add("equip")
        else:
            # Default to point if not site/equip
            result["point"] = True
            result["_is_marker"].add("point")
        
        # Point types logic
        if result.get("point"):
            # Setpoint
            if "sp" in result["_is_marker"] or any(x in combined_text for x in ["setpoint", "consigne", "stp", "target", "limite"]):
                result["sp"] = True
                result["_is_marker"].add("sp")
                result["cmd"] = True
                result["_is_marker"].add("cmd")
                result["writable"] = True
                result["_is_marker"].add("writable")
            # Command
            elif "cmd" in result["_is_marker"] or any(x in combined_text for x in ["command", "commande", "output", "ordre", "ao", "bo"]):
                result["cmd"] = True
                result["_is_marker"].add("cmd")
                result["writable"] = True
                result["_is_marker"].add("writable")
            # Sensor
            elif any(fn in result["_is_marker"] for fn in ["temp", "humidity", "pressure", "flow", "co2", "power", "energy", "current", "voltage", "level"]):
                result["sensor"] = True
                result["_is_marker"].add("sensor")
            
            # BACnet specific types
            if "binaryInput" in result["_is_marker"] or "analogInput" in result["_is_marker"]:
                result["sensor"] = True
                result["_is_marker"].add("sensor")
            elif "binaryOutput" in result["_is_marker"] or "analogOutput" in result["_is_marker"]:
                result["cmd"] = True
                result["_is_marker"].add("cmd")
                result["writable"] = True
                result["_is_marker"].add("writable")

        # Handle commandable flag
        if commandable:
            result["cmd"] = True
            result["_is_marker"].add("cmd")
            result["writable"] = True
            result["_is_marker"].add("writable")
        
        # Unit Inference
        inferred_unit = ""
        if "temp" in result["_is_marker"]: inferred_unit = "°C"
        elif "humidity" in result["_is_marker"]: inferred_unit = "%RH"
        elif "pressure" in result["_is_marker"]: inferred_unit = "Pa"
        elif "flow" in result["_is_marker"]: inferred_unit = "m³/h"
        elif "co2" in result["_is_marker"]: inferred_unit = "ppm"
        elif "power" in result["_is_marker"]: inferred_unit = "kW"
        elif "energy" in result["_is_marker"]: inferred_unit = "kWh"
        elif "current" in result["_is_marker"]: inferred_unit = "A"
        elif "voltage" in result["_is_marker"]: inferred_unit = "V"
        elif any(x in result["_is_marker"] for x in ["speed", "level"]): inferred_unit = "%"
        
        if inferred_unit:
            result["unit"] = inferred_unit
            
        # Override unit if provided explicitly
        if unit:
            result["unit"] = unit
        
        # Final cleanup: convert _is_marker to list for consumption if needed, or just let users filter results
        # but to keep it simple, we'll return the dict.
        # We also need to be compatible with both call styles (one arg vs multiple)
        
        return result


    def _seed_if_empty(self):
        """Seed a small database for demonstration if empty."""
        count = 0
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM entities")
            count = cursor.fetchone()[0]
        
        if count == 0:
            print("[Haystack] Seeding database with initial data...")
            mock_data = [
                 {
                    "id": "site_1", "dis": "Campus Eclypse", "site": True,
                    "geoAddr": "Lausanne, CH", "tz": "Europe/Zurich", "code": "ECL_01"
                },
                {
                    "id": "eq_ahu_1", "dis": "AHU-01 South", "equip": True, "ahu": True,
                    "siteRef": "site_1",
                    "manufacturer": "Generic Manufacturer", "modelName": "Model-X", "docUrl": "https://example.com/docs"
                },
                {
                    "id": "zone_101", "dis": "VAV Office 101", "equip": True, "vav": True,
                    "siteRef": "site_1", "ahuRef": "eq_ahu_1"
                },
                {
                    "id": "var_z1_temp", "dis": "Room Temp", "point": True, "sensor": True, 
                    "zone": True, "air": True, "temp": True,
                    "equipRef": "zone_101", "kind": "Number", "unit": "°C",
                    "bacnetConn": {"device": 101, "objectType": "analog-input", "instance": 1}
                },
                {
                    "id": "var_z1_sp", "dis": "Setpoint", "point": True, "cmd": True, 
                    "zone": True, "air": True, "temp": True,
                    "equipRef": "zone_101", "kind": "Number", "unit": "°C"
                },
                # -- AHU-01 Points --
                {
                    "id": "var_temp_supply", "dis": "Supply Temp", "point": True, "sensor": True,
                    "discharge": True, "air": True, "temp": True,
                    "equipRef": "eq_ahu_1", "kind": "Number", "unit": "°C"
                },
                {
                    "id": "var_temp_return", "dis": "Return Temp", "point": True, "sensor": True,
                    "return": True, "air": True, "temp": True,
                    "equipRef": "eq_ahu_1", "kind": "Number", "unit": "°C"
                },
                {
                    "id": "var_fan_speed", "dis": "Fan Speed", "point": True, "cmd": True,
                    "fan": True, "speed": True,
                    "equipRef": "eq_ahu_1", "kind": "Number", "unit": "%"
                },
                {
                    "id": "var_co2", "dis": "CO2 Level", "point": True, "sensor": True,
                    "air": True, "co2": True,
                    "equipRef": "eq_ahu_1", "kind": "Number", "unit": "ppm"
                }
            ]
            self.save_entities(mock_data)

    def save_entities(self, entities: List[Dict[str, Any]]):
        """Save or update entities in DB."""
        with sqlite3.connect(self.db_path) as conn:
            for e in entities:
                conn.execute(
                    "INSERT OR REPLACE INTO entities (id, tags_json) VALUES (?, ?)",
                    (e["id"], json.dumps(e))
                )
            conn.commit()

    def update_entity_tags(self, entity_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update specific tags for an entity."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT tags_json FROM entities WHERE id=?", (entity_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"Entity {entity_id} not found")
            
            tags = json.loads(row[0])
            tags.update(updates) # Merge updates
            
            conn.execute(
                "INSERT OR REPLACE INTO entities (id, tags_json) VALUES (?, ?)",
                (entity_id, json.dumps(tags))
            )
            conn.commit()
            return tags

    def validate_instance(self, instance: Dict[str, Any], type_name: str) -> Dict[str, Any]:
        """
        Validates a dictionary (Haystack dict) against a named Xeto type.
        Returns { valid: bool, errors: [] }
        """
        schema = self.schemas.get(type_name)
        if not schema:
            return {"valid": False, "errors": [f"Unknown type: {type_name}"]}
        
        errors = []
        
        # Check Required Tags
        for tag in schema.get("required", []):
            if tag not in instance:
                errors.append(f"Missing required tag: {tag}")
                
        # Check Value Validation
        validations = schema.get("validation", {})
        for tag, expected_val in validations.items():
            if tag in instance and instance[tag] != expected_val:
                 errors.append(f"Invalid value for {tag}. Expected '{expected_val}', got '{instance[tag]}'")

        return {"valid": len(errors) == 0, "errors": errors}

    

    
    def get_tag_library(self) -> Dict[str, Any]:
        """Return the complete Haystack tag library for UI consumption."""
        return HAYSTACK_TAGS_LIBRARY

    def read_all(self, filter_expr: str = "") -> List[Dict[str, Any]]:
        """
        Simple simulation of a Haystack filter (tags check) over SQL data.
        """
        results = []
        # Basic filter parsing: "equiv and ahu" -> checks tags
        conditions = [c.strip() for c in filter_expr.split(" and ")] if filter_expr else []
        
        with sqlite3.connect(self.db_path) as conn:
            # For simplicity in this demo, we verify tags in Python after fetching.
            # In production, use JSON_EXTRACT or a dedicated column for indexing.
            cursor = conn.execute("SELECT tags_json FROM entities")
            for row in cursor:
                entity = json.loads(row[0])
                match = True
                for cond in conditions:
                    if not cond: continue
                    if "==" in cond:
                        k, v = cond.split("==")
                        k, v = k.strip(), v.strip().strip('"').strip("'")
                        if str(entity.get(k)) != v:
                            match = False; break
                    else:
                        if cond not in entity:
                            match = False; break
                if match:
                    results.append(entity)
                
        return results

    def get_entity(self, id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT tags_json FROM entities WHERE id = ?", (id,))
            row = cursor.fetchone()
            if row:
                return json.loads(row[0])
        return None

    def update_entity(self, id: str, tags: Dict[str, Any], replace: bool = True):
        """Update or create an entity with new tags. By default replaces existing tags."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT tags_json FROM entities WHERE id = ?", (id,))
            row = cursor.fetchone()
            entity = {}
            if row:
                entity = json.loads(row[0])
            
            # Ensure ID is set
            entity["id"] = id
            
            if replace:
                # Identify keys to keep (metadata)
                protected = ["id", "dis", "kind", "unit", "_is_marker"]
                # Keep only protected keys and non-boolean keys (metadata)
                new_entity = {}
                for k, v in entity.items():
                    if k in protected or not isinstance(v, bool):
                        new_entity[k] = v
                # Add new tags (assumed to be markers if True)
                new_entity.update(tags)
                entity = new_entity
            else:
                # Merge logic (keep old tags)
                entity.update(tags)
            
            conn.execute("INSERT OR REPLACE INTO entities (id, tags_json) VALUES (?, ?)", 
                         (id, json.dumps(entity, ensure_ascii=False)))
            conn.commit()
    
    def get_relations_down(self, parent_id: str) -> List[Dict[str, Any]]:
        """Find children (entities referencing this parent)."""
        # Since we store JSON string, we iterate (inefficient but OK for demo)
        # Or use LIKE '%"siteRef": "id"%'
        # Let's use Python iteration for robustness with JSON format variations
        all_entities = self.read_all()
        ret = []
        for e in all_entities:
            for k, v in e.items():
                if k.endswith("Ref") and v == parent_id:
                    ret.append(e)
                    break

        return ret
    
    def export_to_csv(self) -> str:
        """Export all entities to CSV string."""
        entities = self.read_all()
        if not entities:
            return ""
            
        # Collect all unique keys
        keys = set()
        for e in entities:
            keys.update(e.keys())
        
        # Sort keys, ensure 'id' is first
        headers = ["id"] + sorted([k for k in keys if k != "id"])
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        
        for e in entities:
            # Flatten/Stringify complex objects (dicts) for CSV
            row = e.copy()
            for k, v in row.items():
                if isinstance(v, (dict, list)):
                    row[k] = json.dumps(v)
            writer.writerow(row)
            
        return output.getvalue()

    def import_from_csv(self, csv_content: str):
        """Import entities from CSV string."""
        reader = csv.DictReader(io.StringIO(csv_content))
        entities = []
        
        for row in reader:
            entity = {}
            for k, v in row.items():
                if not v: continue # Skip empty strings
                
                # Inference Logic
                if v.lower() == "true":
                    entity[k] = True
                elif v.lower() == "false":
                    entity[k] = False
                elif v.replace(".", "", 1).isdigit() and k != "id" and k != "dis":
                    # Try number if it looks like one (and isn't id/dis)
                    try:
                        if "." in v: entity[k] = float(v)
                        else: entity[k] = int(v)
                    except:
                        entity[k] = v
                elif v.startswith("{") or v.startswith("["):
                    # Try JSON
                    try:
                        entity[k] = json.loads(v)
                    except:
                        entity[k] = v
                else:
                    entity[k] = v
                    
            # Trigger Auto-Tagging using multiple sources for better precision
            # Use id, dis, name, Object Name, AND description for keyword analysis
            name_source = entity.get("dis") or entity.get("name") or ""
            object_name = entity.get("Object Name") or ""
            description = entity.get("description") or ""
            # Combine ALL text sources for comprehensive keyword matching
            combined_text = f"{name_source} {object_name} {description}".lower()
            
            if combined_text.strip():
                 unit = entity.get("unit") or entity.get("Units") or ""
                 if not isinstance(unit, str): unit = ""
                 
                 # Generate tags from combined name + description
                 auto_tags = self.generate_tags_from_name(combined_text, unit)
                 
                 # Add 'cmd' tag if object is commandable
                 if entity.get("commandable") == True or str(entity.get("commandable")).lower() == "true":
                     auto_tags["cmd"] = True
                     auto_tags["writable"] = True
                 
                 # Add limit tags if present
                 if entity.get("hiLimit") is not None:
                     auto_tags["hiLimit"] = entity.get("hiLimit")
                 if entity.get("lowLimit") is not None:
                     auto_tags["lowLimit"] = entity.get("lowLimit")
                 if entity.get("minPresentValue") is not None:
                     auto_tags["minVal"] = entity.get("minPresentValue")
                 if entity.get("maxPresentValue") is not None:
                     auto_tags["maxVal"] = entity.get("maxPresentValue")
                 
                 # Merge: Keep existing CSV values if collision, but add inferred tags
                 for k, v in auto_tags.items():
                     if k not in entity:
                         entity[k] = v
                    
            if "id" in entity:
                entities.append(entity)
        
        if entities:
            self.save_entities(entities)
        return len(entities)

    # =====================================================
    # LIBRARY MANAGEMENT
    # =====================================================

    def get_library(self) -> Dict[str, Any]:
        """Return the full Haystack Tag Library."""
        # TODO: Merge with custom library from JSON if exists
        return HAYSTACK_TAGS_LIBRARY

    def _get_library_path(self):
        """Get absolute path for the custom library file."""
        # Use absolute path relative to this file's directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        return os.path.join(current_dir, "haystack_custom_library.json")

    def update_library(self, new_library: Dict[str, Any]):
        """Update the Tag Library (Customization)."""
        global HAYSTACK_TAGS_LIBRARY
        HAYSTACK_TAGS_LIBRARY = new_library
        
        lib_path = self._get_library_path()
        try:
            print(f"[Haystack] Saving library to {lib_path}")
            with open(lib_path, "w", encoding="utf-8") as f:
                json.dump(new_library, f, indent=2, ensure_ascii=False)
            return True, f"Library updated and saved to {lib_path}"
        except Exception as e:
            error_msg = f"[Haystack] Update Error: {str(e)}"
            print(error_msg)
            return False, error_msg

    def load_custom_library(self):
        """Load custom library if exists."""
        lib_path = self._get_library_path()
        if os.path.exists(lib_path):
            try:
                print(f"[Haystack] Loading library from {lib_path}")
                with open(lib_path, "r", encoding="utf-8") as f:
                    custom_lib = json.load(f)
                    global HAYSTACK_TAGS_LIBRARY
                    HAYSTACK_TAGS_LIBRARY = custom_lib
            except Exception as e:
                print(f"[Haystack] Failed to load custom library: {e}")

    def export_library(self, format: str = "json") -> str:
        """Export library to JSON or CSV."""
        if format == "json":
            return json.dumps(HAYSTACK_TAGS_LIBRARY, indent=2, ensure_ascii=False)
        elif format == "csv":
            # Flatten library to CSV: Category, Tag, Label, Keywords
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["Category", "Tag", "Label", "Keywords"])
            
            for cat_key, cat_data in HAYSTACK_TAGS_LIBRARY.items():
                cat_label = cat_data.get("label", cat_key)
                for tag in cat_data.get("tags", []):
                    keywords = ";".join(tag.get("keywords", []))
                    writer.writerow([cat_key, tag["value"], tag["label"], keywords])
            
            return output.getvalue()
        return ""
