from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import server  # server.py doit exister et définir mcp

__version__ = getattr(server, '__version__', 'dev')

app = FastAPI(title='BACnet MCP', version=__version__)

@app.get('/health')
def health():
    return {'status': 'ok', 'version': __version__}

try:
    app.mount('/static', StaticFiles(directory='static'), name='static')
except Exception:
    pass

# Monte le MCP sous /mcp
# run.py
# run.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import server  # contient 'mcp' et éventuellement __version__

__version__ = getattr(server, '__version__', 'dev')
app = FastAPI(title='BACnet MCP', version=__version__)

@app.get('/health')
def health():
    return {'status': 'ok', 'version': __version__}

try:
    app.mount('/static', StaticFiles(directory='static'), name='static')
except Exception:
    pass

# ⬇️ IMPORTANT : pas de docs_url/openapi_url ici (ta version ne les supporte pas)
mcp_app = server.mcp.http_app()
app.mount('/mcp', mcp_app)

