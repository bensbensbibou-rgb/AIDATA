#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dedicated TrendLog Service - Port 8002
Runs independently to avoid async conflicts with main servers.
Periodically reads TrendLog data from BACnet devices and stores in SQLite.
"""

import os
import sys
import json
import asyncio
import sqlite3
import socket
from datetime import datetime, timedelta
from threading import Thread
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

# Add bacnet-mcp to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "bacnet-mcp"))

# FastAPI
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# BACnet imports
from bacpypes3.pdu import Address
from bacpypes3.primitivedata import ObjectIdentifier, Unsigned, Integer
from bacpypes3.apdu import ReadRangeRequest
from bacpypes3.basetypes import PropertyIdentifier, Range, RangeByPosition
from bacpypes3.app import Application

# Decode module
try:
    from decode import format_readrange_ack
except:
    format_readrange_ack = None

# === Configuration ===
DB_PATH = os.path.join(os.getcwd(), "data", "trendlog_data.db")
POLL_INTERVAL_SECONDS = 300  # 5 minutes
DEFAULT_TARGET = "192.168.1.7"
DEFAULT_PORT = 47808

# === Global state ===
_app_bacnet: Optional[Application] = None
_polling_task: Optional[asyncio.Task] = None
_known_trendlogs: List[Dict] = []  # List of {device_id, address, object_id, name}


def get_local_ip():
    """Get local IP address for BACnet."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "192.168.1.177"


def init_database():
    """Initialize SQLite database for trend log storage."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Trend log metadata table
    c.execute('''CREATE TABLE IF NOT EXISTS trendlogs (
        id INTEGER PRIMARY KEY,
        device_id INTEGER,
        object_type TEXT,
        object_instance INTEGER,
        name TEXT,
        last_read TEXT,
        UNIQUE(device_id, object_type, object_instance)
    )''')
    
    # Trend log data table
    c.execute('''CREATE TABLE IF NOT EXISTS trendlog_data (
        id INTEGER PRIMARY KEY,
        trendlog_id INTEGER,
        timestamp TEXT,
        value REAL,
        FOREIGN KEY(trendlog_id) REFERENCES trendlogs(id)
    )''')
    
    # Index for fast queries
    c.execute('''CREATE INDEX IF NOT EXISTS idx_trendlog_data_ts 
                 ON trendlog_data(trendlog_id, timestamp)''')
    
    conn.commit()
    conn.close()
    print(f"[TrendLog Service] Database initialized: {DB_PATH}")


async def init_bacnet_app():
    """Initialize BACnet application."""
    global _app_bacnet
    
    if _app_bacnet:
        return _app_bacnet
    
    try:
        local_ip = get_local_ip()
        import random
        dev_id = 777000 + random.randint(1, 999)
        
        _app_bacnet = Application.from_args(arglist=[
            "--address", f"{local_ip}/24",
            "--name", f"TrendLogService{dev_id}",
            "--device-identifier", str(dev_id)
        ])
        print(f"[TrendLog Service] BACnet app initialized on {local_ip}")
        return _app_bacnet
    except Exception as e:
        print(f"[TrendLog Service] BACnet init error: {e}")
        return None


async def read_trendlog_data(device_address: str, obj_type: str, obj_instance: int, count: int = 100) -> List[Dict]:
    """Read trend log data from BACnet device."""
    app = await init_bacnet_app()
    if not app:
        return []
    
    try:
        if ":" not in device_address:
            device_address = f"{device_address}:{DEFAULT_PORT}"
        
        target = Address(device_address)
        oid = ObjectIdentifier(f"{obj_type},{obj_instance}")
        
        request = ReadRangeRequest(
            objectIdentifier=oid,
            propertyIdentifier=PropertyIdentifier("logBuffer"),
            range=Range(
                byPosition=RangeByPosition(
                    referenceIndex=Unsigned(1),
                    count=Integer(-count)
                )
            )
        )
        request.pduDestination = target
        
        response = await asyncio.wait_for(app.request(request), timeout=20.0)
        
        if format_readrange_ack and hasattr(response, 'itemData'):
            parsed = format_readrange_ack(response, f"{obj_type},{obj_instance}", "byPosition")
            if parsed.get("status") == "success" and parsed.get("records"):
                return [
                    {"timestamp": r.get("timestamp", ""), "value": r.get("value")}
                    for r in parsed["records"]
                ]
        return []
        
    except asyncio.TimeoutError:
        print(f"[TrendLog Service] Timeout reading {obj_type},{obj_instance}")
        return []
    except Exception as e:
        print(f"[TrendLog Service] Read error: {e}")
        return []


def store_trendlog_data(device_id: int, obj_type: str, obj_instance: int, data: List[Dict]):
    """Store trend log data in SQLite."""
    if not data:
        return
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get or create trendlog entry
    c.execute('''INSERT OR IGNORE INTO trendlogs (device_id, object_type, object_instance, name)
                 VALUES (?, ?, ?, ?)''', (device_id, obj_type, obj_instance, f"{obj_type},{obj_instance}"))
    
    c.execute('''SELECT id FROM trendlogs 
                 WHERE device_id=? AND object_type=? AND object_instance=?''',
              (device_id, obj_type, obj_instance))
    row = c.fetchone()
    if not row:
        conn.close()
        return
    
    trendlog_id = row[0]
    
    # Insert data (avoid duplicates by checking timestamp)
    for d in data:
        ts = d.get("timestamp", "")
        val = d.get("value")
        if ts and val is not None:
            try:
                c.execute('''INSERT OR REPLACE INTO trendlog_data (trendlog_id, timestamp, value)
                             VALUES (?, ?, ?)''', (trendlog_id, ts, float(val)))
            except:
                pass
    
    # Update last read time
    c.execute('''UPDATE trendlogs SET last_read=? WHERE id=?''',
              (datetime.now().isoformat(), trendlog_id))
    
    conn.commit()
    conn.close()
    print(f"[TrendLog Service] Stored {len(data)} records for {obj_type},{obj_instance}")


def get_trendlog_data(device_id: int, obj_type: str, obj_instance: int, 
                      start_time: Optional[str] = None, limit: int = 500) -> List[Dict]:
    """Retrieve trend log data from SQLite."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get trendlog ID
    c.execute('''SELECT id FROM trendlogs 
                 WHERE device_id=? AND object_type=? AND object_instance=?''',
              (device_id, obj_type, obj_instance))
    row = c.fetchone()
    if not row:
        conn.close()
        return []
    
    trendlog_id = row[0]
    
    # Query data
    if start_time:
        c.execute('''SELECT timestamp, value FROM trendlog_data 
                     WHERE trendlog_id=? AND timestamp >= ?
                     ORDER BY timestamp DESC LIMIT ?''',
                  (trendlog_id, start_time, limit))
    else:
        c.execute('''SELECT timestamp, value FROM trendlog_data 
                     WHERE trendlog_id=?
                     ORDER BY timestamp DESC LIMIT ?''',
                  (trendlog_id, limit))
    
    rows = c.fetchall()
    conn.close()
    
    return [{"timestamp": r[0], "value": r[1]} for r in rows]


async def poll_trendlogs():
    """Background task to poll known trend logs."""
    global _known_trendlogs
    
    while True:
        try:
            for tl in _known_trendlogs:
                data = await read_trendlog_data(
                    tl["address"], 
                    tl["object_type"], 
                    tl["object_instance"]
                )
                if data:
                    store_trendlog_data(
                        tl["device_id"],
                        tl["object_type"],
                        tl["object_instance"],
                        data
                    )
                await asyncio.sleep(1)  # Small delay between reads
                
        except Exception as e:
            print(f"[TrendLog Service] Poll error: {e}")
        
        await asyncio.sleep(POLL_INTERVAL_SECONDS)


# === FastAPI App ===
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown."""
    global _polling_task
    
    init_database()
    
    # Start background polling
    _polling_task = asyncio.create_task(poll_trendlogs())
    print("[TrendLog Service] Background polling started")
    
    yield
    
    # Cleanup
    if _polling_task:
        _polling_task.cancel()
    if _app_bacnet:
        try:
            await _app_bacnet.close()
        except:
            pass


app = FastAPI(title="TrendLog Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class TrendLogReadRequest(BaseModel):
    device_instance: int
    object_id: str  # "trend-log,20"
    count: int = 100
    address: Optional[str] = None


class RegisterTrendLogRequest(BaseModel):
    device_id: int
    address: str
    object_type: str
    object_instance: int
    name: Optional[str] = None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "trendlog", "port": 8002}


@app.get("/trendlogs")
async def list_trendlogs():
    """List registered trend logs."""
    return {"trendlogs": _known_trendlogs}


@app.post("/trendlogs/register")
async def register_trendlog(req: RegisterTrendLogRequest):
    """Register a trend log for polling."""
    global _known_trendlogs
    
    # Check if already registered
    for tl in _known_trendlogs:
        if tl["device_id"] == req.device_id and \
           tl["object_type"] == req.object_type and \
           tl["object_instance"] == req.object_instance:
            return {"status": "already_registered"}
    
    _known_trendlogs.append({
        "device_id": req.device_id,
        "address": req.address,
        "object_type": req.object_type,
        "object_instance": req.object_instance,
        "name": req.name or f"{req.object_type},{req.object_instance}"
    })
    
    return {"status": "registered", "count": len(_known_trendlogs)}


@app.post("/read")
async def read_trendlog(req: TrendLogReadRequest):
    """Read trend log data - first from DB, then from device if needed."""
    
    # Parse object_id
    parts = req.object_id.split(",")
    if len(parts) != 2:
        raise HTTPException(400, f"Invalid object_id: {req.object_id}")
    
    obj_type = parts[0].strip()
    try:
        obj_instance = int(parts[1].strip())
    except:
        raise HTTPException(400, f"Invalid instance: {parts[1]}")
    
    # Try to get from database first
    data = get_trendlog_data(req.device_instance, obj_type, obj_instance, limit=req.count)
    
    if data:
        return {
            "status": "success",
            "message": f"From database: {len(data)} records",
            "count": len(data),
            "data": data
        }
    
    # If not in DB, read from device
    address = req.address or DEFAULT_TARGET
    live_data = await read_trendlog_data(address, obj_type, obj_instance, req.count)
    
    if live_data:
        # Store for next time
        store_trendlog_data(req.device_instance, obj_type, obj_instance, live_data)
        
        return {
            "status": "success",
            "message": f"Live from device: {len(live_data)} records",
            "count": len(live_data),
            "data": live_data
        }
    
    # Fallback: no data
    return {
        "status": "success",
        "message": "No data available",
        "count": 0,
        "data": []
    }


if __name__ == "__main__":
    print("[TrendLog Service] Starting on port 8002...")
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")
