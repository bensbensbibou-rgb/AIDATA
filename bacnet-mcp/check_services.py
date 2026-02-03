#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de vérification des services Docker
"""

import requests
import time
import subprocess

def check_docker_services():
    """Vérifier que tous les services Docker sont en cours d'exécution"""
    print("🔍 Vérification des services Docker")
    print("=" * 40)
    
    try:
        result = subprocess.run(['docker-compose', 'ps'], capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            print("✅ Docker Compose fonctionne")
            print(result.stdout)
        else:
            print("❌ Erreur Docker Compose")
            print(result.stderr)
    except Exception as e:
        print(f"❌ Erreur: {e}")

def check_service_health(url, name, timeout=5):
    """Vérifier la santé d'un service"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            print(f"✅ {name}: OK (Status: {response.status_code})")
            return True
        else:
            print(f"⚠️ {name}: Status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ {name}: Connexion refusée")
        return False
    except requests.exceptions.Timeout:
        print(f"⏰ {name}: Timeout")
        return False
    except Exception as e:
        print(f"❌ {name}: Erreur - {e}")
        return False

def main():
    print("🚀 Vérification complète des services")
    print("=" * 50)
    
    # Vérifier Docker
    check_docker_services()
    
    print("\n🔍 Vérification des services web")
    print("=" * 40)
    
    services = [
        ("http://localhost:8000/health", "Serveur BACnet MCP"),
        ("http://localhost:5678", "n8n"),
        ("http://localhost:3000", "Grafana"),
        ("http://localhost:9090", "Prometheus"),
        ("http://localhost:8080", "Adminer"),
        ("http://localhost:6379", "Redis"),
    ]
    
    results = []
    for url, name in services:
        results.append(check_service_health(url, name))
        time.sleep(0.5)  # Petite pause entre les vérifications
    
    print(f"\n📊 Résumé: {sum(results)}/{len(results)} services opérationnels")
    
    if all(results):
        print("🎉 Tous les services sont opérationnels !")
        print("\n🌐 Accès aux services:")
        print("  - n8n: http://localhost:5678")
        print("  - Serveur MCP: http://localhost:8000")
        print("  - Grafana: http://localhost:3000")
        print("  - Prometheus: http://localhost:9090")
        print("  - Adminer: http://localhost:8080")
    else:
        print("⚠️ Certains services ne répondent pas")
        print("Vérifiez les logs avec: docker-compose logs")

if __name__ == "__main__":
    main()
