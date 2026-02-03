# Script PowerShell pour démarrer BACnet MCP Server avec Docker
Write-Host "🚀 Démarrage de BACnet MCP Server avec Docker..." -ForegroundColor Green

# Arrêter les conteneurs existants
Write-Host "🛑 Arrêt des conteneurs existants..." -ForegroundColor Yellow
docker-compose down

# Nettoyer les images (optionnel)
Write-Host "🧹 Nettoyage des images... (peut prendre un moment)" -ForegroundColor Yellow
docker system prune -f

# Construire et démarrer les services
Write-Host "🔨 Construction et démarrage des services Docker..." -ForegroundColor Green
docker-compose up --build -d

# Attendre que les services démarrent
Write-Host "⏳ Attente du démarrage des services (15 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Vérifier le statut des conteneurs
Write-Host "📊 Statut des conteneurs:" -ForegroundColor Cyan
docker-compose ps

# Lancer MCP Inspector dans une nouvelle fenêtre PowerShell
Write-Host "🔍 Lancement de MCP Inspector v0.13.0 dans une nouvelle fenêtre..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit -Command `"npx @modelcontextprotocol/inspector@0.13.0`""

Write-Host "✅ Tous les services sont démarrés et MCP Inspector est lancé !" -ForegroundColor Green
Write-Host "Vous pouvez maintenant accéder à l'interface web sur http://localhost:8000" -ForegroundColor Green
Write-Host "Et configurer MCP Inspector pour se connecter à http://localhost:8000/mcp/" -ForegroundColor Green

# Instructions pour MCP Inspector
Write-Host "`n🔧 Configuration MCP Inspector:" -ForegroundColor Cyan
Write-Host "1. Dans MCP Inspector, cliquez sur 'Add Server'" -ForegroundColor White
Write-Host "2. URL: http://localhost:8000/mcp/" -ForegroundColor White
Write-Host "3. Method: HTTP" -ForegroundColor White
Write-Host "4. Format: JSON-RPC 2.0" -ForegroundColor White
Write-Host "5. Cliquez sur 'Connect'" -ForegroundColor White
Write-Host "✅ Vous devriez voir tous les outils BACnet disponibles !" -ForegroundColor Green
