import sys
import os
import asyncio
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add bacnet-mcp to path
sys.path.append(os.path.join(os.getcwd(), "bacnet-mcp"))

try:
    import server as bacnet_module
except ImportError as e:
    print(f"Failed to import bacnet module: {e}")
    sys.exit(1)

async def main():
    print("Attempting to initialize BACnet app...")
    try:
        app = await bacnet_module.get_bacnet_app()
        if app:
            print("BACnet app initialized successfully!")
            print(f"App: {app}")
            # Keep it running for a moment to check netstat
            await asyncio.sleep(5)
            if hasattr(app, "close"):
                app.close()
        else:
            print("BACnet app returned None.")
    except Exception as e:
        print(f"Error initializing BACnet app: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
