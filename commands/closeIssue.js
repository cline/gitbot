const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserIssues } = require('../utils/storage');
const { createGitHubClient } = require('../utils/github');
const { isBlocked, hasOwner, isAdminOrOwner } = require('../utils/admin');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close-issue')
    .setDescription('Close a GitHub issue')
    .addNumberOption(option =>
      option.setName('number')
        .setDescription('The issue number to close')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('The reason for closing the issue')
        .setRequired(false)),

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
      const issueNumber = interaction.options.getNumber('number');
      const reason = interaction.options.getString('reason');

      const repository = process.env.DEFAULT_GITHUB_REPO;
      if (!repository || !repository.includes('/')) {
        await interaction.editReply({
          content: 'The DEFAULT_GITHUB_REPO environment variable is not properly set.',
          flags: ['Ephemeral'],
        });
        return;
      }

      const [owner, repo] = repository.split('/');

      // Get the issue to check its current state and ownership
      try {
        const { data: issue } = await octokit.issues.get({
          owner,
          repo,
          issue_number: issueNumber
        });

        // Check if issue is already closed
        if (issue.state === 'closed') {
          await interaction.editReply({
            content: `Issue #${issueNumber} is already closed.`,
            flags: ['Ephemeral'],
          });
          return;
        }

        // If not admin, check if user owns the issue
        if (!isAuthorized) {
          const userIssues = await getUserIssues(userId);
          const isUserIssue = userIssues.some(userIssue => 
            userIssue.repository === repository && 
            userIssue.issueNumber === issueNumber
          );

          if (!isUserIssue) {
            await interaction.editReply({
              content: `You can only close issues that you created. Issue #${issueNumber} was created by someone else.`,
              flags: ['Ephemeral'],
            });
            return;
          }
        }

        // Close the issue
        const closeComment = reason ? `Closed via Discord by ${interaction.user.tag}: ${reason}` : `Closed via Discord by ${interaction.user.tag}`;
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: issueNumber,
          body: closeComment
        });

        await octokit.issues.update({
          owner,
          repo,
          issue_number: issueNumber,
          state: 'closed'
        });

        // Create an embed for the closed issue
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('Issue Closed')
          .setDescription(`Successfully closed issue #${issueNumber}`)
          .addFields(
            { name: 'Issue', value: `[#${issue.number}: ${issue.title}](${issue.html_url})`, inline: false },
            { name: 'Repository', value: repository, inline: true },
            { name: 'Closed By', value: interaction.user.tag, inline: true }
          );

        if (reason) {
          embed.addFields({ name: 'Reason', value: reason, inline: false });
        }

        embed.setTimestamp()
          .setFooter({ text: 'GitHub Issues Bot', iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' });

        await interaction.editReply({ embeds: [embed], flags: ['Ephemeral'] });
      } catch (error) {
        if (error.status === 404) {
          await interaction.editReply({
            content: `Issue #${issueNumber} not found in ${repository}.`,
            flags: ['Ephemeral'],
          });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error closing issue:', error);
      await interaction.editReply({
        content: 'An error occurred while closing the issue. Please try again later.',
        flags: ['Ephemeral'],
      });
    }
  },
};
