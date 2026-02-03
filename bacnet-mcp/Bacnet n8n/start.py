#!/usr/bin/env python3
"""
Script de lancement pour l'Agent BACnet
Charge les variables d'environnement et lance le serveur
"""

import os
import sys
from pathlib import Path

# Charger les variables d'environnement depuis .env si le fichier existe
env_file = Path(".env")
if env_file.exists():
    print("📄 Chargement du fichier .env...")
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                if "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key] = value

# Lancer l'application
if __name__ == "__main__":
    print("🚀 Lancement de l'Agent BACnet...")
    print("=" * 50)
    
    # Vérifier que les dépendances sont installées
    try:
        import fastapi
        import uvicorn
        import httpx
        print("✅ Dépendances OK")
    except ImportError as e:
        print(f"❌ Dépendance manquante: {e}")
        print("Installez les dépendances avec: pip install -r requirements.txt")
        sys.exit(1)
    
    # Lancer l'application
    try:
        from app import app
        import uvicorn
        
        port = int(os.getenv("PORT", "8000"))
        host = os.getenv("HOST", "0.0.0.0")
        debug = os.getenv("DEBUG", "false").lower() == "true"
        
        print(f"🌐 Serveur démarré sur http://{host}:{port}")
        print(f"🔧 Mode debug: {'Activé' if debug else 'Désactivé'}")
        
        uvicorn.run(
            "app:app",
            host=host,
            port=port,
            reload=debug,
            log_level="info" if debug else "warning"
        )
        
    except Exception as e:
        print(f"❌ Erreur lors du lancement: {e}")
        sys.exit(1)

