#!/usr/bin/env python3
"""
Serveur Web Simple pour BACnet MCP
Sert les pages web statiques et redirige vers les services
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
import os
import uvicorn

# Configuration
STATIC_DIR = "static"
PORT = 8080

# Créer l'application FastAPI
app = FastAPI(
    title="BACnet MCP Web Interface",
    description="Interface web pour le serveur BACnet MCP",
    version="1.0.0"
)

# Monter les fichiers statiques
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/", response_class=HTMLResponse)
async def root():
    """Page d'accueil avec liens vers tous les services"""
    return """
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BACnet MCP - Interface Web</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
                padding: 20px;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            }
            h1 {
                text-align: center;
                color: #2d3748;
                font-size: 3rem;
                margin-bottom: 10px;
            }
            .subtitle {
                text-align: center;
                color: #718096;
                font-size: 1.2rem;
                margin-bottom: 40px;
            }
            .services-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            .service-card {
                background: rgba(255, 255, 255, 0.8);
                border-radius: 15px;
                padding: 25px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .service-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 45px rgba(0, 0, 0, 0.15);
            }
            .service-card h3 {
                color: #2d3748;
                margin-bottom: 15px;
                font-size: 1.5rem;
            }
            .service-card p {
                color: #718096;
                margin-bottom: 20px;
                line-height: 1.6;
            }
            .service-card .url {
                background: #f7fafc;
                padding: 10px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 0.9rem;
                color: #4a5568;
                margin-bottom: 15px;
                word-break: break-all;
            }
            .btn {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 24px;
                border-radius: 10px;
                text-decoration: none;
                font-weight: 600;
                transition: transform 0.2s ease;
            }
            .btn:hover {
                transform: translateY(-2px);
            }
            .status {
                display: inline-block;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #48bb78;
                margin-right: 8px;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            .web-apps {
                background: rgba(255, 255, 255, 0.8);
                border-radius: 15px;
                padding: 25px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .web-apps h2 {
                color: #2d3748;
                margin-bottom: 20px;
                font-size: 2rem;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 BACnet MCP</h1>
            <p class="subtitle">Interface web complète pour la gestion BACnet</p>
            
            <div class="services-grid">
                <div class="service-card">
                    <h3><span class="status"></span>Serveur BACnet MCP</h3>
                    <p>API principale pour la communication BACnet et les outils MCP</p>
                    <div class="url">http://localhost:8050</div>
                    <a href="http://localhost:8050" class="btn" target="_blank">Accéder</a>
                </div>
                
                <div class="service-card">
                    <h3><span class="status"></span>Interface n8n</h3>
                    <p>Plateforme d'automatisation des workflows BACnet</p>
                    <div class="url">http://localhost:5678</div>
                    <a href="http://localhost:5678" class="btn" target="_blank">Accéder</a>
                </div>
                
                <div class="service-card">
                    <h3><span class="status"></span>Prometheus</h3>
                    <p>Monitoring et collecte de métriques en temps réel</p>
                    <div class="url">http://localhost:9090</div>
                    <a href="http://localhost:9090" class="btn" target="_blank">Accéder</a>
                </div>
                
                <div class="service-card">
                    <h3><span class="status"></span>Grafana</h3>
                    <p>Dashboards et visualisation des données BACnet</p>
                    <div class="url">http://localhost:3000</div>
                    <a href="http://localhost:3000" class="btn" target="_blank">Accéder</a>
                </div>
                
                <div class="service-card">
                    <h3><span class="status"></span>Nginx (Reverse Proxy)</h3>
                    <p>Point d'entrée principal avec load balancing</p>
                    <div class="url">http://localhost:80</div>
                    <a href="http://localhost:80" class="btn" target="_blank">Accéder</a>
                </div>
            </div>
            
            <div class="web-apps">
                <h2>📱 Applications Web BACnet</h2>
                <div class="services-grid">
                    <div class="service-card">
                        <h3>💬 Chat AI 24/7</h3>
                        <p>Interface de chat intelligent pour l'assistance technique BACnet</p>
                        <div class="url">http://localhost:8080/static/app.html</div>
                        <a href="/static/app.html" class="btn" target="_blank">Ouvrir Chat</a>
                    </div>
                    
                    <div class="service-card">
                        <h3>🏢 Interface BACnet</h3>
                        <p>Interface web complète pour la gestion des appareils BACnet</p>
                        <div class="url">http://localhost:8080/static/app1.html</div>
                        <a href="/static/app1.html" class="btn" target="_blank">Ouvrir Interface</a>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/health")
async def health():
    """Endpoint de santé"""
    return {"status": "ok", "service": "BACnet MCP Web Interface"}

if __name__ == "__main__":
    print(f"🌐 Démarrage du serveur web BACnet MCP sur le port {PORT}")
    print(f"📍 Interface web: http://localhost:{PORT}")
    print(f"💬 Chat AI: http://localhost:{PORT}/static/app.html")
    print(f"🏢 Interface BACnet: http://localhost:{PORT}/static/app1.html")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
