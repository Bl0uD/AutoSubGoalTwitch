# 🎨 Configuration des Polices et Couleurs dans OBS

## 📝 Comment changer la police, taille et couleur ?

### Méthode 1 : Paramètres d'URL dans OBS

Lorsque vous ajoutez une source navigateur dans OBS, vous pouvez personnaliser l'apparence en ajoutant des paramètres à l'URL.

#### Exemple d'URL de base :
```
file:///C:/Users/VotreNom/Documents/StreamLabels/SubcountAutomatic/obs/overlays/subgoal_left.html
```

#### Exemple d'URL avec personnalisation :
```
file:///C:/Users/VotreNom/Documents/StreamLabels/SubcountAutomatic/obs/overlays/subgoal_left.html?font=Arial&size=72&color=red
```

---

## 🔧 Paramètres Disponibles

| Paramètre | Description | Valeurs Possibles | Défaut |
|-----------|-------------|-------------------|--------|
| `font` | Police d'écriture | Toutes les polices installées sur Windows | `SEA` |
| `size` | Taille du texte (en pixels) | Nombre (ex: 48, 64, 72, 100) | `64` |
| `color` | Couleur du texte | Nom (red, blue) ou HEX (#FF0000) | `white` |

---

## 📋 Exemples de Configuration

### Police Arial, taille 80px, couleur bleue
```
subgoal_left.html?font=Arial&size=80&color=blue
```

### Police Comic Sans MS, taille 60px, couleur orange
```
subgoal_left.html?font=Comic Sans MS&size=60&color=orange
```

### Police Impact, taille 100px, couleur personnalisée (HEX)
```
subgoal_left.html?font=Impact&size=100&color=%23FF6B35
```
*Note : `%23` = `#` encodé pour URL*

### Police Segoe UI, taille 72px, couleur verte
```
subgoal_left.html?font=Segoe UI&size=72&color=%2300FF00
```

---

## 🎯 Liste de Polices Windows Courantes

### Polices Standard Windows :
- **Arial** : Police sans-serif classique
- **Times New Roman** : Police serif élégante
- **Courier New** : Police monospace
- **Verdana** : Police web-friendly
- **Georgia** : Police serif moderne
- **Comic Sans MS** : Police décontractée
- **Trebuchet MS** : Police sans-serif arrondie
- **Impact** : Police grasse impactante
- **Calibri** : Police moderne Office
- **Segoe UI** : Police système Windows 10/11

### Polices Gaming/Stream :
- **Bebas Neue** (si installée)
- **Montserrat** (si installée)
- **Roboto** (si installée)
- **Oswald** (si installée)

---

## 🖥️ Comment Configurer dans OBS ?

### Étape 1 : Ajouter une Source Navigateur
1. Dans OBS, cliquez sur **+** dans Sources
2. Sélectionnez **Navigateur**
3. Donnez un nom (ex: "Subgoal Left")

### Étape 2 : Configurer l'URL
1. Dans **URL**, collez le chemin complet vers votre fichier HTML
2. Ajoutez les paramètres à la fin de l'URL avec `?`
3. Séparez les paramètres avec `&`

**Exemple complet :**
```
file:///C:/Users/BlouD/Documents/StreamLabels/SubcountAutomatic/obs/overlays/subgoal_left.html?font=Impact&size=80&color=yellow
```

### Étape 3 : Définir les Dimensions
- **Largeur** : 1920 (ou votre résolution)
- **Hauteur** : 1080 (ou votre résolution)

### Étape 4 : Options Recommandées
- ✅ Cocher **"Actualiser le navigateur quand la scène devient active"**
- ✅ Cocher **"Arrêter de rendre quand invisible"**

---

## 🎨 Exemples de Couleurs

### Couleurs Nommées :
- `white` (blanc)
- `black` (noir)
- `red` (rouge)
- `blue` (bleu)
- `green` (vert)
- `yellow` (jaune)
- `orange` (orange)
- `purple` (violet)
- `pink` (rose)
- `cyan` (cyan)

### Couleurs HEX (encodées pour URL) :
- Rouge vif : `%23FF0000`
- Bleu ciel : `%2300BFFF`
- Vert lime : `%2300FF00`
- Orange : `%23FF6B35`
- Violet : `%239D4EDD`
- Rose : `%23FF007F`
- Or : `%23FFD700`

---

## 🔄 Appliquer les Modifications

Après avoir modifié l'URL dans OBS :
1. Cliquez sur **OK** pour fermer les propriétés
2. **Clic droit** sur la source → **Actualiser**
3. Les changements devraient être visibles immédiatement

---

## 💡 Conseils

### Choix de la Police :
- ✅ Utilisez des polices **grasses** pour la lisibilité en stream
- ✅ Testez la police avec différents nombres (0-9, /, :)
- ✅ Impact, Arial Black, Bebas Neue sont excellents pour le streaming

### Taille du Texte :
- **Petits overlays** : 48-64px
- **Taille moyenne** : 64-80px
- **Grands overlays** : 80-120px

### Couleurs :
- ✅ Utilisez des couleurs **contrastées** avec votre background
- ✅ Le contour noir (`-webkit-text-stroke: 1px black`) reste toujours appliqué
- ✅ Testez avec votre overlay de stream pour vérifier la lisibilité

---

## 🐛 Dépannage

### La police ne change pas ?
- Vérifiez que la police est **installée sur Windows**
- Vérifiez l'**orthographe exacte** du nom de la police
- Utilisez `%20` pour les espaces (ex: `Comic%20Sans%20MS`)
- Actualisez la source navigateur dans OBS

### La couleur ne s'applique pas ?
- Vérifiez l'encodage HEX : `%23` avant le code couleur
- Utilisez les noms de couleurs en anglais
- Exemple correct : `color=%23FF0000` ou `color=red`

### La taille semble incorrecte ?
- N'oubliez pas l'unité est en **pixels**
- Essayez différentes valeurs : 48, 64, 72, 80, 100
- La hauteur du conteneur s'adapte automatiquement

---

## 📦 Fichiers Concernés

Cette configuration fonctionne avec tous les overlays :
- ✅ `subgoal_left.html`
- ⏳ `subgoal_right.html` (à modifier)
- ⏳ `followgoal_left.html` (à modifier)
- ⏳ `followgoal_right.html` (à modifier)

---

## 🔗 Ressources Utiles

- **Polices gratuites** : [Google Fonts](https://fonts.google.com/)
- **Encodeur URL** : [URL Encoder](https://www.urlencoder.org/)
- **Color Picker** : [HTML Color Codes](https://htmlcolorcodes.com/)

---

<div align="center">

**💡 Besoin d'aide ? Ouvrez une issue sur GitHub !**

</div>
