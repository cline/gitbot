# Discord GitHub Bot

A Discord bot that allows users to list and create GitHub issues directly from Discord. The bot associates Discord users with their GitHub issues for easy tracking.

## Features

- List GitHub issues from a specified repository (with state filtering)
- Create new GitHub issues in a specified repository
- Close GitHub issues (with optional reason)
- Associate Discord users with their GitHub issues
- Persistent storage of user-issue associations
- Uses GitHub App authentication for better security and permissions
- Docker support for easy deployment

## Prerequisites

- Node.js (v16.9.0 or higher) OR Docker
- A Discord account and a registered Discord application/bot
- A GitHub account with a registered GitHub App

## Setup

### Option 1: Local Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd gitbot
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Option 2: Docker Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd gitbot
   ```

2. Build and run with Docker Compose:
   ```bash
   # Build the container
   docker-compose build

   # Start the bot
   docker-compose up -d

   # View logs
   docker-compose logs -f

   # Stop the bot
   docker-compose down
   ```

The bot's data will be persisted in the local `./data` directory.

## Configuration

Copy the `.env.example` file to `.env` and fill in your credentials:

```
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_application_id

# GitHub App Configuration
GITHUB_APP_ID=your_github_app_id
# Use either GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_PATH
# Option 1: Private key as a string (replace newlines with \n)
# GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1c7+9z5Pad7OejecsQ0bu...E8tmYk9\n-----END RSA PRIVATE KEY-----
# Option 2: Path to private key file (recommended)
GITHUB_APP_PRIVATE_KEY_PATH=path/to/private-key.pem
GITHUB_APP_INSTALLATION_ID=your_github_app_installation_id

# Default GitHub Repository (format: owner/repo)
DEFAULT_GITHUB_REPO=owner/repo
```

### Getting a Discord Bot Token and Client ID

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Under the "TOKEN" section, click "Copy" to copy your bot token
5. From the "General Information" tab, copy your "Application ID" (this is your DISCORD_CLIENT_ID)
6. Enable the following Privileged Gateway Intents:
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT

### Creating and Configuring a GitHub App

1. Go to [GitHub Settings > Developer settings > GitHub Apps](https://github.com/settings/apps)
2. Click "New GitHub App" and fill in the required information:
   - GitHub App name: Choose a unique name
   - Homepage URL: Can be your GitHub profile or repository URL
   - Webhook: Disable for now (uncheck "Active")
   - Permissions:
     - Repository permissions:
       - Issues: Read & Write
       - Metadata: Read-only
3. Click "Create GitHub App"
4. After creation, note your "App ID" from the app's settings page
5. Generate a private key by clicking "Generate a private key" and save the downloaded file
6. Install the app on your account or organization by clicking "Install App"
7. After installation, note the "Installation ID" from the URL in your browser:
   - The URL will look like: `https://github.com/settings/installations/12345678`
   - The number at the end (e.g., `12345678`) is your Installation ID

#### Setting Up the Private Key

You have two options for providing the GitHub App private key:

##### Option 1: Using a file path (Recommended)

1. Save the private key file (`.pem`) that you downloaded from GitHub in a secure location
2. If using Docker:
   - Place the private key file in your project directory
   - Uncomment the private key volume mount in `docker-compose.yml`:
     ```yaml
     volumes:
       - ./data:/usr/src/app/data
       - ./private-key.pem:/usr/src/app/private-key.pem:ro
     ```
3. Set the path in your `.env` file:
   ```
   GITHUB_APP_PRIVATE_KEY_PATH=/usr/src/app/private-key.pem  # For Docker
   # or
   GITHUB_APP_PRIVATE_KEY_PATH=./private-key.pem  # For local installation
   ```

##### Option 2: Using the key directly in the .env file

1. Open the private key file (`.pem`) in a text editor
2. Copy all the content (including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines)
3. Replace all newlines with `\n` for a single-line entry
4. Set the `GITHUB_APP_PRIVATE_KEY` variable in your `.env` file:
   ```
   GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1c7+9z5Pad7OejecsQ0bu...E8tmYk9\n-----END RSA PRIVATE KEY-----
   ```

### Inviting the Bot to Your Server

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application and go to the "OAuth2" tab
3. Under "URL Generator", select the following scopes:
   - `bot`
   - `applications.commands`
4. Under "Bot Permissions", select:
   - "Send Messages"
   - "Embed Links"
   - "Read Message History"
5. Copy the generated URL and open it in your browser to invite the bot to your server

## Running the Bot

### Option 1: Local Installation

```bash
# Start the bot
npm start

# Start the bot with nodemon (auto-restart on file changes)
npm run dev
```

### Option 2: Docker

```bash
# Start the bot
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the bot
docker-compose down
```

### Managing Commands

#### Registering Commands

The bot will automatically register its commands on startup. You can also manually register commands using:

```bash
# Local installation
node register-commands.js

# Docker
docker-compose exec bot node register-commands.js
```

#### Unregistering Commands

To remove all commands from Discord (both global and guild-specific):

```bash
# Local installation
node unregister-commands.js

# Docker
docker-compose exec bot node unregister-commands.js
```

This utility is useful for:
- Cleaning up during development
- Removing outdated commands
- Troubleshooting command registration issues
- Completely resetting your bot's commands

## Commands

The bot provides a variety of commands for both regular users and administrators. For a complete list of all available commands with detailed descriptions and options, see [COMMANDS.md](COMMANDS.md).

## Admin System

The bot includes an admin system that allows for user management and additional administrative commands:

1. **Bot Owner**: Each server can have one bot owner, who has full control over the bot's administrative functions.
   - The first server administrator to use the `/register-bot` command becomes the bot owner.
   - Once an owner is registered, the `/register-bot` command is no longer available.

2. **Administrators**: The bot owner can designate other users as administrators.
   - Administrators can use most admin commands except removing other admins.
   - Administrators cannot be blocked from using the bot.

3. **User Management**: The bot owner and administrators can block users from using the bot.
   - Blocked users cannot use any of the bot's commands.
   - The bot owner and administrators cannot be blocked.

4. **Server-Specific Settings**: All admin settings are server-specific, allowing the bot to be used in multiple servers with different configurations.

## Data Storage

The bot stores data in the following directories:

- `data/storage/` - Associations between Discord users and GitHub issues
- `data/admin/` - Admin system configuration (owners, admins, blocked users)

When using Docker, these directories are persisted through a volume mount to `./data` in your project directory.

## License

MIT
