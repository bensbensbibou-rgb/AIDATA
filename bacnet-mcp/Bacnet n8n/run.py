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
app.mount('/mcp', server.mcp.http_app())
