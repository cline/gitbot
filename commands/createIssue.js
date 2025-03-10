const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addUserIssue } = require('../utils/storage');
const { createGitHubClient } = require('../utils/github');
const { isBlocked, hasOwner } = require('../utils/admin');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-issue')
    .setDescription('Create a new GitHub issue')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('The title of the issue')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('body')
        .setDescription('The body/description of the issue')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('repository')
        .setDescription('The GitHub repository (format: owner/repo)')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: ['Ephemeral'] });
      const guildId = interaction.guildId;
      const discordUserId = interaction.user.id;

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
      const userBlocked = await isBlocked(guildId, discordUserId);
      if (userBlocked) {
        await interaction.editReply({
          content: 'You have been blocked from using this bot. Please contact a server administrator if you believe this is a mistake.',
          flags: ['Ephemeral'],
        });
        return;
      }

      // Create GitHub client with App authentication
      const octokit = await createGitHubClient();

      const repository = interaction.options.getString('repository') || process.env.DEFAULT_GITHUB_REPO;
      const title = interaction.options.getString('title');
      const body = interaction.options.getString('body');

      if (!repository || !repository.includes('/')) {
        await interaction.editReply({
          content: 'Please provide a valid repository in the format `owner/repo` or set the DEFAULT_GITHUB_REPO in your .env file.',
          flags: ['Ephemeral'],
        });
        return;
      }

      const [owner, repo] = repository.split('/');

      // Create the issue on GitHub
      const { data: issue } = await octokit.issues.create({
        owner,
        repo,
        title,
        body: `${body}\n\n---\n*Created via Discord by ${interaction.user.tag}*`,
      });

      // Add the issue to the user's stored issues
      issue.repository = repository; // Add repository info to the issue data
      await addUserIssue(discordUserId, issue);

      // Create an embed for the created issue
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Issue Created Successfully')
        .setDescription(`Your issue has been created in ${repository}`)
        .addFields(
          { name: 'Issue Number', value: `#${issue.number}`, inline: true },
          { name: 'Title', value: issue.title, inline: true },
          { name: 'Link', value: `[View Issue](${issue.html_url})` }
        )
        .setTimestamp()
        .setFooter({ text: 'GitHub Issues', iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' });

      await interaction.editReply({ embeds: [embed], flags: ['Ephemeral'] });
    } catch (error) {
      console.error('Error creating issue:', error);
      await interaction.editReply({
        content: 'An error occurred while creating the issue. Please try again later.',
        flags: ['Ephemeral'],
      });
    }
  },
};
