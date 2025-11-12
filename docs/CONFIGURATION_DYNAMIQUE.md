# 🎨 Système de Configuration Dynamique des Overlays

Ce système permet de modifier en temps réel les propriétés visuelles des overlays HTML (police, couleurs, animations, etc.) depuis le script Python OBS, **sans recharger les sources navigateur dans OBS**.

## 📋 Architecture

```
Python (OBS) ──────► Node.js Server ──────► Overlays HTML
                    (WebSocket + REST API)    (WebSocket Client)
```

### Flux de données :

1. **Python** envoie une mise à jour de configuration via REST API (`POST /api/overlay-config`)
2. **Serveur Node.js** :
   - Sauvegarde la nouvelle config dans `config/overlay_config.json`
   - Diffuse via WebSocket (port 8084) aux overlays connectés
3. **Overlays HTML** reçoivent la mise à jour et appliquent les changements CSS en temps réel

---

## 🚀 Utilisation depuis Python

### 1. Importer le module

```python
from overlay_config_manager import OverlayConfigManager

# Créer le gestionnaire
config = OverlayConfigManager()
```

### 2. Modifier la police

```python
# Changer la famille de police
config.update_font(family="Arial")

# Changer la taille
config.update_font(size="48px")

# Changer l'épaisseur
config.update_font(weight="bold")

# Tout modifier d'un coup
config.update_font(family="Courier New", size="72px", weight="bold")
```

### 3. Modifier les couleurs

```python
# Couleur du texte
config.update_colors(text="#FF0000")  # Rouge

# Couleur de l'ombre
config.update_colors(shadow="rgba(255,0,0,0.8)")  # Rouge avec transparence

# Couleur du contour
config.update_colors(stroke="#0000FF")  # Bleu

# Tout modifier
config.update_colors(
    text="white",
    shadow="rgba(0,0,0,0.9)",
    stroke="black"
)
```

### 4. Modifier l'animation

```python
# Durée de l'animation
config.update_animation(duration="2s")

# Fonction d'easing
config.update_animation(easing="ease-in-out")

# Les deux
config.update_animation(duration="500ms", easing="linear")
```

### 5. Modifier la mise en page

```python
# Padding gauche
config.update_layout(paddingLeft="50px")

# Espacement entre les caractères
config.update_layout(gap="10px")
```

### 6. Mise à jour complète

```python
config.update_full_config(
    font={'family': 'Arial', 'size': '64px', 'weight': 'bold'},
    colors={'text': '#00FF00', 'shadow': 'rgba(0,0,0,0.7)', 'stroke': '#000'},
    animation={'duration': '1.5s', 'easing': 'ease-out'},
    layout={'paddingLeft': '30px', 'gap': '5px'}
)
```

---

## 🔧 Intégration dans `obs_subcount_auto.py`

### Exemple : Ajouter un menu de sélection de police

```python
from overlay_config_manager import OverlayConfigManager

# Créer le gestionnaire global
overlay_config = OverlayConfigManager()

def script_properties():
    props = obs.obs_properties_create()
    
    # ... vos propriétés existantes ...
    
    # Ajouter un menu déroulant pour la police
    font_list = obs.obs_properties_add_list(
        props,
        "overlay_font",
        "Police des overlays",
        obs.OBS_COMBO_TYPE_LIST,
        obs.OBS_COMBO_FORMAT_STRING
    )
    
    # Ajouter les polices disponibles
    fonts = ["SEA", "Arial", "Courier New", "Times New Roman", "Verdana", "Comic Sans MS"]
    for font in fonts:
        obs.obs_property_list_add_string(font_list, font, font)
    
    # Ajouter un slider pour la taille
    obs.obs_properties_add_int_slider(
        props,
        "overlay_font_size",
        "Taille de la police (px)",
        24, 128, 4
    )
    
    return props

def script_update(settings):
    # ... votre code existant ...
    
    # Récupérer les valeurs
    font_family = obs.obs_data_get_string(settings, "overlay_font")
    font_size = obs.obs_data_get_int(settings, "overlay_font_size")
    
    # Appliquer aux overlays
    if font_family:
        overlay_config.update_font(family=font_family)
    
    if font_size > 0:
        overlay_config.update_font(size=f"{font_size}px")
```

---

## 📁 Fichiers concernés

### Nouveaux fichiers créés :

1. **`config/overlay_config.json`**
   - Stockage persistant de la configuration
   - Chargé au démarrage du serveur

2. **`obs/overlay_config_manager.py`**
   - Module Python pour communiquer avec le serveur
   - Fournit une API simple pour modifier la config

3. **`obs/overlays/subgoal_left_dynamic.html`** (exemple)
   - Version modifiée avec support WebSocket
   - Variables CSS dynamiques (`--font-family`, `--text-color`, etc.)

### Fichiers modifiés :

1. **`server/server.js`**
   - Ajout WebSocket Server (port 8084)
   - Ajout API REST `/api/overlay-config` (GET/POST)
   - Fonctions `loadOverlayConfig()`, `saveOverlayConfig()`, `broadcastConfigUpdate()`

---

## 🔌 Ports utilisés

| Port | Usage | Description |
|------|-------|-------------|
| 3001 | HTTP REST API | Endpoints principaux + config overlays |
| 8083 | WebSocket Events | Événements Twitch (follows/subs) |
| 8084 | **WebSocket Config** | **Configuration dynamique overlays** |

---

## 🧪 Test du système

### Test 1 : Depuis Python standalone

```bash
cd obs
python overlay_config_manager.py
```

Résultat attendu :
```
📄 Configuration actuelle:
{
  "font": { "family": "SEA", "size": "64px", "weight": "normal" },
  "colors": { "text": "white", "shadow": "rgba(0,0,0,0.5)", "stroke": "black" },
  ...
}

🎨 Tests de modification:
1. Changement de police...
✅ Config overlay mise à jour: {'font': {'family': 'Arial', 'size': '48px'}}
...
```

### Test 2 : Depuis OBS

1. **Démarrer le serveur** depuis le script Python OBS
2. **Ajouter une source navigateur** : `obs/overlays/subgoal_left_dynamic.html`
3. **Ouvrir la console du navigateur** (clic droit sur la source → Interagir → F12)
4. **Modifier une propriété** depuis Python :
   ```python
   from overlay_config_manager import OverlayConfigManager
   config = OverlayConfigManager()
   config.update_font(family="Arial", size="96px")
   config.update_colors(text="#FF0000")
   ```
5. **Vérifier** que l'overlay se met à jour **instantanément** sans rechargement

---

## 📊 Propriétés configurables

### Police (`font`)
- `family` : Nom de la police (string)
- `size` : Taille en px (string, ex: "64px")
- `weight` : Épaisseur (string: "normal", "bold", "100-900")

### Couleurs (`colors`)
- `text` : Couleur du texte (hex, rgb, rgba, nom)
- `shadow` : Couleur de l'ombre (rgba recommandé)
- `stroke` : Couleur du contour (hex, rgb, nom)

### Animation (`animation`)
- `duration` : Durée (string, ex: "1s", "500ms")
- `easing` : Fonction d'easing CSS (string)

### Layout (`layout`)
- `paddingLeft` : Padding gauche (string, ex: "20px")
- `gap` : Espacement entre caractères (string, ex: "0", "10px")

---

## 🛡️ Sécurité et Backups

### Backups automatiques

Tous les fichiers modifiés ont été sauvegardés dans :
```
backups/before_websocket_config_YYYYMMDD_HHMMSS/
├── server.js.backup
├── obs_subcount_auto.py.backup
├── subgoal_left.html.backup
└── subgoal_right.html.backup
```

### En cas de problème

```bash
# Restaurer server.js
cp backups/before_websocket_config_*/server.js.backup server/server.js

# Restaurer Python
cp backups/before_websocket_config_*/obs_subcount_auto.py.backup obs/obs_subcount_auto.py
```

---

## 🐛 Dépannage

### Erreur "Impossible de se connecter au serveur"

**Cause** : Le serveur Node.js n'est pas démarré.

**Solution** :
```python
# Dans OBS, cliquer sur "Démarrer le serveur" dans le script Python
```

### Les overlays ne se mettent pas à jour

**Vérifications** :
1. **Console navigateur OBS** (F12 sur source) : messages d'erreur WebSocket ?
2. **Port 8084 libre** : `netstat -ano | findstr 8084` (Windows)
3. **Overlay utilise la version dynamique** : `subgoal_left_dynamic.html` ou équivalent

### Les changements ne persistent pas au redémarrage

**Cause** : La configuration est sauvegardée dans `config/overlay_config.json`.

**Vérification** :
```bash
cat config/overlay_config.json
```

---

## 🎯 Prochaines étapes

### Pour utiliser avec tous vos overlays :

1. **Dupliquer le code WebSocket** de `subgoal_left_dynamic.html` vers :
   - `subgoal_right.html`
   - `followgoal_left.html`
   - `followgoal_right.html`

2. **Ajouter des menus dans OBS** :
   - Dropdown de polices
   - Color pickers
   - Sliders de taille

3. **Créer des presets** :
   ```python
   # Preset "Stream de nuit"
   config.update_full_config(
       font={'family': 'Courier New', 'size': '56px'},
       colors={'text': '#8B00FF', 'stroke': '#000'}
   )
   
   # Preset "Stream classique"
   config.update_full_config(
       font={'family': 'SEA', 'size': '64px'},
       colors={'text': 'white', 'stroke': 'black'}
   )
   ```

---

## 📚 Ressources

- **Documentation WebSocket** : https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **CSS Variables** : https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- **Requests Python** : https://requests.readthedocs.io/

---

<div align="center">

**✨ Système créé le 12 novembre 2025 ✨**

Made with ❤️ pour AutoSubGoalTwitch v2.1.0

</div>
