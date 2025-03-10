// Load environment variables
require('dotenv').config();

// Import required modules
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Check if required environment variables are set
if (!process.env.DISCORD_TOKEN) {
  console.error('Error: DISCORD_TOKEN is not set in the .env file');
  process.exit(1);
}

if (!process.env.DISCORD_CLIENT_ID) {
  console.error('Error: DISCORD_CLIENT_ID is not set in the .env file');
  process.exit(1);
}

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Load command files
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`Loaded command: ${command.data.name}`);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Register commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // Register commands globally
    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
})();
