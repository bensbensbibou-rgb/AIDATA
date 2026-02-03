
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from distech_mcp_server_full import app as bacnet_app

# Combined app
app = FastAPI(title="Distech MCP + UI")

# Mount the existing API under /api
app.mount("/api", bacnet_app)

# Serve the static UI (index.html) at root
app.mount("/", StaticFiles(directory="static", html=True), name="app")
