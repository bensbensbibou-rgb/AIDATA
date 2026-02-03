import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
import asyncio
import json
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import httpx

# MCP & Gemini Imports
try:
    import google.generativeai as genai
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.sse import sse_client
except ImportError:
    print("Warning: mcp or google-generativeai not installed. Chat features may fail.")


# Load environment variables from .env file
load_dotenv()

# Add the directory to sys.path to allow imports
sys.path.append(os.path.join(os.getcwd(), "distech_mcp_server_full"))

# Import the existing app and client from the MCP server
# This allows us to reuse the MCP tools and the configured HTTP client
try:
    from distech_mcp_server_full.distech_mcp_server_full import app as mcp_app, client
except ImportError as e:
    print(f"Error importing distech_mcp_server_full: {e}")
    # Fallback for testing/development if module is missing
    from fastapi import FastAPI
    import httpx
    mcp_app = None
    client = httpx.AsyncClient()

# Create a new FastAPI app (don't use mcp_app directly as it may not support all features)
app = FastAPI(title="Distech MCP Wrapper")

# Configure CORS
# We add it again to be sure, or update existing middleware
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
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

rag = None
rag_mode = "local"
try:
    # Try File Search first
    from google_file_search_service import GoogleFileSearchService
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if gemini_key:
        rag = GoogleFileSearchService(api_key=gemini_key)
        rag_mode = "google_file_search"
        print("RAG Service initialized (Google File Search)")
    else:
        raise ImportError("No GEMINI_API_KEY for File Search")
except Exception as e:
    try:
        from rag_service import RAGService
        rag = RAGService()
        rag_mode = "local"
        print("RAG Service initialized (local Chroma, fallback)")
    except Exception as e2:
        print(f"RAG Service not available: {e}; fallback error: {e2}")
        rag = None
        rag_mode = "none"


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo for now, or handle commands
            # In a real scenario, this would handle subscriptions
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- REST Endpoints for BACnetDriver ---

@app.get("/devices")
async def get_devices():
    """
    Returns a list of discovered BACnet devices (local and remote).
    Compatible with BACnetDriver.ts
    """
    devices = []
    
    # 1. Get Local Device Info
    try:
        resp = await client.get("/protocols/bacnet/local/device")
        if resp.status_code == 200:
            data = resp.json()
            devices.append({
                "deviceId": data.get("instance", 0),
                "name": data.get("objectName", "Local Device"),
                "address": "Local",
                "vendor": "Distech Controls",
                "objects": [] # Objects loaded on demand via /objects endpoint
            })
    except Exception as e:
        print(f"Error fetching local device: {e}")

    # 2. Get Remote Devices
    try:
        resp = await client.get("/protocols/bacnet/remote/devices")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                for d in data:
                    devices.append({
                        "deviceId": d.get("instance"),
                        "name": d.get("objectName", f"Device {d.get('instance')}"),
                        "address": d.get("address"),
                        "vendor": "Unknown",
                        "objects": []
                    })
    except Exception as e:
        print(f"Error fetching remote devices: {e}")

    return devices

@app.get("/devices/{device_id}/objects")
async def get_device_objects(device_id: int):
    """
    Returns an empty list immediately to avoid slow BACnet object reads that
    currently timeout on the target device.
    Objects should be fetched via a scan endpoint or another optimized path.
    """
    return {"objects": []}

# --- BACnet Scan Endpoint (Proxy to BACnet Server) ---
@app.api_route("/scan", methods=["GET", "POST"])
async def scan_network(payload: Dict[str, Any] | None = None, timeout: int = 5):
    """
    Proxies BACnet/IP network scan requests to the dedicated BACnet server on port 8000.
    """
    try:
        # Proxy to the BACnet server running on port 8000
        async with httpx.AsyncClient(timeout=30.0) as bacnet_client:
            response = await bacnet_client.post(
                "http://localhost:8000/scan",
                json=payload or {"timeout": timeout}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"BACnet server error: {response.status_code} - {response.text}")
                return {"devices": []}
                
    except httpx.ConnectError:
        print("Could not connect to BACnet server on port 8000. Is server_bacnet.py running?")
        return {"devices": []}
    except Exception as e:
        print(f"Scan proxy error: {e}")
        return {"devices": []}


# --- RAG Integration ---
try:
    from rag_service import RAGService
    # Initialize RAG Service (this might take a moment to load models)
    rag = RAGService()
    print("RAG Service initialized successfully")
except ImportError as e:
    print(f"RAG Service not available (missing dependencies?): {e}")
    rag = None
except Exception as e:
    print(f"RAG Service failed to init: {e}")
    rag = None

from fastapi import UploadFile, File
import json


@app.post("/api/rag/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Uploads a file to the vector database.
    """
    if not rag:
        raise HTTPException(status_code=503, detail="RAG Service not available")
    
    try:
        content = await file.read()
        success, message = rag.add_document(content, file.filename)
        if not success:
            raise HTTPException(status_code=500, detail=message)
        return {"status": "success", "message": message}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rag/search")
async def search_documents(q: str):
    """
    Searches the vector database for relevant context.
    """
    if not rag:
        # Return empty if RAG is down, so frontend doesn't break
        return {"results": []}
    
    try:
        results = rag.search(q)
        return {"results": results}
    except Exception as e:
        print(f"Search error: {e}")
        return {"results": []}

@app.get("/api/rag/documents")
async def list_documents():
    """
    Returns the list of indexed documents.
    """
    if not rag:
        return {"documents": []}
    
    return {"documents": rag.list_documents()}

@app.post("/upload-document")
async def upload_document_kb(file: UploadFile = File(...)):
    """
    Upload endpoint for Knowledge Base widget.
    """
    if not rag:
        raise HTTPException(status_code=503, detail="RAG Service not available")
    
    try:
        content = await file.read()
        success, message = rag.add_document(content, file.filename)
        if not success:
            raise HTTPException(status_code=500, detail=message)
        return {"status": "success", "message": message, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search-documents")
async def search_documents_kb(payload: Dict[str, Any]):
    """
    Search endpoint for Knowledge Base widget.
    """
    if not rag:
        return {"results": []}
    
    try:
        query = payload.get("query", "")
        if not query:
            return {"results": []}
        results = rag.search(query)
        return {"results": results}
    except Exception as e:
        print(f"Search error: {e}")
        return {"results": []}

# --- Predictive stub endpoint ---
@app.get("/api/predictive_stub")
async def predictive_stub():
    """
    Stub endpoint for predictive alerts. Replace with real predictive backend.
    """
    return {
        "alerts": [
            {"id": "pred_1", "title": "HVAC anomaly risk", "probability": "0.78", "action": "Inspect valves and dampers", "eta": "next 24h"},
            {"id": "pred_2", "title": "Chiller efficiency drop", "probability": "0.64", "action": "Check refrigerant / filters", "eta": "next 48h"},
        ]
    }

# --- Predictive AI endpoint using Gemini ---
@app.post("/api/predictive_ai")
async def predictive_ai(payload: Dict[str, Any]):
    """
    Expects payload: { "variables": [ { "id":..., "label":..., "value":..., "unit":... }, ... ] }
    Returns: { "alerts": [ { id, issue, asset, prob, risk }, ... ] }
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        return {"alerts": []}

    vars_in = payload.get("variables") or []
    prompt = (
        "You are a building operations expert. Given variables (id,label,value,unit), "
        "return JSON only: [{\"id\":\"...\",\"issue\":\"...\",\"asset\":\"...\","
        "\"prob\":\"0.xx\",\"risk\":\"Low/Medium/High/Critical\"}]. "
        "Use concise issues. Probability as 0.xx.\n"
        f"Variables: {json.dumps(vars_in)[:8000]}"
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={gemini_key}"
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 512,
            "responseMimeType": "text/plain"
        }
    }
    try:
        resp = httpx.post(url, json=body, timeout=30)
        if resp.status_code != 200:
            return {"alerts": []}
        data = resp.json()
        cands = data.get("candidates") or []
        if not cands:
            return {"alerts": []}
        text = ""
        parts = cands[0].get("content", {}).get("parts", []) if isinstance(cands[0].get("content"), dict) else cands[0].get("content", [])
        for p in parts:
            if isinstance(p, dict) and "text" in p:
                text += p["text"]
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return {"alerts": parsed}
        except Exception:
            return {"alerts": []}
    except Exception:
        return {"alerts": []}

# --- MQTT Integration for AI Assistant ---
try:
    import aiomqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False
    print("aiomqtt not available - MQTT tools disabled")

MQTT_HOST = "localhost"
MQTT_PORT = 1883

@app.post("/api/mqtt/publish")
async def mqtt_publish(payload: Dict[str, Any]):
    """
    Publishes a message to an MQTT topic.
    Payload: { "topic": "...", "message": "..." }
    """
    if not MQTT_AVAILABLE:
        return {"success": False, "error": "MQTT not available"}
    
    topic = payload.get("topic")
    message = payload.get("message")
    
    if not topic or message is None:
        return {"success": False, "error": "topic and message required"}
    
    try:
        async with aiomqtt.Client(hostname=MQTT_HOST, port=MQTT_PORT) as client:
            await client.publish(topic, str(message))
        return {
            "success": True,
            "message": f"Published to {topic}",
            "topic": topic,
            "payload": message
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/mqtt/subscribe")
async def mqtt_subscribe(payload: Dict[str, Any]):
    """
    Subscribes to an MQTT topic and waits for a message.
    Payload: { "topic": "...", "timeout": 5 }
    """
    if not MQTT_AVAILABLE:
        return {"success": False, "error": "MQTT not available"}
    
    topic = payload.get("topic")
    timeout = payload.get("timeout", 5)
    
    if not topic:
        return {"success": False, "error": "topic required"}
    
    try:
        async with aiomqtt.Client(hostname=MQTT_HOST, port=MQTT_PORT) as client:
            await client.subscribe(topic)
            async with asyncio.timeout(timeout):
                async for message in client.messages:
                    return {
                        "success": True,
                        "topic": topic,
                        "message": message.payload.decode()
                    }
        return {"success": False, "error": "No message received"}
    except asyncio.TimeoutError:
        return {"success": False, "error": f"Timeout after {timeout}s"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ---Health Check ---
@app.get("/health")
async def health_check():
    return {"status": "ok", "mcp": "active", "websocket": "active"}

# --- Chat AI proxy (Gemini + MCP + RAG) ---
@app.post("/api/chat_ai")
async def chat_ai(payload: Dict[str, Any]):
    """
    Expects { userText: str, context: any } 
    Returns { response: str, predictions: list }
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        return {"response": "No Gemini API key configured on server.", "predictions": []}

    try:
        genai.configure(api_key=gemini_key)
    except Exception as e:
        print(f"Gemini Config Error: {e}")
        return {"response": "Error configuring AI.", "predictions": []}

    user_text = payload.get("userText") or ""
    context_data = payload.get("context") or {}

    # 1. RAG Context
    rag_context = ""
    if rag:
        try:
            results = rag.search(user_text)
            if results:
                rag_context = "\n\nRelevant Documentation:\n" + "\n".join([f"- {r}" for r in results])
        except Exception as e:
            print(f"RAG Search Error: {e}")

    # 2. MCP Connection & Tool Execution
    gemini_tools = []
    try:
        # Try to connect to MCP Server (optional - gracefully degrades if not available)
        async with sse_client(url="http://127.0.0.1:8080/mcp") as streams:
            async with ClientSession(streams.read, streams.write) as session:
                await session.initialize()
                
                # List tools
                tools_result = await session.list_tools()
                mcp_tools = tools_result.tools
                
                # Convert to Gemini Tools
                for tool in mcp_tools:
                    gemini_tools.append({
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.inputSchema
                    })
                print(f"Connected to MCP server, {len(gemini_tools)} tools available")
    except Exception as e:
        print(f"MCP Connection failed (continuing without tools): {e}")
        # Continue without MCP tools - this is OK
    
    # 3. Gemini Model Initialization (with or without tools)
    try:
        # System Prompt
        system_instruction = """You are an advanced AI Facility Manager.
        Analyze the provided dashboard context and answer the user's question.
        You have access to tools to query the building system (BACnet, etc.).
        Use these tools when necessary to get real-time data or perform actions.
        
        IMPORTANT: You must return the final response in the following JSON format:
        {
            "response": "Your conversational response here.",
            "predictions": [
                { "asset": "Asset Name", "risk": "High/Medium/Low", "prob": "0.xx", "issue": "Description" }
            ]
        }
        If no predictions are relevant, return empty list for predictions.
        """
        
        # Initialize Model
        model = genai.GenerativeModel(
            model_name='models/gemini-pro-latest',
            tools=gemini_tools if gemini_tools else None,
            system_instruction=system_instruction
        )
        
        # Start Chat
        chat = model.start_chat(enable_automatic_function_calling=False)
        
        # Initial Prompt
        full_prompt = f"Dashboard Context: {json.dumps(context_data)[:10000]}\n{rag_context}\n\nUser Question: {user_text}"
        
        # Send Message
        response = await chat.send_message_async(full_prompt)
        
        # Parse JSON Response
        try:
            text_response = response.text
            # Clean up markdown code blocks if present
            if text_response.startswith("```json"):
                text_response = text_response[7:-3]
            elif text_response.startswith("```"):
                text_response = text_response[3:-3]
                
            parsed = json.loads(text_response)
            return parsed
        except Exception as e:
            print(f"JSON Parse Error: {e}, Raw: {response.text}")
            # Fallback
            return {"response": response.text, "predictions": []}

    except Exception as e:
        print(f"Gemini Error: {e}")
        # Graceful fallback if Gemini fails - provide helpful response with RAG context
        fallback_response = "I'm currently experiencing issues with the AI model initialization. "
        
        if rag_context:
            fallback_response += f"However, I found some relevant documentation that might help:\n{rag_context}\n\n"
        
        fallback_response += f"Regarding your question: '{user_text}'\n\n"
        fallback_response += "The AI assistant is temporarily unavailable due to a model configuration issue. "
        fallback_response += "Your dashboard data and systems are functioning normally. "
        fallback_response += "Please check the system status in the Network tab for real-time BACnet data."
        
        return {"response": fallback_response, "predictions": []}


if __name__ == "__main__":
    # Run on port 8001 for Distech MCP
    uvicorn.run("server:app", host="0.0.0.0", port=8002, reload=True)
