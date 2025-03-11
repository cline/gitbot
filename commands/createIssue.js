const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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
      option.setName('repository')
        .setDescription('The GitHub repository (format: owner/repo)')
        .setRequired(false)),

  async execute(interaction) {
    try {
      const title = interaction.options.getString('title');
      const repository = interaction.options.getString('repository') || process.env.DEFAULT_GITHUB_REPO;

      // Create the modal
      const modal = new ModalBuilder()
        .setCustomId('issue-form')
        .setTitle('Create GitHub Issue');

      // Operating System input
      const osInput = new TextInputBuilder()
        .setCustomId('operating-system')
        .setLabel('Operating System')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter: OSX, Windows, or Linux')
        .setRequired(true);

      // Cline Version input
      const versionInput = new TextInputBuilder()
        .setCustomId('cline-version')
        .setLabel('Cline Version')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      // What Happened textarea
      const whatHappenedInput = new TextInputBuilder()
        .setCustomId('what-happened')
        .setLabel('What Happened')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      // Steps to Reproduce textarea
      const stepsInput = new TextInputBuilder()
        .setCustomId('steps')
        .setLabel('Steps to Reproduce')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('1.\n2.\n3.')
        .setRequired(true);

      // Add inputs to action rows
      const osRow = new ActionRowBuilder().addComponents(osInput);
      const versionRow = new ActionRowBuilder().addComponents(versionInput);
      const whatHappenedRow = new ActionRowBuilder().addComponents(whatHappenedInput);
      const stepsRow = new ActionRowBuilder().addComponents(stepsInput);

      // Add action rows to modal
      modal.addComponents(osRow, versionRow, whatHappenedRow, stepsRow);

      // Store title and repository in temporary storage for the modal submission handler
      interaction.client.tempStorage = interaction.client.tempStorage || new Map();
      interaction.client.tempStorage.set(interaction.user.id, { title, repository });

      const guildId = interaction.guildId;
      const discordUserId = interaction.user.id;

      // Check if the server has a registered owner
      const ownerRegistered = await hasOwner(guildId);
      if (!ownerRegistered) {
        await interaction.reply({
          content: 'This server does not have a registered bot owner yet. Please ask a server administrator to use the `/register-bot` command to set up the bot.',
          flags: ['Ephemeral'],
        });
        return;
      }

      // Check if the user is blocked
      const userBlocked = await isBlocked(guildId, discordUserId);
      if (userBlocked) {
        await interaction.reply({
          content: 'You have been blocked from using this bot. Please contact a server administrator if you believe this is a mistake.',
          flags: ['Ephemeral'],
        });
        return;
      }

      // Validate repository format
      if (!repository || !repository.includes('/')) {
        await interaction.reply({
          content: 'Please provide a valid repository in the format `owner/repo` or set the DEFAULT_GITHUB_REPO in your .env file.',
          flags: ['Ephemeral'],
        });
        return;
      }

      // Show the modal
      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error creating issue:', error);
      await interaction.editReply({
        content: 'An error occurred while creating the issue. Please try again later.',
        flags: ['Ephemeral'],
      });
    }
  },
};
