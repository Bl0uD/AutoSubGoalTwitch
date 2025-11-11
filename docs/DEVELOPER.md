# 🔧 Guide Développeur - AutoSubGoalTwitch v2.1.0

**Documentation technique pour contribuer au projet AutoSubGoalTwitch.**

---

## 📋 Table des Matières

1. [Architecture du Projet](#architecture-du-projet)
2. [Stack Technique](#stack-technique)
3. [Structure des Fichiers](#structure-des-fichiers)
4. [Configuration du Développement](#configuration-du-développement)
5. [Système d'Auto-Update](#système-dauto-update)
6. [API & WebSocket](#api--websocket)
7. [Sécurité](#sécurité)
8. [Contribution](#contribution)

---

## 🏗️ Architecture du Projet

### Vue d'Ensemble

```
AutoSubGoalTwitch/
│
├── 📂 obs/                          # Frontend OBS
│   ├── obs_subcount_auto.py        # Script principal Python
│   ├── updater/                     # Module auto-update
│   │   ├── __init__.py
│   │   └── version_checker.py
│   └── overlays/                    # Overlays HTML/CSS/JS
│       ├── subgoal_left.html
│       ├── subgoal_right.html
│       ├── followgoal_left.html
│       └── followgoal_right.html
│
├── 📂 server/                       # Backend Node.js
│   ├── server.js                    # Serveur principal
│   ├── config-crypto.js             # Chiffrement tokens
│   ├── package.json                 # Dépendances npm
│   └── node_modules/                # Librairies
│
├── 📂 web/                          # Interfaces Web
│   ├── dashboard.html               # Tableau de bord
│   ├── config.html                  # Configuration Twitch
│   └── admin.html                   # Panel admin
│
├── 📂 config/                       # Configuration
│   ├── version.json                 # Version actuelle
│   ├── update_config.json           # Config auto-update
│   ├── subgoal_config.example       # Template objectifs subs
│   └── followgoal_config.example    # Template objectifs follows
│
├── 📂 data/                         # Données utilisateur (gitignored)
│   ├── twitch_config.txt            # Config Twitch chiffrée
│   ├── subgoal_config.txt           # Objectifs subs
│   ├── followgoal_config.txt        # Objectifs follows
│   ├── total_subscriber_count.txt   # Compteur subs
│   ├── total_subscriber_count_goal.txt
│   ├── total_followers_count.txt    # Compteur follows
│   └── total_followers_count_goal.txt
│
├── 📂 logs/                         # Logs (gitignored)
│   ├── subcount_logs.txt            # Logs serveur
│   ├── obs_subcount_auto.log        # Logs script OBS
│   └── update.log                   # Logs mises à jour
│
├── 📂 backups/                      # Sauvegardes (gitignored)
│   └── .gitkeep
│
├── 📂 scripts/                      # Scripts utilitaires
│   ├── START_SERVER.bat             # Démarrage serveur Windows
│   ├── deploy_initial.ps1           # Déploiement initial
│   ├── deploy_to_github.ps1         # Déploiement GitHub
│   ├── fix_paths.ps1                # Correction chemins
│   └── test_update_system.py        # Test auto-update
│
├── 📂 docs/                         # Documentation
│   ├── USER_GUIDE.md                # Guide utilisateur
│   └── DEVELOPER.md                 # Guide développeur (ce fichier)
│
├── 📄 .gitignore                    # Exclusions Git
├── 📄 README.md                     # Présentation
├── 📄 LICENSE                       # Licence MIT
├── 📄 INSTALLER.bat                 # Installeur Windows (batch)
└── 📄 INSTALLER.ps1                 # Installeur Windows (PowerShell)
```

---

## 💻 Stack Technique

### Backend
- **Node.js** v20.10.0+ (LTS)
- **Express** v4.18.2 - Serveur HTTP
- **ws** v8.13.0 - WebSocket
- **crypto** (natif) - Chiffrement AES-256-GCM

### Frontend
- **Vanilla JavaScript** (ES6+)
- **HTML5** + **CSS3**
- **WebSocket API** (client)

### OBS Integration
- **Python** 3.6+ (OBS Python API)
- **obspython** (fourni par OBS)
- **urllib** + **json** (librairies standard)

### Twitch API
- **Twitch Helix API** v5
- **EventSub WebSocket** (temps réel)
- **Device Code Grant Flow** (OAuth2)

### DevOps
- **Git** pour versioning
- **GitHub Actions** (CI/CD - à venir)
- **PowerShell** pour scripts Windows

---

## 🔧 Configuration du Développement

### Prérequis

```powershell
# Vérifier Node.js
node --version  # v20.10.0+

# Vérifier npm
npm --version   # 10.2.0+

# Vérifier Python
python --version  # 3.6+

# Vérifier Git
git --version  # 2.40.0+
```

### Installation

```powershell
# Cloner le repository
git clone https://github.com/Bl0uD/AutoSubGoalTwitch.git
cd AutoSubGoalTwitch

# Installer les dépendances npm
cd server
npm install
cd ..

# Créer les dossiers nécessaires
mkdir data, logs, backups -ErrorAction SilentlyContinue

# Copier les templates de configuration
Copy-Item config\*.example data\
```

### Variables d'Environnement

Créez un fichier `.env` dans `server/` (optionnel pour dev) :

```env
PORT=8082
WS_PORT=8083
NODE_ENV=development
LOG_LEVEL=debug
```

### Démarrage en Mode Développement

```powershell
# Terminal 1 : Démarrer le serveur avec watch mode
cd server
node --watch server.js

# Terminal 2 : Surveiller les logs
Get-Content -Path ..\logs\subcount_logs.txt -Wait

# Terminal 3 : Tester les endpoints
curl http://localhost:8082/api/sub_goal
```

---

## 🔄 Système d'Auto-Update

### Architecture

```
┌─────────────────┐
│  OBS (Python)   │
│  version_checker│
└────────┬────────┘
         │ GET /releases/latest
         ▼
┌─────────────────┐
│  GitHub API     │
│  Releases       │
└────────┬────────┘
         │ JSON (version, download_url)
         ▼
┌─────────────────┐
│  Server Node.js │
│  /api/update    │
└────────┬────────┘
         │ Download ZIP
         ▼
┌─────────────────┐
│  Local FS       │
│  Extract & Apply│
└─────────────────┘
```

### Fichiers Clés

**`config/version.json`**
```json
{
  "version": "2.1.0",
  "github_repo": "Bl0uD/AutoSubGoalTwitch",
  "update_url": "https://api.github.com/repos/Bl0uD/AutoSubGoalTwitch/releases/latest"
}
```

**`config/update_config.json`**
```json
{
  "update_check_url": "https://api.github.com/repos/Bl0uD/AutoSubGoalTwitch/releases/latest",
  "update_download_url": "https://github.com/Bl0uD/AutoSubGoalTwitch/releases/download/{version}/AutoSubGoalTwitch.zip"
}
```

**`obs/updater/version_checker.py`**
```python
import urllib.request
import json

def check_for_updates(current_version):
    """Vérifie si une nouvelle version est disponible sur GitHub."""
    try:
        url = "https://api.github.com/repos/Bl0uD/AutoSubGoalTwitch/releases/latest"
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read())
            latest_version = data["tag_name"].lstrip("v")
            return compare_versions(current_version, latest_version)
    except Exception as e:
        print(f"Erreur vérification mise à jour: {e}")
        return None
```

### Processus de Mise à Jour

1. **Vérification** : Au démarrage d'OBS, `version_checker.py` interroge GitHub API
2. **Notification** : Si nouvelle version → notification dans OBS
3. **Téléchargement** : Utilisateur clique → Server Node.js télécharge le ZIP depuis GitHub Releases
4. **Sauvegarde** : Backup automatique de `data/` et `config/` dans `backups/backup_YYYYMMDD_HHMMSS/`
5. **Extraction** : Décompression du ZIP dans un dossier temporaire
6. **Application** : Remplacement des fichiers (sauf `data/`, `logs/`, `backups/`)
7. **Validation** : Vérification de l'intégrité + mise à jour de `config/version.json`
8. **Redémarrage** : Redémarrage automatique du serveur

### Ajouter une Release GitHub

```powershell
# 1. Tagger la version
git tag v2.2.0
git push origin v2.2.0

# 2. Créer le ZIP de release (exclure .git, node_modules, data, logs)
Compress-Archive -Path obs, server, web, config, scripts, docs, *.md, *.bat, *.ps1, LICENSE -DestinationPath AutoSubGoalTwitch-v2.2.0.zip

# 3. Créer la release sur GitHub
# Via GitHub Web UI: Releases → New Release
# - Tag: v2.2.0
# - Title: AutoSubGoalTwitch v2.2.0
# - Attach: AutoSubGoalTwitch-v2.2.0.zip
```

---

## 🌐 API & WebSocket

### Endpoints HTTP (Port 8082)

**GET `/api/sub_count`**
```json
{
  "total_subscriber_count": 42
}
```

**GET `/api/sub_goal`**
```json
{
  "total_subscriber_count": 42,
  "total_subscriber_count_goal": 50
}
```

**GET `/api/follow_count`**
```json
{
  "total_followers_count": 1337
}
```

**GET `/api/follow_goal`**
```json
{
  "total_followers_count": 1337,
  "total_followers_count_goal": 1500
}
```

**POST `/api/update_goal`**
```json
{
  "type": "subscriber",  // ou "follower"
  "goal": 100
}
```
Response:
```json
{
  "success": true,
  "message": "Objectif mis à jour"
}
```

**POST `/api/twitch_auth`**
```json
{
  "device_code": "ABC123",
  "user_code": "WXYZ-4567"
}
```
Response:
```json
{
  "success": true,
  "access_token": "encrypted_token",
  "expires_in": 3600
}
```

### WebSocket (Port 8083)

**Connexion**
```javascript
const ws = new WebSocket('ws://localhost:8083');

ws.onopen = () => {
  console.log('✅ Connexion WebSocket établie');
};
```

**Messages Entrants**

```json
{
  "type": "subscriber_update",
  "data": {
    "total": 43,
    "goal": 50,
    "new_subscriber": {
      "user_name": "JohnDoe",
      "tier": "1000"  // 1000, 2000, 3000 (Tier 1, 2, 3)
    }
  }
}
```

```json
{
  "type": "follower_update",
  "data": {
    "total": 1338,
    "goal": 1500,
    "new_follower": {
      "user_name": "JaneDoe"
    }
  }
}
```

```json
{
  "type": "goal_reached",
  "data": {
    "type": "subscriber",  // ou "follower"
    "goal": 50,
    "next_goal": 75
  }
}
```

**Messages Sortants**

```json
{
  "type": "ping"
}
```

```json
{
  "type": "request_update",
  "data": {
    "type": "all"  // ou "subscriber", "follower"
  }
}
```

---

## 🔐 Sécurité

### Chiffrement des Tokens Twitch

**Méthode** : AES-256-GCM (Authenticated Encryption)  
**Clé** : Dérivée du MACHINE_ID (unique par machine)  
**IV** : Généré aléatoirement pour chaque chiffrement

**Fichier** : `server/config-crypto.js`

```javascript
const crypto = require('crypto');
const os = require('os');

// Génération d'une clé unique par machine
function getMachineKey() {
  const machineId = os.hostname() + os.platform() + os.arch();
  return crypto.createHash('sha256').update(machineId).digest();
}

// Chiffrement AES-256-GCM
function encrypt(text) {
  const key = getMachineKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// Déchiffrement AES-256-GCM
function decrypt(text) {
  const key = getMachineKey();
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Stockage** : `data/twitch_config.txt` (chiffré, non commitable)

### CORS Policy

**Configuration** : Restriction à localhost uniquement

```javascript
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === 'http://localhost:8082' || origin === 'http://127.0.0.1:8082') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

### Device Code Grant Flow

**Pourquoi ?** : Plus sécurisé que Client Secret (pas de secret stocké localement)

**Processus** :
1. Utilisateur clique sur "Connecter avec Twitch"
2. Server génère un `device_code` et `user_code` via Twitch API
3. Utilisateur va sur https://www.twitch.tv/activate et entre `user_code`
4. Server poll Twitch API pour vérifier l'autorisation
5. Une fois autorisé, Server reçoit `access_token` et le chiffre
6. Token stocké dans `data/twitch_config.txt` (chiffré)

**Permissions** :
- `user:read:email` - Lire l'email (identification)
- `channel:read:subscriptions` - Lire les abonnements
- `moderator:read:followers` - Lire les followers

---

## 🧪 Tests

### Tests Manuels

**Test de connexion WebSocket**

```python
# scripts/test_websocket.py
import websocket

def on_message(ws, message):
    print(f"📩 Reçu: {message}")

ws = websocket.WebSocketApp("ws://localhost:8083",
                            on_message=on_message)
ws.run_forever()
```

**Test des endpoints API**

```powershell
# Test GET
curl http://localhost:8082/api/sub_goal

# Test POST
curl -X POST http://localhost:8082/api/update_goal `
  -H "Content-Type: application/json" `
  -d '{"type":"subscriber","goal":100}'
```

### Tests Automatisés (à implémenter)

```javascript
// server/tests/api.test.js
const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
  test('GET /api/sub_count returns valid JSON', async () => {
    const response = await request(app).get('/api/sub_count');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total_subscriber_count');
  });
});
```

---

## 🤝 Contribution

### Workflow Git

```powershell
# 1. Fork le projet sur GitHub

# 2. Cloner votre fork
git clone https://github.com/VotreNom/AutoSubGoalTwitch.git
cd AutoSubGoalTwitch

# 3. Créer une branche feature
git checkout -b feature/ma-fonctionnalite

# 4. Développer et committer
git add .
git commit -m "feat: Ajoute la fonctionnalité X"

# 5. Pusher vers votre fork
git push origin feature/ma-fonctionnalite

# 6. Créer une Pull Request sur GitHub
```

### Conventions de Code

**JavaScript/Node.js**
- Indentation : 2 espaces
- Point-virgule : obligatoire
- Quotes : simple `'`
- Naming : camelCase pour variables/fonctions, PascalCase pour classes

**Python**
- Indentation : 4 espaces
- Style : PEP 8
- Naming : snake_case

**Commits**
- Format : `type(scope): message`
- Types : `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Exemple : `feat(api): Ajoute endpoint /api/stats`

### Pull Request Checklist

- [ ] Code testé manuellement
- [ ] Pas de `console.log()` oublié
- [ ] Documentation mise à jour si nécessaire
- [ ] Pas de fichiers `data/` ou `logs/` commités
- [ ] Commit messages clairs et descriptifs

---

## 📚 Ressources Externes

**Twitch API**
- [Twitch API Reference](https://dev.twitch.tv/docs/api/)
- [EventSub WebSocket](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/)
- [Device Code Grant Flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow)

**OBS Python**
- [OBS Python Scripting](https://obsproject.com/docs/scripting.html)
- [obspython API](https://obsproject.com/docs/reference-libobs-scripting.html)

**Node.js**
- [Express.js Documentation](https://expressjs.com/)
- [ws WebSocket Library](https://github.com/websockets/ws)

---

## 🐛 Debug

### Activer les Logs Détaillés

**server/server.js**
```javascript
const DEBUG = true;  // Mettre à true

if (DEBUG) {
  console.log('[DEBUG]', ...args);
}
```

**obs/obs_subcount_auto.py**
```python
DEBUG_MODE = True  # Mettre à True

if DEBUG_MODE:
    print(f"[DEBUG] {message}")
```

### Logs Utiles

```powershell
# Logs serveur
Get-Content logs\subcount_logs.txt -Wait

# Logs script OBS
Get-Content logs\obs_subcount_auto.log -Wait

# Logs mises à jour
Get-Content logs\update.log -Wait
```

---

**📞 Besoin d'Aide ?**

Ouvrez une issue sur GitHub : https://github.com/Bl0uD/AutoSubGoalTwitch/issues
