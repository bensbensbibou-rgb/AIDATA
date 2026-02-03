#!/usr/bin/env python3
import requests
import time

def test_server():
    print("Test du serveur BACnet MCP...")
    
    # Test de l'endpoint de santé
    try:
        print("1. Test de l'endpoint /health...")
        response = requests.get("http://localhost:8050/health", timeout=5)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"   Erreur: {e}")
    
    # Test de l'endpoint MCP
    try:
        print("\n2. Test de l'endpoint /mcp/...")
        response = requests.get("http://localhost:8050/mcp/", timeout=5)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
    except requests.exceptions.RequestException as e:
        print(f"   Erreur: {e}")
    
    # Test de la documentation
    try:
        print("\n3. Test de l'endpoint /docs...")
        response = requests.get("http://localhost:8050/docs", timeout=5)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
    except requests.exceptions.RequestException as e:
        print(f"   Erreur: {e}")

if __name__ == "__main__":
    test_server()
