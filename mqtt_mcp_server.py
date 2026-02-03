"""
Serveur MCP MQTT pour l'Assistant AI du Dashboard
Se connecte au broker Mosquitto local et expose les outils MQTT via MCP
Port: 8050
"""
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import aiomqtt
import json
from typing import Dict, Any

app = FastAPI(title="MQTT MCP Server")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration MQTT
MQTT_HOST = "localhost"
MQTT_PORT = 1883

# Stockage des messages reçus (cache simple)
message_cache: Dict[str, str] = {}

@app.get("/mcp")
async def mcp_endpoint():
    """
    Endpoint MCP en mode SSE (Server-Sent Events)
    """
    async def event_generator():
        # Envoi de l'événement 'endpoint' pour indiquer où envoyer les requêtes POST
        # C'est la norme MCP via SSE
        yield f"event: endpoint\ndata: /mcp\n\n"
        
        # Garder la connexion ouverte
        while True:
            await asyncio.sleep(1)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.post("/mcp")
async def mcp_post_endpoint(payload: Dict[str, Any]):
    """
    Endpoint MCP pour le transport HTTP standard (POST) - Support JSON-RPC
    """
    method = payload.get("method")
    params = payload.get("params", {})
    msg_id = payload.get("id")

    # 1. Initialize
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "MQTT MCP Server",
                    "version": "1.0.0"
                }
            }
        }
    
    # 2. Initialized Notification
    elif method == "notifications/initialized":
        # Just acknowledge
        return None
        
    # 3. List Tools
    elif method == "tools/list":
        tools_data = await list_tools()
        return {"jsonrpc": "2.0", "id": msg_id, "result": tools_data}
        
    # 4. Call Tool
    elif method == "tools/call":
        name = params.get("name")
        args = params.get("arguments", {})
        
        result = {}
        if name == "mqtt_publish":
            result = await mqtt_publish(**args)
        elif name == "mqtt_subscribe":
            result = await mqtt_subscribe(**args)
        elif name == "mqtt_get_cached":
            result = await mqtt_get_cached(**args)
        else:
            return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": f"Unknown tool: {name}"}}
            
        # Format result for MCP (content list)
        return {
            "jsonrpc": "2.0", 
            "id": msg_id, 
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(result, ensure_ascii=False)
                    }
                ]
            }
        }
    
    # 5. Ping
    elif method == "ping":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {}}

    return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": "Method not found"}}

@app.get("/sse")
async def sse_endpoint():
    """Alias pour /mcp"""
    return await mcp_endpoint()

@app.get("/tools")
async def list_tools():
    """
    Liste les outils MQTT disponibles
    """
    return {
        "tools": [
            {
                "name": "mqtt_publish",
                "description": "Publie un message sur un topic MQTT",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "topic": {
                            "type": "string",
                            "description": "Topic MQTT (ex: campus/temp)"
                        },
                        "message": {
                            "type": "string",
                            "description": "Message à publier (peut être JSON)"
                        }
                    },
                    "required": ["topic", "message"]
                }
            },
            {
                "name": "mqtt_subscribe",
                "description": "S'abonne à un topic MQTT et attend un message",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "topic": {
                            "type": "string",
                            "description": "Topic MQTT à écouter"
                        },
                        "timeout": {
                            "type": "number",
                            "description": "Timeout en secondes (défaut: 5)",
                            "default": 5
                        }
                    },
                    "required": ["topic"]
                }
            },
            {
                "name": "mqtt_get_cached",
                "description": "Récupère le dernier message reçu d'un topic",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "topic": {
                            "type": "string",
                            "description": "Topic MQTT"
                        }
                    },
                    "required": ["topic"]
                }
            }
        ]
    }

# Remove old call_tool endpoint as it is now handled in mcp_post_endpoint


async def mqtt_publish(topic: str, message: str) -> Dict[str, Any]:
    """Publie un message MQTT"""
    try:
        async with aiomqtt.Client(hostname=MQTT_HOST, port=MQTT_PORT) as client:
            await client.publish(topic, message)
        return {
            "success": True,
            "message": f"Message publié sur {topic}",
            "topic": topic,
            "payload": message
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

async def mqtt_subscribe(topic: str, timeout: int = 5) -> Dict[str, Any]:
    """S'abonne à un topic et attend un message"""
    try:
        async with aiomqtt.Client(hostname=MQTT_HOST, port=MQTT_PORT) as client:
            await client.subscribe(topic)
            async with asyncio.timeout(timeout):
                async for message in client.messages:
                    payload = message.payload.decode()
                    # Mise en cache
                    message_cache[topic] = payload
                    return {
                        "success": True,
                        "topic": topic,
                        "message": payload
                    }
        return {
            "success": False,
            "error": "No message received"
        }
    except asyncio.TimeoutError:
        return {
            "success": False,
            "error": f"Timeout après {timeout}s"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

async def mqtt_get_cached(topic: str) -> Dict[str, Any]:
    """Récupère le dernier message en cache"""
    if topic in message_cache:
        return {
            "success": True,
            "topic": topic,
            "message": message_cache[topic]
        }
    return {
        "success": False,
        "error": "Aucun message en cache pour ce topic"
    }

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "mqtt_broker": f"{MQTT_HOST}:{MQTT_PORT}",
        "cached_topics": list(message_cache.keys())
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Démarrage du serveur MCP MQTT sur http://127.0.0.1:8080")
    print(f"📡 Connexion au broker MQTT: {MQTT_HOST}:{MQTT_PORT}")
    uvicorn.run(app, host="127.0.0.1", port=8080)
