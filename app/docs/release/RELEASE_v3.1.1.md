# 🎉 Release v3.1.1 - Corrections Polices, Routes API & Nettoyage

**Date**: 3 décembre 2025

## 📋 Résumé

Cette version corrige les problèmes de détection des polices dans OBS, restaure toutes les routes API manquantes pour les pages web, et nettoie le code legacy.

---

## 🐛 Corrections

### Détection des Polices (OBS)
| Problème | Solution |
|----------|----------|
| Polices utilisateur non détectées | Scan du dossier `LocalAppData/Microsoft/Windows/Fonts` |
| Variantes (Bold, Italic) dans la liste | Filtrage strict par mots-clés |
| Polices système obsolètes (8514fix, etc.) | Exclusion des fichiers `.fon` et noms numériques |

### Interface OBS
| Problème | Solution |
|----------|----------|
| Saisie libre causait des erreurs | Dropdown en lecture seule (`OBS_COMBO_TYPE_LIST`) |
| Config perdue au redémarrage | Restauration auto via `apply_saved_overlay_config()` |
| Callback silencieux | Logs détaillés + try/except global |

### Routes API (Pages Web)
| Problème | Solution |
|----------|----------|
| `/api/auth-status` manquant | Route ajoutée pour dashboard.html |
| `/admin/add-follows` manquant | Toutes les routes admin restaurées |
| `/api/sync-twitch` manquant | Route ajoutée pour synchronisation |
| `/api/disconnect-twitch` manquant | Route ajoutée pour déconnexion |
| `/api/config` manquant | Route ajoutée pour config.html |
| Format `currentFollows` manquant | Compatibilité rétro ajoutée dans `/api/status` |

### Overlay HTML
| Problème | Solution |
|----------|----------|
| Goal affichait "undefined/undefined" | Format corrigé: `{current, target, message, isMaxReached}` |
| Police Sea non appliquée | Nom corrigé dans `@font-face` |

---

## 🔧 Routes API Ajoutées

### Dashboard (`/`)
- `GET /api/auth-status` - Statut d'authentification Twitch
- `GET /api/sync-twitch` - Synchronisation manuelle
- `POST /api/start-device-auth` - Démarrer authentification
- `POST /api/disconnect-twitch` - Déconnecter Twitch

### Admin (`/admin`)
- `POST /admin/add-follows` - Ajouter des follows
- `POST /admin/remove-follows` - Retirer des follows
- `POST /admin/set-follows` - Définir le nombre de follows
- `POST /admin/add-subs` - Ajouter des subs
- `POST /admin/remove-subs` - Retirer des subs
- `POST /admin/set-subs` - Définir le nombre de subs
- `POST /admin/set-follow-goal` - Définir objectif follows
- `POST /admin/set-sub-goal` - Définir objectif subs
- `GET /admin/test-twitch-api` - Tester l'API Twitch
- `GET /admin/test-eventsub` - Tester EventSub
- `GET /admin/test-polling` - Tester le polling
- `GET /admin/read-files` - Lire les fichiers de données

### Config (`/config`)
- `POST /api/config` - Sauvegarder la configuration

---

## 📊 Métriques

- **161 polices** valides détectées (vs 176 brutes)
- **20+ routes API** restaurées/ajoutées
- **5724 lignes** de code legacy supprimées

---

## 🔧 Fichiers Modifiés

```
app/server/server.js           - Routes API complètes + version 3.1.1
app/server/core/bootstrap.js   - loadAppState/saveAppState intégrés
app/web/dashboard.html         - Lecture des données corrigée
obs/obs_subcount_auto.py       - Détection polices + callbacks améliorés
obs/overlays/overlay.html      - @font-face corrigé
```

## 🗑️ Fichiers Supprimés

```
app/server/server-legacy.js    - 2670 lignes (remplacé par architecture DI)
app/server/services/           - 3054 lignes (remplacé par core/factories/)
```

**Total : 5724 lignes de code legacy supprimées**

---

## 📥 Installation

```powershell
# Télécharger et exécuter l'installeur
.\INSTALLER.bat
```

Ou mise à jour automatique via le script OBS.

---
