#!/usr/bin/env python3
import os
from typing import Optional
from fastapi import FastAPI, Body, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import httpx

# ---------- Config ----------
PORT = int(os.getenv("PORT", "3000"))
N8N_WEBHOOK_URL = os.getenv(
    "N8N_WEBHOOK_URL",
    "http://localhost:5678/webhook/13478bce-581a-4cdc-a291-0e629aee3eaf"
).strip()
API_BEARER = os.getenv("API_BEARER", "").strip()
IFRAME_UI_URL = os.getenv("IFRAME_UI_URL", "/static/app.html").strip()

# ---------- App ----------
app = FastAPI(title="Proxy n8n + UI iframe", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# Création auto dossier static
BASE_DIR = os.path.dirname(__file__)
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Auth facultative
def require_bearer(auth_header: Optional[str]):
    if API_BEARER and auth_header != f"Bearer {API_BEARER}":
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return None

# ---------- Routes ----------
@app.get("/health")
def health():
    return {"ok": True, "n8n_url": N8N_WEBHOOK_URL or None, "method": "GET/POST"}

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
  <iframe src='{IFRAME_UI_URL}' title='Agent BACnet' allowfullscreen></iframe>
</body>
</html>""")

@app.api_route("/make", methods=["GET", "POST"])
async def make_proxy(
    request: Request,
    payload: Optional[dict] = Body(None),
    authorization: Optional[str] = Header(None)
):
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("serveur:app", host="0.0.0.0", port=PORT, reload=True)
