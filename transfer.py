import paramiko
import os

# Configuration
hostname = "192.168.1.50"
username = "pi"
password = "2t5qth"
local_file = r"C:\Users\Mbensale\GIT\-Dashboard-AI_beta\dashboard-20251125-230004.zip"
remote_file = "/home/pi/dashboard-20251125-230004.zip"

print(f"Connexion a {hostname}...")

# Creer une connexion SSH
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(hostname, username=username, password=password)
    print("Connecte!")
    
    # Creer un client SFTP
    sftp = ssh.open_sftp()
    print(f"Transfert de {os.path.basename(local_file)}...")
    
    # Transferer le fichier
    sftp.put(local_file, remote_file)
    print(f"Transfert termine! Fichier envoye vers {remote_file}")
    
    # Fermer SFTP
    sftp.close()
    
finally:
    ssh.close()
    print("Connexion fermee")
