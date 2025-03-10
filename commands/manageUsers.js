const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { blockUser, unblockUser, isAdminOrOwner, getUserRole, UserRole, getBlockedUsers } = require('../utils/admin');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('manage-users')
    .setDescription('Block or unblock users from using the bot (Owner/Admin only)')
    .setDefaultMemberPermissions('0') // Hide from everyone by default
    .addSubcommand(subcommand =>
      subcommand
        .setName('block')
        .setDescription('Block a user from using the bot')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to block')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('unblock')
        .setDescription('Unblock a user from using the bot')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to unblock')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list-blocked')
        .setDescription('List all blocked users')),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: ['Ephemeral'] });
      const guildId = interaction.guildId;
      const userId = interaction.user.id;

      // Check if the user is an admin or owner
      const isAuthorized = await isAdminOrOwner(guildId, interaction.member);
      if (!isAuthorized) {
        await interaction.editReply({
          content: 'You do not have permission to manage users. Only the bot owner and administrators can use this command.',
          flags: ['Ephemeral'],
        });
        return;
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'block') {
        const targetUser = interaction.options.getUser('user');

        // Check if the target user is already blocked
        const targetRole = await getUserRole(guildId, targetUser.id);
        if (targetRole === UserRole.BLOCKED) {
          await interaction.editReply({
            content: `${targetUser.username} is already blocked from using the bot.`,
            flags: ['Ephemeral'],
          });
          return;
        }

        // Check if the target user is an admin or owner
        if (targetRole === UserRole.ADMIN || targetRole === UserRole.OWNER) {
          await interaction.editReply({
            content: `You cannot block ${targetUser.username} because they are a bot ${targetRole}.`,
            flags: ['Ephemeral'],
          });
          return;
        }

        // Block the user
        await blockUser(guildId, targetUser.id);

        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('User Blocked')
          .setDescription(`${targetUser.username} has been blocked from using the bot.`)
          .addFields(
            { name: 'Server', value: interaction.guild.name, inline: true },
            { name: 'Blocked User', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Blocked By', value: `<@${userId}>`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'GitHub Issues Bot', iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' });

        await interaction.editReply({ embeds: [embed], flags: ['Ephemeral'] });
      } else if (subcommand === 'unblock') {
        const targetUser = interaction.options.GetUser('user');

        // Check if the target user is blocked
        const targetRole = await getUserRole(guildId, targetUser.id);
        if (targetRole !== UserRole.BLOCKED) {
          await interaction.editReply({
            content: `${targetUser.username} is not blocked from using the bot.`,
            flags: ['Ephemeral'],
          });
          return;
        }

        // Unblock the user
        await unblockUser(guildId, targetUser.id);

        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('User Unblocked')
          .setDescription(`${targetUser.username} has been unblocked and can now use the bot.`)
          .addFields(
            { name: 'Server', value: interaction.guild.name, inline: true },
            { name: 'Unblocked User', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Unblocked By', value: `<@${userId}>`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'GitHub Issues Bot', iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' });

        await interaction.editReply({ embeds: [embed], flags: ['Ephemeral'] });
      } else if (subcommand === 'list-blocked') {
        // Get all blocked users
        const blockedUsers = await getBlockedUsers(guildId);

        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('Blocked Users')
          .setDescription('List of all users blocked from using the bot.')
          .setTimestamp()
          .setFooter({ text: 'GitHub Issues Bot', iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' });

        if (blockedUsers.length > 0) {
          const usersList = blockedUsers.map(blockedId => `<@${blockedId}>`).join('\n');
          embed.addFields({ name: 'Blocked Users', value: usersList, inline: false });
        } else {
          embed.addFields({ name: 'Blocked Users', value: 'No users are currently blocked.', inline: false });
        }

        await interaction.editReply({ embeds: [embed], flags: ['Ephemeral'] });
      }
    } catch (error) {
      console.error('Error managing users:', error);
      await interaction.editReply({
        content: 'An error occurred while managing users. Please try again later.',
        flags: ['Ephemeral'],
      });
    }
  },
};
