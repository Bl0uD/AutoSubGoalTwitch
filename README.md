# SubCount Auto

## Description
SubCount Auto is a Python application designed to integrate with OBS (Open Broadcaster Software) for managing subscriber and follower counts in real-time. It features an automatic server that handles requests related to updates and provides a dashboard for monitoring.

## Project Structure
```
SubcountAutomatic
├── src
│   ├── obs_subcount_auto.py          # Main script for OBS integration
│   ├── updater                        # Module for handling updates
│   │   ├── __init__.py               # Initializes the updater module
│   │   ├── version_checker.py         # Checks for the latest version
│   │   ├── file_updater.py            # Manages file updates
│   │   └── github_api.py              # Interacts with GitHub API
│   ├── config                         # Configuration files
│   │   ├── version.json               # Current version of the application
│   │   └── update_config.json         # Update process configuration
│   └── utils                          # Utility functions
│       ├── __init__.py               # Initializes the utils module
│       └── logger.py                  # Logging functionality
├── server
│   ├── server.js                      # Node.js server code
│   └── package.json                   # npm configuration file
├── updates                             # Directory for updates
│   └── .gitkeep                       # Keeps the updates directory in Git
├── logs                                # Directory for logs
│   └── .gitkeep                       # Keeps the logs directory in Git
├── START_SERVER.bat                   # Batch file to start the server
├── INSTALLER.bat                      # Batch file for installation
├── README.md                          # Project documentation
└── .github
    └── workflows
        └── release.yml                # GitHub Actions workflow for releases
```

## Installation
1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Run `INSTALLER.bat` to install the necessary dependencies.

## Usage
1. Open OBS Studio.
2. Load the `obs_subcount_auto.py` script through the Tools > Scripts menu.
3. The SubCount Auto server will start automatically.
4. Use the provided buttons in OBS to manage follower and subscriber counts.

## Features
- Automatic server management for real-time updates.
- Integration with Twitch API for synchronization.
- Dashboard for monitoring follower and subscriber counts.
- Update checking and file management for maintaining the application.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.