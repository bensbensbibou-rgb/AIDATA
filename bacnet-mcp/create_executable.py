#!/usr/bin/env python3
"""
Script pour créer un exécutable Windows du projet BACnet MCP
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def install_pyinstaller():
    """Installer PyInstaller si nécessaire"""
    try:
        import PyInstaller
        print("✅ PyInstaller est déjà installé")
    except ImportError:
        print("📦 Installation de PyInstaller...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
        print("✅ PyInstaller installé")

def create_executable():
    """Créer l'exécutable principal"""
    print("🔨 Création de l'exécutable BACnet MCP...")
    
    # Configuration PyInstaller
    cmd = [
        "pyinstaller",
        "--onefile",                    # Un seul fichier exécutable
        "--windowed",                   # Pas de console (optionnel)
        "--name=BACnet_MCP_Installer",  # Nom de l'exécutable
        "--add-data=static;static",     # Inclure les fichiers statiques
        "--add-data=requirements.txt;.", # Inclure requirements.txt
        "--add-data=installer.bat;.",   # Inclure l'installateur
        "--add-data=start_all_with_web_interface.bat;.", # Scripts de démarrage
        "--add-data=start_n8n_local.bat;.",
        "--add-data=start.bat;.",
        "--add-data=serveurWeb.py;.",
        "--add-data=server.py;.",
        "--add-data=n8n.env;.",
        "--add-data=config.env.example;.",
        "--icon=static/favicon.ico",    # Icône (si disponible)
        "installer.bat"                 # Point d'entrée
    ]
    
    subprocess.run(cmd, check=True)
    print("✅ Exécutable créé dans dist/BACnet_MCP_Installer.exe")

def create_installer_script():
    """Créer un script Python pour l'installateur"""
    installer_script = """
import os
import sys
import subprocess
import tkinter as tk
from tkinter import messagebox, ttk
import threading

class BACnetInstaller:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Installateur BACnet MCP + n8n + Web")
        self.root.geometry("600x400")
        self.setup_ui()
    
    def setup_ui(self):
        # Titre
        title = tk.Label(self.root, text="🚀 Installateur BACnet MCP + n8n + Web", 
                        font=("Arial", 16, "bold"))
        title.pack(pady=20)
        
        # Description
        desc = tk.Label(self.root, text="Cet installateur va configurer automatiquement\\n"
                                       "tous les services nécessaires pour BACnet MCP", 
                        font=("Arial", 10))
        desc.pack(pady=10)
        
        # Zone de logs
        self.log_text = tk.Text(self.root, height=15, width=70)
        self.log_text.pack(pady=10, padx=20)
        
        # Barre de progression
        self.progress = ttk.Progressbar(self.root, length=400, mode='indeterminate')
        self.progress.pack(pady=10)
        
        # Boutons
        button_frame = tk.Frame(self.root)
        button_frame.pack(pady=20)
        
        self.install_btn = tk.Button(button_frame, text="Installer", 
                                   command=self.start_installation,
                                   bg="green", fg="white", font=("Arial", 12))
        self.install_btn.pack(side=tk.LEFT, padx=10)
        
        quit_btn = tk.Button(button_frame, text="Quitter", 
                           command=self.root.quit,
                           bg="red", fg="white", font=("Arial", 12))
        quit_btn.pack(side=tk.LEFT, padx=10)
    
    def log(self, message):
        self.log_text.insert(tk.END, message + "\\n")
        self.log_text.see(tk.END)
        self.root.update()
    
    def start_installation(self):
        self.install_btn.config(state=tk.DISABLED)
        self.progress.start()
        
        # Lancer l'installation dans un thread séparé
        thread = threading.Thread(target=self.run_installation)
        thread.daemon = True
        thread.start()
    
    def run_installation(self):
        try:
            self.log("🚀 Démarrage de l'installation...")
            
            # Vérifier Python
            self.log("📋 Vérification de Python...")
            result = subprocess.run(["python", "--version"], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                self.log(f"✅ Python: {result.stdout.strip()}")
            else:
                self.log("❌ Python non trouvé. Veuillez l'installer.")
                return
            
            # Vérifier Node.js
            self.log("📋 Vérification de Node.js...")
            result = subprocess.run(["node", "--version"], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                self.log(f"✅ Node.js: {result.stdout.strip()}")
            else:
                self.log("❌ Node.js non trouvé. Veuillez l'installer.")
                return
            
            # Vérifier Docker
            self.log("📋 Vérification de Docker...")
            result = subprocess.run(["docker", "--version"], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                self.log(f"✅ Docker: {result.stdout.strip()}")
            else:
                self.log("❌ Docker non trouvé. Veuillez l'installer.")
                return
            
            # Créer l'environnement virtuel
            self.log("🔧 Création de l'environnement virtuel...")
            if not os.path.exists("venv"):
                subprocess.run(["python", "-m", "venv", "venv"], check=True)
                self.log("✅ Environnement virtuel créé")
            else:
                self.log("✅ Environnement virtuel déjà présent")
            
            # Installer les dépendances
            self.log("📦 Installation des dépendances Python...")
            if os.path.exists("requirements.txt"):
                subprocess.run(["venv\\Scripts\\pip", "install", "-r", "requirements.txt"], 
                             check=True)
                self.log("✅ Dépendances installées")
            
            # Installer n8n
            self.log("📦 Installation de n8n...")
            subprocess.run(["npm", "install", "-g", "n8n"], check=True)
            self.log("✅ n8n installé")
            
            # Créer les dossiers
            self.log("📁 Création des dossiers...")
            folders = ["data", "static", "logs", "n8n-data", "monitoring"]
            for folder in folders:
                os.makedirs(folder, exist_ok=True)
            self.log("✅ Dossiers créés")
            
            self.log("🎉 Installation terminée avec succès!")
            self.log("\\nServices disponibles:")
            self.log("- BACnet MCP: http://localhost:8050")
            self.log("- n8n: http://localhost:5678")
            self.log("- Interface Web: http://localhost:8080")
            
            messagebox.showinfo("Succès", "Installation terminée avec succès!")
            
        except Exception as e:
            self.log(f"❌ Erreur: {str(e)}")
            messagebox.showerror("Erreur", f"Erreur lors de l'installation: {str(e)}")
        finally:
            self.progress.stop()
            self.install_btn.config(state=tk.NORMAL)
    
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = BACnetInstaller()
    app.run()
"""
    
    with open("installer_gui.py", "w", encoding="utf-8") as f:
        f.write(installer_script)
    
    print("✅ Script d'installateur GUI créé")

def main():
    """Fonction principale"""
    print("🚀 Création de l'exécutable BACnet MCP")
    print("=" * 50)
    
    # Installer PyInstaller
    install_pyinstaller()
    
    # Créer le script d'installateur GUI
    create_installer_script()
    
    # Créer l'exécutable
    create_executable()
    
    print("\\n🎉 Exécutable créé avec succès!")
    print("📁 Fichier: dist/BACnet_MCP_Installer.exe")
    print("\\nPour distribuer:")
    print("1. Copiez le fichier .exe")
    print("2. Partagez-le avec les utilisateurs")
    print("3. Ils peuvent l'exécuter directement")

if __name__ == "__main__":
    main()
