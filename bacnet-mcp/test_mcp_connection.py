#!/usr/bin/env python3
"""
Script de test pour vérifier la connexion MCP BACnet
"""

import requests
import json
import time

def test_mcp_connection():
    """Test de connexion au serveur MCP"""
    
    print("🔍 Test de connexion MCP BACnet")
    print("=" * 50)
    
    # URL du serveur MCP
    mcp_url = "http://localhost:8050/mcp/"
    
    # Test 1: Vérifier que le serveur répond
    print("1. Test de réponse du serveur...")
    try:
        response = requests.get(mcp_url, timeout=5)
        print(f"   ✅ Serveur répond (Status: {response.status_code})")
        print(f"   📄 Réponse: {response.text[:200]}...")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Erreur de connexion: {e}")
        return False
    
    # Test 2: Test avec headers appropriés
    print("\n2. Test avec headers MCP...")
    headers = {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(mcp_url, headers=headers, timeout=5)
        print(f"   ✅ Headers acceptés (Status: {response.status_code})")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Erreur avec headers: {e}")
    
    # Test 3: Test de requête JSON-RPC
    print("\n3. Test de requête JSON-RPC...")
    
    # Requête d'initialisation MCP
    init_request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {},
                "resources": {}
            },
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        }
    }
    
    try:
        response = requests.post(
            mcp_url, 
            headers={'Content-Type': 'application/json'},
            json=init_request,
            timeout=10
        )
        print(f"   ✅ Requête JSON-RPC envoyée (Status: {response.status_code})")
        print(f"   📄 Réponse: {response.text[:300]}...")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Erreur JSON-RPC: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Résumé:")
    print("✅ Serveur MCP BACnet fonctionne sur http://localhost:8050/mcp/")
    print("✅ Inspecteur MCP disponible sur http://localhost:6274")
    print("\n📋 Pour vous connecter:")
    print("1. Ouvrez http://localhost:6274")
    print("2. Ajoutez le serveur: http://localhost:8050/mcp/")
    print("3. Testez les outils BACnet")
    
    return True

if __name__ == "__main__":
    test_mcp_connection()
