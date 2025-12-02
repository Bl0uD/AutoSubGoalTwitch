/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📄 ROUTES - Pages HTML
 * ═══════════════════════════════════════════════════════════════════════════════
 * Routes pour servir les pages HTML de l'application.
 * 
 * Routes:
 * - GET /           → Dashboard principal
 * - GET /dashboard  → Dashboard principal
 * - GET /config     → Page de configuration
 * - GET /test       → Page de test diagnostic
 * - GET /admin      → Panel d'administration
 */

const express = require('express');
const path = require('path');

const router = express.Router();

// Dossier racine du projet (3 niveaux au-dessus : routes -> server -> app -> racine)
const ROOT_DIR = path.join(__dirname, '..', '..', '..');

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 ROUTES DES PAGES HTML
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Page d'accueil (Dashboard)
 */
router.get('/', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'app', 'web', 'dashboard.html'));
});

/**
 * Dashboard explicite
 */
router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'app', 'web', 'dashboard.html'));
});

/**
 * Page de configuration
 */
router.get('/config', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'app', 'web', 'config.html'));
});

/**
 * Page de test/diagnostic
 */
router.get('/test', (req, res) => {
    res.send(generateTestPage());
});

/**
 * Panel d'administration (Hidden)
 */
router.get('/admin', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'app', 'web', 'admin.html'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 GÉNÉRATION DE LA PAGE DE TEST
// ═══════════════════════════════════════════════════════════════════════════════

function generateTestPage() {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>🧪 Test des boutons - SubCount Auto</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #0e0e23; color: white; }
        .header { text-align: center; background: linear-gradient(45deg, #9146ff, #00ffc7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 30px; }
        .card { background: #1a1a2e; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #16213e; }
        button { background: #6441a4; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; margin: 5px; font-size: 14px; }
        button:hover { background: #7c2d92; }
        button.success { background: #28a745; }
        button.warning { background: #ffc107; color: #000; }
        .flex { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .log { background: #2a2a2a; padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Test des boutons</h1>
        <p>Diagnostic des fonctions JavaScript</p>
    </div>
    
    <div class="card">
        <h2>🔧 Tests de base</h2>
        <div class="flex">
            <button onclick="testAlert()">🚨 Test Alert</button>
            <button onclick="testConsole()">📝 Test Console</button>
            <button onclick="testFetch()">🌐 Test Fetch</button>
        </div>
    </div>
    
    <div class="card">
        <h2>👥 Tests Follows</h2>
        <div class="flex">
            <button onclick="addFollow()" class="success">+1 Follow</button>
            <button onclick="addFollow(5)" class="success">+5 Follows</button>
            <button onclick="setFollows()" class="warning">Définir nombre</button>
        </div>
    </div>
    
    <div class="card">
        <h2>⭐ Tests Subs</h2>
        <div class="flex">
            <button onclick="addSub()" class="success">+1 Sub</button>
            <button onclick="addSub(5)" class="success">+5 Subs</button>
            <button onclick="setSubs()" class="warning">Définir nombre</button>
        </div>
    </div>
    
    <div class="card">
        <h2>📄 Tests Système</h2>
        <div class="flex">
            <button onclick="syncTwitch()" class="success">📄 Synchroniser</button>
            <button onclick="updateDiagnostic()" class="success">🔐 Diagnostic</button>
        </div>
    </div>
    
    <div class="card">
        <h2>📋 Journal des événements</h2>
        <div id="log" class="log">Aucun événement...</div>
        <button onclick="clearLog()">🧹 Vider le journal</button>
    </div>
    
    <script>
        function log(message) {
            const logDiv = document.getElementById('log');
            const timestamp = new Date().toLocaleTimeString();
            logDiv.innerHTML += \`[\${timestamp}] \${message}<br>\`;
            logDiv.scrollTop = logDiv.scrollHeight;
            console.log(message);
        }
        
        function clearLog() {
            document.getElementById('log').innerHTML = 'Journal vidé...';
        }
        
        function testAlert() {
            log('🚨 Test Alert appelé');
            alert('Test Alert fonctionne !');
        }
        
        function testConsole() {
            log('📝 Test Console appelé');
            console.log('Test Console fonctionne !');
        }
        
        async function testFetch() {
            log('🌐 Test Fetch appelé...');
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                log('✅ Fetch réussi: ' + JSON.stringify(data).substring(0, 100) + '...');
            } catch (error) {
                log('❌ Erreur Fetch: ' + error.message);
            }
        }
        
        function addFollow(amount = 1) {
            log(\`👥 addFollow(\${amount}) appelé\`);
            fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    log('📊 Status récupéré: ' + data.currentFollows + ' follows');
                    const newCount = data.currentFollows + amount;
                    return fetch('/api/update-follows', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ count: newCount })
                    });
                })
                .then(r => r.json())
                .then(data => {
                    log('✅ Follows mis à jour: ' + data.currentFollows);
                    alert('Follows mis à jour: ' + data.currentFollows);
                })
                .catch(error => {
                    log('❌ Erreur addFollow: ' + error.message);
                    alert('Erreur: ' + error.message);
                });
        }
        
        function setFollows() {
            log('🔐 setFollows appelé');
            const count = prompt('Nombre de follows :');
            if (count !== null && !isNaN(count)) {
                fetch('/api/update-follows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count: parseInt(count) })
                })
                .then(r => r.json())
                .then(data => {
                    log('✅ Follows définis: ' + data.currentFollows);
                    alert('Follows définis: ' + data.currentFollows);
                })
                .catch(error => {
                    log('❌ Erreur setFollows: ' + error.message);
                });
            } else {
                log('⚠️ setFollows annulé');
            }
        }
        
        function addSub(amount = 1) {
            log(\`⭐ addSub(\${amount}) appelé\`);
            fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    const newCount = data.currentSubs + amount;
                    return fetch('/api/update-subs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ count: newCount })
                    });
                })
                .then(r => r.json())
                .then(data => {
                    log('✅ Subs mis à jour: ' + data.currentSubs);
                    alert('Subs mis à jour: ' + data.currentSubs);
                })
                .catch(error => {
                    log('❌ Erreur addSub: ' + error.message);
                });
        }
        
        function setSubs() {
            log('🔐 setSubs appelé');
            const count = prompt('Nombre de subs :');
            if (count !== null && !isNaN(count)) {
                fetch('/api/update-subs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count: parseInt(count) })
                })
                .then(r => r.json())
                .then(data => {
                    log('✅ Subs définis: ' + data.currentSubs);
                    alert('Subs définis: ' + data.currentSubs);
                })
                .catch(error => {
                    log('❌ Erreur setSubs: ' + error.message);
                });
            } else {
                log('⚠️ setSubs annulé');
            }
        }
        
        function syncTwitch() {
            log('📄 syncTwitch appelé');
            fetch('/api/sync-twitch')
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        const message = 'Synchronisation réussie! Follows: ' + data.currentFollows + ', Subs: ' + data.currentSubs;
                        log('✅ ' + message);
                        alert('✅ ' + message);
                    } else {
                        log('❌ Erreur sync: ' + data.error);
                        alert('❌ Erreur: ' + data.error);
                    }
                })
                .catch(error => {
                    log('❌ Erreur syncTwitch: ' + error.message);
                });
        }
        
        function updateDiagnostic() {
            log('🔐 updateDiagnostic appelé');
            fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    log('📊 Diagnostic: ' + data.currentFollows + ' follows, ' + data.currentSubs + ' subs');
                    alert('Diagnostic: ' + data.currentFollows + ' follows, ' + data.currentSubs + ' subs');
                })
                .catch(error => {
                    log('❌ Erreur diagnostic: ' + error.message);
                });
        }
        
        // Log de démarrage
        log('🚀 Page de test chargée');
    </script>
</body>
</html>`;
}

module.exports = router;
