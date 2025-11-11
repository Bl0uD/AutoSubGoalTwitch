#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Module de vérification des versions pour SubCount Auto
Compatible Python 3.6+
"""

import os
import json

# Configuration - Chemins mis à jour pour la nouvelle structure
UPDATER_DIR = os.path.dirname(__file__)  # obs/updater/
OBS_DIR = os.path.dirname(UPDATER_DIR)   # obs/
PROJECT_ROOT = os.path.dirname(OBS_DIR)  # racine du projet

VERSION_FILE = os.path.join(PROJECT_ROOT, 'config', 'version.json')
UPDATE_CONFIG_FILE = os.path.join(PROJECT_ROOT, 'config', 'update_config.json')

# Import conditionnel de requests
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("⚠️ Module requests non disponible - vérification des mises à jour désactivée")

def get_current_version():
    """Récupère la version actuelle de l'application à partir du fichier version.json."""
    try:
        with open(VERSION_FILE, 'r', encoding='utf-8') as f:
            version_info = json.load(f)
            return version_info.get('version', '0.0.0')
    except Exception as e:
        print(f"Erreur lors de la lecture de la version actuelle: {e}")
        return '0.0.0'

def get_update_config():
    """Récupère la configuration de mise à jour à partir du fichier update_config.json."""
    try:
        with open(UPDATE_CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Erreur lors de la lecture de la configuration de mise à jour: {e}")
        return None

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
        
        # GitHub retourne tag_name comme "v2.1.0" ou "2.1.0"
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
                print(f"✅ Vous avez la dernière version: {current_version}")
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