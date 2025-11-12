# 🚀 GUIDE RAPIDE - Configuration Dynamique Overlays dans OBS

## ✅ C'EST PRÊT !

Le système de configuration dynamique est maintenant **intégré directement dans votre script OBS** !

---

## 📋 Étapes d'utilisation

### 1️⃣ Recharger le script dans OBS

1. Ouvrir **OBS Studio**
2. Aller dans **Outils → Scripts**
3. Sélectionner `obs_subcount_auto.py`
4. Cliquer sur **🔄 Recharger les scripts** (icône en bas)

### 2️⃣ Ajouter l'overlay dynamique

1. **Ajouter une source** → **Navigateur**
2. **URL locale** : `C:\Users\BlouD\Documents\StreamLabels\SubcountAutomatic\obs\overlays\subgoal_left_dynamic.html`
3. **Largeur** : 1920
4. **Hauteur** : 1080
5. **Cocher** : "Actualiser le navigateur lorsque la scène devient active"

### 3️⃣ Utiliser les contrôles

Dans **Outils → Scripts → obs_subcount_auto.py**, vous verrez maintenant :

```
━━━━━━━━━━━ 🎨 CONFIGURATION OVERLAYS ━━━━━━━━━━━

📝 Police:          [SEA ▼]
📏 Taille:          [64  ●────────────]
🎨 Couleur:         [Blanc ▼]
⚡ Animation:       [Normal ▼]

[🔄 Réinitialiser aux valeurs par défaut]
```

#### 📝 Police disponibles :
- SEA (par défaut)
- Arial
- Courier New
- Times New Roman
- Verdana
- Georgia
- Impact

#### 📏 Taille :
- Slider de **24px** à **128px** (par défaut: 64px)

#### 🎨 Couleurs :
- Blanc (par défaut)
- Rouge
- Bleu
- Vert
- Jaune
- Violet
- Orange

#### ⚡ Vitesse d'animation :
- Rapide (300ms)
- Normal (1s) - par défaut
- Lent (2s)

---

## 💡 Comment ça marche ?

### Changement instantané
1. **Sélectionnez** une option (police, couleur, etc.)
2. Le changement est **appliqué immédiatement**
3. L'overlay se met à jour **sans rechargement** !

### Exemple d'utilisation
```
Stream de jour → Police SEA, Blanc, Normal
Stream de nuit → Police Courier New, Violet, Lent
Stream énergique → Police Impact, Orange, Rapide
```

---

## 🎨 Personnalisation avancée

### Si vous voulez des options supplémentaires :

Vous pouvez modifier le script Python pour ajouter :
- Plus de polices
- Plus de couleurs
- Réglages d'opacité
- Taille du contour
- Etc.

Tout est dans : `obs/obs_subcount_auto.py` lignes 720-800

---

## 🔧 Dépannage

### ❌ La section "CONFIGURATION OVERLAYS" n'apparaît pas

**Cause** : Le module `overlay_config_manager.py` n'est pas trouvé

**Solution** :
```powershell
# Vérifier que le fichier existe
Test-Path "obs\overlay_config_manager.py"
# Résultat attendu : True
```

### ❌ Les changements ne s'appliquent pas

**Cause** : Le serveur Node.js n'est pas démarré

**Solution** :
1. Dans OBS Scripts, vérifier que le serveur est démarré
2. Ou cliquer sur "🔄 Redémarrer Serveur"

### ❌ L'overlay ne change pas de couleur

**Cause** : Vous utilisez l'ancien overlay (non dynamique)

**Solution** :
- Remplacer `subgoal_left.html` par `subgoal_left_dynamic.html` dans la source navigateur

---

## 📊 Résumé des fichiers

### Utilisés automatiquement :
- ✅ `obs/obs_subcount_auto.py` - Script OBS (modifié)
- ✅ `obs/overlay_config_manager.py` - Module Python
- ✅ `obs/overlays/subgoal_left_dynamic.html` - Overlay dynamique
- ✅ `server/server.js` - Serveur Node.js (modifié)
- ✅ `config/overlay_config.json` - Configuration sauvegardée

### Pour information :
- 📚 `docs/CONFIGURATION_DYNAMIQUE.md` - Documentation complète
- 🧪 `scripts/test_dynamic_config.py` - Script de test

---

## 🎯 Prochaines étapes (optionnel)

### Convertir les autres overlays

Pour avoir la configuration dynamique sur tous vos overlays :

1. **Copier** `subgoal_left_dynamic.html`
2. **Renommer** en `subgoal_right_dynamic.html`
3. **Remplacer** les sources dans OBS

Ou je peux le faire pour vous ! 😊

---

## ✨ Astuce Pro

### Créer des presets personnalisés

Vous pouvez créer des **raccourcis clavier dans OBS** pour changer rapidement de style :

1. **Outils → Raccourcis clavier**
2. Chercher vos scripts
3. Assigner des touches (F1, F2, F3...)

Exemple :
- **F1** → Style jour (Blanc, Normal)
- **F2** → Style nuit (Violet, Lent)
- **F3** → Style énergique (Orange, Rapide)

---

<div align="center">

## 🎉 TOUT EST PRÊT !

**Rechargez le script OBS et testez les contrôles !**

Profitez de votre nouvelle configuration dynamique ! ✨

</div>
