# Discord GitHub Bot Commands

This document provides a quick reference for all available commands in the Discord GitHub Bot.

## User Commands

| Command | Description | Options |
|---------|-------------|---------|
| `/create-issue` | Create a new GitHub issue using a form | `title` (required): The title of the issue<br>`repository` (optional): The GitHub repository (format: owner/repo)<br>*Opens a form with fields for:*<br>- What Happened<br>- Steps to Reproduce<br>- Provider/Model (e.g., cline:anthropic/claude-3.7-sonnet)<br>- Operating System (e.g., Windows 11, macOS Sonoma, Ubuntu 22.04)<br>- Cline Version |
| `/list-issues` | List GitHub issues | `state` (optional): Filter issues by state (open, closed, all) |
| `/close-issue` | Close a GitHub issue | `number` (required): The issue number to close<br>`reason` (optional): The reason for closing the issue |

## Admin Commands

### Setup

| Command | Description | Options |
|---------|-------------|---------|
| `/register-bot` | Register yourself as the bot owner (can only be done once per server) | None |

### User Management

| Command | Description | Options |
|---------|-------------|---------|
| `/manage-users block` | Block a user from using the bot | `user` (required): The user to block |
| `/manage-users unblock` | Unblock a user from using the bot | `user` (required): The user to unblock |
| `/manage-users list-blocked` | List all blocked users | None |

### Issue Management

| Command | Description | Options |
|---------|-------------|---------|
| `/list-issues user:@user` | List issues for a specific user (Admin only) | `user` (required): The Discord user to list issues for<br>`state` (optional): Filter issues by state (open, closed, all) |

## Permission Levels

- **Bot Owner**: The server member who initially set up the bot using `/register-bot`
  - Full access to all commands
  - Cannot be blocked
  - Can manage other administrators

- **Administrators**: Members with admin permissions
  - Access to admin commands
  - Cannot be blocked
  - Can block/unblock regular users
  - Can view any user's issues
  - Can close any issue

- **Regular Users**: All other server members
  - Can create issues
  - Can list their own issues
  - Can close their own issues
  - Can be blocked by admins

- **Blocked Users**: Users who have been blocked by admins
  - No access to any commands
  - Must contact an administrator to be unblocked

## Command Visibility

- Regular commands are visible to all unblocked users
- Admin commands are only visible to the bot owner and administrators
- Blocked users cannot see or use any commands

## Notes

- The `/register-bot` command can only be used once per server
- The bot owner and administrators cannot be blocked
- All admin settings are server-specific
- When listing issues:
  - Regular users can only see their own issues
  - Admins can see all issues or filter by user
  - Issues can be filtered by state (open/closed/all)
- When closing issues:
  - Regular users can only close their own issues
  - Admins can close any issue
  - A reason can be provided which will be added as a comment
