import os
import requests
import json
from ..utils.logger import log_message

GITHUB_API_URL = "https://api.github.com/repos/yourusername/yourrepository/releases/latest"

def check_for_updates():
    """Check for updates from the GitHub repository."""
    try:
        response = requests.get(GITHUB_API_URL)
        if response.status_code == 200:
            latest_release = response.json()
            latest_version = latest_release['tag_name']
            current_version = get_current_version()

            if latest_version > current_version:
                log_message(f"Update available: {latest_version} (current: {current_version})")
                return latest_version, latest_release['assets']
            else:
                log_message("No updates available.")
                return None, None
        else:
            log_message(f"Failed to check for updates: {response.status_code}")
            return None, None
    except Exception as e:
        log_message(f"Error checking for updates: {e}")
        return None, None

def get_current_version():
    """Retrieve the current version from version.json."""
    # Chemins mis à jour pour la nouvelle structure
    updater_dir = os.path.dirname(__file__)  # obs/updater/
    obs_dir = os.path.dirname(updater_dir)   # obs/
    project_root = os.path.dirname(obs_dir)  # racine
    version_file_path = os.path.join(project_root, 'config', 'version.json')
    
    with open(version_file_path, 'r') as version_file:
        version_data = json.load(version_file)
        return version_data['version']

def download_file(url, destination):
    """Download a file from a URL to a specified destination."""
    try:
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open(destination, 'wb') as file:
                for chunk in response.iter_content(chunk_size=8192):
                    file.write(chunk)
            log_message(f"Downloaded file to {destination}")
            return True
        else:
            log_message(f"Failed to download file: {response.status_code}")
            return False
    except Exception as e:
        log_message(f"Error downloading file: {e}")
        return False

def update_files(assets):
    """Update application files based on the latest release assets."""
    for asset in assets:
        file_name = asset['name']
        download_url = asset['url']
        destination = os.path.join(os.path.dirname(__file__), '../..', file_name)

        if download_file(download_url, destination):
            log_message(f"Updated {file_name}")

def perform_update():
    """Perform the update process."""
    latest_version, assets = check_for_updates()
    if latest_version and assets:
        update_files(assets)