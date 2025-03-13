// Load environment variables
require('dotenv').config();

// Import required modules
const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const PORT = process.env.PORT || '8080';

// Create healthcheck server
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      pid: process.pid
    }));
    return;
  }
  res.writeHead(404);
  res.end();
  return;
});

healthServer.listen(PORT, () => {
  console.log(`Healthcheck server running on port ${PORT}`);
});

// Create a new Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Create a collection for commands
client.commands = new Collection();

// Load command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Register commands
const commands = [];
const adminCommands = [];
const regularCommands = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    
    // Separate admin commands from regular commands
    const commandName = command.data.name;
    if (commandName === 'manage-users' || commandName === 'admin-list-issues') {
      adminCommands.push(command.data.toJSON());
    } else {
      regularCommands.push(command.data.toJSON());
    }
    
    // Add all commands to the full commands array
    commands.push(command.data.toJSON());
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Register slash commands with Discord API
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Function to register admin commands for a specific guild with permissions
async function registerGuildCommands(guildId) {
  try {
    // Check if guild has an owner
    const hasGuildOwner = await hasOwner(guildId);
    
    // If there's an owner, register admin commands with permissions
    if (hasGuildOwner) {
      // Create admin commands with default permissions set to 0 (hidden)
      const adminCommandsWithPermissions = adminCommands.map(cmd => ({
        ...cmd,
        default_member_permissions: "0" // Hide from users without permissions
      }));
      
      // Register admin commands with permissions
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: adminCommandsWithPermissions }
      );
      
      console.log(`Registered admin commands for guild ${guildId} with permissions`);
    }
  } catch (error) {
    console.error(`Error registering commands for guild ${guildId}:`, error);
  }
}

// When the client is ready, run this code (only once)
client.once('ready', async () => {
  try {
    console.log('Started refreshing application commands.');
    
    // Register global commands (only regular commands)
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: regularCommands }
    );
    
    console.log('Successfully registered global commands.');
    console.log(`Logged in as ${client.user.tag}!`);
  } catch (error) {
    console.error(error);
  }
});

// When the bot joins a new guild
client.on('guildCreate', async guild => {
  console.log(`Joined new guild: ${guild.name} (${guild.id})`);
  await registerGuildCommands(guild.id);
});

// Import utilities
const { hasOwner, isAdminOrOwner } = require('./utils/admin');
const { createGitHubClient } = require('./utils/github');
const { addUserIssue } = require('./utils/storage');

// Handle command interactions
client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      // Execute the command
      await command.execute(interaction);
      
      // Register guild commands if this was a register-bot command
      if (interaction.commandName === 'register-bot') {
        await registerGuildCommands(interaction.guildId);
      }
    } catch (error) {
      console.error('Error executing command:', error);
    }
  } else if (interaction.isModalSubmit() && interaction.customId === 'issue-form') {
    try {
      // Acknowledge the interaction immediately to prevent timeout
      await interaction.deferReply({ ephemeral: true });
      
      // Get stored data
      const storedData = interaction.client.tempStorage.get(interaction.user.id);
      if (!storedData) {
        await interaction.editReply({
          content: 'Error: Could not find stored issue data. Please try creating the issue again.',
        });
        return;
      }
      const { title, repository } = storedData;
      
      const whatHappened = interaction.fields.getTextInputValue('what-happened');
      const stepsToReproduce = interaction.fields.getTextInputValue('steps');

      // Get form values
      const operatingSystem = interaction.fields.getTextInputValue('operating-system');
      
      // Validate operating system
      const validOS = ['OSX', 'Windows', 'Linux'];
      if (!validOS.includes(operatingSystem)) {
        await interaction.editReply({
          content: `Invalid operating system. Please enter one of: ${validOS.join(', ')}`,
        });
        return;
      }
      const clineVersion = interaction.fields.getTextInputValue('cline-version');

      // Format the issue body
      const body = `### What happened?
${whatHappened}

### Steps to reproduce
${stepsToReproduce}

### Operating System
${operatingSystem}

### Cline Version
${clineVersion}

*Created via Discord by ${interaction.user.tag}*`;

      // Create GitHub client
      const octokit = await createGitHubClient();
      const [owner, repo] = repository.split('/');

      // Create the issue on GitHub
      const { data: issue } = await octokit.issues.create({
        owner,
        repo,
        title,
        body,
      });

      // Add the issue to the user's stored issues
      issue.repository = repository;
      await addUserIssue(interaction.user.id, issue);

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

      await interaction.editReply({ embeds: [embed] });

      // Clean up stored data
      interaction.client.tempStorage.delete(interaction.user.id);
    } catch (error) {
      console.error('Error handling modal submit:', error);
      // Check if the interaction has already been acknowledged
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: 'An error occurred while creating the issue. Please try again later.',
        });
      } else {
        await interaction.reply({
          content: 'An error occurred while creating the issue. Please try again later.',
          ephemeral: true
        });
      }
    }
  }
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
