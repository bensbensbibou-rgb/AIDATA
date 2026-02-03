import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
import asyncio
import importlib.util
import csv
import json
import socket
from typing import List, Dict, Any, Optional


# FastMCP client for calling tools (discover_devices)
try:
    from fastmcp import Client as MCPClient
except Exception:
    MCPClient = None

# --- Import bacnet-mcp server ---
# Since the folder has a hyphen, we use importlib
MODULE_PATH = os.path.join(os.getcwd(), "bacnet-mcp", "server.py")
MODULE_NAME = "bacnet_mcp_server"

try:
    spec = importlib.util.spec_from_file_location(MODULE_NAME, MODULE_PATH)
    bacnet_module = importlib.util.module_from_spec(spec)
    sys.modules[MODULE_NAME] = bacnet_module
    # Add bacnet-mcp directory to sys.path so internal imports work
    sys.path.append(os.path.join(os.getcwd(), "bacnet-mcp"))
    spec.loader.exec_module(bacnet_module)
    
    # Get the app and helpers
    mcp_app = bacnet_module.app
    get_bacnet_app = bacnet_module.get_bacnet_app
    reset_bacnet_app = bacnet_module.reset_bacnet_app
    settings = bacnet_module.settings
    bacnet_to_json = bacnet_module.bacnet_to_json
    
    # Import bacpypes3 types needed for object list
    from bacpypes3.pdu import Address
    from bacpypes3.primitivedata import ObjectIdentifier
    from bacpypes3.apdu import ReadPropertyRequest
    from bacpypes3.constructeddata import ArrayOf
    
except Exception as e:
    print(f"Error importing bacnet-mcp server: {e}")
    # Fallback
    mcp_app = None
    async def get_bacnet_app(): return None
    settings = None

from local_utils.bacnet_db import (
    init_db,
    upsert_device,
    upsert_point,
    insert_point_value,
    fetch_points,
    fetch_latest_point_values,
)

# Import EDE Parser
try:
    from ede_parser import ede_parser
except Exception as e:
    print(f"Warning: Could not import ede_parser: {e}")
    ede_parser = None

# Helper: call MCP tools via HTTP client
def _default_mcp_url():
    return os.getenv("BACNET_MCP_URL", "http://localhost:8050/mcp")

def _mcp_timeout() -> float:
    try:
        return float(os.getenv("BACNET_MCP_TIMEOUT", "20"))
    except Exception:
        return 20.0

async def call_mcp_tool(tool: str, params: Dict[str, Any]) -> Dict[str, Any]:
    if MCPClient is None:
        raise RuntimeError("fastmcp client not available")
    async with MCPClient(_default_mcp_url()) as client:
        res = await asyncio.wait_for(client.call_tool(tool, params), timeout=_mcp_timeout())
        return res.structured_content or {}

# Create a new FastAPI app (don't use mcp_app directly as it may not support all features)
app = FastAPI(title="BACnet MCP Wrapper")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebSocket Support ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        stale: List[WebSocket] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                stale.append(connection)
        for conn in stale:
            self.disconnect(conn)

manager = ConnectionManager()

def _bool_env(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return str(val).lower() in ("1", "true", "yes", "on")


def _object_type_name(code: int) -> str:
    """
    Map BACnet object type code to a human-readable string.
    We normalize to the same strings used on the frontend (e.g., analogValue, binaryInput...).
    """
    mapping = {
        0: "analogInput",
        1: "analogOutput",
        2: "analogValue",
        3: "binaryInput",
        4: "binaryOutput",
        5: "binaryValue",
        13: "multiStateInput",
        14: "multiStateOutput",
        19: "multiStateValue",
    }
    return mapping.get(code, str(code))

def _split_address(addr: str, default_host: Optional[str] = None, default_port: Optional[int] = None) -> (str, int):
    if addr and ":" in addr:
        ip, p = addr.rsplit(":", 1)
        try:
            return ip, int(p)
        except Exception:
            return ip, default_port or 47808
    return addr or (default_host or ""), default_port or 47808

async def _resolve_device_host(device_id: int) -> (str, int, int):
    """
    Use discover_devices to resolve IP:port for a device instance.
    Falls back to settings target_host/port.
    """
    fallback_host = getattr(settings.bacnet, "target_host", "127.0.0.1") if settings else "127.0.0.1"
    fallback_port = getattr(settings.bacnet, "target_port", 47808) if settings else 47808
    # Permettre de forcer l'instance cible (ex: 1007) via variable d'env
    try:
        fallback_inst = int(os.getenv("BACNET_MCP_TARGET_INSTANCE", device_id))
    except Exception:
        fallback_inst = device_id
    try:
        data = await call_mcp_tool("discover_devices", {
            "use_broadcast": _bool_env("BACNET_MCP_USE_BROADCAST", False),
            "target_host": settings.bacnet.target_host if settings else None,
            "as_text": False,
        })
        raw = data.get("result") if isinstance(data, dict) else None
        if isinstance(raw, dict):
            for dev in raw.get("items", []):
                try:
                    inst = int(dev.get("instance") or dev.get("device_instance") or dev.get("id") or 0)
                except Exception:
                    inst = -1
                if inst == device_id:
                    addr = dev.get("address") or dev.get("source") or dev.get("ip") or ""
                    ip, port = _split_address(addr, fallback_host, fallback_port)
                    return ip, port, inst
    except Exception:
        pass
    print(f"[resolve_device_host] fallback {fallback_host}:{fallback_port} inst={fallback_inst}")
    return fallback_host, fallback_port, fallback_inst

async def _fetch_objects(host: str, port: int, device_instance: int, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Fetch objects using decouverte_objects (core) + decouverte_objects_special (others).
    """
    items_out: Dict[str, Dict[str, Any]] = {}
    # Instance forcée éventuelle (ex: 1007)
    try:
        target_inst = int(os.getenv("BACNET_MCP_TARGET_INSTANCE", device_instance))
    except Exception:
        target_inst = device_instance

    async def _merge_from(data: Dict[str, Any]):
        if not isinstance(data, dict):
            return
        for obj in data.get("items", []) or []:
            obj_type = obj.get("type") or obj.get("objectType") or "unknown"
            inst = obj.get("instance") or obj.get("objectInstance")
            key = f"{obj_type}:{inst}"
            # Preserve zero/falsey values by checking key existence instead of truthiness
            if "presentValue" in obj:
                present_val = obj.get("presentValue")
            elif "present_value" in obj:
                present_val = obj.get("present_value")
            else:
                present_val = None
            units_val = (
                obj.get("units")
                or obj.get("unit")
                or obj.get("engineeringUnits")
                or obj.get("engineering_units")
            )
            items_out[key] = {
                "id": key,
                "name": obj.get("objectName") or obj.get("name") or f"{obj_type} {inst}",
                "type": obj_type,
                "instance": inst,
                "presentValue": present_val,
                "description": obj.get("description"),
                "units": units_val,
            }

    try:
        data_core = await call_mcp_tool("decouverte_objects", {
            "host": host,
            "device_instance": device_instance,
            "offset": 0,
            "limit": limit,
        })
        await _merge_from(data_core)
    except Exception:
        pass  # core read failed; continue with what we have

    try:
        data_special = await call_mcp_tool("decouverte_objects_special", {
            "host": host,
            "device_instance": device_instance,
            "offset": 0,
            "limit": limit,
            "include_heavy": False,
        })
        await _merge_from(data_special)
    except Exception:
        pass

    # Fallback: si rien remonté, réessayer avec la cible configurée (certains devices ne répondent pas à l'instance remontée par discover)
    if not items_out and settings:
        try:
            data_core = await call_mcp_tool("decouverte_objects", {
                "host": settings.bacnet.target_host,
                "device_instance": getattr(settings.bacnet, "device_instance", target_inst),
                "offset": 0,
                "limit": limit,
            })
            await _merge_from(data_core)
        except Exception:
            pass
        try:
            data_special = await call_mcp_tool("decouverte_objects_special", {
                "host": settings.bacnet.target_host,
                "device_instance": getattr(settings.bacnet, "device_instance", target_inst),
                "offset": 0,
                "limit": limit,
                "include_heavy": False,
            })
            await _merge_from(data_special)
        except Exception:
            pass

    async def _enrich_present_value_and_units():
        """
        Read full properties for objects missing units or presentValue (N/A/None) to expose real values + units.
        """
        if not items_out:
            return
        sem = asyncio.Semaphore(6)

        async def _enrich(item: Dict[str, Any]):
            pv = item.get("presentValue")
            needs_pv = pv is None or (isinstance(pv, str) and pv.upper() == "N/A")
            needs_units = item.get("units") is None
            if not needs_pv and not needs_units:
                return
            try:
                async with sem:
                    data = await call_mcp_tool("read_all_properties", {
                        "host": host,
                        "port": port,
                        "obj_type": item.get("type"),
                        "obj_instance": item.get("instance"),
                    })
                props = data.get("properties", {}) if isinstance(data, dict) else {}
                if needs_pv and isinstance(props, dict):
                    pv_prop = props.get("presentValue")
                    if pv_prop is None:
                        pv_prop = props.get("present_value") or props.get("value") or props.get("status")
                    if pv_prop is not None:
                        item["presentValue"] = pv_prop
                if needs_units and isinstance(props, dict):
                    u = props.get("units") or props.get("engineeringUnits") or props.get("engineering_units") or props.get("unit")
                    if u is not None:
                        item["units"] = u
            except Exception:
                pass

        await asyncio.gather(*[_enrich(item) for item in items_out.values()])

    await _enrich_present_value_and_units()

    return list(items_out.values())

async def _discover_and_enrich(include_objects: bool = False, use_broadcast: Optional[bool] = None,
                               target_host_override: Optional[str] = None, timeout: int = 5, limit_per_device: int = 20):
    """
    Discover devices and optionally attach core objects via decouverte_objects.
    """
    fallback_host = getattr(settings.bacnet, "target_host", None) if settings else None
    fallback_port = getattr(settings.bacnet, "target_port", 47808) if settings else 47808
    fallback_instance = getattr(settings.bacnet, "device_instance", None) if settings else None

    discover_params = {
        "timeout": timeout,
        "use_broadcast": use_broadcast if use_broadcast is not None else _bool_env("BACNET_MCP_USE_BROADCAST", False),
        "as_text": False,
    }
    if target_host_override:
        discover_params["target_host"] = target_host_override
    elif settings:
        discover_params["target_host"] = settings.bacnet.target_host

    try:
        data = await call_mcp_tool("discover_devices", discover_params)
    except Exception as e:
        data = {}

    devices: List[Dict[str, Any]] = []
    raw = data.get("result") if isinstance(data, dict) else None
    items = raw.get("items", []) if isinstance(raw, dict) else []

    for dev in items:
        try:
            inst = int(dev.get("instance") or dev.get("device_instance") or dev.get("id") or 0)
        except Exception:
            inst = 0
        addr = dev.get("address") or dev.get("source") or dev.get("ip") or ""
        ip, port = _split_address(addr, getattr(settings.bacnet, "target_host", None), getattr(settings.bacnet, "target_port", 47808))
        device_entry = {
            "deviceId": inst,
            "address": addr,
            "name": dev.get("objectName") or dev.get("name") or f"Device {inst}",
            "vendor": dev.get("vendor") or dev.get("vendorName"),
            "lastSeen": dev.get("lastSeen"),
            "objects": [],
        }
        if include_objects:
            try:
                device_entry["objects"] = await _fetch_objects(ip, port, inst, limit=limit_per_device)
            except Exception:
                device_entry["objects"] = []
        devices.append(device_entry)

    # Fallback: if no devices found (or discovery timed-out), use configured target as a single device
    if not devices and fallback_host and fallback_instance is not None:
        dev_entry = {
            "deviceId": fallback_instance,
            "address": f"{fallback_host}:{fallback_port}",
            "name": f"Device {fallback_instance}",
            "vendor": "Unknown",
            "lastSeen": None,
            "objects": [],
        }
        if include_objects:
            try:
                dev_entry["objects"] = await _fetch_objects(fallback_host, fallback_port, fallback_instance, limit=limit_per_device)
            except Exception:
                dev_entry["objects"] = []
        devices.append(dev_entry)

    return devices


# --- EDE Upload & DB integration ---
@app.post("/api/ede/upload")
async def upload_ede(file: UploadFile = File(...)):
    """
    Uploads an EDE CSV file, parses devices/objects, and stores them in SQLite.
    """
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except Exception:
        text = content.decode("latin-1", errors="ignore")

    devices_count = 0
    points_count = 0
    reader = csv.reader(text.splitlines(), delimiter=';')
    for row in reader:
        if not row or (row[0].strip().startswith("#")):
            continue
        if len(row) < 5:
            continue
        try:
            device_instance = int(row[1])
            object_type_code = int(row[3])
            object_instance = int(row[4])
        except Exception:
            continue

        device_id = upsert_device(device_instance, row[2].strip() or f"Device {device_instance}", None, None)
        devices_count += 1

        if object_type_code == 8:
            continue

        obj_type = row[3].strip() or "unknown"
        obj_name = row[2].strip() or f"{obj_type} {object_instance}"
        description = row[5].strip() if len(row) > 5 else None
        units = row[12].strip() if len(row) > 12 else None

        upsert_point(device_id, obj_type, object_instance, obj_name, units, description)
        points_count += 1

    return {"status": "ok", "devices": devices_count, "points": points_count}


@app.get("/api/points/live")
async def list_live_points():
    """
    Returns latest values for all points stored in DB.
    """
    return {"items": fetch_latest_point_values()}

async def _send_live_points_snapshot():
    """
    Broadcast the current point values to all active WebSocket clients.
    """
    if not manager.active_connections:
        return
    try:
        payload = {
            "type": "points_live",
            "items": fetch_latest_point_values(),
        }
        await manager.broadcast(json.dumps(payload))
    except Exception:
        pass

@app.websocket("/ws")
@app.websocket("/ws/points/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial snapshot on connect
        await websocket.send_text(json.dumps({
            "type": "points_live",
            "items": fetch_latest_point_values(),
        }))
        while True:
            try:
                message = await websocket.receive_text()
                if message and message.lower().startswith("ping"):
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif message and message.lower().startswith("latest"):
                    await websocket.send_text(json.dumps({
                        "type": "points_live",
                        "items": fetch_latest_point_values(),
                    }))
            except WebSocketDisconnect:
                break
            except Exception:
                break
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)

# --- REST Endpoints for BACnetDriver ---

@app.get("/devices")
async def get_devices():
    """
    Returns empty list to avoid timeout from network discovery.
    Use /scan endpoint with specific parameters for device discovery.
    """
    return []

@app.api_route("/scan", methods=["GET", "POST"])
async def scan_network(timeout: int = 5):
    """
    Performs a BACnet/IP network scan via the MCP tool 'discover_devices'.
    Accepts JSON payload { timeout?, useBroadcast?, target_host?, limit? }
    GET ?timeout=5 will also work for backward compatibility.
    """
    # Try to get payload from request body if POST
    from fastapi import Request
    from starlette.requests import Request as StarletteRequest
    
    payload = {}
    # Note: We need to access request to get the body
    # For now, use defaults and environment variables
    
    if "timeout" not in payload:
        # default timeout bumped for slow networks
        payload["timeout"] = max(timeout, int(os.getenv("BACNET_SCAN_TIMEOUT", "20")))

    target_host_override = payload.get("target_host") or os.getenv("BACNET_SCAN_TARGET_HOST")
    limit_per_device = payload.get("limit") or int(os.getenv("BACNET_SCAN_LIMIT", "50"))
    use_broadcast = payload.get("useBroadcast")
    if use_broadcast is None:
        use_broadcast = _bool_env("BACNET_MCP_USE_BROADCAST", False)

    try:
        print(f"[scan] start use_broadcast={use_broadcast} target={target_host_override} timeout={payload.get('timeout')} limit={limit_per_device}")
        devices = await _discover_and_enrich(
            include_objects=True,
            use_broadcast=use_broadcast,
            target_host_override=target_host_override,
            timeout=int(payload.get("timeout") or 5),
            limit_per_device=limit_per_device,
        )
    except Exception as e:
        print(f"[scan] discover failed use_broadcast={use_broadcast} target={target_host_override} timeout={payload.get('timeout')} err={e}")
        devices = []
    return {"devices": devices}

# --- Configuration Endpoints ---

def _get_network_interfaces() -> List[Dict[str, str]]:
    """
    Returns a list of available network interfaces (IP addresses).
    Uses ipconfig on Windows for better detection.
    """
    interfaces = []
    try:
        # Try using ipconfig on Windows
        if os.name == 'nt':
            import subprocess
            import re
            
            try:
                # Use chcp 65001 for UTF-8 output
                output = subprocess.check_output("ipconfig", shell=True, encoding="utf-8", errors="ignore")
                
                # Regex to match IPv4 addresses: xxx.xxx.xxx.xxx
                # Looking for lines like "Adresse IPv4" or "IPv4 Address" followed by IP
                ip_pattern = r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
                
                current_adapter = "Unknown"
                for line in output.splitlines():
                    line_stripped = line.strip()
                    
                    # Adapter name (lines ending with : but not containing IPv)
                    if line_stripped.endswith(":") and "IPv" not in line_stripped:
                        # Extract adapter name
                        current_adapter = line_stripped.rstrip(":")
                        
                    # IPv4 address line
                    if "IPv4" in line or "Adresse IPv4" in line:
                        match = re.search(ip_pattern, line)
                        if match:
                            ip = match.group(1)
                            # Skip loopback and link-local
                            if ip != "127.0.0.1" and not ip.startswith("169.254."):
                                interfaces.append({
                                    "name": f"{current_adapter} ({ip})",
                                    "ip": ip
                                })
            except Exception as e:
                print(f"Error running ipconfig: {e}")
                # Fallback to socket method below

        if not interfaces:
            # Fallback to socket method
            try:
                hostname = socket.gethostname()
                infos = socket.getaddrinfo(hostname, None, socket.AF_INET)
                seen = set()
                for info in infos:
                    ip = info[4][0]
                    if ip not in seen and ip != "127.0.0.1":
                        interfaces.append({"name": f"Interface ({ip})", "ip": ip})
                        seen.add(ip)
            except Exception:
                pass
            
    except Exception as e:
        print(f"Error in _get_network_interfaces: {e}")
            
    # Always add 0.0.0.0 first (All Interfaces)
    interfaces.insert(0, {"name": "All Interfaces (0.0.0.0)", "ip": "0.0.0.0"})
    
    # Add localhost at the end
    if "127.0.0.1" not in [i["ip"] for i in interfaces]:
        interfaces.append({"name": "Localhost (127.0.0.1)", "ip": "127.0.0.1"})
        
    return interfaces

def _update_env_file(updates: Dict[str, str]):
    """
    Updates the .env file in bacnet-mcp directory with new values.
    """
    # Use the bacnet-mcp .env file, not the root one
    env_path = os.path.join(os.getcwd(), "bacnet-mcp", ".env")
    try:
        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                lines = f.readlines()
        
        # Create a map of existing keys to line numbers
        key_map = {}
        for i, line in enumerate(lines):
            if "=" in line and not line.strip().startswith("#"):
                key = line.split("=", 1)[0].strip()
                key_map[key] = i
        
        for key, value in updates.items():
            if key in key_map:
                lines[key_map[key]] = f"{key}={value}\n"
            else:
                lines.append(f"{key}={value}\n")
                
        with open(env_path, "w") as f:
            f.writelines(lines)
            
        # Also update os.environ for current process
        for key, value in updates.items():
            os.environ[key] = value
            
    except Exception as e:
        print(f"Error updating .env file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")

@app.get("/api/bacnet/interfaces")
async def get_bacnet_interfaces():
    return {"interfaces": _get_network_interfaces()}

@app.get("/api/bacnet/config")
async def get_bacnet_config():
    return {
        "host": os.getenv("BACNET_MCP_HOST", "0.0.0.0"),
        "target_host": os.getenv("BACNET_MCP_TARGET_HOST", "192.168.1.7"),
        "device_instance": int(os.getenv("BACNET_MCP_DEVICE_INSTANCE", "1007")),
        "server_device_id": int(os.getenv("BACNET_MCP_DEVICE_INSTANCE", "19149")),
        "use_broadcast": _bool_env("BACNET_MCP_USE_BROADCAST", False),
        "bbmd_address": os.getenv("BACNET_MCP_BBMD_ADDRESS", ""),
        "bbmd_ttl": int(os.getenv("BACNET_MCP_BBMD_TTL", "900"))
    }

@app.post("/api/bacnet/config")
async def update_bacnet_config(config: Dict[str, Any]):
    """
    Updates BACnet configuration in .env and runtime.
    """
    updates = {}
    
    if "host" in config:
        updates["BACNET_MCP_HOST"] = config["host"]
    if "target_host" in config:
        updates["BACNET_MCP_TARGET_HOST"] = config["target_host"]
    if "device_instance" in config:
        updates["BACNET_MCP_DEVICE_INSTANCE"] = str(config["device_instance"])
    if "server_device_id" in config:
        # This is the actual server's own device ID (used to be hardcoded as 19149)
        updates["BACNET_MCP_DEVICE_INSTANCE"] = str(config["server_device_id"])
    if "use_broadcast" in config:
        updates["BACNET_MCP_USE_BROADCAST"] = "true" if config["use_broadcast"] else "false"
    if "bbmd_address" in config:
        updates["BACNET_MCP_BBMD_ADDRESS"] = str(config["bbmd_address"])
    if "bbmd_ttl" in config:
        updates["BACNET_MCP_BBMD_TTL"] = str(config["bbmd_ttl"])
        
    _update_env_file(updates)
    
    # Reload settings if possible (this affects server_bacnet.py's view of settings)
    # Since we imported settings from bacnet-mcp, we might need to reload it or update the object
    if settings and settings.bacnet:
        if "host" in config: settings.bacnet.host = config["host"]
        if "target_host" in config: settings.bacnet.target_host = config["target_host"]
        if "device_instance" in config: settings.bacnet.device_instance = int(config["device_instance"])
    
    # Reset BACnet application to rebind to new network interface
    try:
        await reset_bacnet_app()
    except Exception as e:
        print(f"Warning: Could not reset BACnet app: {e}")
        
    return {"status": "ok", "config": config}

@app.get("/devices/{device_id}/objects")
async def get_device_objects(device_id: int):

    """
    Returns empty list to avoid timeout from object fetching.
    Objects should be fetched via the scan endpoint with specific parameters.
    """
    return {"objects": []}

@app.get("/devices/{device_id}/objects/{object_type}/{object_instance}/properties")
async def get_object_properties(device_id: int, object_type: str, object_instance: int):
    """
    Returns detailed properties for a BACnet object using read_all_properties.
    """
    host, port, inst = await _resolve_device_host(device_id)
    try:
        print(f"[read_prop] device={device_id} obj={object_type}/{object_instance} host={host}:{port} inst={inst}")
        data = await call_mcp_tool("read_all_properties", {
            "host": host,
            "port": port,
            "obj_type": object_type,
            "obj_instance": object_instance,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP read_all_properties failed: {e}")

    props = {}
    if isinstance(data, dict):
        props = data.get("properties", {}) or {}

    # Persist to DB for live values if possible
    try:
        dev_db_id = upsert_device(device_id, f"Device {device_id}", f"{host}:{port}", None)
        units = props.get("units") or props.get("Units") or props.get("units-id")
        desc = props.get("description") or props.get("Description")
        pt_id = upsert_point(dev_db_id, object_type, object_instance, props.get("object-name") or props.get("Object Name") or f"{object_type} {object_instance}", units, desc)
        pv = props.get("present-value") if "present-value" in props else props.get("presentValue")
        insert_point_value(pt_id, pv, "ok")
    except Exception as e:
        print(f"[read_prop][db] persist failed: {e}")

    return {
        "driver": "bacnet",
        "deviceId": device_id,
        "objectType": object_type,
        "instance": object_instance,
        "properties": props,
    }

# --- Health Check ---
@app.get("/health")
async def health_check():
    return {"status": "ok", "mcp": "active", "websocket": "active"}


# --- Background polling ---
async def _poll_points_loop():
    """
    Polls points stored in DB and updates point_values table.
    """
    interval = int(os.getenv("BACNET_POLL_INTERVAL", "10"))
    while True:
        try:
            if MCPClient is None:
                await asyncio.sleep(interval)
                continue
            points = fetch_points()
            for pt in points:
                device_instance = pt["device_instance"]
                obj_type = pt["object_type"]
                obj_instance = pt["object_instance"]
                host, port, inst = await _resolve_device_host(device_instance)
                try:
                    data = await call_mcp_tool("read_all_properties", {
                        "host": host,
                        "port": port,
                        "obj_type": obj_type,
                        "obj_instance": obj_instance,
                    })
                    props = data.get("properties", {}) if isinstance(data, dict) else {}
                    val = props.get("presentValue")
                    insert_point_value(pt["id"], val, "ok")
                except Exception as e:
                    insert_point_value(pt["id"], None, f"error:{e}")
        except Exception:
            pass
        try:
            await _send_live_points_snapshot()
        except Exception:
            pass
        await asyncio.sleep(interval)


@app.on_event("startup")
async def _startup():
    init_db()
    try:
        asyncio.create_task(_poll_points_loop())
    except Exception:
        pass


@app.post("/scan/python")
async def scan_python(params: Dict[str, Any]):
    """
    Endpoint to get devices and objects from EDE file (Python parser).
    Used by frontend for real-time tree population.
    """
    if not ede_parser:
        raise HTTPException(status_code=500, detail="EDE Parser not available")

    target_host = params.get("target_host")
    # If target_host is provided (e.g. from device ID in frontend), we might use it to filter
    # But for now, we rely on the EDE file structure.
    
    # Check if we are scanning for devices (no specific device context) or objects (specific device context)
    # The frontend sends 'target_host' when scanning objects for a device.
    # However, the best way to distinguish is usually if we are asking for a specific device's objects.
    # But the current frontend implementation of `refreshDevices` calls `/scan/python` with target_host.
    # And `getObjectList` calls `/scan/python` with target_host.
    
    # Let's assume if the frontend wants objects, it might provide a device ID or we infer it.
    # Actually, the frontend `BACnetDriver.ts` `refreshDevices` expects a list of devices.
    # `getObjectList` expects a list of objects.
    
    # We can differentiate based on the request payload or just return what's appropriate.
    # Since `BACnetDriver.ts` uses the same endpoint for both, we need a way to know.
    # Looking at `BACnetDriver.ts`:
    # refreshDevices: body: { timeout, limit, useBroadcast, target_host }
    # getObjectList: body: { timeout, limit, useBroadcast, target_host }
    
    # The key difference is `target_host`. 
    # In `refreshDevices`, `target_host` is the global setting (e.g. 192.168.1.7).
    # In `getObjectList`, `target_host` is the device's address (e.g. 192.168.1.7:47808 or just ID).
    
    # BUT, `ede_parser` is static.
    # If we return devices, we return the list of devices from EDE.
    # If we return objects, we need to know WHICH device.
    
    # Problem: The current `BACnetDriver.ts` implementation of `getObjectList` sends `target_host` derived from `parseTargetHost(deviceId)`.
    # If `parseTargetHost` returns something like "504" (the instance), we can use that.
    
    # Let's try to parse `target_host` to see if it looks like a device instance or an IP.
    # If it matches a known device instance in EDE, return objects for that device.
    # Otherwise, return the list of devices.
    
    try:
        # refreshDevices usually sends the IP of the gateway/router.
        # getObjectList sends the specific device address/ID.
        
        # Heuristic:
        # 1. Get all devices from EDE.
        devices = ede_parser.get_devices()
        
        # 2. Check if `target_host` matches a device ID or Name in EDE.
        target_device_id = None
        if target_host:
            # Try to match by ID
            try:
                tid = int(target_host)
                if tid in [d["deviceId"] for d in devices]:
                    target_device_id = tid
            except ValueError:
                pass
            
            # Try to match by Name if ID failed
            if target_device_id is None:
                for d in devices:
                    if d["name"] == target_host or d["address"] == target_host:
                        target_device_id = d["deviceId"]
                        break
        
        if target_device_id is not None:
            # Return objects for this device
            objects = ede_parser.get_objects(target_device_id)
            
            # Frontend (BACnetDriver.ts) expects a list of devices, finds the one matching deviceId,
            # and extracts .objects from it.
            # So we must return: [ { "deviceId": 504, "objects": [...] } ]
            
            return [
                {
                    "deviceId": target_device_id,
                    "objects": objects
                }
            ]
            
        else:
            # Return list of devices
            # Frontend expects `{ devices: [...] }`
            return {"devices": devices}

    except Exception as e:
        print(f"Error in /scan/python: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run on port 8000 for BACnet MCP
    uvicorn.run("server_bacnet:app", host="0.0.0.0", port=8000, reload=True)
