const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');
const fs = require('fs');
const path = require('path');

/**
 * Loads the GitHub App private key from a file or environment variable
 * @returns {string} The private key
 */
function loadPrivateKey() {
  // If GITHUB_APP_PRIVATE_KEY_PATH is set, load the key from the file
  if (process.env.GITHUB_APP_PRIVATE_KEY_PATH) {
    try {
      // Resolve the path (support both absolute and relative paths)
      const keyPath = path.isAbsolute(process.env.GITHUB_APP_PRIVATE_KEY_PATH)
        ? process.env.GITHUB_APP_PRIVATE_KEY_PATH
        : path.resolve(__dirname, '..', process.env.GITHUB_APP_PRIVATE_KEY_PATH);
      
      // Read the key file
      return fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
      console.error(`Error loading private key from file: ${error.message}`);
      throw new Error(`Failed to load GitHub App private key from file: ${error.message}`);
    }
  }
  
  // Fall back to GITHUB_APP_PRIVATE_KEY environment variable if set
  if (process.env.GITHUB_APP_PRIVATE_KEY) {
    return process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n');
  }
  
  throw new Error('No GitHub App private key provided. Set either GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_PATH in your environment variables.');
}

/**
 * Creates an authenticated Octokit instance using GitHub App credentials
 * @returns {Promise<Octokit>} Authenticated Octokit instance
 */
async function createGitHubClient() {
  try {
    // Check if required environment variables are set
    if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_INSTALLATION_ID) {
      throw new Error('Missing GitHub App credentials in environment variables. GITHUB_APP_ID and GITHUB_APP_INSTALLATION_ID are required.');
    }

    // Load the private key
    const privateKey = loadPrivateKey();

    // Create an Octokit instance with GitHub App authentication
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GITHUB_APP_ID,
        privateKey: privateKey,
        installationId: process.env.GITHUB_APP_INSTALLATION_ID
      }
    });

    return octokit;
  } catch (error) {
    console.error('Error creating GitHub client:', error);
    throw error;
  }
}

module.exports = {
  createGitHubClient
};
