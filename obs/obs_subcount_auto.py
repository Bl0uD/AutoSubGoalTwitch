#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script OBS pour SubCount Auto v2.3.0
Démarre automatiquement le serveur SubCount Auto avec OBS
et le ferme proprement à la fermeture d'OBS
Inclut le système de vérification automatique des mises à jour

Installation dans OBS :
1. Ouvrir OBS Studio
2. Aller dans Outils > Scripts
3. Cliquer sur "+" et sélectionner ce fichier
4. Le serveur se lancera automatiquement

Auteur: Bl0uD
Date: 18/11/2025
Version: 2.3.0 (filtrage polices amélioré + nettoyage)
"""

import obspython as obs
import subprocess
import os
import sys
import time
import threading
import logging
import webbrowser
import json
import re
import winreg  # Pour lire les polices du registre Windows

# Ajouter le répertoire du script au sys.path pour les imports
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))  # Pointe vers obs/
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)  # Pointe vers la racine du projet
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

# Imports optionnels avec gestion d'erreur
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("⚠️ Module psutil non disponible - certaines fonctionnalités seront limitées")

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("⚠️ Module requests non disponible - vérification serveur désactivée")

# Import du module de mise à jour
try:
    from updater import check_for_updates, get_current_version
    UPDATE_MODULE_AVAILABLE = True
except ImportError:
    UPDATE_MODULE_AVAILABLE = False
    print("⚠️ Module updater non disponible - vérification des mises à jour désactivée")

# Import du module de configuration dynamique des overlays
try:
    # Ajouter le dossier app/scripts au sys.path pour l'import
    scripts_path = os.path.join(PROJECT_ROOT, "app", "scripts")
    if scripts_path not in sys.path:
        sys.path.insert(0, scripts_path)
    
    from overlay_config_manager import OverlayConfigManager
    overlay_config = OverlayConfigManager()
    OVERLAY_CONFIG_AVAILABLE = True
except ImportError:
    OVERLAY_CONFIG_AVAILABLE = False
    print("⚠️ Module overlay_config_manager non disponible - configuration dynamique désactivée")

# Configuration
START_SERVER_BAT = os.path.join(PROJECT_ROOT, "app", "scripts", "START_SERVER.bat")
LOG_FILE = os.path.join(PROJECT_ROOT, "app", "logs", "obs_subcount_auto.log")
SERVER_URL = "http://localhost:8082"
VERSION = "v2.3.0"

# Variables globales
server_process = None
server_thread = None
is_server_running = False
update_info = None
CACHED_FONTS = None  # Cache des polices Windows
server_health_status = False  # Statut santé du serveur
global_settings = None  # Settings OBS accessibles globalement

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler()
    ]
)

# Mode silencieux - N'affiche que les erreurs et notifications importantes
SILENT_MODE = True

# Timeouts HTTP standardisés
HTTP_TIMEOUT_SHORT = 5  # Opérations rapides (add/remove)
HTTP_TIMEOUT_MEDIUM = 10  # Sync Twitch
HTTP_TIMEOUT_LONG = 30  # Opérations lourdes

# Map des couleurs CSS pour overlays
COLOR_MAP = {
    "white": "white",
    "black": "black",
    "red": "#FF0000",
    "blue": "#00FFFF",
    "green": "#00FF00",
    "yellow": "#FFD700",
    "purple": "#8B00FF",
    "orange": "#FF4500",
    "pink": "#FF69B4",
    "cyan": "#00FFFF"
}

def log_message(message, level="info", force_display=False):
    """
    Log un message avec timestamp
    
    Args:
        message: Le message à logger
        level: Niveau du message ("info", "warning", "error")
        force_display: Force l'affichage même en mode silencieux (pour les notifications importantes)
    """
    # Logger dans le fichier UNIQUEMENT si :
    # - force_display=True (notifications importantes)
    # - level="error" ou "warning"
    # - SILENT_MODE=False
    should_log = force_display or level in ["error", "warning"] or not SILENT_MODE
    
    if should_log:
        if level == "error":
            logging.error(f"[OBS SubCount Auto] {message}")
        elif level == "warning":
            logging.warning(f"[OBS SubCount Auto] {message}")
        else:
            logging.info(f"[OBS SubCount Auto] {message}")
        
        # Le StreamHandler affiche déjà dans la console, pas besoin de print()

def get_windows_fonts():
    """
    Récupère la liste de toutes les polices installées sur Windows (polices mères uniquement, sans variantes)
    Utilise un cache pour éviter de recharger les polices à chaque appel
    
    Returns:
        list: Liste des noms de polices disponibles (sans Bold, Italic, Light, etc.)
    """
    global CACHED_FONTS
    
    # Retourner le cache si disponible
    if CACHED_FONTS is not None:
        return CACHED_FONTS
    
    fonts = set()
    
    # Mots de variantes (séparés par espace dans le nom) - EN + FR
    variant_words = [
        # Anglais
        'bold', 'italic', 'oblique', 'light', 'thin', 'medium', 'black', 'heavy',
        'semibold', 'semi bold', 'semi-bold', 'demibold', 'demi bold', 'demi-bold',
        'extrabold', 'extra bold', 'extra-bold', 'extralight', 'extra light', 'extra-light',
        'ultralight', 'ultra light', 'ultra-light', 'ultrabold', 'ultra bold', 'ultra-bold',
        'condensed', 'extended', 'narrow', 'wide', 'regular', 'normal', 'book', 'roman',
        'mt bold', 'mt italic', 'ce', 'cyr', 'greek', 'tur', 'baltic', 'hebrew', 'arabic',
        # Français
        'gras', 'italique', 'maigre', 'demi gras', 'demi-gras', 'très gras', 'très-gras',
        'extra gras', 'extra-gras', 'léger', 'étroit', 'étendu', 'condensé',
        'mt gras', 'mt italique', 'gras italique', 'poster compressed'
    ]
    
    def is_variant(font_name):
        """Vérifie si le nom correspond à une variante de police"""
        name_lower = font_name.lower().strip()
        
        # Vérifier les mots de variante (séparés)
        for word in variant_words:
            # Chercher le mot comme mot complet (séparé par espaces)
            if f' {word}' in f' {name_lower} ' or name_lower.endswith(f' {word}'):
                return True
        
        return False
    
    def extract_base_font_name(font_name):
        """Extrait le nom de base d'une police en retirant les indicateurs de variante"""
        clean = font_name
        
        # Retirer ce qui est entre parenthèses (TrueType), (OpenType), etc.
        clean = clean.split('(')[0].strip()
        
        # Retirer le & parfois présent
        clean = clean.replace('&', '').strip()
        
        # Nettoyer les patterns spéciaux Windows
        # Ex: "Courier 10,12,15" -> "Courier"
        # Retirer les suffixes numériques avec virgules (tailles de police)
        clean = re.sub(r'\s+\d+[,\d]+$', '', clean)
        # Retirer les espaces multiples (ex: "Cambria  Cambria Math" -> premier mot)
        if '  ' in clean:
            clean = clean.split('  ')[0].strip()
        
        # Retirer les suffixes de variante courants (EN + FR)
        suffixes_to_remove = [
            # Anglais
            ' Bold', ' Italic', ' Bold Italic', ' Light', ' Thin', ' Medium', ' Black',
            ' Heavy', ' SemiBold', ' Semi Bold', ' DemiBold', ' Demi Bold',
            ' ExtraBold', ' Extra Bold', ' ExtraLight', ' Extra Light',
            ' UltraLight', ' Ultra Light', ' UltraBold', ' Ultra Bold',
            ' Condensed', ' Extended', ' Narrow', ' Wide', ' Regular', ' Normal',
            ' Book', ' Roman', ' Oblique', ' MT', ' CE', ' Cyr', ' Greek', ' Tur',
            ' Poster Compressed', ' Shadow', ' Outline',
            # Français
            ' Gras', ' Italique', ' Gras Italique', ' Maigre', ' Demi Gras', ' Demi-Gras',
            ' Extra Gras', ' Extra-Gras', ' Très Gras', ' Léger', ' Étroit', ' Étendu',
            ' Condensé', ' MT Gras', ' MT Italique'
        ]
        
        # Appliquer plusieurs fois pour retirer les suffixes composés
        for _ in range(3):
            for suffix in suffixes_to_remove:
                if clean.lower().endswith(suffix.lower()):
                    clean = clean[:-len(suffix)].strip()
        
        return clean
    
    try:
        # Méthode principale: Lire le registre Windows (meilleure source)
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                                r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts")
            
            i = 0
            while True:
                try:
                    font_name, font_file, _ = winreg.EnumValue(key, i)
                    
                    # Extraire le nom de base propre
                    clean_name = extract_base_font_name(font_name)
                    
                    # Filtrer les variantes basées sur le nom
                    if clean_name and not is_variant(font_name):
                        fonts.add(clean_name)
                    
                    i += 1
                except OSError:
                    break
            
            winreg.CloseKey(key)
        except Exception as e:
            log_message(f"⚠️ Erreur lecture registre: {e}", level="warning")
        
        # Convertir en liste triée
        font_list = sorted(list(fonts), key=str.lower)
        
        # Polices prioritaires à mettre en premier
        priority_fonts = ["Arial", "Verdana", "Times New Roman", "Courier New", "Georgia", "Impact", "Comic Sans MS"]
        result = []
        
        for font in priority_fonts:
            # Chercher la police (case-insensitive)
            matching = [f for f in font_list if f.lower() == font.lower()]
            if matching:
                result.append(matching[0])
                font_list = [f for f in font_list if f.lower() != font.lower()]
        
        # Ajouter le reste
        result.extend(font_list)
        
        # Assurer que Arial est toujours présent
        if not any(f.lower() == 'arial' for f in result):
            result.insert(0, 'Arial')
        
        log_message(f"✅ {len(result)} polices mères chargées (variantes filtrées)", level="info")
        
        # Mettre en cache le résultat
        CACHED_FONTS = result if len(result) > 0 else ["Arial", "Arial", "Verdana", "Georgia", "Impact"]
        return CACHED_FONTS
        
    except Exception as e:
        log_message(f"⚠️ Erreur lecture polices: {e}", level="warning")
        # Mettre en cache les polices par défaut
        CACHED_FONTS = ["Arial", "Courier New", "Times New Roman", "Verdana", "Georgia", "Impact"]
        return CACHED_FONTS

def cleanup_log_file(log_file_path, max_size_mb=5, keep_lines=1000):
    """
    Nettoie le fichier de log s'il dépasse la taille limite
    
    Args:
        log_file_path: Chemin vers le fichier de log
        max_size_mb: Taille maximum en MB avant nettoyage (défaut: 5MB)
        keep_lines: Nombre de lignes récentes à conserver (défaut: 1000)
    """
    try:
        if os.path.exists(log_file_path):
            # Vérifier la taille du fichier
            file_size_mb = os.path.getsize(log_file_path) / (1024 * 1024)
            
            if file_size_mb > max_size_mb:
                print(f"🧹 Nettoyage du fichier de log ({file_size_mb:.2f}MB > {max_size_mb}MB)")
                
                # Lire toutes les lignes
                with open(log_file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                # Garder seulement les dernières lignes
                if len(lines) > keep_lines:
                    lines_to_keep = lines[-keep_lines:]
                    
                    # Réécrire le fichier avec seulement les lignes récentes
                    with open(log_file_path, 'w', encoding='utf-8') as f:
                        f.write(f"# Log nettoyé automatiquement - {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                        f.write(f"# Conservé les {keep_lines} dernières lignes sur {len(lines)} total\n\n")
                        f.writelines(lines_to_keep)
                    
                    print(f"✅ Log nettoyé: {len(lines)} → {len(lines_to_keep)} lignes")
                
    except Exception as e:
        print(f"❌ Erreur lors du nettoyage du log: {e}")

def check_for_updates_async():
    """Vérifie les mises à jour de manière asynchrone (en arrière-plan)"""
    global update_info
    
    if not UPDATE_MODULE_AVAILABLE:
        log_message("⚠️ Module updater non disponible - vérification ignorée", "warning")
        return
    
    if not REQUESTS_AVAILABLE:
        log_message("⚠️ Module requests non disponible - vérification ignorée", "warning")
        return
    
    try:
        # Attendre que le serveur soit démarré avant d'afficher le message
        max_wait = 10  # Attendre max 10 secondes
        waited = 0
        while not is_server_running and waited < max_wait:
            time.sleep(0.5)
            waited += 0.5
        
        # Vérification silencieuse (pas de logs intermédiaires)
        current_ver = get_current_version()
        update_info = check_for_updates()
        
        if update_info is None:
            log_message("⚠️ Impossible de vérifier les mises à jour (pas de connexion ou erreur)", "warning")
        elif update_info.get('available'):
            latest = update_info.get('latest_version')
            
            # NOTIFICATION ULTRA-VISIBLE de mise à jour disponible
            print("")  # Ligne vide
            print("=" * 70)
            print("")
            print("       🎉 🎉 🎉  MISE À JOUR DISPONIBLE  🎉 🎉 🎉")
            print("")
            print("=" * 70)
            print(f"   📦 Nouvelle version : v{latest}")
            print(f"   📋 Version actuelle : v{current_ver}")
            print("")
            print("   🔗 Téléchargement:")
            print("      https://github.com/Bl0uD/AutoSubGoalTwitch/releases")
            print("")
            print("   ⚠️  Pensez à sauvegarder votre dossier 'obs/data/' avant MAJ !")
            print("")
            print("=" * 70)
            print("")
            
            # Log simple pour le fichier de log
            log_message(f"🎉 Mise à jour v{latest} disponible ! (actuelle: v{current_ver})", "info", force_display=True)
        else:
            # MESSAGE VISIBLE pour version à jour - affiché APRÈS le démarrage du serveur
            print("")
            print("=" * 70)
            print(f"   ✅ VOUS AVEZ LA DERNIÈRE VERSION: {current_ver}")
            print("=" * 70)
            print("")
            # Pas de log supplémentaire, le message encadré suffit
        
    except Exception as e:
        print(f"ERROR: {e}")

def check_dependencies():
    """
    Vérifie que toutes les dépendances sont installées
    Retourne (bool, list): (succès, liste des erreurs)
    """
    errors = []
    warnings = []
    
    log_message("🔍 VÉRIFICATION DES DÉPENDANCES...", level="info")
    log_message("=" * 60, level="info")
    
    # 1. Vérifier Python
    log_message("1️⃣ Vérification de Python...", level="info")
    try:
        import sys
        python_version = sys.version_info
        version_str = f"{python_version.major}.{python_version.minor}.{python_version.micro}"
        log_message(f"   ✅ Python {version_str} détecté", level="info")
        
        # OBS nécessite Python 3.6.x
        if python_version.major != 3 or python_version.minor != 6:
            warnings.append(f"Python {version_str} détecté - OBS recommande Python 3.6.x")
            log_message(f"   ⚠️  Version non optimale pour OBS (recommandé: 3.6.x)", level="warning")
    except Exception as e:
        errors.append(f"Impossible de vérifier Python: {e}")
        log_message(f"   ❌ Erreur: {e}", level="error")
    
    # 2. Vérifier Node.js
    log_message("2️⃣ Vérification de Node.js...", level="info")
    try:
        result = subprocess.run(
            ['node', '--version'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            timeout=5
        )
        if result.returncode == 0:
            node_version = result.stdout.strip()
            log_message(f"   ✅ Node.js {node_version} installé", level="info")
        else:
            errors.append("Node.js introuvable ou non fonctionnel")
            log_message(f"   ❌ Node.js non détecté", level="error")
    except FileNotFoundError:
        errors.append("Node.js n'est pas installé ou pas dans PATH")
        log_message(f"   ❌ Node.js introuvable dans PATH", level="error")
    except Exception as e:
        errors.append(f"Erreur vérification Node.js: {e}")
        log_message(f"   ❌ Erreur: {e}", level="error")
    
    # 3. Vérifier npm
    log_message("3️⃣ Vérification de npm...", level="info")
    try:
        result = subprocess.run(
            ['npm', '--version'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            timeout=5
        )
        if result.returncode == 0:
            npm_version = result.stdout.strip()
            log_message(f"   ✅ npm {npm_version} installé", level="info")
        else:
            # npm non détecté mais vérifier si node_modules existe
            node_modules_path = os.path.join(PROJECT_ROOT, 'app', 'server', 'node_modules')
            if os.path.exists(node_modules_path):
                # node_modules existe, npm n'est plus nécessaire
                pass
            else:
                errors.append("npm introuvable ou non fonctionnel")
                log_message(f"   ❌ npm non détecté", level="error")
    except FileNotFoundError:
        # npm non trouvé, vérifier si node_modules existe déjà
        node_modules_path = os.path.join(PROJECT_ROOT, 'app', 'server', 'node_modules')
        if os.path.exists(node_modules_path):
            # node_modules existe, npm n'est plus nécessaire
            pass
        else:
            errors.append("npm n'est pas installé ou pas dans PATH")
            log_message(f"   ❌ npm introuvable dans PATH", level="error")
    except Exception as e:
        # Erreur npm mais vérifier si node_modules existe
        node_modules_path = os.path.join(PROJECT_ROOT, 'app', 'server', 'node_modules')
        if os.path.exists(node_modules_path):
            # node_modules existe, npm n'est plus nécessaire
            pass
        else:
            errors.append(f"Erreur vérification npm: {e}")
            log_message(f"   ❌ Erreur: {e}", level="error")
    
    # 4. Vérifier les modules Python
    log_message("4️⃣ Vérification des modules Python...", level="info")
    
    if not PSUTIL_AVAILABLE:
        warnings.append("Module Python 'psutil' manquant - gestion processus limitée")
        log_message(f"   ⚠️  psutil manquant (fonctionnalités limitées)", level="warning")
    else:
        log_message(f"   ✅ psutil disponible", level="info")
    
    if not REQUESTS_AVAILABLE:
        warnings.append("Module Python 'requests' manquant - API désactivée")
        log_message(f"   ⚠️  requests manquant (API désactivée)", level="warning")
    else:
        log_message(f"   ✅ requests disponible", level="info")
    
    try:
        import websocket
        log_message(f"   ✅ websocket-client disponible", level="info")
    except ImportError:
        errors.append("Module Python 'websocket-client' manquant")
        log_message(f"   ❌ websocket-client manquant (requis pour OBS)", level="error")
    
    # 5. Vérifier les fichiers essentiels
    log_message("5️⃣ Vérification des fichiers...", level="info")
    
    essential_files = {
        'app/server/server.js': 'Serveur Node.js principal',
        'app/server/package.json': 'Configuration npm',
        'app/scripts/START_SERVER.bat': 'Script de démarrage',
        'obs/data/twitch_config.txt': 'Configuration Twitch'
    }
    
    for file, description in essential_files.items():
        file_path = os.path.join(PROJECT_ROOT, file)
        if os.path.exists(file_path):
            log_message(f"   ✅ {os.path.basename(file)} ({description})", level="info")
        else:
            errors.append(f"Fichier manquant: {os.path.basename(file)} ({description})")
            log_message(f"   ❌ {os.path.basename(file)} MANQUANT", level="error")
    
    # 6. Vérifier node_modules
    log_message("6️⃣ Vérification des dépendances Node.js...", level="info")
    node_modules_path = os.path.join(PROJECT_ROOT, 'app', 'server', 'node_modules')
    if os.path.exists(node_modules_path):
        log_message(f"   ✅ Dossier node_modules présent", level="info")
        
        # Vérifier quelques modules critiques
        critical_modules = ['express', 'ws', 'cors']
        for module in critical_modules:
            module_path = os.path.join(node_modules_path, module)
            if os.path.exists(module_path):
                log_message(f"   ✅ {module} installé", level="info")
            else:
                warnings.append(f"Module Node.js '{module}' manquant")
                log_message(f"   ⚠️  {module} manquant (npm install requis)", level="warning")
    else:
        errors.append("Dossier node_modules manquant - exécutez 'npm install'")
        log_message(f"   ❌ node_modules MANQUANT (npm install requis)", level="error")
    
    # Résumé
    log_message("=" * 60, level="info")
    
    if errors:
        log_message(f"❌ ÉCHEC: {len(errors)} erreur(s) critique(s)", level="error")
        for i, error in enumerate(errors, 1):
            log_message(f"   {i}. {error}", level="error")
        
        if warnings:
            log_message(f"⚠️  {len(warnings)} avertissement(s):", level="warning")
            for i, warning in enumerate(warnings, 1):
                log_message(f"   {i}. {warning}", level="warning")
        
        log_message("", level="error")
        log_message("📋 SOLUTION:", level="error")
        log_message("   Relancez INSTALLER.bat en mode administrateur", level="error")
        log_message("   Ou installez manuellement:", level="error")
        log_message("   • Node.js: https://nodejs.org/", level="error")
        log_message("   • Python 3.6.8: https://www.python.org/downloads/release/python-368/", level="error")
        log_message("   • Modules Python: pip install websocket-client psutil requests", level="error")
        log_message("   • Modules Node: npm install", level="error")
        log_message("=" * 60, level="error")
        
        return False, errors
    
    elif warnings:
        # Ne pas afficher les warnings si c'est juste npm manquant mais node_modules présent
        # (le serveur fonctionne correctement)
        return True, warnings
    
    else:
        log_message("✅ TOUTES LES DÉPENDANCES SONT INSTALLÉES", level="info")
        log_message("=" * 60, level="info")
        
        return True, []

def find_subcount_processes():
    """Trouve tous les processus SubCount Auto en cours"""
    if not PSUTIL_AVAILABLE:
        return []
    
    processes = []
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                # Chercher les processus node.js qui lancent server.js
                if (proc.info['name'] and 'node' in proc.info['name'].lower() and 
                    proc.info['cmdline'] and any('server.js' in str(cmd) for cmd in proc.info['cmdline'])):
                    processes.append(proc)
                # Chercher les processus cmd.exe qui lancent START_SERVER.bat
                elif (proc.info['name'] and 'cmd' in proc.info['name'].lower() and 
                      proc.info['cmdline'] and any('START_SERVER.bat' in str(cmd) for cmd in proc.info['cmdline'])):
                    processes.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception as e:
        log_message(f"Erreur lors de la recherche des processus: {e}", level="error")
    
    return processes

def kill_existing_servers():
    """Tue tous les serveurs SubCount Auto existants"""
    processes = find_subcount_processes()
    
    if processes:
        log_message(f"🔄 Arrêt de {len(processes)} processus SubCount Auto existants...", level="info")
        for proc in processes:
            try:
                log_message(f"   ⏹️ Arrêt du processus {proc.pid} ({proc.info['name']})", level="info")
                proc.terminate()
                # Attendre 3 secondes pour un arrêt propre
                proc.wait(timeout=3)
            except psutil.TimeoutExpired:
                log_message(f"   💥 Force l'arrêt du processus {proc.pid}", level="warning")
                proc.kill()
            except Exception as e:
                log_message(f"   ❌ Erreur arrêt processus {proc.pid}: {e}", level="error")
        
        # Vérifier que tout est bien arrêté
        time.sleep(1)
        remaining = find_subcount_processes()
        if remaining:
            log_message(f"⚠️ {len(remaining)} processus toujours actifs", level="warning")
        else:
            log_message("✅ Tous les processus SubCount Auto arrêtés", level="info")

def start_server():
    """Démarre le serveur SubCount Auto"""
    global server_process, is_server_running
    
    try:
        log_message("", level="info")
        log_message("=" * 60, level="info")
        log_message("🚀 DÉMARRAGE DU SERVEUR SUBCOUNT AUTO", level="info")
        log_message("=" * 60, level="info")
        log_message("", level="info")
        
        # Vérifier les dépendances AVANT de démarrer
        deps_ok, deps_issues = check_dependencies()
        
        if not deps_ok:
            log_message("", level="error")
            log_message("🛑 SERVEUR NON DÉMARRÉ - Dépendances manquantes", level="error")
            log_message("   Consultez les erreurs ci-dessus et lancez INSTALLER.bat", level="error")
            log_message("", level="error")
            return False
        
        # Si des warnings mais pas d'erreurs, continuer silencieusement
        
        # Vérifier que le fichier START_SERVER.bat existe
        if not os.path.exists(START_SERVER_BAT):
            log_message(f"❌ Fichier START_SERVER.bat introuvable: {START_SERVER_BAT}", level="error")
            return False
        
        log_message("🔄 Arrêt des serveurs existants...", level="info")
        
        # Tuer les serveurs existants
        kill_existing_servers()
        
        # Démarrer le nouveau serveur
        server_process = subprocess.Popen(
            [START_SERVER_BAT],
            cwd=SCRIPT_DIR,
            shell=True,
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
        
        is_server_running = True
        log_message(f"✅ Serveur SubCount Auto démarré (PID: {server_process.pid})", level="info", force_display=True)
        
        # Attendre un peu pour vérifier que le serveur démarre bien
        time.sleep(3)
        
        if server_process.poll() is None:
            log_message("✅ Serveur SubCount Auto en cours d'exécution", level="info", force_display=True)
            return True
        else:
            log_message("❌ Le serveur SubCount Auto s'est arrêté immédiatement", level="error")
            is_server_running = False
            return False
            
    except Exception as e:
        log_message(f"❌ Erreur démarrage serveur: {e}", level="error")
        is_server_running = False
        return False

def stop_server():
    """Arrête le serveur SubCount Auto"""
    global server_process, is_server_running
    
    log_message("🔄 Arrêt du serveur SubCount Auto...", level="info")
    
    # Arrêter le processus principal si il existe
    if server_process:
        try:
            log_message(f"   ⏹️ Arrêt du processus principal {server_process.pid}", level="info")
            server_process.terminate()
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            log_message("   💥 Force l'arrêt du processus principal", level="warning")
            server_process.kill()
        except Exception as e:
            log_message(f"   ❌ Erreur arrêt processus principal: {e}", level="error")
    
    # Arrêter tous les processus SubCount Auto
    kill_existing_servers()
    
    server_process = None
    is_server_running = False
    log_message("✅ Serveur SubCount Auto arrêté", level="info")

def monitor_server():
    """Surveille le serveur en arrière-plan"""
    global is_server_running
    
    while is_server_running:
        try:
            if server_process and server_process.poll() is not None:
                log_message("⚠️ Le serveur SubCount Auto s'est arrêté de manière inattendue", level="warning")
                is_server_running = False
                break
            
            time.sleep(10)  # Vérifier toutes les 10 secondes
            
        except Exception as e:
            log_message(f"❌ Erreur monitoring serveur: {e}", level="error")
            break

# ============================================================================
# PHASE 1 - FONCTIONS ESSENTIELLES
# ============================================================================

def add_follow():
    """Ajoute 1 follow"""
    if not REQUESTS_AVAILABLE:
        log_message("❌ Module requests non disponible", level="error")
        return False
    
    response = api_call_with_retry(
        f"{SERVER_URL}/admin/add-follows",
        method='POST',
        json={'amount': 1},
        headers={'Content-Type': 'application/json'}
    )
    
    if response and response.status_code == 200:
        log_message("✅ +1 Follow ajouté", level="info")
        return True
    
    return False

def remove_follow():
    """Retire 1 follow"""
    if not REQUESTS_AVAILABLE:
        log_message("❌ Module requests non disponible", level="error")
        return False
    
    response = api_call_with_retry(
        f"{SERVER_URL}/admin/remove-follows",
        method='POST',
        json={'amount': 1},
        headers={'Content-Type': 'application/json'}
    )
    
    if response and response.status_code == 200:
        log_message("✅ -1 Follow retiré", level="info")
        return True
    
    return False

def add_sub():
    """Ajoute 1 sub (tier 1)"""
    if not REQUESTS_AVAILABLE:
        log_message("❌ Module requests non disponible", level="error")
        return False
    
    response = api_call_with_retry(
        f"{SERVER_URL}/admin/add-subs",
        method='POST',
        json={'amount': 1, 'tier': '1000'},
        headers={'Content-Type': 'application/json'}
    )
    
    if response and response.status_code == 200:
        log_message("✅ +1 Sub ajouté (Tier 1)", level="info")
        return True
    
    return False

def remove_sub():
    """Retire 1 sub"""
    if not REQUESTS_AVAILABLE:
        log_message("❌ Module requests non disponible", level="error")
        return False
    
    response = api_call_with_retry(
        f"{SERVER_URL}/admin/remove-subs",
        method='POST',
        json={'amount': 1},
        headers={'Content-Type': 'application/json'}
    )
    
    if response and response.status_code == 200:
        log_message("✅ -1 Sub retiré", level="info")
        return True
    
    return False

def sync_with_twitch():
    """Synchronise avec Twitch API"""
    if not REQUESTS_AVAILABLE:
        log_message("❌ Module requests non disponible", level="error")
        return False
    try:
        log_message("🔄 Synchronisation avec Twitch API...", level="info")
        response = requests.get(f"{SERVER_URL}/admin/sync-twitch", timeout=HTTP_TIMEOUT_MEDIUM)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                log_message(f"✅ Sync réussie - Follows: {data['twitchFollows']}, Subs: {data['twitchSubs']}", level="info")
                if data.get('updated'):
                    log_message(f"   Diff Follows: {data['followsDiff']:+d}, Diff Subs: {data['subsDiff']:+d}", level="info")
                else:
                    log_message("   Déjà à jour", level="info")
                return True
            else:
                log_message(f"❌ Erreur sync: {data.get('error', 'Erreur inconnue')}", level="error")
        else:
            log_message(f"❌ Erreur HTTP: {response.status_code}", level="error")
    except Exception as e:
        log_message(f"❌ Erreur sync Twitch: {e}", level="error")
    return False

def open_dashboard():
    """Ouvre le dashboard dans le navigateur"""
    try:
        webbrowser.open(f"{SERVER_URL}/")
        log_message("🏠 Dashboard ouvert dans le navigateur", level="info")
        return True
    except Exception as e:
        log_message(f"❌ Erreur ouverture dashboard: {e}", level="error")
    return False

def open_config():
    """Ouvre la page de configuration"""
    try:
        webbrowser.open(f"{SERVER_URL}/config")
        log_message("⚙️ Configuration ouverte dans le navigateur", level="info")
        return True
    except Exception as e:
        log_message(f"❌ Erreur ouverture config: {e}", level="error")
    return False

def open_admin():
    """Ouvre le panel admin"""
    try:
        webbrowser.open(f"{SERVER_URL}/admin")
        log_message("🔧 Panel Admin ouvert dans le navigateur", level="info")
        return True
    except Exception as e:
        log_message(f"❌ Erreur ouverture admin: {e}", level="error")
    return False

def connect_twitch():
    """Ouvre la page de configuration pour se connecter à Twitch"""
    try:
        webbrowser.open(f"{SERVER_URL}")
        log_message("🔐 Page Admin Twitch ouverte", level="info")
        log_message("   Suivez les instructions pour vous connecter", level="info")
        return True
    except Exception as e:
        log_message(f"❌ Erreur ouverture admin Twitch: {e}", level="error")
    return False

def disconnect_twitch():
    """Déconnecte le compte Twitch actuel"""
    if not REQUESTS_AVAILABLE:
        log_message("❌ Module requests non disponible", level="error")
        return False
    try:
        response = requests.post(
            f"{SERVER_URL}/api/disconnect-twitch",
            headers={'Content-Type': 'application/json'},
            timeout=HTTP_TIMEOUT_SHORT
        )
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                log_message(f"✅ Déconnecté de Twitch: {data.get('previousUser', 'Utilisateur inconnu')}", level="info")
                log_message("   Vous pouvez maintenant connecter un autre compte", level="info")
                return True
            else:
                log_message(f"❌ Erreur déconnexion: {data.get('error', 'Erreur inconnue')}", level="error")
        else:
            log_message(f"❌ Erreur HTTP: {response.status_code}", level="error")
    except Exception as e:
        log_message(f"❌ Erreur déconnexion Twitch: {e}", level="error")
    return False

def get_twitch_status():
    """Récupère le statut de connexion Twitch"""
    if not REQUESTS_AVAILABLE:
        return None
    try:
        response = requests.get(f"{SERVER_URL}/api/auth-status", timeout=HTTP_TIMEOUT_SHORT)
        if response.status_code == 200:
            data = response.json()
            return data
    except Exception as e:
        log_message(f"❌ Erreur récupération status Twitch: {e}", level="error")
    return None

def is_server_healthy():
    """Vérifie si le serveur répond correctement"""
    global server_health_status
    
    if not REQUESTS_AVAILABLE:
        return False
    
    try:
        response = requests.get(f"{SERVER_URL}/", timeout=2)
        is_healthy = response.status_code == 200
        server_health_status = is_healthy
        return is_healthy
    except Exception:
        server_health_status = False
        return False

def api_call_with_retry(url, method='GET', retries=3, timeout=HTTP_TIMEOUT_SHORT, **kwargs):
    """Appel API avec retry automatique sur échec
    
    Args:
        url: URL de l'API
        method: Méthode HTTP ('GET' ou 'POST')
        retries: Nombre de tentatives (défaut: 3)
        timeout: Timeout en secondes
        **kwargs: Arguments supplémentaires pour requests
    
    Returns:
        Response object ou None si échec après toutes les tentatives
    """
    if not REQUESTS_AVAILABLE:
        log_message("❌ Module requests non disponible", level="error")
        return None
    
    for attempt in range(retries):
        try:
            if method.upper() == 'GET':
                response = requests.get(url, timeout=timeout, **kwargs)
            elif method.upper() == 'POST':
                response = requests.post(url, timeout=timeout, **kwargs)
            else:
                log_message(f"❌ Méthode HTTP non supportée: {method}", level="error")
                return None
            
            # Retourner si succès
            if response.status_code < 500:
                return response
            
            # Erreur serveur 5xx, retry
            if attempt < retries - 1:
                log_message(f"⚠️ Erreur serveur {response.status_code}, tentative {attempt + 2}/{retries}...", level="warning")
                time.sleep(1)  # Attendre 1s avant retry
            
        except requests.exceptions.Timeout:
            if attempt < retries - 1:
                log_message(f"⚠️ Timeout, tentative {attempt + 2}/{retries}...", level="warning")
                time.sleep(1)
            else:
                log_message(f"❌ Timeout après {retries} tentatives", level="error")
        except Exception as e:
            if attempt < retries - 1:
                log_message(f"⚠️ Erreur {e}, tentative {attempt + 2}/{retries}...", level="warning")
                time.sleep(1)
            else:
                log_message(f"❌ Échec après {retries} tentatives: {e}", level="error")
    
    return None

# ========================================================================
# GESTION CONFIGURATION DYNAMIQUE DES OVERLAYS
# ========================================================================

def is_valid_css_color(color):
    """Valide un code couleur CSS
    
    Args:
        color: String contenant le code couleur à valider
    
    Returns:
        bool: True si la couleur est valide, False sinon
    """
    import re
    
    if not color or not isinstance(color, str):
        return False
    
    color = color.strip()
    
    # Patterns supportés
    patterns = [
        r'^#[0-9A-Fa-f]{3}$',  # Hex court (#RGB)
        r'^#[0-9A-Fa-f]{6}$',  # Hex normal (#RRGGBB)
        r'^#[0-9A-Fa-f]{8}$',  # Hex avec alpha (#RRGGBBAA)
        r'^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$',  # rgb(r,g,b)
        r'^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$'  # rgba(r,g,b,a)
    ]
    
    # Noms de couleurs CSS standard
    css_colors = [
        'white', 'black', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
        'orange', 'purple', 'pink', 'brown', 'gray', 'grey', 'transparent'
    ]
    
    # Vérifier si c'est un nom de couleur
    if color.lower() in css_colors:
        return True
    
    # Vérifier si ça match un des patterns
    for pattern in patterns:
        if re.match(pattern, color):
            # Pour RGB/RGBA, valider que les valeurs sont dans [0-255]
            if 'rgb' in color:
                numbers = re.findall(r'\d{1,3}', color)
                if any(int(n) > 255 for n in numbers[:3]):  # Vérifier R,G,B (pas alpha)
                    return False
            return True
    
    return False

def apply_overlay_font(props, prop, settings):
    """Applique la police sélectionnée aux overlays"""
    global global_settings
    global_settings = settings  # Mettre à jour les settings globaux
    
    if not OVERLAY_CONFIG_AVAILABLE:
        log_message("❌ Module overlay_config_manager non disponible", level="error")
        return False
    
    font_family = obs.obs_data_get_string(settings, "overlay_font")
    font_size = obs.obs_data_get_int(settings, "overlay_font_size")
    
    if font_family:
        # Vérifier que overlay_config existe avant de l'utiliser
        try:
            overlay_config.update_font(family=font_family, size=f"{font_size}px")
            log_message(f"✅ Police mise à jour: {font_family} @ {font_size}px", level="info")
        except NameError:
            log_message("❌ overlay_config non initialisé", level="error")
            return False
    
    return True

def apply_overlay_colors(props, prop, settings):
    """Applique la couleur prédéfinie aux overlays (callback du dropdown)"""
    global global_settings
    global_settings = settings  # Mettre à jour les settings globaux
    
    if not OVERLAY_CONFIG_AVAILABLE:
        log_message("❌ Module overlay_config_manager non disponible", level="error")
        return False
    
    text_color = obs.obs_data_get_string(settings, "overlay_text_color")
    
    if text_color:
        # Utiliser la constante globale COLOR_MAP
        final_color = COLOR_MAP.get(text_color, text_color)
        
        # Vérifier que overlay_config existe avant de l'utiliser
        try:
            # Vider le cache pour permettre de réappliquer la même couleur
            overlay_config.clear_cache()
            overlay_config.update_colors(text=final_color)
            log_message(f"✅ Couleur prédéfinie appliquée: {text_color}", level="info")
        except NameError:
            log_message("❌ overlay_config non initialisé", level="error")
            return False
    
    return True

def apply_custom_color(props, prop):
    """Applique le code couleur personnalisé aux overlays (callback du bouton)"""
    if not OVERLAY_CONFIG_AVAILABLE:
        log_message("❌ Module overlay_config_manager non disponible", level="error")
        return False
    
    # Récupérer la propriété directement depuis props
    custom_color_prop = obs.obs_properties_get(props, "overlay_custom_color")
    if not custom_color_prop:
        log_message("❌ Impossible de récupérer la propriété couleur", level="error")
        return False
    
    # Fallback: essayer depuis global_settings
    if global_settings is None:
        log_message("❌ Settings non disponibles", level="error")
        return False
    
    # Lire la valeur actuelle depuis les settings
    custom_color = obs.obs_data_get_string(global_settings, "overlay_custom_color")
    
    # Si vide, essayer de lire la valeur par défaut
    if not custom_color:
        custom_color = obs.obs_data_get_default_string(global_settings, "overlay_custom_color")
    
    if not custom_color or not custom_color.strip():
        log_message("⚠️ Veuillez entrer un code couleur dans le champ", level="warning")
        return False
    
    custom_color = custom_color.strip()
    
    # Valider le format CSS avant d'appliquer
    if not is_valid_css_color(custom_color):
        log_message(f"❌ Code couleur CSS invalide: {custom_color}", level="error")
        log_message("   Formats acceptés: #RGB, #RRGGBB, rgb(r,g,b), rgba(r,g,b,a), ou nom de couleur", level="info")
        return False
    
    # Vérifier que overlay_config existe avant de l'utiliser
    try:
        # Vider le cache pour permettre de réappliquer la même couleur
        overlay_config.clear_cache()
        overlay_config.update_colors(text=custom_color)
        log_message(f"✅ Code couleur CSS appliqué: {custom_color}", level="info")
        return True
    except NameError:
        log_message("❌ overlay_config non initialisé", level="error")
        return False
    except Exception as e:
        log_message(f"❌ Erreur application couleur: {e}", level="error")
        return False

def reset_overlay_config(props, prop):
    """Réinitialise la configuration des overlays aux valeurs par défaut"""
    if not OVERLAY_CONFIG_AVAILABLE:
        log_message("❌ Module overlay_config_manager non disponible", level="error")
        return False
    
    # Vérifier que overlay_config existe avant de l'utiliser
    try:
        overlay_config.update_full_config(
            font={'family': 'Arial', 'size': '64px', 'weight': 'normal'},
            colors={'text': 'white', 'shadow': 'rgba(0,0,0,0.5)', 'stroke': 'black'},
            animation={'duration': '1s', 'easing': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'},
            layout={'paddingLeft': '20px', 'gap': '0'}
        )
        log_message("✅ Configuration overlays réinitialisée aux valeurs par défaut", level="info")
    except NameError:
        log_message("❌ overlay_config non initialisé", level="error")
        return False
    return True

# ============================================================================
# FIN PHASE 1
# ============================================================================

# Fonctions OBS
def script_description():
    """Description du script pour OBS"""
    return """<h2>🎮 SubCount Auto v2.3.0</h2>"""

def script_load(settings):
    """Appelé quand le script est chargé dans OBS"""
    # Nettoyer les logs avant de commencer
    cleanup_log_file(LOG_FILE, max_size_mb=5, keep_lines=1000)
    
    # Nettoyer aussi le log du serveur Node.js
    subcount_log_file = os.path.join(PROJECT_ROOT, 'app', 'logs', 'subcount_logs.txt')
    cleanup_log_file(subcount_log_file, max_size_mb=2, keep_lines=500)
    
    log_message("🎬 Script OBS SubCount Auto v2.3.0 avec Auto-Update chargé", level="info")
    log_message(f"📂 Répertoire: {SCRIPT_DIR}", level="info")
    log_message(f"🚀 Fichier serveur: {START_SERVER_BAT}", level="info")
    log_message(f"📦 Version: {VERSION}", level="info")
    
    # Vérifier les mises à jour en arrière-plan
    update_thread = threading.Thread(target=check_for_updates_async, daemon=True)
    update_thread.start()
    
    # Démarrer le serveur automatiquement
    global server_thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Démarrer la surveillance
    monitor_thread = threading.Thread(target=monitor_server, daemon=True)
    monitor_thread.start()

def script_unload():
    """Appelé quand le script est déchargé ou OBS se ferme"""
    global is_server_running
    
    log_message("🎬 Script OBS SubCount Auto déchargé", level="info")
    is_server_running = False
    
    # Arrêter le serveur
    stop_server()
    
    log_message("👋 Arrêt complet du script OBS SubCount Auto", level="info")

def script_tick(seconds):
    """Appelé à chaque frame (pour mise à jour de l'interface)"""
    # Vérifier la santé du serveur toutes les 5 secondes
    if int(seconds) % 5 == 0 and seconds > 0:
        # Vérification asynchrone pour ne pas bloquer OBS
        if is_server_running:
            threading.Thread(target=is_server_healthy, daemon=True).start()

def script_update(settings):
    """Appelé quand les paramètres changent"""
    global global_settings
    global_settings = settings

def script_save(settings):
    """Appelé lors de la sauvegarde - stocke les settings"""
    global global_settings
    global_settings = settings

def script_defaults(settings):
    """Définit les valeurs par défaut"""
    if OVERLAY_CONFIG_AVAILABLE:
        obs.obs_data_set_default_string(settings, "overlay_font", "Arial")
        obs.obs_data_set_default_int(settings, "overlay_font_size", 64)
        obs.obs_data_set_default_string(settings, "overlay_text_color", "white")
        obs.obs_data_set_default_string(settings, "overlay_custom_color", "#FFFFFF")

def script_properties():
    """Propriétés configurables du script"""
    props = obs.obs_properties_create()

	# ========== SECTION TWITCH (NOUVEAU) ==========
    obs.obs_properties_add_text(
        props, "section_twitch", 
        "────── 🟣 CONFIGURATION TWITCH 🟣 ───────", 
        obs.OBS_TEXT_INFO
    )
    
    obs.obs_properties_add_button(
        props, "connect_twitch", "🔗\tSe connecter à Twitch", 
        lambda props, prop: connect_twitch()
    )
    
    obs.obs_properties_add_button(
        props, "disconnect_twitch", "🔌\tSe déconnecter de Twitch", 
        lambda props, prop: disconnect_twitch()
    )

    # ========== SECTION SERVEUR ==========
    obs.obs_properties_add_text(
        props, "section_server", 
        "\n───────── 📡 GESTION SERVEUR 📡 ─────────", 
        obs.OBS_TEXT_INFO
    )
    
    # Bouton Sync Twitch
    obs.obs_properties_add_button(
        props, "sync_twitch", "🔄\tSynchro avec Twitch", 
        lambda props, prop: sync_with_twitch()
    )
    
    obs.obs_properties_add_button(
        props, "restart_server", "⚙️\tRedémarrer le Serveur", 
        lambda props, prop: restart_server()
    )
    
    obs.obs_properties_add_button(
        props, "stop_server", "🔴\tArrêter le Serveur", 
        lambda props, prop: stop_server()
    )

    # ========== CONFIGURATION OVERLAYS ==========
    if OVERLAY_CONFIG_AVAILABLE:
        obs.obs_properties_add_text(
            props, "spacer3", 
            " ", 
            obs.OBS_TEXT_INFO
        )
        
        obs.obs_properties_add_text(
            props, "separator_overlays", 
            "──────🎨 CONFIGURATION OVERLAYS 🎨──────", 
            obs.OBS_TEXT_INFO
        )
        
        # Dropdown Police
        font_list = obs.obs_properties_add_list(
            props,
            "overlay_font",
            "  📝  Police",
            obs.OBS_COMBO_TYPE_EDITABLE,
            obs.OBS_COMBO_FORMAT_STRING
        )
        
        # Récupérer toutes les polices installées
        all_fonts = get_windows_fonts()
        for font in all_fonts:
            obs.obs_property_list_add_string(font_list, font, font)
        
        obs.obs_property_set_modified_callback(font_list, apply_overlay_font)
        
        # Slider Taille
        obs.obs_properties_add_int_slider(
            props,
            "overlay_font_size",
            "  📏  Taille",
            24, 128, 4
        )
        obs.obs_property_set_modified_callback(
            obs.obs_properties_get(props, "overlay_font_size"),
            apply_overlay_font
        )
        
        # Dropdown Couleur prédéfinie
        color_list = obs.obs_properties_add_list(
            props,
            "overlay_text_color",
            "  🎨  Couleur prédéfinie",
            obs.OBS_COMBO_TYPE_LIST,
            obs.OBS_COMBO_FORMAT_STRING
        )
        colors = [
            ("Blanc", "white"),
            ("Noir", "black"),
            ("Rouge", "red"),
            ("Bleu", "blue"),
            ("Vert", "green"),
            ("Jaune", "yellow"),
            ("Violet", "purple"),
            ("Orange", "orange"),
            ("Rose", "pink"),
            ("Cyan", "cyan")
        ]
        for name, value in colors:
            obs.obs_property_list_add_string(color_list, name, value)
        
        obs.obs_property_set_modified_callback(color_list, apply_overlay_colors)
        
        # Séparateur OU
        obs.obs_properties_add_text(
            props, "color_separator", 
            "───────────────── OU ────────────────", 
            obs.OBS_TEXT_INFO
        )
        
        # Champ texte pour couleur personnalisée
        custom_color = obs.obs_properties_add_text(
            props,
            "overlay_custom_color",
            "  🎨  Code couleur CSS",
            obs.OBS_TEXT_DEFAULT
        )
        obs.obs_property_set_long_description(
            custom_color,
            "Ex: #FF4578, rgb(255,87,51), rgba(255,87,51,0.8)\nTapez votre couleur puis cliquez sur 'Appliquer'"
        )
        
        # PAS de callback sur le champ pour éviter la réinitialisation du curseur
        
        # Bouton pour valider la couleur personnalisée
        obs.obs_properties_add_button(
            props, "apply_custom_color_btn", "  ✅  Appliquer la couleur", 
            apply_custom_color
        )
        
        # Bouton Reset
        obs.obs_properties_add_button(
            props, "reset_overlay", "  🔄  Réinitialiser aux valeurs par défaut", 
            reset_overlay_config
        )

    # ========== CONTRÔLES RAPIDES ==========
    obs.obs_properties_add_text(
        props, "section_controls", 
        "\n────────🕹️ CONTRÔLES RAPIDES 🕹️─────────", 
        obs.OBS_TEXT_INFO
    )

    # ========== FOLLOWS ==========
    obs.obs_properties_add_text(
        props, "section_follows", 
        "👥  FOLLOWS", 
        obs.OBS_TEXT_INFO
    )
    
    obs.obs_properties_add_button(
        props, "add_follow", "  ➕  Ajouter 1 Follow", 
        lambda props, prop: add_follow()
    )
    
    obs.obs_properties_add_button(
        props, "remove_follow", "  ➖  Retirer 1 Follow", 
        lambda props, prop: remove_follow()
    )
    
    # ========== SUBS ==========
    obs.obs_properties_add_text(
        props, "section_subs", 
        "⭐  SUBS", 
        obs.OBS_TEXT_INFO
    )
    
    obs.obs_properties_add_button(
        props, "add_sub", "  ➕  Ajouter 1 Sub (Tier 1)", 
        lambda props, prop: add_sub()
    )
    
    obs.obs_properties_add_button(
        props, "remove_sub", "  ➖  Retirer 1 Sub", 
        lambda props, prop: remove_sub()
    )
    
    # ========== INTERFACES WEB ==========
    obs.obs_properties_add_text(
        props, "separator_web", 
        "\n─────────🌐 INTERFACES WEB 🌐──────────", 
        obs.OBS_TEXT_INFO
    )

    obs.obs_properties_add_button(
        props, "open_dashboard", "  🏠  Dashboard", 
        lambda props, prop: open_dashboard()
    )
    
    obs.obs_properties_add_button(
        props, "open_config", "  ⚙️  Configuration", 
        lambda props, prop: open_config()
    )
    
    obs.obs_properties_add_button(
        props, "open_admin", "  🔧  Panel Admin", 
        lambda props, prop: open_admin()
    )
    
    return props

def restart_server():
    """Redémarre le serveur manuellement"""
    log_message("🔄 Redémarrage manuel du serveur...", level="info")
    stop_server()
    time.sleep(2)
    
    global server_thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    return True

# Point d'entrée principal
if __name__ == "__main__":
    # Test en dehors d'OBS
    print("🧪 Test du script SubCount Auto en dehors d'OBS")
    print(f"📂 Répertoire: {SCRIPT_DIR}")
    print(f"🚀 Fichier serveur: {START_SERVER_BAT}")
    
    if os.path.exists(START_SERVER_BAT):
        print("✅ START_SERVER.bat trouvé")
        
        # Test de démarrage
        if start_server():
            print("✅ Serveur démarré avec succès")
            time.sleep(5)
            stop_server()
            print("✅ Serveur arrêté avec succès")
        else:
            print("❌ Échec du démarrage du serveur")
    else:
        print("❌ START_SERVER.bat introuvable")
