# 🎨 Guide : Utiliser le Menu Police dans OBS

## ❓ Problème : Je ne vois pas le menu déroulant des polices

### ✅ Solution : Recharger le Script

Le menu déroulant apparaît dans les **Propriétés du script**, pas dans la Description.

---

## 📋 Étapes pour Voir le Menu Police

### 1️⃣ Ouvrir OBS Studio

### 2️⃣ Aller dans Outils → Scripts
- Menu en haut : **Outils**
- Sélectionner : **Scripts**

### 3️⃣ Recharger le Script
**Si le script est déjà chargé :**
- Sélectionnez `obs_subcount_auto.py` dans la liste
- Cliquez sur le bouton **⟳ Recharger** (en bas à gauche)

**OU**

- Cliquez sur **-** pour retirer le script
- Cliquez sur **+** pour le rajouter
- Naviguez vers : `obs/obs_subcount_auto.py`

### 4️⃣ Vérifier l'Ordre d'Affichage

**En haut (Description) :**
```
🎮 SubCount Auto v2.1 - Contrôle OBS
Script amélioré avec contrôle total depuis OBS...
```

**En bas (Propriétés - défilez vers le bas) :**
```
━━━━━━━━━━━ 🎨 APPARENCE DES OVERLAYS ━━━━━━━━━━━

📝 Police d'écriture : [Menu déroulant]
📏 Taille (px) : [Curseur 24-200]
🎨 Couleur du texte : [Menu déroulant]
✅ Appliquer la Police [Bouton]

💡 Aide : Après avoir cliqué sur 'Appliquer'...
```

---

## 🎯 Nouvel Ordre d'Affichage

### Section 1 : CONTRÔLES RAPIDES
- 🔄 Synchroniser avec Twitch

### Section 2 : FOLLOWS
- ➕ Ajouter 1 Follow
- ➖ Retirer 1 Follow

### Section 3 : SUBS
- ➕ Ajouter 1 Sub (Tier 1)
- ➖ Retirer 1 Sub

### Section 4 : INTERFACES WEB
- 🏠 Ouvrir Dashboard
- ⚙️ Ouvrir Configuration
- 🔧 Ouvrir Panel Admin

### Section 5 : COMPTE TWITCH
- 🔗 Connecter Twitch
- 🔌 Déconnecter Twitch

### Section 6 : GESTION SERVEUR
- 🔄 Redémarrer Serveur
- ⏹️ Arrêter Serveur

### Section 7 : APPARENCE DES OVERLAYS ⭐ **NOUVEAU**
- 📝 **Police d'écriture** : Menu déroulant avec toutes les polices Windows
- 📏 **Taille (px)** : Curseur de 24 à 200 pixels
- 🎨 **Couleur du texte** : Menu déroulant avec 12 couleurs
- ✅ **Appliquer la Police** : Bouton pour valider

---

## 🖱️ Utilisation du Menu Police

### Étape 1 : Choisir la Police
Cliquez sur le **menu déroulant "Police d'écriture"**

**Polices disponibles (exemples) :**
- SEA (par défaut)
- Arial
- Arial Black
- Calibri
- Comic Sans MS
- Impact ⭐ (recommandé streaming)
- Segoe UI
- Times New Roman
- Trebuchet MS
- Verdana
- ... et toutes vos polices Windows installées !

### Étape 2 : Régler la Taille
Déplacez le **curseur "Taille (px)"**
- Minimum : 24px (petit)
- Défaut : 64px (moyen)
- Maximum : 200px (très grand)

### Étape 3 : Choisir la Couleur
Cliquez sur le **menu déroulant "Couleur du texte"**

**Couleurs disponibles :**
- Blanc (white)
- Noir (black)
- Rouge (red)
- Bleu (blue)
- Vert (green)
- Jaune (yellow) ⭐ (très visible)
- Orange (orange)
- Violet (purple)
- Rose (pink)
- Cyan (cyan)
- Or (#FFD700)
- Argent (#C0C0C0)

### Étape 4 : Appliquer
Cliquez sur **"✅ Appliquer la Police"**

**Résultat dans les logs :**
```
✅ Police configurée: Impact, Taille: 80px, Couleur: yellow
   Dans OBS, ajoutez à l'URL: ?font=Impact&size=80&color=yellow
```

### Étape 5 : Mettre à Jour les Sources OBS
Dans chaque **source navigateur** (subgoal_left, subgoal_right, etc.) :

1. **Clic droit** sur la source → **Propriétés**
2. Dans le champ **URL**, ajoutez à la fin :
   ```
   ?font=Impact&size=80&color=yellow
   ```

**Exemple complet :**
```
Avant :
file:///C:/Users/BlouD/Documents/StreamLabels/SubcountAutomatic/obs/overlays/subgoal_left.html

Après :
file:///C:/Users/BlouD/Documents/StreamLabels/SubcountAutomatic/obs/overlays/subgoal_left.html?font=Impact&size=80&color=yellow
```

3. **OK** pour fermer
4. **Clic droit** sur la source → **Actualiser**

---

## 🐛 Dépannage

### Le menu ne s'affiche pas ?

**Solution 1 : Recharger le script**
```
Outils → Scripts → Sélectionner le script → Bouton ⟳ Recharger
```

**Solution 2 : Vérifier les logs**
Si erreur, regardez dans les logs :
```
C:\Users\BlouD\Documents\StreamLabels\SubcountAutomatic\logs\obs_subcount_auto.log
```

**Solution 3 : Réinstaller le script**
```
1. Retirer (-) le script
2. Fermer la fenêtre Scripts
3. Rouvrir Outils → Scripts
4. Ajouter (+) le script à nouveau
```

### Le menu est vide (pas de polices) ?

**Erreur possible :** Problème d'accès au registre Windows

**Solution :** Le script affichera des polices par défaut :
- SEA, Arial, Impact, Segoe UI, Calibri, Comic Sans MS

### Les polices ne s'appliquent pas dans OBS ?

**Vérification 1 :** Avez-vous cliqué sur "Appliquer" ?

**Vérification 2 :** Avez-vous ajouté les paramètres à l'URL ?
```
?font=Impact&size=80&color=yellow
```

**Vérification 3 :** Avez-vous actualisé la source navigateur ?
```
Clic droit → Actualiser
```

---

## 📸 Capture d'Écran Attendue

Lorsque vous faites défiler vers le bas dans les Propriétés du script, vous devriez voir :

```
┌─────────────────────────────────────────────────┐
│ ━━━━━━━━━ 🎨 APPARENCE DES OVERLAYS ━━━━━━━━━ │
│                                                 │
│ 📝 Police d'écriture :                         │
│    [SEA                           ▼]           │
│                                                 │
│ 📏 Taille (px) :                               │
│    |——●————————————————| 64                    │
│    24                 200                      │
│                                                 │
│ 🎨 Couleur du texte :                          │
│    [Blanc                         ▼]           │
│                                                 │
│ [✅ Appliquer la Police]                       │
│                                                 │
│ 💡 Aide : Après avoir cliqué sur 'Appliquer',│
│   ajoutez ces paramètres à l'URL...           │
└─────────────────────────────────────────────────┘
```

---

## 💡 Astuces

### Police Recommandées pour le Streaming :
1. **Impact** : Gras, très lisible, style moderne
2. **Arial Black** : Ultra gras, excellent contraste
3. **Bebas Neue** : Style pro (si installée)
4. **Segoe UI** : Clean, Windows style
5. **Calibri** : Élégant et moderne

### Tailles Recommandées :
- **Petit overlay** : 48-64px
- **Taille moyenne** : 64-80px
- **Grand overlay** : 80-120px
- **Très visible** : 120-200px

### Couleurs Recommandées :
- **Jaune** : Très visible sur fond sombre ⭐
- **Blanc** : Classic, toujours lisible
- **Or (#FFD700)** : Effet premium
- **Cyan** : Moderne, gaming style

### Combiner Police + Couleur :
```
Impact + Jaune = Style énergique
Arial Black + Blanc = Classic pro
Segoe UI + Cyan = Gaming moderne
Calibri + Or = Effet premium
```

---

## 🔄 Mise à Jour Rapide

Si vous avez modifié le script manuellement :

1. **Sauvegarder** le fichier `.py`
2. Dans OBS : **Outils → Scripts**
3. Cliquer sur **⟳ Recharger**
4. Le menu devrait apparaître immédiatement

---

## 📝 Résumé

✅ **Le menu est dans les Propriétés, pas dans la Description**
✅ **Il faut recharger le script pour voir les modifications**
✅ **La section Apparence est maintenant en bas**
✅ **Après "Appliquer", il faut ajouter les paramètres à l'URL OBS**

---

<div align="center">

**💡 Besoin d'aide ? Consultez les logs OBS ou ouvrez une issue !**

</div>
