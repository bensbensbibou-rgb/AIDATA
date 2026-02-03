"""
Fichier de lancement pour le serveur MCP MQTT
"""
from mqtt_mcp.server import MQTTMCP

# Créer l'instance du serveur MCP
mcp = MQTTMCP()

# FastMCP est une sous-classe de FastAPI, donc on peut l'utiliser directement
app = mcp

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
