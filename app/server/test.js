/**
 * Tests simples pour valider le serveur SubCount Auto
 * Usage: node test.js [all|status|increment|validation]
 * 
 * ⚠️ ATTENTION: Ces tests sont pour server-legacy.js (v3.0)
 * Le nouveau server.js (v3.1) utilise des routes différentes.
 * 
 * @deprecated Nécessite mise à jour pour v3.1
 * @see server.js pour les nouvelles routes
 */

const http = require('http');

const BASE_URL = 'http://localhost:8082';

// Couleurs pour la console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
    const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
    console.log(`  ${status} ${name}${details ? ` - ${details}` : ''}`);
    return passed;
}

/**
 * Effectue une requête HTTP
 */
function httpRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : null;
                    resolve({ status: res.statusCode, data: json, raw: data });
                } catch (e) {
                    resolve({ status: res.statusCode, data: null, raw: data });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

/**
 * Vérifie si le serveur est accessible
 */
async function checkServerRunning() {
    try {
        await httpRequest('/api/status');
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================
// TESTS DE STATUS
// ============================================
async function testStatus() {
    log('\n📊 Tests de Status', 'cyan');
    let passed = 0;
    let total = 0;

    // Test /api/status - utilise currentFollows et currentSubs
    try {
        total++;
        const res = await httpRequest('/api/status');
        const ok = res.status === 200 && res.data && 
                   typeof res.data.currentFollows !== 'undefined' && 
                   typeof res.data.currentSubs !== 'undefined';
        if (logTest('/api/status retourne 200 avec currentFollows/Subs', ok, 
            `follows: ${res.data?.currentFollows}, subs: ${res.data?.currentSubs}`)) passed++;
    } catch (e) {
        logTest('/api/status retourne 200 avec currentFollows/Subs', false, e.message);
    }

    // Test /api/sub_goal (underscore, pas tiret)
    try {
        total++;
        const res = await httpRequest('/api/sub_goal');
        const ok = res.status === 200 && res.data && res.data.goal && 
                   typeof res.data.goal.current !== 'undefined';
        if (logTest('/api/sub_goal retourne un goal', ok)) passed++;
    } catch (e) {
        logTest('/api/sub_goal retourne un goal', false, e.message);
    }

    // Test /api/follow_goal (underscore, pas tiret)
    try {
        total++;
        const res = await httpRequest('/api/follow_goal');
        const ok = res.status === 200 && res.data && res.data.goal && 
                   typeof res.data.goal.current !== 'undefined';
        if (logTest('/api/follow_goal retourne un goal', ok)) passed++;
    } catch (e) {
        logTest('/api/follow_goal retourne un goal', false, e.message);
    }

    // Test /api/overlay-config
    try {
        total++;
        const res = await httpRequest('/api/overlay-config');
        const ok = res.status === 200 && res.data;
        if (logTest('/api/overlay-config retourne 200', ok)) passed++;
    } catch (e) {
        logTest('/api/overlay-config retourne 200', false, e.message);
    }

    return { passed, total };
}

// ============================================
// TESTS DE VALIDATION
// ============================================
async function testValidation() {
    log('\n🔒 Tests de Validation des entrées', 'cyan');
    let passed = 0;
    let total = 0;

    // Test validation: add-subs avec valeur négative
    try {
        total++;
        const res = await httpRequest('/admin/add-subs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { amount: -5 }
        });
        const ok = res.status === 400;
        if (logTest('add-subs rejette amount négatif (400)', ok, `status: ${res.status}`)) passed++;
    } catch (e) {
        logTest('add-subs rejette amount négatif', false, e.message);
    }

    // Test validation: add-subs avec string au lieu de nombre
    try {
        total++;
        const res = await httpRequest('/admin/add-subs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { amount: "abc" }
        });
        const ok = res.status === 400;
        if (logTest('add-subs rejette string au lieu de nombre (400)', ok, `status: ${res.status}`)) passed++;
    } catch (e) {
        logTest('add-subs rejette string', false, e.message);
    }

    // Test validation: set-follows avec valeur négative
    try {
        total++;
        const res = await httpRequest('/admin/set-follows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { count: -10 }
        });
        const ok = res.status === 400;
        if (logTest('set-follows rejette count négatif (400)', ok, `status: ${res.status}`)) passed++;
    } catch (e) {
        logTest('set-follows rejette count négatif', false, e.message);
    }

    // Test validation: set-sub-goal avec goal négatif
    try {
        total++;
        const res = await httpRequest('/admin/set-sub-goal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { goal: -100 }
        });
        const ok = res.status === 400;
        if (logTest('set-sub-goal rejette goal négatif (400)', ok, `status: ${res.status}`)) passed++;
    } catch (e) {
        logTest('set-sub-goal rejette goal négatif', false, e.message);
    }

    // Test validation: set-sub-goal avec string au lieu de nombre
    try {
        total++;
        const res = await httpRequest('/admin/set-sub-goal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { goal: "abc" }
        });
        const ok = res.status === 400;
        if (logTest('set-sub-goal rejette string au lieu de nombre (400)', ok, `status: ${res.status}`)) passed++;
    } catch (e) {
        logTest('set-sub-goal rejette string', false, e.message);
    }

    return { passed, total };
}

// ============================================
// TESTS D'INCREMENT (modifie les données!)
// ============================================
async function testIncrement() {
    log('\n➕ Tests d\'Increment (ATTENTION: modifie les données)', 'yellow');
    let passed = 0;
    let total = 0;

    // Récupérer l'état initial - utilise currentFollows et currentSubs
    let initialStatus;
    try {
        const res = await httpRequest('/api/status');
        initialStatus = res.data;
    } catch (e) {
        log('  Impossible de récupérer le status initial', 'red');
        return { passed: 0, total: 1 };
    }

    // Test: add-subs +1 (utilise 'amount' et non 'count')
    try {
        total++;
        const addRes = await httpRequest('/admin/add-subs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { amount: 1 }
        });
        
        // Attendre le traitement batch (100ms minimum)
        await new Promise(r => setTimeout(r, 200));
        
        const statusRes = await httpRequest('/api/status');
        const newCount = statusRes.data.currentSubs;
        const expectedCount = initialStatus.currentSubs + 1;
        const ok = addRes.status === 200 && newCount === expectedCount;
        if (logTest(`add-subs +1 (${initialStatus.currentSubs} → ${newCount})`, ok)) passed++;
    } catch (e) {
        logTest('add-subs +1', false, e.message);
    }

    // Restaurer: remove-subs -1 (utilise 'amount')
    try {
        total++;
        const removeRes = await httpRequest('/admin/remove-subs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { amount: 1 }
        });
        
        // Attendre le traitement batch
        await new Promise(r => setTimeout(r, 200));
        
        const statusRes = await httpRequest('/api/status');
        const newCount = statusRes.data.currentSubs;
        const ok = removeRes.status === 200 && newCount === initialStatus.currentSubs;
        if (logTest(`remove-subs -1 (restauré à ${newCount})`, ok)) passed++;
    } catch (e) {
        logTest('remove-subs -1', false, e.message);
    }

    // Test: add-follows +1 (utilise 'amount')
    try {
        total++;
        const addRes = await httpRequest('/admin/add-follows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { amount: 1 }
        });
        
        // Attendre le traitement batch
        await new Promise(r => setTimeout(r, 200));
        
        const statusRes = await httpRequest('/api/status');
        const newCount = statusRes.data.currentFollows;
        const expectedCount = initialStatus.currentFollows + 1;
        const ok = addRes.status === 200 && newCount === expectedCount;
        if (logTest(`add-follows +1 (${initialStatus.currentFollows} → ${newCount})`, ok)) passed++;
    } catch (e) {
        logTest('add-follows +1', false, e.message);
    }

    // Restaurer: remove-follows -1 (utilise 'amount')
    try {
        total++;
        const removeRes = await httpRequest('/admin/remove-follows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { amount: 1 }
        });
        
        // Attendre le traitement batch
        await new Promise(r => setTimeout(r, 200));
        
        const statusRes = await httpRequest('/api/status');
        const newCount = statusRes.data.currentFollows;
        const ok = removeRes.status === 200 && newCount === initialStatus.currentFollows;
        if (logTest(`remove-follows -1 (restauré à ${newCount})`, ok)) passed++;
    } catch (e) {
        logTest('remove-follows -1', false, e.message);
    }

    return { passed, total };
}

// ============================================
// TESTS EVENT BUFFER / QUEUE
// ============================================
async function testEventQueue() {
    log('\n📦 Tests de la Queue d\'événements', 'cyan');
    let passed = 0;
    let total = 0;

    // Test: récupérer le status de la queue
    try {
        total++;
        const res = await httpRequest('/api/event-buffer/status');
        const ok = res.status === 200 && res.data && typeof res.data.size !== 'undefined';
        if (logTest('/api/event-buffer/status retourne le size', ok, `size: ${res.data?.size || 0}`)) passed++;
    } catch (e) {
        logTest('/api/event-buffer/status retourne le size', false, e.message);
    }

    // Test: clear le buffer
    try {
        total++;
        const res = await httpRequest('/api/event-buffer/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const checkRes = await httpRequest('/api/event-buffer/status');
        const ok = res.status === 200 && checkRes.data.size === 0;
        if (logTest('/api/event-buffer/clear vide le buffer', ok)) passed++;
    } catch (e) {
        logTest('/api/event-buffer/clear vide le buffer', false, e.message);
    }

    return { passed, total };
}

// ============================================
// MAIN
// ============================================
async function main() {
    const args = process.argv.slice(2);
    const testType = args[0] || 'all';

    log('\n╔══════════════════════════════════════════╗', 'blue');
    log('║     SubCount Auto - Tests du Serveur     ║', 'blue');
    log('╚══════════════════════════════════════════╝', 'blue');

    // Vérifier que le serveur est en cours d'exécution
    log('\n🔍 Vérification du serveur...', 'yellow');
    const serverRunning = await checkServerRunning();
    
    if (!serverRunning) {
        log('\n❌ Le serveur n\'est pas accessible sur ' + BASE_URL, 'red');
        log('   Lancez le serveur avec: npm start', 'yellow');
        process.exit(1);
    }
    
    log('✓ Serveur accessible sur ' + BASE_URL, 'green');

    let totalPassed = 0;
    let totalTests = 0;

    // Exécuter les tests selon le type demandé
    if (testType === 'all' || testType === 'status') {
        const result = await testStatus();
        totalPassed += result.passed;
        totalTests += result.total;
    }

    if (testType === 'all' || testType === 'validation') {
        const result = await testValidation();
        totalPassed += result.passed;
        totalTests += result.total;
    }

    if (testType === 'all' || testType === 'queue') {
        const result = await testEventQueue();
        totalPassed += result.passed;
        totalTests += result.total;
    }

    if (testType === 'all' || testType === 'increment') {
        const result = await testIncrement();
        totalPassed += result.passed;
        totalTests += result.total;
    }

    // Résumé
    log('\n══════════════════════════════════════════', 'blue');
    const allPassed = totalPassed === totalTests;
    const color = allPassed ? 'green' : 'red';
    log(`📊 Résultat: ${totalPassed}/${totalTests} tests passés`, color);
    
    if (allPassed) {
        log('✅ Tous les tests sont passés!', 'green');
    } else {
        log(`❌ ${totalTests - totalPassed} test(s) échoué(s)`, 'red');
    }
    log('══════════════════════════════════════════\n', 'blue');

    process.exit(allPassed ? 0 : 1);
}

main().catch(e => {
    log('\n❌ Erreur inattendue: ' + e.message, 'red');
    process.exit(1);
});
