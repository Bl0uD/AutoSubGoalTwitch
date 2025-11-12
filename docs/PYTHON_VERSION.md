# 🐍 Pourquoi Python 3.6.8 Exactement ?

## ❓ Question Fréquente

**"J'ai déjà Python 3.10/3.11/3.12 installé, pourquoi installer Python 3.6.8 ?"**

---

## 🎯 Raison : Compatibilité OBS Studio

### 📌 OBS Studio embarque Python 3.6.x

OBS Studio (versions 28.x, 29.x, 30.x, 31.x) intègre un **interpréteur Python 3.6** en interne pour exécuter les scripts Python.

**Spécifications OBS :**
- ✅ OBS 28+ → Python **3.6.x**
- ✅ OBS 29+ → Python **3.6.x**
- ✅ OBS 30+ → Python **3.6.x**
- ✅ OBS 31+ → Python **3.6.x**

### ⚠️ Problèmes avec d'autres versions

**Si vous utilisez Python 3.10+ :**
```python
# Modules Python installés pour Python 3.10
pip install psutil requests websocket-client

# ❌ OBS ne peut PAS les utiliser !
# OBS cherche dans Python 3.6, pas Python 3.10
```

**Résultat :** Script OBS ne trouve pas les modules installés.

---

## 🔧 Installation Côte à Côte

### ✅ Vous pouvez avoir plusieurs versions Python

Windows supporte **plusieurs installations Python simultanées** :

```
C:\Program Files\
├── Python36\          ← Pour OBS Studio
│   ├── python.exe
│   └── Scripts\
│       └── pip.exe
│
└── Python310\         ← Pour vos projets perso
    ├── python.exe
    └── Scripts\
        └── pip.exe
```

### 📦 Gestion des modules

**Pour Python 3.6.8 (OBS) :**
```powershell
py -3.6 -m pip install psutil requests websocket-client
```

**Pour Python 3.10 (projets perso) :**
```powershell
py -3.10 -m pip install pandas numpy
```

---

## 🚀 Ce que fait l'installateur

### Étape 1 : Vérification stricte
```powershell
python --version
# Cherche EXACTEMENT "Python 3.6.8"
```

### Étape 2 : Installation si nécessaire
- Télécharge Python 3.6.8 depuis python.org
- Installe dans `C:\Program Files\Python36\`
- Ajoute au PATH système
- Installe pip automatiquement

### Étape 3 : Installation des modules
```powershell
# Ces modules sont installés pour Python 3.6.8
pip install psutil requests websocket-client
```

---

## 🔍 Vérifier votre installation

### Commandes de diagnostic :

**Version Python par défaut :**
```powershell
python --version
# Devrait afficher : Python 3.6.8
```

**Lister toutes les versions Python :**
```powershell
py --list
# Affiche toutes les versions installées
```

**Tester un module pour Python 3.6 :**
```powershell
py -3.6 -c "import psutil; print('OK')"
# Devrait afficher : OK
```

---

## 💡 Solutions Alternatives

### Option 1 : Utiliser py.exe (Python Launcher)

```powershell
# Installer un module pour Python 3.6
py -3.6 -m pip install psutil

# Exécuter avec Python 3.6
py -3.6 script.py

# Exécuter avec Python 3.10
py -3.10 script.py
```

### Option 2 : Environnements virtuels

```powershell
# Créer un venv Python 3.6 pour OBS
py -3.6 -m venv obs_env

# Activer
.\obs_env\Scripts\activate

# Installer les modules
pip install psutil requests websocket-client
```

---

## 📋 FAQ Technique

### Q1 : Python 3.6 est obsolète (EOL décembre 2021), c'est sûr ?

**R :** Oui, Python 3.6 n'a plus de mises à jour de sécurité. **MAIS** :
- OBS Studio l'utilise en environnement isolé
- Pas d'exposition réseau directe
- Uniquement pour scripts locaux
- OBS maintiendra Python 3.6 jusqu'à migration complète

### Q2 : Quand OBS passera à Python 3.10+ ?

**R :** Pas de date officielle. Raisons :
- **Compatibilité** : Migration casserait tous les scripts existants
- **Stabilité** : Python 3.6 est stable et fiable
- **Plugins** : Des milliers de plugins OBS dépendent de 3.6

### Q3 : Mon Python 3.10 est prioritaire dans PATH, impact ?

**R :** Aucun impact négatif si configuré correctement :
```powershell
# L'installateur configure OBS pour chercher explicitement Python36\
# OBS ne dépend pas du PATH pour trouver Python
```

### Q4 : Puis-je désinstaller Python 3.6 après ?

**R :** ❌ **NON** - Le script OBS ne fonctionnera plus.
- Garder Python 3.6.8 installé
- Environ 30 MB d'espace disque
- Pas de conflit avec autres versions

---

## 🛠️ Dépannage

### Problème : "Module 'psutil' not found" dans OBS

**Solution :**
```powershell
# Vérifier que Python 3.6 est bien celui utilisé
py -3.6 --version

# Réinstaller les modules pour Python 3.6
py -3.6 -m pip install --force-reinstall psutil requests websocket-client
```

### Problème : OBS dit "Python not found"

**Solution :**
1. Ouvrir OBS Studio
2. Aller dans **Outils → Scripts**
3. Cliquer sur l'icône Python (engrenage)
4. Sélectionner manuellement : `C:\Program Files\Python36`

### Problème : Deux versions Python causent des conflits

**Solution :**
```powershell
# Utiliser toujours py.exe avec version explicite
py -3.6 -m pip install module_name
py -3.10 -m pip install autre_module
```

---

## 📊 Comparaison Versions Python

| Version | OBS Support | Modules Compatibles | EOL | Recommandation |
|---------|-------------|---------------------|-----|----------------|
| 3.6.8 | ✅ Oui (natif) | Tous les anciens | 2021 | **OBS uniquement** |
| 3.10+ | ❌ Non | Modernes | 2026+ | Projets perso |

---

## 🔗 Ressources

- **Python 3.6.8 Download** : https://www.python.org/downloads/release/python-368/
- **OBS Studio Docs** : https://obsproject.com/docs/scripting.html
- **OBS Python API** : https://obsproject.com/docs/reference-scripting-python.html

---

## ✅ Résumé

### En une phrase :
> **Python 3.6.8 est requis car OBS Studio embarque Python 3.6, et les modules doivent être installés pour cette version spécifique.**

### Actions automatiques de l'installateur :
1. ✅ Détecte si Python 3.6.8 est installé
2. ✅ N'installe que si version stricte manquante
3. ✅ Configure PATH pour accessibilité
4. ✅ Installe pip pour Python 3.6
5. ✅ Installe modules psutil, requests, websocket-client
6. ✅ Vérifie l'installation réussie

---

<div align="center">

**💡 Besoin d'aide ? Consultez le README.md ou ouvrez une issue !**

</div>
