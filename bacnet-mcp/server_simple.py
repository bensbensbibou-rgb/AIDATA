#!/usr/bin/env python3
"""
Serveur MCP BACnet simplifié sans fastmcp
Version stable pour Docker et local
"""

import json
import asyncio
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from typing import Dict, Any, List
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Version
__version__ = "1.4.2"

# Création de l'application FastAPI
app = FastAPI(title="BACnet MCP Server", version=__version__)

# Stockage des outils MCP
mcp_tools = {}

def mcp_tool(name: str = None):
    """Décorateur pour enregistrer les outils MCP"""
    def decorator(func):
        tool_name = name or func.__name__
        mcp_tools[tool_name] = {
            "function": func,
            "description": func.__doc__ or f"Tool {tool_name}",
            "name": tool_name
        }
        return func
    return decorator

# Outils BACnet MCP
@mcp_tool("ping")
async def ping_tool():
    """Ping du serveur MCP BACnet"""
    return {"status": "ok", "message": f"MCP BACnet v{__version__} active"}

@mcp_tool("bacnet_discover")
async def bacnet_discover_tool():
    """Découverte des appareils BACnet sur le réseau"""
    return {"devices": [], "message": "Découverte BACnet simulée"}

@mcp_tool("bacnet_read")
async def bacnet_read_tool(device_id: str, object_type: str, instance: str):
    """Lecture d'une propriété BACnet"""
    return {
        "device_id": device_id,
        "object_type": object_type,
        "instance": instance,
        "value": "Valeur simulée"
    }

@mcp_tool("bacnet_write")
async def bacnet_write_tool(device_id: str, object_type: str, instance: str, value: Any):
    """Écriture d'une propriété BACnet"""
    return {
        "device_id": device_id,
        "object_type": object_type,
        "instance": instance,
        "value": value,
        "status": "success"
    }

# Endpoints FastAPI
@app.get("/")
async def root():
    """Endpoint racine"""
    return {
        "name": "BACnet MCP Server",
        "version": __version__,
        "status": "running",
        "endpoints": {
            "mcp": "/mcp/",
            "docs": "/docs",
            "health": "/health"
        }
    }

@app.get("/health")
async def health():
    """Endpoint de santé"""
    return {"status": "ok", "version": __version__}

@app.post("/mcp/")
async def handle_mcp(request: Request):
    """Gestion des requêtes MCP"""
    try:
        body = await request.json()
        method = body.get("method", "")
        params = body.get("params", {})
        request_id = body.get("id", 1)
        
        logger.info(f"MCP Request: {method} (ID: {request_id})")
        
        # Gestion des méthodes MCP
        if method == "tools/list":
            tools_list = []
            for tool_name, tool_info in mcp_tools.items():
                tools_list.append({
                    "name": tool_name,
                    "description": tool_info["description"],
                    "inputSchema": {
                        "type": "object",
                        "properties": {}
                    }
                })
            
            return JSONResponse({
                "jsonrpc": "2.0",
                "result": {"tools": tools_list},
                "id": request_id
            })
        
        elif method == "tools/call":
            tool_name = params.get("name", "")
            tool_params = params.get("arguments", {})
            
            if tool_name in mcp_tools:
                tool_func = mcp_tools[tool_name]["function"]
                try:
                    # Exécution de l'outil
                    if asyncio.iscoroutinefunction(tool_func):
                        result = await tool_func(**tool_params)
                    else:
                        result = tool_func(**tool_params)
                    
                    return JSONResponse({
                        "jsonrpc": "2.0",
                        "result": {"content": [{"type": "text", "text": str(result)}]},
                        "id": request_id
                    })
                except Exception as e:
                    logger.error(f"Tool execution error: {e}")
                    return JSONResponse({
                        "jsonrpc": "2.0",
                        "error": {"code": -1, "message": f"Tool execution error: {str(e)}"},
                        "id": request_id
                    })
            else:
                return JSONResponse({
                    "jsonrpc": "2.0",
                    "error": {"code": -32601, "message": f"Tool '{tool_name}' not found"},
                    "id": request_id
                })
        
        elif method == "ping":
            return JSONResponse({
                "jsonrpc": "2.0",
                "result": {"status": "ok", "message": f"MCP BACnet v{__version__} active"},
                "id": request_id
            })
        
        else:
            return JSONResponse({
                "jsonrpc": "2.0",
                "error": {"code": -32601, "message": f"Method '{method}' not found"},
                "id": request_id
            })
            
    except Exception as e:
        logger.error(f"MCP Error: {e}")
        return JSONResponse({
            "jsonrpc": "2.0",
            "error": {"code": -32700, "message": f"Parse error: {str(e)}"},
            "id": None
        })

@app.get("/mcp/")
async def mcp_get():
    """Endpoint GET pour MCP"""
    return {
        "jsonrpc": "2.0",
        "result": {
            "status": "ok", 
            "message": f"MCP BACnet v{__version__} server is running",
            "tools": list(mcp_tools.keys())
        },
        "id": 1
    }

if __name__ == "__main__":
    print(f"🚀 Démarrage du serveur MCP BACnet v{__version__}")
    print("📍 Interface web: http://0.0.0.0:8050")
    print("🔧 Serveur MCP: http://0.0.0.0:8050/mcp/")
    print("📚 Documentation API: http://0.0.0.0:8050/docs")
    print("💚 Santé: http://0.0.0.0:8050/health")
    print("=" * 60)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8050,
        log_level="info"
    )
