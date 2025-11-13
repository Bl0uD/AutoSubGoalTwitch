# 🎉 AutoSubGoalTwitch v2.2.0

**Configuration dynamique unifiée et structure optimisée**

---

## ✨ Nouveautés

### 🎨 Configuration Dynamique Complète
- **Modification en temps réel** de tous les overlays depuis OBS
- **50+ polices Windows** détectées automatiquement (filtrage intelligent des variantes)
- **Couleurs personnalisées** avec saisie
- **WebSocket dédié** (port 8084) pour communication instantanée
- **Mesure précise** des caractères avec support complet des effets CSS

### 📁 Overlays Unifiés
- **4 overlays dynamiques**
- **Configuration temps réel** active par défaut sur tous les overlays

### 🖥️ Interface OBS Redessinée
- Menu entièrement repensé avec **séparateurs élégants**
- **Espacement optimisé** entre les sections
- **Émojis alignés** pour meilleure lisibilité
- Interface **épurée et professionnelle**

### 🔧 Structure Optimisée
- Nouveau dossier `config/` pour configuration persistante
- `overlay_config.json` créé automatiquement avec valeurs par défaut
- **Documentation simplifiée** : 1 guide utilisateur, notes de release pour GitHub

---

## 🚀 Améliorations

### Affichage
- **Recalcul progressif** des dimensions (50ms, 200ms, 500ms) lors du changement de police

### Configuration
- **Détection intelligente** des polices Windows (registre + dossier système)
- **Filtrage automatique** des variantes (Bold, Italic, Light, etc.)
- **Polices prioritaires** en tête de liste (Arial, Verdana)

### Installeur
- **Création automatique** de tous les dossiers nécessaires
- **Génération de overlay_config.json** avec configuration par défaut
- **Vérification des prérequis** (Python 3.6.8, Node.js, Git)

---

## 🐛 Corrections

- ✅ **Affichage des caractères** : Résolution du problème d'alignement avec différentes polices
- ✅ **Cache OBS** : Mécanisme de rechargement du script amélioré
- ✅ **Espacement** : Calcul précis de la largeur pour tous types de polices
- ✅ **WebSocket** : Gestion robuste des reconnexions

---

## 🔔 Améliorations Post-Release

### Notification de Mise à Jour Ultra-Visible
- **Affichage optimisé** : Notification claire et lisible sans duplication
- **Bordures propres** : Caractères `=` compatibles avec tous les terminaux
- **Ultra-visible** : 17 lignes avec émojis, espacement et séparateurs
- **Impossible à louper** : Les utilisateurs verront immédiatement les nouvelles versions
- **Commits** : d448759, 3701ccd, 51c8160

Les utilisateurs en v2.1.0 verront une magnifique notification au démarrage d'OBS les informant de la disponibilité de v2.2.0 !

---

## 📦 Installation

### Nouvelle installation

1. **Télécharger** le ZIP de la release
2. **Extraire** dans un dossier
3. **Lancer** `INSTALLER.bat`
4. **Charger** `obs/obs_subcount_auto.py` dans OBS → Outils → Scripts

### Mise à jour depuis v2.0.x/v2.1.x

1. **Sauvegarder** votre dossier `data/`
2. **Télécharger** et extraire la nouvelle version
3. **Copier** votre dossier `data/` dans la nouvelle version
4. **Relancer** l'installeur (pour mettre à jour les dépendances)
5. **Recharger** le script dans OBS

**Note** : Les overlays ont été renommés (suppression du suffixe `_dynamic`). Si vous utilisiez les versions dynamiques, changez simplement le chemin dans vos sources OBS :
- `subgoal_left_dynamic.html` → `subgoal_left.html`
- etc.

---

## 📖 Documentation

- **Guide utilisateur** : `docs/GUIDE_UTILISATEUR.md`
- **README** : Informations générales et démarrage rapide
- **CHANGELOG** : Historique complet des versions

---

## 🎯 Overlays inclus

Tous les overlays supportent la **configuration dynamique** :

1. **subgoal_left.html** - Compteur subs aligné à gauche
2. **subgoal_right.html** - Compteur subs aligné à droite  
3. **followgoal_left.html** - Compteur follows aligné à gauche
4. **followgoal_right.html** - Compteur follows aligné à droite

---

## ⚙️ Configuration requise

- **OS** : Windows 10/11
- **OBS Studio** : v27+ (avec support Python 3.6)
- **Python** : 3.6.8 (installé automatiquement)
- **Node.js** : v14+ (installé automatiquement)
- **Connexion internet** : Pour API Twitch

---

## 🔌 Ports utilisés

- **8082** : API REST
- **8083** : WebSocket données (subs/follows)
- **8084** : WebSocket configuration (styles)

---

## 🙏 Remerciements

Merci à tous les utilisateurs qui ont testé et donné leurs retours !

---

## 🐛 Signaler un bug

[Issues GitHub](https://github.com/Bl0uD/AutoSubGoalTwitch/issues)

---

## 📜 Licence

MIT License - Voir fichier `LICENSE`

---

<div align="center">

## 🎉 Bon stream avec v2.2.0 ! ✨

**Configuration dynamique • Overlays unifiés • Interface redessinée**

</div>
