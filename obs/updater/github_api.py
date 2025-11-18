import requests
import json
import os

GITHUB_API_URL = "https://api.github.com/repos/<username>/<repository>/releases/latest"

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
    """Load the current version from the version.json file."""
    # Chemins mis à jour pour la nouvelle structure
    updater_dir = os.path.dirname(__file__)  # obs/updater/
    obs_dir = os.path.dirname(updater_dir)   # obs/
    project_root = os.path.dirname(obs_dir)  # racine
    version_file_path = os.path.join(project_root, 'app', 'config', 'version.json')
    with open(version_file_path, 'r') as f:
        version_info = json.load(f)
    return version_info.get('version')

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