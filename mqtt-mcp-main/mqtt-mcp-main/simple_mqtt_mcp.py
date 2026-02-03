"""
Serveur MCP MQTT simplifié
"""
from fastmcp import FastMCP
import asyncio
import aiomqtt

mcp = FastMCP("MQTT Server")

# Configuration MQTT par défaut
MQTT_HOST = "localhost"
MQTT_PORT = 1883

@mcp.tool()
async def publish_mqtt(topic: str, message: str, host: str = MQTT_HOST, port: int = MQTT_PORT) -> str:
    """Publie un message sur un topic MQTT"""
    try:
        async with aiomqtt.Client(hostname=host, port=port) as client:
            await client.publish(topic, message)
        return f"Message publié sur {topic}"
    except Exception as e:
        return f"Erreur: {str(e)}"

@mcp.tool()
async def subscribe_mqtt(topic: str, timeout: int = 10, host: str = MQTT_HOST, port: int = MQTT_PORT) -> str:
    """S'abonne à un topic MQTT et attend un message"""
    try:
        async with aiomqtt.Client(hostname=host, port=port) as client:
            await client.subscribe(topic)
            async with asyncio.timeout(timeout):
                async for message in client.messages:
                    return f"Message reçu: {message.payload.decode()}"
        return "Aucun message reçu"
    except asyncio.TimeoutError:
        return f"Timeout après {timeout}s"
    except Exception as e:
        return f"Erreur: {str(e)}"

if __name__ == "__main__":
    mcp.run()
