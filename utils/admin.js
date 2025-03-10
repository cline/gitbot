const fs = require('fs');
const path = require('path');

// Directory for admin data
const adminDir = path.join(__dirname, '..', 'data', 'admin');

// Ensure admin directory exists
if (!fs.existsSync(adminDir)) {
  fs.mkdirSync(adminDir, { recursive: true });
}

// File paths for data
const ownersFile = path.join(adminDir, 'owners.json');
const blockedFile = path.join(adminDir, 'blocked.json');

// Initialize data files if they don't exist
if (!fs.existsSync(ownersFile)) {
  fs.writeFileSync(ownersFile, '{}', 'utf8');
}
if (!fs.existsSync(blockedFile)) {
  fs.writeFileSync(blockedFile, '{}', 'utf8');
}

// Load data
let owners = {};
let blocked = {};
try {
  owners = JSON.parse(fs.readFileSync(ownersFile, 'utf8'));
  blocked = JSON.parse(fs.readFileSync(blockedFile, 'utf8'));
} catch (error) {
  console.error('Error loading data:', error);
  owners = {};
  blocked = {};
}

/**
 * Check if a user has the Bot Admin role or is the owner
 * @param {string} guildId - The Discord guild ID
 * @param {Object} member - The Discord guild member object
 * @returns {Promise<boolean>} - True if the user is an admin or owner
 */
async function isAdminOrOwner(guildId, member) {
  // Check if member is valid
  if (!member || !member.roles || !member.roles.cache) {
    console.warn('Invalid member object passed to isAdminOrOwner');
    return false;
  }

  // Check if user is the owner
  const isOwner = owners[guildId] === member.id;
  if (isOwner) return true;

  // Check if user has the Gitbot Admin role
  return member.roles.cache.some(role => role.name === 'Gitbot Admin');
}

/**
 * Check if a guild has a registered owner
 * @param {string} guildId - The Discord guild ID
 * @returns {Promise<boolean>} - True if the guild has an owner
 */
async function hasOwner(guildId) {
  return owners.hasOwnProperty(guildId);
}

/**
 * Register a user as the owner for a guild
 * @param {string} guildId - The Discord guild ID
 * @param {string} userId - The Discord user ID
 */
async function registerOwner(guildId, userId) {
  owners[guildId] = userId;
  await saveOwners();
}

/**
 * Save owners data to file
 */
async function saveOwners() {
  try {
    await fs.promises.writeFile(ownersFile, JSON.stringify(owners, null, 2));
  } catch (error) {
    console.error('Error saving owners data:', error);
    throw error;
  }
}

/**
 * Check if a user is blocked in a guild
 * @param {string} guildId - The Discord guild ID
 * @param {string} userId - The Discord user ID
 * @returns {Promise<boolean>} - True if the user is blocked
 */
async function isBlocked(guildId, userId) {
  return blocked[guildId]?.includes(userId) || false;
}

/**
 * Block a user in a guild
 * @param {string} guildId - The Discord guild ID
 * @param {string} userId - The Discord user ID
 */
async function blockUser(guildId, userId) {
  if (!blocked[guildId]) {
    blocked[guildId] = [];
  }
  if (!blocked[guildId].includes(userId)) {
    blocked[guildId].push(userId);
    await saveBlocked();
  }
}

/**
 * Unblock a user in a guild
 * @param {string} guildId - The Discord guild ID
 * @param {string} userId - The Discord user ID
 */
async function unblockUser(guildId, userId) {
  if (blocked[guildId]) {
    const index = blocked[guildId].indexOf(userId);
    if (index > -1) {
      blocked[guildId].splice(index, 1);
      await saveBlocked();
    }
  }
}

/**
 * Get all blocked users in a guild
 * @param {string} guildId - The Discord guild ID
 * @returns {Promise<string[]>} - Array of blocked user IDs
 */
async function getBlockedUsers(guildId) {
  return blocked[guildId] || [];
}

/**
 * Save blocked users data to file
 */
async function saveBlocked() {
  try {
    await fs.promises.writeFile(blockedFile, JSON.stringify(blocked, null, 2));
  } catch (error) {
    console.error('Error saving blocked users data:', error);
    throw error;
  }
}

module.exports = {
  isAdminOrOwner,
  hasOwner,
  registerOwner,
  isBlocked,
  blockUser,
  unblockUser,
  getBlockedUsers
};
