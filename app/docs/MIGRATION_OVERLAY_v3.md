# 🔄 Migration vers l'Overlay Unifié v3.0.0

## Vue d'ensemble

À partir de la v3.0.0, les 4 fichiers d'overlay séparés sont remplacés par un seul fichier `overlay.html` configurable via paramètres URL.

## Ancien système (v2.x)

| Fichier | Description |
|---------|-------------|
| `followgoal_left.html` | Compteur follows, aligné à gauche |
| `followgoal_right.html` | Compteur follows, aligné à droite |
| `subgoal_left.html` | Compteur subs, aligné à gauche |
| `subgoal_right.html` | Compteur subs, aligné à droite |

## Nouveau système (v3.0.0+)

Un seul fichier : `overlay.html` avec paramètres URL.

### Paramètres URL

| Paramètre | Valeurs | Défaut | Description |
|-----------|---------|--------|-------------|
| `type` | `follow`, `sub` | `follow` | Type de compteur |
| `align` | `left`, `right` | `left` | Alignement horizontal |

### URLs équivalentes

| Ancien fichier | Nouvelle URL |
|----------------|--------------|
| `followgoal_left.html` | `overlay.html?type=follow&align=left` |
| `followgoal_right.html` | `overlay.html?type=follow&align=right` |
| `subgoal_left.html` | `overlay.html?type=sub&align=left` |
| `subgoal_right.html` | `overlay.html?type=sub&align=right` |

## Configuration dans OBS

### Browser Source
1. Supprimer l'ancienne source de navigateur
2. Créer une nouvelle source de navigateur
3. URL : `http://localhost:8082/obs/overlays/overlay.html?type=follow&align=left`
4. Largeur/Hauteur : selon vos préférences (ex: 800x100)

### Exemple URLs complètes

```
# Follows à gauche
http://localhost:8082/obs/overlays/overlay.html?type=follow&align=left

# Follows à droite
http://localhost:8082/obs/overlays/overlay.html?type=follow&align=right

# Subs à gauche
http://localhost:8082/obs/overlays/overlay.html?type=sub&align=left

# Subs à droite
http://localhost:8082/obs/overlays/overlay.html?type=sub&align=right
```

## Avantages

1. **Maintenance simplifiée** : Un seul fichier au lieu de 4
2. **Moins de code dupliqué** : ~2400 lignes de code en moins
3. **Configuration dynamique** : Changement de type/alignement sans modifier le fichier
4. **Évolutivité** : Ajout facile de nouveaux paramètres (ex: `theme=dark`)

## Compatibilité arrière

Les anciens fichiers (`followgoal_left.html`, etc.) restent disponibles mais sont marqués comme **deprecated**. Ils seront supprimés dans une version future.

## FAQ

### Q: Puis-je continuer à utiliser les anciens fichiers ?
R: Oui, mais ils ne recevront plus de mises à jour. Migrez vers `overlay.html` dès que possible.

### Q: Comment tester le nouvel overlay ?
R: Ouvrez simplement dans un navigateur : `http://localhost:8082/obs/overlays/overlay.html?type=follow&align=left`

### Q: L'animation fonctionne-t-elle de la même façon ?
R: Oui, toutes les animations sont identiques. Seule la structure du code a changé.
