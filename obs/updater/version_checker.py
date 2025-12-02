#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Module de vérification des versions pour SubCount Auto
Compatible Python 3.6+

Mise à jour v2.3.0: Utilise app_state.json centralisé
"""

import os
import json

# Configuration - Chemins mis à jour pour la nouvelle structure
UPDATER_DIR = os.path.dirname(__file__)  # obs/updater/
OBS_DIR = os.path.dirname(UPDATER_DIR)   # obs/
PROJECT_ROOT = os.path.dirname(OBS_DIR)  # racine du projet

# Fichier d'état centralisé (v2.3.0+)
APP_STATE_FILE = os.path.join(PROJECT_ROOT, 'app', 'config', 'app_state.json')

# Import conditionnel de requests
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("⚠️ Module requests non disponible - vérification des mises à jour désactivée")

def load_app_state():
    """Charge l'état de l'application depuis app_state.json."""
    try:
        if os.path.exists(APP_STATE_FILE):
            with open(APP_STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Erreur lors de la lecture de app_state.json: {e}")
    
    # Valeurs par défaut si le fichier n'existe pas
    return {
        'version': {'current': '2.3.0'},
        'update': {
            'enabled': True,
            'github': {
                'apiUrl': 'https://api.github.com/repos/Bl0uD/AutoSubGoalTwitch/releases/latest',
                'timeout': 10
            }
        }
    }

def get_current_version():
    """Récupère la version actuelle de l'application depuis app_state.json."""
    try:
        app_state = load_app_state()
        return app_state.get('version', {}).get('current', '2.3.0')
    except Exception as e:
        print(f"Erreur lors de la lecture de la version actuelle: {e}")
        return '2.3.0'

def get_update_config():
    """Récupère la configuration de mise à jour depuis app_state.json."""
    try:
        app_state = load_app_state()
        update_config = app_state.get('update', {})
        
        # Convertir au format attendu par check_for_updates()
        return {
            'update_check_url': update_config.get('github', {}).get('apiUrl', 
                'https://api.github.com/repos/Bl0uD/AutoSubGoalTwitch/releases/latest'),
            'github_api': {
                'timeout': update_config.get('github', {}).get('timeout', 10),
                'headers': {'Accept': 'application/vnd.github.v3+json'}
            }
        }
    except Exception as e:
        print(f"Erreur lors de la lecture de la configuration de mise à jour: {e}")
        # Retourner une config par défaut fonctionnelle
        return {
            'update_check_url': 'https://api.github.com/repos/Bl0uD/AutoSubGoalTwitch/releases/latest',
            'github_api': {'timeout': 10, 'headers': {}}
        }

def compare_versions(version1, version2):
    """
    Compare deux versions au format X.Y.Z
    Retourne: -1 si version1 < version2, 0 si égales, 1 si version1 > version2
    """
    try:
        v1_parts = [int(x) for x in version1.split('.')]
        v2_parts = [int(x) for x in version2.split('.')]
        
        # Assurer qu'on a 3 parties (major, minor, patch)
        while len(v1_parts) < 3:
            v1_parts.append(0)
        while len(v2_parts) < 3:
            v2_parts.append(0)
        
        for i in range(3):
            if v1_parts[i] < v2_parts[i]:
                return -1
            elif v1_parts[i] > v2_parts[i]:
                return 1
        
        return 0
    except Exception as e:
        print(f"Erreur comparaison versions: {e}")
        return 0

def check_for_updates():
    """Vérifie s'il existe une mise à jour disponible sur le serveur distant."""
    if not REQUESTS_AVAILABLE:
        print("Module requests manquant - impossible de vérifier les mises à jour")
        return None
    
    current_version = get_current_version()
    update_config = get_update_config()

    if not current_version or not update_config:
        return None

    update_url = update_config.get('update_check_url')
    if not update_url:
        print("URL de mise à jour non spécifiée dans la configuration.")
        return None

    try:
        timeout = update_config.get('github_api', {}).get('timeout', 10)
        headers = update_config.get('github_api', {}).get('headers', {})
        
        response = requests.get(update_url, timeout=timeout, headers=headers)
        response.raise_for_status()
        latest_release = response.json()
        
        # GitHub retourne tag_name comme "v2.2.2" ou "2.1.0"
        latest_version = latest_release.get('tag_name', '').lstrip('v')
        
        if not latest_version:
            latest_version = latest_release.get('name', '').lstrip('v')
        
        if latest_version:
            comparison = compare_versions(latest_version, current_version)
            if comparison > 0:
                print(f"✅ Mise à jour disponible: {latest_version} (actuelle: {current_version})")
                return {
                    'available': True,
                    'current_version': current_version,
                    'latest_version': latest_version,
                    'download_url': latest_release.get('assets', [{}])[0].get('browser_download_url') if latest_release.get('assets') else None,
                    'release_notes': latest_release.get('body', ''),
                    'published_at': latest_release.get('published_at', '')
                }
            else:
                # Message visible pour version à jour (sera affiché à la fin)
                return {
                    'available': False,
                    'current_version': current_version,
                    'latest_version': latest_version
                }
        else:
            print("⚠️ Impossible de déterminer la version distante")
            return None
            
    except requests.exceptions.Timeout:
        print("⚠️ Timeout lors de la vérification des mises à jour")
        return None
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Erreur réseau lors de la vérification: {e}")
        return None
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des mises à jour: {e}")
        return None

if __name__ == "__main__":
    result = check_for_updates()
    if result:
        print(f"\nRésultat: {json.dumps(result, indent=2, ensure_ascii=False)}")