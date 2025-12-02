# 🎯 Release Notes - Version 2.2.3

**Date de sortie :** 22 novembre 2025  
**Type :** Correctif critique + Améliorations UX

---

## ✨ Améliorations

---

## 🔧 Modifications Techniques

### Fichiers modifiés (4 overlays HTML)
- `obs/overlays/subgoal_left.html`
- `obs/overlays/subgoal_right.html`
- `obs/overlays/followgoal_left.html`
- `obs/overlays/followgoal_right.html`

### Changements de signature
```javascript
// AVANT
function animateCounterProgressive(fromCount, toCount, goal)
function displayGoalText(goal)

// APRÈS
function animateCounterProgressive(fromCount, toCount, goal, direction)
function displayGoalText(goal, direction = null)
```

---

## 🧹 Nettoyage

### Fichiers supprimés
- ✅ `app/scripts/FIX_ANIMATION_DIRECTION.ps1` (script temporaire)
- ✅ `app/scripts/fix_animation.py` (script temporaire)
- ✅ `app/server/server.js.backup` (backup obsolète)
- ✅ `app/scripts/__pycache__/` (cache Python)
- ✅ `obs/__pycache__/` (cache Python)
- ✅ `obs/updater/__pycache__/` (cache Python)

---

## 📦 Installation

### Mise à jour depuis v2.2.0/v2.2.1/v2.2.2
1. Arrêtez OBS
2. Téléchargez la v2.2.3 depuis GitHub
3. Extrayez et remplacez les fichiers
4. Redémarrez OBS

### Installation complète
Suivez le guide dans `app/docs/GUIDE_UTILISATEUR.md`

---

## ✅ Tests Requis

Avant de streamer avec cette version, testez :
1. ✅ **Animation abonnement** : Simuler un sub → animation fluide
2. ✅ **Animation désabonnement** : Simuler un unsub → animation fluide
3. ✅ **Animation follow** : Simuler un follow → animation fluide
4. ✅ **Animation unfollow** : Simuler un unfollow → animation fluide

---

## 🔗 Liens Utiles

- **GitHub Repository :** [Bl0uD/AutoSubGoalTwitch](https://github.com/Bl0uD/AutoSubGoalTwitch)
- **Guide Utilisateur :** `app/docs/GUIDE_UTILISATEUR.md`
- **Changelog Complet :** `CHANGELOG.md`

---

## 🙏 Remerciements

Merci à la communauté pour les retours sur les animations incohérentes entre gains et pertes !

---

**Version :** 2.2.3  
