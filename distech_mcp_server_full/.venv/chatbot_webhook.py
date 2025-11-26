from fastapi import FastAPI
import gradio as gr
import httpx
import asyncio

# 🌐 Ton webhook Make (réception + réponse texte brut)
WEBHOOK_URL = "https://hook.eu2.make.com/jjrqo6elm1ot032qrruxramopg9ctf8g"

# ⚙️ Application FastAPI
app = FastAPI()

# 🔁 Fonction : envoie la requête à Make et récupère la réponse texte
async def send_and_receive(user_message: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(WEBHOOK_URL, json={"texte": user_message})
        response.raise_for_status()
        return response.text.strip()  # Utilise la réponse brute

# 🤖 Fonction Gradio
async def chatbot(messages, context=None):
    # Vérifie si le message est brut ou liste (sécurité)
    if isinstance(messages, str):
        user_msg = messages
        messages = [{"role": "user", "content": user_msg}]
    else:
        user_msg = messages[-1]["content"]

    # Envoie au webhook et récupère la réponse
    reply = await send_and_receive(user_msg)

    # Affiche la réponse dans le chat
    return messages + [{"role": "assistant", "content": reply}]

# 🎛️ Interface Gradio
demo = gr.ChatInterface(
    fn=chatbot,
    title="🤖 Agent IA connecté à Make",
    type="messages"
)

# ✅ API GET simple
@app.get("/")
def read_root():
    return {"status": "Agent IA opérationnel 🚀"}

# 🚀 Lancement automatique de Gradio avec FastAPI
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(
        demo.launch(
            share=True,
            server_name="0.0.0.0",
            server_port=7860,
            inline=False
        )
    )
