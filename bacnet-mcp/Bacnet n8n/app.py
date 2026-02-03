#!/usr/bin/env python3
"""
Serveur unifié BACnet MCP + Interface Web + Webhook n8n
Combine le serveur MCP BACnet avec une interface web moderne et le proxy n8n
"""

import os
import sys
import json
from typing import Optional
from fastapi import FastAPI, Request, HTTPException, Body, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import httpx

# Import du serveur MCP BACnet
try:
    import fastmcp
    from fastmcp import mcp, __version__
except ImportError as e:
    print(f"Erreur: Impossible d'importer le serveur BACnet: {e}")
    print("Assurez-vous que fastmcp.py existe et est fonctionnel")
    sys.exit(1)

# Configuration
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Configuration n8n
N8N_WEBHOOK_URL = os.getenv(
    "N8N_WEBHOOK_URL",
    "http://localhost:5678/webhook/a889d2ae-2159-402f-b326-5f61e90f602e/chat"
).strip()
API_BEARER = os.getenv("API_BEARER", "").strip()

# Application FastAPI principale
app = FastAPI(
    title="Agent BACnet - Interface Web + n8n",
    description="Interface web moderne pour le contrôle BACnet avec intégration n8n",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montage des fichiers statiques
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except Exception as e:
    print(f"Attention: Impossible de monter les fichiers statiques: {e}")

# Routes MCP directes dans l'application principale
@app.post("/mcp")
async def mcp_endpoint(request: Request):
    """Endpoint MCP principal"""
    try:
        # Parser le JSON du body de la requête
        body = await request.json()
        return await mcp._handle_mcp_request(body)
    except Exception as e:
        print(f"Erreur parsing JSON: {e}")
        # Essayer de parser comme string
        try:
            body_text = await request.body()
            if not body_text:
                return JSONResponse(
                    status_code=400,
                    content={
                        "jsonrpc": "2.0",
                        "error": {"code": -32700, "message": "Empty request body"},
                        "id": None
                    }
                )
            
            body_str = body_text.decode('utf-8')
            if not body_str.strip():
                return JSONResponse(
                    status_code=400,
                    content={
                        "jsonrpc": "2.0",
                        "error": {"code": -32700, "message": "Empty request body"},
                        "id": None
                    }
                )
            
            body = json.loads(body_str)
            return await mcp._handle_mcp_request(body)
        except json.JSONDecodeError as e2:
            print(f"Erreur parsing JSON string: {e2}")
            return JSONResponse(
                status_code=400,
                content={
                    "jsonrpc": "2.0",
                    "error": {"code": -32700, "message": f"Invalid JSON: {str(e2)}"},
                    "id": None
                }
            )
        except Exception as e2:
            print(f"Erreur parsing string: {e2}")
            return JSONResponse(
                status_code=400,
                content={
                    "jsonrpc": "2.0",
                    "error": {"code": -32700, "message": "Parse error"},
                    "id": None
                }
            )

# Montage du serveur MCP sous /mcp (pour compatibilité)
# Note: Les routes MCP sont maintenant dans mcp.http_app
# et seront accessibles via /mcp/...
app.mount("/mcp", mcp.http_app, name="mcp")

# Auth facultative pour n8n
def require_bearer(auth_header: Optional[str]):
    if API_BEARER and auth_header != f"Bearer {API_BEARER}":
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return None

# Routes principales
@app.get("/")
async def root():
    """Page d'accueil avec redirection vers l'interface web"""
    return HTMLResponse("""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Agent BACnet - Accueil</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
                max-width: 600px;
                width: 90%;
            }
            h1 {
                color: #2d3748;
                margin-bottom: 20px;
                font-size: 2.5rem;
            }
            .subtitle {
                color: #718096;
                margin-bottom: 30px;
                font-size: 1.1rem;
            }
            .btn {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-weight: 600;
                margin: 10px;
                transition: all 0.3s ease;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
            }
            .btn-secondary {
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            }
            .btn-warning {
                background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
            }
            .links {
                margin-top: 30px;
            }
            .version {
                color: #a0aec0;
                font-size: 0.9rem;
                margin-top: 20px;
            }
            .n8n-status {
                margin-top: 20px;
                padding: 10px;
                border-radius: 8px;
                background: rgba(72, 187, 120, 0.1);
                border: 1px solid rgba(72, 187, 120, 0.3);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔧 Agent BACnet</h1>
            <p class="subtitle">Interface de contrôle BACnet + Intégration n8n</p>
            
            <div class="links">
                <a href="/static/app.html" class="btn">🚀 Interface Web BACnet</a>
                <a href="/ui" class="btn btn-secondary">🖥️ Interface iframe</a>
                <a href="/docs" class="btn">📚 Documentation API</a>
                <a href="/health" class="btn">💚 Vérifier santé</a>
            </div>
            
            <div class="n8n-status">
                <strong>🔗 n8n Webhook:</strong> """ + (N8N_WEBHOOK_URL if N8N_WEBHOOK_URL else "Non configuré") + """
            </div>
            
            <div class="version">
                Version: """ + __version__ + """
            </div>
        </div>
    </body>
    </html>
    """)

@app.get("/health")
async def health():
    """Point de terminaison de santé du serveur"""
    try:
        # Vérifier que le serveur MCP est disponible
        return {
            "status": "healthy",
            "version": __version__,
            "mcp_available": True,
            "n8n_webhook": N8N_WEBHOOK_URL or None,
            "endpoints": {
                "web_interface": "/static/app.html",
                "iframe_interface": "/ui",
                "api_docs": "/docs",
                "mcp_server": "/mcp",
                "n8n_webhook": "/make",
                "health": "/health"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@app.get("/api/tools")
async def list_tools():
    """Liste tous les outils MCP disponibles"""
    try:
        tools = []
        for tool_name, tool_info in mcp.tools.items():
            tools.append({
                "name": tool_name,
                "description": getattr(tool_info, 'description', ''),
                "parameters": getattr(tool_info, 'parameters', {})
            })
        return {"tools": tools}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des outils: {str(e)}")

@app.post("/api/tools/{tool_name}")
async def call_tool(tool_name: str, arguments: dict = Body(...)):
    """Appelle un outil MCP spécifique"""
    try:
        if tool_name not in mcp.tools:
            raise HTTPException(status_code=404, detail=f"Outil '{tool_name}' non trouvé")
        
        # Appeler l'outil MCP
        tool_func = mcp.tools[tool_name]
        result = await tool_func(**arguments.get("arguments", {}))
        
        return {"result": result, "tool": tool_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'appel de l'outil '{tool_name}': {str(e)}")

# Interface iframe (comme dans serveurWeb.py)
@app.get("/ui")
async def serve_iframe():
    return HTMLResponse(f"""<!doctype html>
<html lang='fr'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>UI Agent BACnet</title>
  <style>
    html, body {{
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        background: #0b0d10;
    }}
    iframe {{
        width: 100%;
        height: 100%;
        border: none;
        display: block;
        background: #fff;
    }}
  </style>
</head>
<body>
  <iframe src='/static/app.html' title='Agent BACnet' allowfullscreen></iframe>
</body>
</html>""")

# Webhook n8n (comme dans serveurWeb.py)
@app.api_route("/make", methods=["GET", "POST"])
async def make_proxy(
    request: Request,
    payload: Optional[dict] = Body(None),
    authorization: Optional[str] = Header(None)
):
    """Proxy vers le webhook n8n"""
    maybe_err = require_bearer(authorization)
    if maybe_err:
        return maybe_err

    if not N8N_WEBHOOK_URL:
        return JSONResponse({"error": "N8N_WEBHOOK_URL non configurée"}, status_code=500)

    try:
        async with httpx.AsyncClient(timeout=30) as h:
            if request.method == "GET":
                r = await h.get(N8N_WEBHOOK_URL, params=dict(request.query_params))
            else:
                r = await h.post(N8N_WEBHOOK_URL, json=payload or {}, headers={"Content-Type": "application/json"})

        if r.status_code == 404:
            return JSONResponse(
                {"error": "Webhook introuvable ou mauvais type de requête. Vérifie que ton scénario n8n est actif et accepte la méthode utilisée."},
                status_code=404
            )

        ctype = (r.headers.get("content-type") or "").lower()
        if "application/json" in ctype:
            try:
                return JSONResponse(r.json(), status_code=r.status_code)
            except Exception:
                return JSONResponse({"raw": r.text}, status_code=r.status_code)

        return StreamingResponse(iter([r.text]), media_type="text/plain", status_code=r.status_code)

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=502)

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """Gestionnaire pour les pages non trouvées"""
    return HTMLResponse("""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Page non trouvée - Agent BACnet</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
                max-width: 500px;
                width: 90%;
            }
            h1 {
                color: #e53e3e;
                margin-bottom: 20px;
                font-size: 2.5rem;
            }
            .btn {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-weight: 600;
                margin: 10px;
                transition: all 0.3s ease;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔍 Page non trouvée</h1>
            <p>La page que vous recherchez n'existe pas.</p>
            <a href="/" class="btn">🏠 Retour à l'accueil</a>
        </div>
    </body>
    </html>
    """, status_code=404)

if __name__ == "__main__":
    print(f"🚀 Démarrage de l'Agent BACnet v{__version__}")
    print(f"📍 Interface web: http://{HOST}:{PORT}")
    print(f"🖥️ Interface iframe: http://{HOST}:{PORT}/ui")
    print(f"📚 Documentation API: http://{HOST}:{PORT}/docs")
    print(f"🔧 Serveur MCP: http://{HOST}:{PORT}/mcp")
    print(f"🔗 Webhook n8n: http://{HOST}:{PORT}/make")
    print(f"💚 Santé: http://{HOST}:{PORT}/health")
    if N8N_WEBHOOK_URL:
        print(f"🔗 n8n configuré: {N8N_WEBHOOK_URL}")
    else:
        print("⚠️ n8n non configuré (N8N_WEBHOOK_URL)")
    print("=" * 50)
    
    uvicorn.run(
        "app:app",
        host=HOST,
        port=PORT,
        reload=DEBUG,
        log_level="info" if DEBUG else "warning"
    )
