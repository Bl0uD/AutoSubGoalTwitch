# 📘 Guide Utilisateur - AutoSubGoalTwitch v2.1.0

**Bienvenue dans AutoSubGoalTwitch !** Ce guide vous accompagne de l'installation à l'utilisation complète du projet.

---

## 📦 Installation

### Méthode Automatique (Recommandée)

1. **Téléchargez** le ZIP depuis [GitHub Releases](https://github.com/Bl0uD/AutoSubGoalTwitch/releases)
2. **Extrayez** le contenu dans un dossier de votre choix
3. **Double-cliquez** sur `INSTALLER.bat`
4. **Suivez** les instructions à l'écran

L'installeur va automatiquement :
- ✅ Vérifier et installer Git (si nécessaire)
- ✅ Vérifier et installer Node.js (si nécessaire)
- ✅ Installer toutes les dépendances npm
- ✅ Créer les dossiers nécessaires (data/, logs/, backups/)
- ✅ Copier les fichiers de configuration depuis les templates

### Ce qui sera installé

**Git pour Windows**
- Version : 2.43.0+ (dernière stable)
- Taille : ~50 MB
- Emplacement : `C:\Program Files\Git`
- Utilité : Gestion de versions et mises à jour automatiques

**Node.js**
- Version : 20.10.0+ LTS (Long Term Support)
- Taille : ~30 MB
- Emplacement : `C:\Program Files\nodejs`
- Utilité : Serveur backend pour l'application

**Dépendances npm**
- express, ws, crypto, fs, path, etc.
- Installées dans `server/node_modules/`

---

## 🚀 Premier Démarrage

### Étape 1 : Démarrer le serveur

Double-cliquez sur **`scripts\START_SERVER.bat`**

Une fenêtre de terminal s'ouvre et affiche :
```
🚀 AutoSubGoalTwitch Server v2.1.0
✅ Server listening on http://localhost:8082
✅ WebSocket server listening on ws://localhost:8083
```

**⚠️ Gardez cette fenêtre ouverte** pendant toute votre session de streaming.

### Étape 2 : Accéder au Dashboard

Ouvrez votre navigateur et allez sur : **http://localhost:8082**

Vous verrez le tableau de bord principal avec :
- 📊 Statistiques en temps réel (subs, follows)
- 🎯 Progression des objectifs
- 🔗 Statut de connexion Twitch

### Étape 3 : Connecter votre compte Twitch

1. Sur le dashboard, cliquez sur **"Configuration"** (ou allez sur http://localhost:8082/config.html)
2. Cliquez sur **"Connecter avec Twitch"**
3. Un code s'affiche à l'écran (exemple : `ABCD-1234`)
4. Ouvrez automatiquement ou manuellement : https://www.twitch.tv/activate
5. Entrez le code affiché
6. Autorisez les permissions demandées :
   - ✅ Lire votre email
   - ✅ Lire vos abonnements
   - ✅ Lire vos followers
7. Retournez sur le dashboard → **Connexion établie !** ✅

### Étape 4 : Charger le script dans OBS

1. Ouvrez **OBS Studio**
2. Allez dans **Outils → Scripts**
3. Cliquez sur **"+"** (Ajouter un script)
4. Sélectionnez : `obs\obs_subcount_auto.py`
5. Le script apparaît dans la liste et se connecte automatiquement

**💡 Vérification :** Regardez les logs dans la fenêtre de script, vous devriez voir :
```
✅ Connexion WebSocket établie
✅ Synchronisation Twitch réussie
```

### Étape 5 : Ajouter les overlays dans OBS

Pour afficher les compteurs de subs :

1. Dans OBS, cliquez sur **"+"** dans les Sources
2. Sélectionnez **"Navigateur"**
3. Nom : `SubGoal Counter`
4. URL : `http://localhost:8082/obs/overlays/subgoal_left.html`
5. Largeur : `400`, Hauteur : `100`
6. ✅ Cochez **"Actualiser le cache du navigateur lors du chargement de la scène"**
7. Cliquez sur **OK**

Répétez pour les autres overlays :
- `subgoal_right.html` - Compteur subs aligné à droite
- `followgoal_left.html` - Compteur follows aligné à gauche
- `followgoal_right.html` - Compteur follows aligné à droite

---

## 🎯 Configuration des Objectifs

### Via l'Interface Web (Recommandé)

1. Allez sur **http://localhost:8082**
2. Cliquez sur **"Admin Panel"**
3. Modifiez les objectifs :
   - **Objectif Subscribers** : Entrez le nombre cible (ex: 100)
   - **Objectif Followers** : Entrez le nombre cible (ex: 500)
4. Cliquez sur **"Sauvegarder"**

Les overlays OBS se mettent à jour automatiquement !

### Via les fichiers de configuration

Si vous préférez éditer manuellement :

**`data/subgoal_config.txt`** - Objectifs de subs
```
12
15
20
25
30
35
40
50
60
75
100
150
```

**`data/followgoal_config.txt`** - Objectifs de follows
```
50
100
150
200
250
300
400
500
750
1000
1500
2000
2500
3000
5000
```

Chaque ligne = un palier d'objectif. Ajoutez ou supprimez des lignes selon vos besoins.

---

## 🔄 Système de Mise à Jour Automatique

### Vérification des mises à jour

Le script OBS vérifie automatiquement les nouvelles versions au démarrage.

**Si une mise à jour est disponible :**
1. Une notification apparaît dans OBS
2. Allez sur **http://localhost:8082**
3. Cliquez sur **"Nouvelle version disponible - Télécharger"**
4. La mise à jour se télécharge en arrière-plan
5. Cliquez sur **"Installer la mise à jour"**
6. Redémarrez OBS

**🔒 Sauvegarde automatique :** Avant chaque mise à jour, vos fichiers de configuration et données sont sauvegardés dans `backups/`.

### Vérification manuelle

Dans le terminal où le serveur tourne, tapez :
```powershell
cd scripts
python test_update_system.py
```

Vous verrez :
```
✅ Version actuelle : 2.1.0
✅ Dernière version disponible : 2.1.0
✅ Vous êtes à jour !
```

---

## 🌐 Interfaces Web

### Dashboard - http://localhost:8082
- 📊 Vue d'ensemble des statistiques
- 🎯 Progression vers les objectifs
- 🔗 Statut de connexion Twitch
- 📈 Graphiques en temps réel

### Configuration - http://localhost:8082/config.html
- 🔐 Connexion/Déconnexion Twitch
- 🎯 Définir les objectifs
- 🔄 Tester la connexion

### Admin Panel - http://localhost:8082/admin.html
- ⚙️ Paramètres avancés
- 🔧 Reset des compteurs
- 📜 Visualisation des logs
- 💾 Gestion des sauvegardes

---

## 🐛 Résolution de Problèmes

### Le serveur ne démarre pas

**Symptôme :** La fenêtre du serveur se ferme immédiatement ou affiche des erreurs.

**Solutions :**
1. Vérifiez que Node.js est installé :
   ```powershell
   node --version
   ```
   Devrait afficher : `v20.10.0` ou supérieur

2. Réinstallez les dépendances :
   ```powershell
   cd server
   npm install
   ```

3. Consultez les logs :
   ```powershell
   type logs\subcount_logs.txt
   ```

### Les overlays ne s'affichent pas dans OBS

**Symptôme :** Source navigateur vide ou erreur de chargement.

**Solutions :**
1. Vérifiez que le serveur est démarré (http://localhost:8082 doit répondre)
2. Vérifiez l'URL de la source navigateur dans OBS
3. Cochez **"Actualiser le cache"** dans les propriétés de la source
4. Appuyez sur **F5** pour rafraîchir la source
5. Redémarrez OBS si nécessaire

### Le script OBS ne fonctionne pas

**Symptôme :** Pas de connexion WebSocket, erreurs dans les logs.

**Solutions :**
1. Vérifiez que Python est installé et détecté par OBS :
   - OBS → Outils → Scripts → Onglet "Python Settings"
   - Le chemin Python doit être configuré

2. Consultez les logs :
   ```powershell
   type logs\obs_subcount_auto.log
   ```

3. Redémarrez OBS complètement (Fichier → Quitter)

### Erreur "Invalid OAuth token"

**Symptôme :** Message d'erreur sur le dashboard, pas de synchronisation Twitch.

**Solutions :**
1. Reconnectez-vous depuis http://localhost:8082/config.html
2. Cliquez sur **"Connecter avec Twitch"**
3. Suivez le processus Device Code
4. Assurez-vous d'accepter **toutes les permissions** demandées

### Les compteurs ne se mettent pas à jour

**Symptôme :** Les overlays affichent des anciennes valeurs.

**Solutions :**
1. Vérifiez la connexion WebSocket dans les logs du serveur
2. Rafraîchissez les sources navigateur dans OBS (F5)
3. Redémarrez le serveur :
   - Fermez la fenêtre du serveur
   - Relancez `scripts\START_SERVER.bat`

---

## 📁 Structure des Fichiers

### Fichiers Utilisateur (à ne pas supprimer)

```
data/
├── twitch_config.txt              ← Configuration Twitch (chiffrée)
├── subgoal_config.txt             ← Objectifs subscribers
├── followgoal_config.txt          ← Objectifs followers
├── total_subscriber_count.txt     ← Compteur subs actuel
├── total_subscriber_count_goal.txt← Objectif subs actuel
├── total_followers_count.txt      ← Compteur follows actuel
└── total_followers_count_goal.txt ← Objectif follows actuel

logs/
├── subcount_logs.txt              ← Logs du serveur
├── obs_subcount_auto.log          ← Logs du script OBS
└── update.log                     ← Logs des mises à jour

backups/
└── backup_YYYYMMDD_HHMMSS/        ← Sauvegardes avant mises à jour
```

### Fichiers à ne PAS Modifier

```
obs/                               ← Scripts OBS
server/                            ← Serveur Node.js
web/                               ← Interfaces web
config/                            ← Templates
scripts/                           ← Scripts de démarrage
```

---

## 💡 Conseils & Astuces

### Optimiser les Performances

1. **Gardez OBS en mode Studio** pour voir les sources avant de les afficher
2. **Désactivez la source navigateur** quand vous ne streamez pas (clic droit → Désactiver)
3. **Limitez le nombre de sources navigateur actives** (max 4 recommandé)

### Personnaliser les Overlays

Les fichiers HTML dans `obs/overlays/` peuvent être modifiés :
- Couleurs (CSS)
- Polices de caractères
- Animations
- Taille et position des éléments

**💡 Conseil :** Faites une copie avant de modifier !

### Sauvegarder vos Configurations

Avant toute manipulation, copiez le dossier `data/` :
```powershell
xcopy /E /I data data_backup_$(Get-Date -Format "yyyyMMdd")
```

### Logs et Débogage

Pour activer les logs détaillés, éditez `config/version.json` :
```json
{
  "version": "2.1.0",
  "debug_mode": true
}
```

---

## 🔗 Liens Utiles

- **Repository GitHub** : https://github.com/Bl0uD/AutoSubGoalTwitch
- **Issues (Support)** : https://github.com/Bl0uD/AutoSubGoalTwitch/issues
- **Releases** : https://github.com/Bl0uD/AutoSubGoalTwitch/releases
- **Documentation Développeur** : `docs/DEVELOPER.md`

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier `LICENSE` pour plus de détails.

---

**🎉 Bon stream avec AutoSubGoalTwitch !**
