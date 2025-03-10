const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { hasOwner, registerOwner } = require('../utils/admin');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register-bot')
    .setDescription('Set up the bot for this server (can only be done once)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: ['Ephemeral'] });
      const guildId = interaction.guildId;
      const userId = interaction.user.id;

      // Check if the server already has an owner
      const ownerExists = await hasOwner(guildId);
      if (ownerExists) {
        await interaction.editReply({
          content: 'This server is already set up.',
          flags: ['Ephemeral'],
        });
        return;
      }

      // Create Gitbot Admin role if it doesn't exist
      let adminRole = interaction.guild.roles.cache.find(role => role.name === 'Gitbot Admin');
      if (!adminRole) {
        adminRole = await interaction.guild.roles.create({
          name: 'Gitbot Admin',
          color: 0x0000FF,
          reason: 'Role for GitHub Issues Bot administrators',
          permissions: [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.UseExternalEmojis,
            PermissionFlagsBits.AddReactions,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.Stream,
            PermissionFlagsBits.UseEmbeddedActivities,
            PermissionFlagsBits.ModerateMembers,
          ],
        });
      }

      // Assign the Bot Admin role to the command user
      await interaction.member.roles.add(adminRole);

      // Register the user as the owner
      await registerOwner(guildId, userId);

      // Create an embed for the success message
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Bot Setup Complete')
        .setDescription('The bot has been successfully set up for this server. Add Discord users to the `Gitbot Admin` role to assign admins.')
        .addFields(
          { name: 'Server', value: interaction.guild.name, inline: true },
          { name: 'Owner', value: `<@${userId}>`, inline: true },
          { name: 'Admin Role', value: adminRole.name, inline: true }
        )
        .setFooter({ text: 'GitHub Issues Bot', iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], flags: ['Ephemeral'] });
    } catch (error) {
      console.error('Error setting up bot:', error);
      await interaction.editReply({
        content: 'An error occurred while setting up the bot. Please try again later.',
        flags: ['Ephemeral'],
      });
    }
  },
};
