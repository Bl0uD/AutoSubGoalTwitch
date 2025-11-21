# 🎉 AutoSubGoalTwitch v2.2.2

## 🐛 Corrections critiques

### Bug majeur : Détection des unfollows
**Problème résolu** : Les unfollows n'étaient pas détectés pendant plusieurs minutes, causant un compteur bloqué.

**Cause** :
- Polling probabiliste (33% seulement quand EventSub actif) → Skip 67% des vérifications
- Désynchronisation entre `lastKnownFollowCount` (polling) et `currentFollows` (batch système)

**Solution** :
- ✅ **Polling constant** : Vérification toutes les 10 secondes (au lieu de 33% du temps)
- ✅ **Synchronisation `lastKnownFollowCount`** : Mise à jour dans `flushFollowBatch()` et `updateFollowCount()`
- ✅ **Détection fiable** : Unfollows détectés en **10 secondes maximum** (au lieu de 2+ minutes)

### Optimisations système

#### 🔥 Architecture refactorisée
- **EventQueue thread-safe** : Remplacement du système `eventBuffer` obsolète (~150 lignes supprimées)
- **Result Pattern** : Gestion d'erreurs cohérente pour `getTwitchFollowCount()`
  - Codes d'erreur standardisés : `NOT_CONFIGURED`, `TOKEN_EXPIRED`, `API_ERROR`, `TIMEOUT`, `NETWORK_ERROR`
  - Propagation d'erreurs propre dans 4+ emplacements
- **Variables synchronisées** : 20+ variables globales maintenant synchronisées avec `appState` via getters/setters
  - Élimine les risques de désynchronisation
  - Rétrocompatible à 100%

#### 🛡️ Sécurité et robustesse
- **`validatePositiveInt()`** : Validation robuste des entrées (crash prevention)
- **`resetDeviceCodeFlow()`** : Utilise maintenant `appState.config` au lieu de variables globales
- **Rate limiting** : Respecte les limites Twitch (7 requêtes/min sur 800 max = 0.9%)

### 📊 Impact des corrections

| Événement | Avant v2.2.2 | Après v2.2.2 |
|-----------|--------------|--------------|
| **Follow** | ✅ < 1s (EventSub) | ✅ < 1s (EventSub) |
| **Unfollow** | ❌ 2+ minutes (probabiliste) | ✅ **10 secondes max** |
| **Requêtes API** | 2-6/min (instable) | **6/min** (constant) |
| **Synchronisation** | Désynchronisée | **Thread-safe** |

---

## 🚀 Installation

### Nouvelle installation
1. **Téléchargez** le fichier ZIP ci-dessous
2. **Extrayez** dans `Documents/StreamLabels/SubcountAutomatic`
3. **Lancez** `INSTALLER.bat` en tant qu'administrateur
4. **Suivez** les instructions dans OBS

### Mise à jour depuis v2.2.0/v2.2.1
1. **Sauvegardez** vos fichiers :
   - `obs/data/twitch_config.txt`
   - `obs/data/followgoal.txt` et `subgoals.txt` (si personnalisés)
   - `app/config/overlay_config.json` (si personnalisé)

2. **Remplacez** uniquement ces fichiers :
   - `app/server/server.js` ← **Fichier critique avec tous les fixes**
   - `app/config/version.json` ← **Nouvelle version**

3. **Redémarrez** le serveur (fermer OBS + relancer)

---

## 📖 Configuration des overlays

⚠️ **IMPORTANT** : Les overlays doivent être ajoutés comme **Sources Navigateur** avec des URLs HTTP :

```
http://localhost:8082/obs/overlays/subgoal_left.html
http://localhost:8082/obs/overlays/subgoal_right.html
http://localhost:8082/obs/overlays/followgoal_left.html
http://localhost:8082/obs/overlays/followgoal_right.html
```

**Paramètres recommandés pour les sources** :
- Largeur : 800px
- Hauteur : 200px
- Actualiser le cache en changeant de scène : ✅ Activé

---

### Rate Limiting Twitch

**Configuration actuelle** :
- Polling follows : 6 requêtes/minute
- Sync manuelle : Max 1/minute
- **Total** : ~7 requêtes/minute
- **Limite Twitch** : 800 requêtes/minute
- **Marge de sécurité** : **99.1%** (793 points libres)

✅ **Parfaitement sécurisé** pour une utilisation 24/7

---

## 📁 Structure du projet

```
Root/
├── INSTALLER.bat          (Installation automatique)
├── CHANGELOG.md           (Historique des versions)
├── README.md              (Guide rapide)
│
├── obs/                   (Scripts OBS)
│   ├── obs_subcount_auto.py
│   ├── updater/          (Système de mise à jour automatique)
│   ├── overlays/         (Fichiers HTML des overlays)
│   └── data/             (twitch_config.txt, goals)
│
└── app/                   (Application serveur)
    ├── server/           (Node.js + package.json)
    │   ├── server.js     ← **FICHIER CRITIQUE (4644 lignes)**
    │   ├── config-crypto.js
    │   └── package.json
    ├── config/           (version.json, overlay_config.json)
    ├── web/              (dashboard.html, admin.html, config.html)
    ├── scripts/          (INSTALLER.ps1, START_SERVER.bat)
    ├── logs/             (Fichiers de log)
    ├── backups/          (Sauvegardes automatiques)
    └── docs/             (Documentation technique)
        ├── GUIDE_UTILISATEUR.md
        ├── RELEASE_v2.2.0.md
        ├── RELEASE_v2.2.1.md
        └── RELEASE_v2.2.2.md ← **Vous êtes ici**

```

---

## 🎯 Fonctionnalités complètes

### Système de compteurs
- ✅ **Follows en temps réel** via EventSub WebSocket
- ✅ **Unfollows détectés** via polling intelligent (10s max)
- ✅ **Subs en temps réel** (Tier 1, 2, 3, Prime, Gifted)
- ✅ **Synchronisation automatique** toutes les 10 secondes

### Overlays configurables
- ✅ **50+ polices Windows** détectées automatiquement
- ✅ **Couleurs personnalisées** (texte, ombre, contour)
- ✅ **Animations** : Fade, Slide, Bounce, Wave
- ✅ **Configuration temps réel** sans recharger OBS
- ✅ **WebSocket dédié**

### Administration
- ✅ **Dashboard complet** : Vue d'ensemble + graphiques
- ✅ **Authentification Twitch** sécurisée (OAuth2 + PKCE)
- ✅ **Tokens chiffrés** AES-256-GCM machine-bound
- ✅ **Logs détaillés** avec nettoyage automatique
- ✅ **Backups automatiques** des compteurs

---

## 🐛 Bugs connus résolus

### v2.2.2
✅ Unfollows non détectés (polling probabiliste + désynchronisation)  
✅ EventBuffer obsolète (remplacé par EventQueue)  
✅ Variables dupliquées (synchronisation via getters/setters)  
✅ Crash sur validatePositiveInt() manquante  
✅ resetDeviceCodeFlow() utilisant variables globales  

### v2.2.1
✅ Structure projet désorganisée  
✅ Chemins incorrects (Python/Node.js/PowerShell)  
✅ INSTALLER.ps1 incompatible PowerShell 5.1  
✅ Bouton Twitch ouvrant mauvaise page  

### v2.2.0
✅ Configuration overlays statique  
✅ Polices limitées  
✅ Pas de WebSocket configuration  

---

## 📞 Support

**Problème ?** Consultez les fichiers de log :
- `app/logs/subcount_logs.txt` (serveur Node.js)
- Logs OBS (Menu → Aide → Fichiers journaux)

**Documentation complète** : `app/docs/GUIDE_UTILISATEUR.md`

**GitHub** : [Bl0uD/AutoSubGoalTwitch](https://github.com/Bl0uD/AutoSubGoalTwitch)

---

**Développé avec ❤️ pour la communauté streaming francophone**
