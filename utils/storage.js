const storage = require('node-persist');
const path = require('path');

// Initialize storage
async function initStorage() {
  try {
    await storage.init({
      dir: path.join(__dirname, '../data/storage'),
      stringify: JSON.stringify,
      parse: JSON.parse,
      encoding: 'utf8',
      logging: false,
      ttl: false,
      forgiveParseErrors: true // Be more forgiving with parse errors
    });
  } catch (error) {
    console.error('Error initializing storage:', error);
    // Create the storage directory if it doesn't exist
    const fs = require('fs');
    const storageDir = path.join(__dirname, '../data/storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
      // Try initializing again
      await storage.init({
        dir: storageDir,
        stringify: JSON.stringify,
        parse: JSON.parse,
        encoding: 'utf8',
        logging: false,
        ttl: false,
        forgiveParseErrors: true
      });
    } else {
      throw error; // Re-throw if directory exists but there's still an error
    }
  }
}

// Get all issues for a Discord user
async function getUserIssues(discordUserId) {
  await initStorage();
  const userIssues = await storage.getItem(`user-${discordUserId}`) || [];
  return userIssues;
}

// Add a new issue to a Discord user's list
async function addUserIssue(discordUserId, issueData) {
  await initStorage();
  const userIssues = await getUserIssues(discordUserId);
  
  // Add the new issue
  userIssues.push({
    issueNumber: issueData.number,
    issueTitle: issueData.title,
    issueUrl: issueData.html_url,
    repository: issueData.repository,
    createdAt: issueData.created_at,
    updatedAt: issueData.updated_at
  });
  
  // Save the updated list
  await storage.setItem(`user-${discordUserId}`, userIssues);
  return userIssues;
}

// Remove an issue from a Discord user's list
async function removeUserIssue(discordUserId, issueNumber, repository) {
  await initStorage();
  const userIssues = await getUserIssues(discordUserId);
  
  // Filter out the issue to remove
  const updatedIssues = userIssues.filter(issue => 
    !(issue.issueNumber === issueNumber && issue.repository === repository)
  );
  
  // Save the updated list
  await storage.setItem(`user-${discordUserId}`, updatedIssues);
  return updatedIssues;
}

// Clear all issues for a Discord user
async function clearUserIssues(discordUserId) {
  await initStorage();
  await storage.setItem(`user-${discordUserId}`, []);
  return [];
}

module.exports = {
  getUserIssues,
  addUserIssue,
  removeUserIssue,
  clearUserIssues
};
