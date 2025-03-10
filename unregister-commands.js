const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Delete all commands globally
async function deleteGlobalCommands() {
  try {
    console.log('Started removing global application commands...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: [] }
    );
    console.log('Successfully removed all global application commands.');
  } catch (error) {
    console.error('Error removing global commands:', error);
  }
}

// Delete commands from a specific guild
async function deleteGuildCommands(guildId) {
  try {
    console.log(`Started removing application commands from guild ${guildId}...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
      { body: [] }
    );
    console.log(`Successfully removed all application commands from guild ${guildId}.`);
  } catch (error) {
    if (error.status === 403) {
      console.log(`Bot no longer in guild ${guildId}, skipping...`);
    } else {
      console.error(`Error removing commands from guild ${guildId}:`, error);
    }
  }
}

// Get all guilds the bot is in
async function getGuilds() {
  try {
    return await rest.get(Routes.userGuilds());
  } catch (error) {
    console.error('Error getting guilds:', error);
    return [];
  }
}

// Main function to unregister all commands
async function unregisterCommands() {
  try {
    // Delete global commands first
    await deleteGlobalCommands();

    // Get all guilds and delete commands from each
    const guilds = await getGuilds();
    console.log(`Found ${guilds.length} guilds.`);

    for (const guild of guilds) {
      await deleteGuildCommands(guild.id);
    }

    console.log('Command removal complete.');
  } catch (error) {
    console.error('Error during command removal:', error);
  }
}

// Run the unregister process
unregisterCommands().then(() => process.exit());
