# Release Notes - v2.2.1

**Date de sortie** : 18 novembre 2025

---

## 🎯 Résumé

Cette version corrige les problèmes d'installation sur les machines Windows neuves et améliore considérablement l'expérience utilisateur lors de la configuration initiale avec OBS.

---

## ✨ Nouvelles Fonctionnalités

### 🔧 Installeur Robuste

- **Installation Python améliorée** :
  - Détection automatique de l'exécutable Python (`python` ou `py -3`)
  - Vérification et installation de pip via `ensurepip` si nécessaire
  - Mise à jour automatique de pip, setuptools et wheel
  - Installation en mode `--user` avec fallback global
  - Préférence pour les wheels binaires (`--prefer-binary`)
  
- **Messages d'erreur détaillés** :
  - Guidance spécifique pour l'installation de `psutil`
  - Liens vers Visual Studio Build Tools
  - Liens vers PyPI pour téléchargement manuel de wheels

### 🎨 Affichage du Chemin Python

- **Détection automatique** du chemin d'installation Python
- **Affichage clair** du dossier à copier dans OBS
- **Trois méthodes de détection** pour maximiser la compatibilité :
  - `where.exe python`
  - `Get-Command python`
  - `python -c "import sys; print(sys.executable)"`

### 📋 Guidage Pas à Pas

- **Pauses entre chaque étape** de configuration
- **Instructions détaillées** pour :
  1. Ouvrir OBS Studio
  2. Configurer le chemin Python (Scripts > Paramètres Python)
  3. Ajouter le script `obs_subcount_auto.py`
  4. Redémarrer OBS
  5. Se connecter à Twitch
  6. Ajouter les overlays HTML
  7. Démarrer le serveur

---

## 🐛 Corrections de Bugs

### Installation
- ✅ **Fix installation psutil** sur machines Windows sans Build Tools
- ✅ **Fix détection pip** avec tentative automatique d'installation
- ✅ **Fix permissions** avec installation `--user` en priorité

### Affichage
- ✅ **Fix encodage** : Correction des caractères accentués (é, à, etc.)
- ✅ **Fix affichage PowerShell** : Ajout de `$OutputEncoding`
- ✅ **Fix messages** : Retrait des accents dans tous les messages

---

## 📦 Fichiers Modifiés

### Scripts d'Installation
- `scripts/INSTALLER.ps1` - Logique d'installation complètement refactorisée
- `INSTALLER.bat` - Mise à jour version

### Script OBS
- `obs/obs_subcount_auto.py` - Mise à jour version et date

### Configuration
- `server/package.json` - Version 2.2.1
- `config/overlay_config.json` - Ajustements couleurs

---

## 🔄 Mise à Jour depuis v2.2.0

### Utilisateurs Existants

Si vous avez déjà installé v2.2.0, vous pouvez :

1. **Mise à jour simple** :
   ```bash
   git pull origin main
   ```

2. **Pas besoin de réinstaller** les dépendances si elles fonctionnent déjà

### Nouvelles Installations

Pour une nouvelle installation :

1. **Télécharger** le projet depuis GitHub
2. **Exécuter** `INSTALLER.bat`
3. **Suivre** les instructions pas à pas affichées
4. **Copier** le chemin Python affiché dans OBS

---

## 🛠️ Détails Techniques

### Améliorations de l'Installeur

**Avant (v2.2.0)** :
```powershell
python -m pip install psutil
# Échec sur machines sans Build Tools
```

**Après (v2.2.1)** :
```powershell
# 1. Détection Python
$pythonExe = "python" ou "py -3"

# 2. Vérification pip
pip --version || ensurepip

# 3. Upgrade dépendances
pip install --upgrade pip setuptools wheel

# 4. Installation robuste
pip install --user --prefer-binary psutil
# Fallback si échec
pip install --prefer-binary psutil
```

### Détection du Chemin Python

```powershell
# Méthode 1: where.exe
$wherePython = where.exe python

# Méthode 2: Get-Command
$pythonCmd = Get-Command python

# Extraction du dossier
$pythonDir = Split-Path -Parent $pythonPath
# Exemple: C:\Users\BlouD\AppData\Local\Programs\Python\Python36
```

---

## 📚 Documentation

### Nouvelles Instructions OBS

Le processus de configuration OBS est maintenant documenté en 7 étapes claires avec des pauses entre chaque étape pour permettre à l'utilisateur de suivre le rythme.

### Messages d'Erreur Améliorés

En cas d'échec d'installation de `psutil`, l'utilisateur reçoit :
- Un message clair expliquant le problème
- Un lien vers la documentation Visual Studio Build Tools
- Un lien vers PyPI pour télécharger manuellement une wheel compatible

---

## 🔗 Liens Utiles

- **GitHub** : https://github.com/Bl0uD/AutoSubGoalTwitch
- **Documentation** : README.md
- **Issues** : https://github.com/Bl0uD/AutoSubGoalTwitch/issues
- **Build Tools** : https://learn.microsoft.com/fr-fr/cpp/build/building-on-windows
- **PyPI psutil** : https://pypi.org/project/psutil/#files

---

## 👥 Contributeurs

- **Bl0uD** - Développement et maintenance

---

## 📝 Notes de Développement

### Commits Principaux

- `883ce21` - fix(installer): robustify Python modules installation
- `8099752` - fix(installer): correct encoding issues and improve OBS setup instructions
- `fe4db00` - feat(installer): add pause between each setup step for better guidance
- `a40b811` - chore: bump version to 2.2.1

### Tests Recommandés

Avant de déployer en production, tester sur :
- ✅ Machine Windows 10 neuve (sans Python)
- ✅ Machine Windows 11 neuve (sans Python)
- ✅ Machine avec Python déjà installé
- ✅ Machine avec plusieurs versions Python

---

## 🚀 Prochaines Étapes (v2.3.0)

Fonctionnalités prévues pour la prochaine version :
- Détection automatique Visual Studio Build Tools
- Téléchargement automatique de wheels psutil
- Interface web d'installation
- Support multi-langue (EN/FR)

---

**Merci d'utiliser AutoSubGoalTwitch !** 🎉
