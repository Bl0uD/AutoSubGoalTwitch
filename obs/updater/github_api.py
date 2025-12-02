import requests
import json
import os

GITHUB_API_URL = "https://api.github.com/repos/Bl0uD/AutoSubGoalTwitch/releases/latest"

# Chemins pour app_state.json (v2.3.0+)
UPDATER_DIR = os.path.dirname(__file__)  # obs/updater/
OBS_DIR = os.path.dirname(UPDATER_DIR)   # obs/
PROJECT_ROOT = os.path.dirname(OBS_DIR)  # racine
APP_STATE_FILE = os.path.join(PROJECT_ROOT, 'app', 'config', 'app_state.json')

def get_latest_release():
    """Fetch the latest release information from GitHub."""
    try:
        response = requests.get(GITHUB_API_URL)
        response.raise_for_status()  # Raise an error for bad responses
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching latest release: {e}")
        return None

def check_for_updates(current_version):
    """Check if a new version is available."""
    latest_release = get_latest_release()
    if latest_release:
        latest_version = latest_release['tag_name']
        if latest_version != current_version:
            return latest_version, latest_release['assets']
    return None, None

def load_current_version():
    """Load the current version from app_state.json (v2.3.0+)."""
    try:
        if os.path.exists(APP_STATE_FILE):
            with open(APP_STATE_FILE, 'r', encoding='utf-8') as f:
                app_state = json.load(f)
                return app_state.get('version', {}).get('current', '2.3.0')
    except Exception as e:
        print(f"Error reading version from app_state.json: {e}")
    return '2.3.0'

def main():
    """Main function to check for updates."""
    current_version = load_current_version()
    new_version, assets = check_for_updates(current_version)
    
    if new_version:
        print(f"New version available: {new_version}")
        # Here you can add logic to download the assets if needed
    else:
        print("You are using the latest version.")

if __name__ == "__main__":
    main()