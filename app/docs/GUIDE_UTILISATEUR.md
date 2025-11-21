# 📖 Guide d'utilisation - SubcountAutomatic

Guide complet pour installer et utiliser SubcountAutomatic dans OBS Studio.

---

## 📦 Installation

### 1. Télécharger le projet

Téléchargez la dernière version depuis GitHub : [Releases](https://github.com/Bl0uD/AutoSubGoalTwitch/releases)

### 2. Lancer l'installeur

Double-cliquez sur `INSTALLER.bat` - L'installeur va automatiquement :
- ✅ Installer Python 3.6.8 (si nécessaire)
- ✅ Installer Node.js (si nécessaire)  
- ✅ Installer Git (si nécessaire)
- ✅ Installer toutes les dépendances
- ✅ Créer les dossiers nécessaires (`obs/data/`, `app/logs/`, `app/backups/`, `app/config/`)
- ✅ Créer les fichiers de configuration par défaut

⏱️ **Durée** : 5-10 minutes

### 3. Configuration Twitch

Éditez le fichier `obs/data/twitch_config.txt` :
```
votre_client_id:votre_client_secret:votre_nom_de_chaine
```

**Comment obtenir les identifiants :**
1. Allez sur [Twitch Developer Console](https://dev.twitch.tv/console)
2. Créez une application
3. Copiez le Client ID et Client Secret

---

## 🎬 Configuration OBS

### 1. Charger le script Python

1. **Ouvrir OBS Studio**
2. **Outils → Scripts**
3. **Cliquer sur "+"**
4. **Sélectionner** : `obs/obs_subcount_auto.py`

Le serveur démarre automatiquement ! ✅

### 2. Ajouter un overlay

1. **Ajouter une source** : `Source navigateur`
2. **Nom** : `Subgoal Left` (exemple)
3. **URL** : `http://localhost:8082/obs/overlays/subgoal_left.html`
4. **Dimensions** : 800x200 (ajuster selon besoin)
5. **Cocher** : `Actualiser le navigateur lorsque la scène devient active`
6. **OK**

> ⚠️ **IMPORTANT** : N'utilisez PAS "Fichier local" ! Les overlays doivent être chargés via HTTP pour que les WebSockets fonctionnent.

**URLs disponibles :**
- `http://localhost:8082/obs/overlays/subgoal_left.html` - Compteur subs gauche
- `http://localhost:8082/obs/overlays/subgoal_right.html` - Compteur subs droite
- `http://localhost:8082/obs/overlays/followgoal_left.html` - Compteur follows gauche
- `http://localhost:8082/obs/overlays/followgoal_right.html` - Compteur follows droite

---

## ⚙️ Configuration dynamique des overlays

### Modifier l'apparence en temps réel

Dans le script OBS, section **"Configuration Overlays"** :

#### 🎨 Police
- **Liste déroulante** : Toutes les polices Windows disponibles (~50-100 polices)
- **Taille** : 32px à 128px
- **Style** : Normal, Bold, Italic

#### 🌈 Couleurs
- **Couleur du texte** : CSS (ex: `white`, `#FF0000`, `rgb(255,0,0)`)
- **Couleur de l'ombre** : CSS avec transparence (ex: `rgba(0,0,0,0.5)`)
- **Couleur du contour** : CSS (ex: `black`, `#000000`)

#### ✨ Animations
- **Vitesse** : Lent (2s), Normal (1s), Rapide (0.5s)
- **Style** : Fluide, Rebond, Snap

**Les changements sont instantanés** - Pas besoin de recharger la source ! 🎉

---

## 🎯 Utilisation courante

### Démarrage

**Option 1 - Automatique (recommandé) :**
- Ouvrir OBS → Le script démarre automatiquement le serveur

**Option 2 - Manuel :**
- Lancer `app/scripts/START_SERVER.bat`

### Modifier les objectifs

**Depuis OBS (script Python) :**
- Section **"Subs"** → Modifier l'objectif
- Section **"Follows"** → Modifier l'objectif

**Ou manuellement :**
- Éditer `obs/data/total_subscriber_count_goal.txt`
- Éditer `obs/data/total_followers_count_goal.txt`

### Voir les compteurs actuels

**Option 1 - Dashboard web :**
- Ouvrir : `http://localhost:8082/dashboard.html`

**Option 2 - Fichiers :**
- `obs/data/total_subscriber_count.txt` - Nombre de subs actuel
- `obs/data/total_followers_count.txt` - Nombre de follows actuel

---

## 🔧 Dépannage

### Le serveur ne démarre pas

**Vérifier les ports :**
```powershell
netstat -ano | findstr "8082 8083 8084"
```

**Si occupés**, modifier dans `app/server/server.js` (lignes ~30-35)

### L'overlay ne s'affiche pas

1. **Vérifier que le serveur est lancé** (voyant vert dans le script OBS)
2. **Actualiser le cache** : Clic droit sur la source → Actualiser le cache du navigateur
3. **Vérifier le chemin** : Le fichier HTML doit être accessible
4. **Consulter les logs** : `app/logs/obs_subcount_auto.log`

### Les changements de style ne s'appliquent pas

1. **Actualiser le cache** : Clic droit sur la source → Actualiser le cache
2. **Vérifier la console** : F12 dans la source navigateur → Console
3. **Vérifier WebSocket** : Doit afficher "WebSocket (config) connecté au port 8084"

### Les compteurs ne se mettent pas à jour

1. **Vérifier Twitch config** : `obs/data/twitch_config.txt` doit contenir vos vrais identifiants
2. **Vérifier les logs** : `app/logs/obs_subcount_auto.log`
3. **Redémarrer le serveur** : Bouton dans le script OBS

---

## 📊 Interfaces web

### Dashboard - `http://localhost:8082/dashboard.html`
Vue d'ensemble des compteurs et objectifs en temps réel

### Configuration - `http://localhost:8082/config.html`
Modifier les objectifs et la configuration

### Admin - `http://localhost:8082/admin.html`
Gestion avancée du système

---

## 🎨 Personnalisation avancée

### Créer un preset de style

1. **Configurer** l'overlay comme désiré (police, couleurs, animations)
2. **Sauvegarder** - La config est automatiquement sauvegardée dans `app/config/overlay_config.json`
3. **Créer un backup** : Copier `overlay_config.json` avec un nom (ex: `style_nuit.json`)
4. **Restaurer** : Copier le backup sur `overlay_config.json` et relancer le serveur

### Modifier un overlay HTML

Les fichiers sont dans `obs/overlays/` - Vous pouvez modifier :
- Le CSS (alignement, marges, etc.)
- Les animations
- La structure HTML

**Note** : Ne modifiez pas la section WebSocket (lignes ~100-200) pour garder la configuration dynamique

---

## 📁 Structure des fichiers

```
SubcountAutomatic/
├── INSTALLER.bat           ⭐ Installeur principal
├── README.md               📖 Documentation GitHub
│
├── data/                   💾 Vos données
│   ├── twitch_config.txt       (identifiants Twitch)
│   ├── total_subscriber_count.txt
│   ├── total_subscriber_count_goal.txt
│   ├── total_followers_count.txt
│   └── total_followers_count_goal.txt
│
├── config/                 ⚙️ Configuration système
│   └── overlay_config.json     (apparence overlays)
│
├── obs/                    🎬 Scripts OBS
│   ├── obs_subcount_auto.py    ⭐ Script principal
│   └── overlays/               (4 fichiers HTML)
│
├── server/                 🖥️ Serveur Node.js
│   └── server.js
│
├── web/                    🌐 Interfaces web
│   ├── dashboard.html
│   ├── config.html
│   └── admin.html
│
├── logs/                   📋 Logs système
└── backups/                💾 Backups automatiques
```

---

## ❓ FAQ

### Puis-je utiliser plusieurs overlays en même temps ?
Oui ! Ajoutez autant de sources navigateur que vous voulez. Tous partagent la même configuration de style.

### Les compteurs fonctionnent-ils hors ligne ?
Non, le système nécessite une connexion internet pour récupérer les données Twitch.

### Puis-je changer la police en stream ?
Oui ! Les changements sont instantanés, sans recharger les sources OBS.

### Est-ce compatible avec Streamlabs OBS ?
Non, seulement OBS Studio (Python scripts non supportés par SLOBS).

### Les données sont-elles sauvegardées ?
Oui, automatiquement dans `obs/data/*_backup.txt` et `app/backups/`.

---

## 🆘 Support

**Problème non résolu ?**

1. **Consulter les logs** : `app/logs/obs_subcount_auto.log`
2. **Issues GitHub** : [github.com/Bl0uD/AutoSubGoalTwitch/issues](https://github.com/Bl0uD/AutoSubGoalTwitch/issues)

---

<div align="center">

## 🎉 Bon stream ! ✨

**v2.2.2** - Avec configuration dynamique et mise à jour automatique

</div>
