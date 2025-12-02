# 🚀 Release v3.0.0 - Architecture Modulaire

## 📋 Résumé

La version 3.0.0 représente une refonte majeure de l'architecture du projet avec une modularisation complète du serveur Node.js. Le fichier `server.js` est passé de **5200 lignes** à **2555 lignes** grâce à l'extraction de **10 services indépendants**.

---

## ✨ Nouveautés Majeures

### 🏗️ Architecture Modulaire (10 Services)

| Service | Responsabilité | Lignes |
|---------|----------------|--------|
| `files.js` | Gestion fichiers et app_state.json | 215 |
| `counters.js` | Compteurs follows/subs | 180 |
| `goals.js` | Objectifs et file watchers | 341 |
| `batching.js` | Système de batching intelligent | 330 |
| `polling.js` | Polling API Twitch | 195 |
| `event-handlers.js` | Handlers EventSub | 220 |
| `eventsub.js` | Connexion WebSocket Twitch | 348 |
| `twitch-config.js` | Configuration Twitch chiffrée | 179 |
| `broadcast.js` | Diffusion WebSocket clients | 150 |
| `twitch.js` | Appels API Twitch | 280 |

### 📁 Structure Routes Modulaires

```
app/server/routes/
├── index.js      → Export centralisé
├── pages.js      → Pages HTML (/, /admin, /config)
├── api.js        → API REST (/api/*)
├── admin.js      → Actions admin (/admin/*)
└── twitch.js     → Auth Twitch (/twitch/*)
```

### 🔧 Utilitaires Centralisés

```
app/server/utils/
├── index.js          → Export centralisé
├── constants.js      → Toutes les constantes
├── logger.js         → Logging structuré + sécurité
├── validation.js     → Validation des entrées
├── rate-limiter.js   → Rate limiting (Sliding, TokenBucket)
├── timer-registry.js → Gestion timers (évite memory leaks)
└── event-queue.js    → File d'attente événements
```

---

## 🔄 Améliorations

### Animations Overlays
- **Slot-machine animation** : Animation progressive pour les changements multiples
- **Cohérence** : Même animation sur tous les overlays (follow, sub, left, right)
- **Direction correcte** : Animation up/down selon ajout/retrait

### Détection Polices Windows
- **Polices utilisateur** : Lecture `HKEY_CURRENT_USER` en plus de `HKEY_LOCAL_MACHINE`
- **Polices installées par l'utilisateur** (comme "SEA") maintenant détectées

### Admin Panel
- Boutons "Retirer Follows/Subs" corrigés
- Fonction `loadAdminPassword()` ajoutée
- Meilleure gestion des erreurs

---

## 🐛 Corrections

- **Fix** : `followRemoveBatch is not defined` - Variables batch ajoutées
- **Fix** : Animation `animateDirectTransition` remplacée par `animateSlotMachine`
- **Fix** : Polices utilisateur non détectées (registre HKEY_CURRENT_USER)
- **Fix** : Nettoyage des fichiers `__pycache__`

---

## 📊 Métriques

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| Lignes server.js | 5200 | 2555 | **-51%** |
| Fichiers services | 0 | 10 | +10 |
| Fichiers routes | 1 | 5 | +4 |
| Fichiers utils | 0 | 7 | +7 |

---

## 📦 Installation

### Nouvelle Installation
```bash
1. Télécharger la release
2. Extraire dans un dossier
3. Exécuter INSTALLER.bat en administrateur
4. Suivre les instructions OBS
```

### Mise à jour depuis v2.x
```bash
1. Sauvegarder obs/data/ (vos configurations)
2. Télécharger la nouvelle release
3. Remplacer tous les fichiers
4. Restaurer obs/data/
5. Redémarrer OBS
```

---

## ⚠️ Breaking Changes

- **Aucun** pour les utilisateurs finaux
- Les overlays existants continuent de fonctionner
- La configuration Twitch est préservée

---

## 🔮 Prochaines Versions

### v3.1.0 (Planifié)
- Tests unitaires pour les services
- Consolidation des overlays en un seul fichier paramétrable
- Réduction supplémentaire de server.js

### v3.2.0 (Planifié)
- TypeScript (typage optionnel)
- Interface de configuration web améliorée
- Support multi-chaînes Twitch

---

## 🙏 Remerciements

Merci à tous les utilisateurs pour leurs retours et suggestions !

---

**Version** : 3.0.0  
**Date** : 02/12/2025  
**Auteur** : Bl0uD
