const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserIssues } = require('../utils/storage');
const { createGitHubClient } = require('../utils/github');
const { isBlocked, hasOwner, isAdminOrOwner } = require('../utils/admin');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-issues')
    .setDescription('List GitHub issues')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The Discord user to list issues for (Admin only)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('state')
        .setDescription('Filter issues by state')
        .setRequired(false)
        .addChoices(
          { name: 'Open', value: 'open' },
          { name: 'Closed', value: 'closed' },
          { name: 'All', value: 'all' }
        )),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: ['Ephemeral'] });
      const guildId = interaction.guildId;
      const userId = interaction.user.id;

      // Check if the server has a registered owner
      const ownerRegistered = await hasOwner(guildId);
      if (!ownerRegistered) {
        await interaction.editReply({
          content: 'This server does not have a registered bot owner yet. Please ask a server administrator to use the `/register-bot` command to set up the bot.',
          flags: ['Ephemeral'],
        });
        return;
      }

      // Check if the user is blocked
      const userBlocked = await isBlocked(guildId, userId);
      if (userBlocked) {
        await interaction.editReply({
          content: 'You have been blocked from using this bot. Please contact a server administrator if you believe this is a mistake.',
          flags: ['Ephemeral'],
        });
        return;
      }

      // Create GitHub client with App authentication
      const octokit = await createGitHubClient();

      // Check if user is admin/owner
      const isAuthorized = await isAdminOrOwner(guildId, interaction.member);
      const targetUser = interaction.options.getUser('user');
      const state = interaction.options.getString('state') || 'all';

      // If not admin and trying to view other user's issues
      if (!isAuthorized && targetUser) {
        await interaction.editReply({
          content: 'You do not have permission to view other users\' issues.',
          flags: ['Ephemeral'],
        });
        return;
      }

      const repository = process.env.DEFAULT_GITHUB_REPO;
      if (!repository || !repository.includes('/')) {
        await interaction.editReply({
          content: 'The DEFAULT_GITHUB_REPO environment variable is not properly set.',
          flags: ['Ephemeral'],
        });
        return;
      }

      const [owner, repo] = repository.split('/');

      let displayIssues;
      let title;
      let description;

      if (isAuthorized && !targetUser) {
        // Admin viewing all issues
        const { data: issues } = await octokit.issues.listForRepo({
          owner,
          repo,
          state,
          per_page: 100,
          sort: 'created',
          direction: 'desc'
        });
        displayIssues = issues;
        title = `${state.charAt(0).toUpperCase() + state.slice(1)} Issues in ${repository}`;
        description = `Found ${displayIssues.length} ${state} issues in this repository.`;
      } else {
        // User viewing their own issues or admin viewing specific user's issues
        const discordUserId = targetUser ? targetUser.id : userId;
        const userIssues = await getUserIssues(discordUserId);
        
        if (!userIssues || userIssues.length === 0) {
          const noIssuesMessage = targetUser 
            ? `${targetUser.username} hasn't created any issues yet.`
            : `You haven't created any issues yet.`;

          await interaction.editReply({
            content: noIssuesMessage,
            flags: ['Ephemeral'],
          });
          return;
        }

        // Filter issues for this repository
        const repoIssues = userIssues.filter(issue => issue.repository === repository);

        if (repoIssues.length === 0) {
          const noIssuesMessage = targetUser 
            ? `${targetUser.username} hasn't created any issues in ${repository}.`
            : `You haven't created any issues in ${repository}.`;

          await interaction.editReply({
            content: noIssuesMessage,
            flags: ['Ephemeral'],
          });
          return;
        }

        // Get current status of these issues from GitHub
        const issuePromises = repoIssues.map(async issue => {
          try {
            const response = await octokit.issues.get({
              owner,
              repo,
              issue_number: issue.issueNumber
            });
            return {
              ...response.data,
              storedData: issue // Keep the stored data for reference
            };
          } catch (error) {
            if (error.status === 404) {
              console.error(`Issue #${issue.issueNumber} not found:`, error);
              return null; // Skip deleted issues
            }
            console.error(`Error fetching issue #${issue.issueNumber}:`, error);
            // Return stored data as fallback
            return {
              number: issue.issueNumber,
              title: issue.issueTitle,
              html_url: issue.issueUrl,
              state: 'unknown',
              created_at: issue.createdAt,
              updated_at: issue.updatedAt,
              storedData: issue
            };
          }
        });

        displayIssues = (await Promise.all(issuePromises))
          .filter(issue => issue !== null) // Remove deleted issues
          .filter(issue => state === 'all' || issue.state === state) // Filter by state if specified
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (displayIssues.length === 0) {
          const stateText = state === 'all' ? '' : ` ${state}`;
          const noIssuesMessage = targetUser 
            ? `${targetUser.username} has no${stateText} issues in ${repository}.`
            : `You have no${stateText} issues in ${repository}.`;

          await interaction.editReply({
            content: noIssuesMessage,
            flags: ['Ephemeral'],
          });
          return;
        }

        const username = targetUser ? targetUser.username : 'Your';
        const stateText = state === 'all' ? '' : ` ${state}`;
        title = `${username}${stateText} Issues in ${repository}`;
        description = `Found ${displayIssues.length}${stateText} issue(s) created by ${targetUser ? 'this user' : 'you'}.`;
      }

      // Create an embed for the issues
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: 'GitHub Issues Bot', iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' });

      // Add fields for the first 10 issues
      displayIssues.slice(0, 10).forEach(issue => {
        if (!issue || !issue.number) return;
        
        const status = issue.state === 'open' ? '🟢' : issue.state === 'closed' ? '🔴' : '⚪';
        const title = issue.title || issue.storedData?.issueTitle || 'Unknown Title';
        const url = issue.html_url || issue.storedData?.issueUrl;
        const date = new Date(issue.created_at || issue.storedData?.createdAt).toLocaleDateString();
        const statusText = issue.state === 'unknown' ? ' (Status Unknown)' : '';
        
        embed.addFields({
          name: `${status} #${issue.number}: ${title}${statusText}`,
          value: `[View Issue](${url})\nCreated: ${date}`,
        });
      });

      // If there are more than 10 issues, add a note
      if (displayIssues.length > 10) {
        embed.addFields({
          name: 'And more...',
          value: `${displayIssues.length - 10} additional issues not shown. Use GitHub to view all issues.`,
        });
      }

      await interaction.editReply({ embeds: [embed], flags: ['Ephemeral'] });
    } catch (error) {
      console.error('Error listing issues:', error);
      await interaction.editReply({
        content: 'An error occurred while listing issues. Please try again later.',
        flags: ['Ephemeral'],
      });
    }
  },
};
