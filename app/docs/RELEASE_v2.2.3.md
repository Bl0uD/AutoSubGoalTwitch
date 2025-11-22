# 🎯 Release Notes - Version 2.2.3

**Date de sortie :** 22 novembre 2025  
**Type :** Correctif critique + Améliorations UX

---

## 🐛 Corrections Critiques

### Animation des désabonnements (URGENT)
- **Problème :** Les animations étaient fluides pour les abonnements/follows mais instantanées pour les désabonnements/unfollows
- **Cause :** La direction d'animation n'était pas transmise correctement aux fonctions d'animation progressive
- **Solution :** 
  - Ajout du paramètre `direction` à `animateCounterProgressive()`
  - Propagation de `direction` à tous les appels `displayGoalText()` pendant l'animation
  - Stockage de `direction` dans `animationQueue` pour chaque animation
  - Correction de `processAnimationQueue()` pour transmettre la direction

### Affichage overlay cassé après correction
- **Problème :** Aucun affichage après les premières corrections (écran noir)
- **Cause :** Le script de correction automatique avait remplacé `${animationDirection}` par `${direction}` dans `updateCounter()`, créant une référence à une variable inexistante
- **Solution :** Restauration de `${animationDirection}` dans les 4 fichiers overlay

---

## ✨ Améliorations

### Comportement final
```
✅ GAINS (follow/sub):
   - Animation progressive sur 1 seconde
   - Direction 'down': nouveaux chiffres entrent par le haut
   - Animation CSS: 0.4s ease-in-out (rapide et fluide)

✅ PERTES (unfollow/unsub):
   - Animation progressive sur 1 seconde (IDENTIQUE)
   - Direction 'up': nouveaux chiffres entrent par le bas
   - Animation CSS: 0.4s ease-in-out (IDENTIQUE)
```

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
1. Arrêtez le serveur Node.js et OBS Python
2. Téléchargez la v2.2.3 depuis GitHub
3. Extrayez et remplacez les fichiers
4. Redémarrez le serveur et OBS
5. **Rafraîchissez les overlays dans OBS (Ctrl+F5)**

### Installation complète
Suivez le guide dans `app/docs/GUIDE_UTILISATEUR.md`

---

## ✅ Tests Requis

Avant de streamer avec cette version, testez :
1. ✅ **Animation abonnement** : Simuler un sub → animation fluide 1s
2. ✅ **Animation désabonnement** : Simuler un unsub → animation fluide 1s (même durée)
3. ✅ **Animation follow** : Simuler un follow → animation fluide 1s
4. ✅ **Animation unfollow** : Simuler un unfollow → animation fluide 1s (même durée)
5. ✅ **Changement multiple** : Plusieurs changements rapides → queue correcte

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
**Statut :** ✅ Stable - Prêt pour production  
**Priorité :** 🔥 Haute (correctifs critiques animations)
