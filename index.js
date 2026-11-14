// Require the necessary discord.js classes
const fs = require('node:fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { token } = require('./config.json');
const userSelections = new Map();
let name = '';
let timezone = '';
// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

function createUserTable(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT PRIMARY KEY NOT NULL,
      nickname TEXT NOT NULL,
      timezone TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Table created successfully or already exists.');
    }
  });
}

function createServerTable(database, serverId) {

  const tableName = `server_${serverId}`;

  const sql = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      userId TEXT PRIMARY KEY NOT NULL,
      MondayMorning TEXT NOT NULL,
      MondayAfternoon TEXT NOT NULL,
      MondayEvening TEXT NOT NULL,
      MondayNight TEXT NOT NULL,
      TuesdayMorning TEXT NOT NULL,
      TuesdayAfternoon TEXT NOT NULL,
      TuesdayEvening TEXT NOT NULL,
      TuesdayNight TEXT NOT NULL,
      WednesdayMorning TEXT NOT NULL,
      WednesdayAfternoon TEXT NOT NULL,
      WednesdayEvening TEXT NOT NULL,
      WednesdayNight TEXT NOT NULL,
      ThursdayMorning TEXT NOT NULL,
      ThursdayAfternoon TEXT NOT NULL,
      ThursdayEvening TEXT NOT NULL,
      ThursdayNight TEXT NOT NULL,
      FridayMorning TEXT NOT NULL,
      FridayAfternoon TEXT NOT NULL,
      FridayEvening TEXT NOT NULL,
      FridayNight TEXT NOT NULL,
      SaturdayMorning TEXT NOT NULL,
      SaturdayAfternoon TEXT NOT NULL,
      SaturdayEvening TEXT NOT NULL,
      SaturdayNight TEXT NOT NULL,
      SundayMorning TEXT NOT NULL,
      SundayAfternoon TEXT NOT NULL,
      SundayEvening TEXT NOT NULL,
      SundayNight TEXT NOT NULL
    )
  `;

  database.run(sql, (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`Table "${tableName}" created successfully or already exists.`);
    }
  });
}

function addUserToDB(id, name, timezone, monday, tuesday, wednesday, thursday, friday, saturday, sunday, serverId) {
  console.log({
    userId: id,
    name: name,
    timezone: timezone,
    monday: monday,
    tuesday: tuesday,
    wednesday: wednesday,
    thursday: thursday,
    friday: friday,
    saturday: saturday,
    sunday: sunday,
  })
  const db = new sqlite3.Database('./timezones.db', (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Connected to the SQLite database.');

      createUserTable(db);
      createServerTable(db, serverId);

      const sql = `REPLACE INTO users (userId, nickname, timezone) VALUES (?, ?, ?)`;
      const params = [id, name, timezone];

      db.run(sql, params, function(err) {
        if (err) {
          return console.error(err.message);
        }

        console.log(`A row has been REPLACEed with rowid ${this.lastID}`);
      });

      let states = [id];

      if(monday === undefined) monday = [];
      if(tuesday === undefined) tuesday = [];
      if(wednesday === undefined) wednesday = [];
      if(thursday === undefined) thursday = [];
      if(friday === undefined) friday = [];
      if(saturday === undefined) saturday = [];
      if(sunday === undefined) sunday = [];

      states.push(monday.includes('Morning') ? 'green' : 'red');
      states.push(monday.includes('Afternoon') ? 'green' : 'red');
      states.push(monday.includes('Evening') ? 'green' : 'red');
      states.push(monday.includes('Night') ? 'green' : 'red');

      states.push(tuesday.includes('Morning') ? 'green' : 'red');
      states.push(tuesday.includes('Afternoon') ? 'green' : 'red');
      states.push(tuesday.includes('Evening') ? 'green' : 'red');
      states.push(tuesday.includes('Night') ? 'green' : 'red');

      states.push(wednesday.includes('Morning') ? 'green' : 'red');
      states.push(wednesday.includes('Afternoon') ? 'green' : 'red');
      states.push(wednesday.includes('Evening') ? 'green' : 'red');
      states.push(wednesday.includes('Night') ? 'green' : 'red');

      states.push(thursday.includes('Morning') ? 'green' : 'red');
      states.push(thursday.includes('Afternoon') ? 'green' : 'red');
      states.push(thursday.includes('Evening') ? 'green' : 'red');
      states.push(thursday.includes('Night') ? 'green' : 'red');

      states.push(friday.includes('Morning') ? 'green' : 'red');
      states.push(friday.includes('Afternoon') ? 'green' : 'red');
      states.push(friday.includes('Evening') ? 'green' : 'red');
      states.push(friday.includes('Night') ? 'green' : 'red');

      states.push(saturday.includes('Morning') ? 'green' : 'red');
      states.push(saturday.includes('Afternoon') ? 'green' : 'red');
      states.push(saturday.includes('Evening') ? 'green' : 'red');
      states.push(saturday.includes('Night') ? 'green' : 'red');

      states.push(sunday.includes('Morning') ? 'green' : 'red');
      states.push(sunday.includes('Afternoon') ? 'green' : 'red');
      states.push(sunday.includes('Evening') ? 'green' : 'red');
      states.push(sunday.includes('Night') ? 'green' : 'red');
      const tableName = `server_${serverId}`;
      const sql2 = `REPLACE INTO ${tableName} (userId, MondayMorning, MondayAfternoon, MondayEvening, MondayNight, TuesdayMorning, TuesdayAfternoon, TuesdayEvening, TuesdayNight, WednesdayMorning, WednesdayAfternoon, WednesdayEvening, WednesdayNight, ThursdayMorning, ThursdayAfternoon, ThursdayEvening, ThursdayNight, FridayMorning, FridayAfternoon, FridayEvening, FridayNight, SaturdayMorning, SaturdayAfternoon, SaturdayEvening, SaturdayNight, SundayMorning, SundayAfternoon, SundayEvening, SundayNight) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
      const params2 = [
        'eu',
        'red', 'red', 'red', 'red',  // Monday
        'red', 'red', 'red', 'red',  // Tuesday
        'red', 'red', 'green', 'green',  // Wednesday
        'red', 'red', 'red', 'red',  // Thursday
        'red', 'red', 'red', 'red',  // Friday
        'red', 'red', 'red', 'red',  // Saturday
        'red', 'red', 'red', 'red'   // Sunday
      ];

      db.run(sql2, states, function(err) {
        if (err) {
          return console.error(err.message);
        }

        console.log(`A row has been REPLACEed with rowid ${this.lastID}`);
      });


    }

  });
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
  });
}

client.on(Events.InteractionCreate, async (interaction) => {
  if(interaction.isModalSubmit()) {
    name = interaction.fields.getTextInputValue('nicknameInput');
    timezone = interaction.fields.getTextInputValue('timezoneInput');
    console.log({name, timezone});
  }
  if(interaction.isStringSelectMenu()) {
    const day = interaction.customId;
    const userId = interaction.user.id;
    const selectedTimes = interaction.values;
    const userData = userSelections.get(userId) || {};
    userData[day] = selectedTimes;
    userSelections.set(userId, userData);
    await interaction.deferUpdate();
  }
  const saturday = new StringSelectMenuBuilder()
    .setCustomId('saturday')
    .setMinValues(0)
    .setMaxValues(4)
    .setPlaceholder('Saturday Availability')
    .addOptions(
      // String select menu options
      new StringSelectMenuOptionBuilder()
        // Label displayed to user
        .setLabel('Morning')
        // Description of option
        .setDescription('6am to 12am')
        // Value returned in select menu interaction
        .setValue('Morning'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Afternoon')
        .setDescription('12pm to 6pm')
        .setValue('Afternoon'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Evening')
        .setDescription('6pm to 12pm')
        .setValue('Evening'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Night')
        .setDescription('12am to 6am')
        .setValue('Night'),
    );
  const sunday = new StringSelectMenuBuilder()
    .setCustomId('sunday')
    .setMinValues(0)
    .setMaxValues(4)
    .setPlaceholder('Sunday Availability')
    .addOptions(
      // String select menu options
      new StringSelectMenuOptionBuilder()
        // Label displayed to user
        .setLabel('Morning')
        // Description of option
        .setDescription('6am to 12am')
        // Value returned in select menu interaction
        .setValue('Morning'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Afternoon')
        .setDescription('12pm to 6pm')
        .setValue('Afternoon'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Evening')
        .setDescription('6pm to 12pm')
        .setValue('Evening'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Night')
        .setDescription('12am to 6am')
        .setValue('Night'),
    );
  const friday = new StringSelectMenuBuilder()
    .setCustomId('friday')
    .setMinValues(0)
    .setMaxValues(4)
    .setPlaceholder('Friday Availability')
    .addOptions(
      // String select menu options
      new StringSelectMenuOptionBuilder()
        // Label displayed to user
        .setLabel('Morning')
        // Description of option
        .setDescription('6am to 12am')
        // Value returned in select menu interaction
        .setValue('Morning'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Afternoon')
        .setDescription('12pm to 6pm')
        .setValue('Afternoon'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Evening')
        .setDescription('6pm to 12pm')
        .setValue('Evening'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Night')
        .setDescription('12am to 6am')
        .setValue('Night'),
    );
  const submitButton = new ButtonBuilder()
    .setCustomId('submitButton')
    .setLabel('Submit')
    .setStyle(ButtonStyle.Primary);
  const sun = new ActionRowBuilder().addComponents(sunday);
  const sat = new ActionRowBuilder().addComponents(saturday);
  const fri = new ActionRowBuilder().addComponents(friday);
  const submitBtn = new ActionRowBuilder().addComponents(submitButton);
  if(interaction.customId === 'nextPage') {
    await interaction.update(
      {
        content: 'Set Your Schedule\nPage 2/2',
        components: [fri, sun, sat, submitBtn],
        flags: MessageFlags.Ephemeral,
      }
    )
  }
  if(interaction.customId === 'submitButton') {
    await interaction.update(
      {
        content: 'Setup Complete! Use /profile to view you profile!',
        components: [],
        flags: MessageFlags.Ephemeral,
      }
    )
    if(name.length === 0) {
      name = interaction.user.globalName;
      console.log(name)
    }
    const userDataToBeAdded = userSelections.get(interaction.user.id);
    addUserToDB(interaction.user.id, name, timezone, userDataToBeAdded['monday'], userDataToBeAdded['tuesday'], userDataToBeAdded['wednesday'], userDataToBeAdded['thursday'], userDataToBeAdded['friday'], userDataToBeAdded['saturday'], userDataToBeAdded['sunday'], interaction.guild.id);
  }
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId === 'setupModal') {
    const monday = new StringSelectMenuBuilder()
      .setCustomId('monday')
      .setMinValues(0)
      .setMaxValues(4)
      .setPlaceholder('Monday Availability')
      .addOptions(
        // String select menu options
        new StringSelectMenuOptionBuilder()
          // Label displayed to user
          .setLabel('Morning')
          // Description of option
          .setDescription('6am to 12am')
          // Value returned in select menu interaction
          .setValue('Morning'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Afternoon')
          .setDescription('12pm to 6pm')
          .setValue('Afternoon'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Evening')
          .setDescription('6pm to 12pm')
          .setValue('Evening'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Night')
          .setDescription('12am to 6am')
          .setValue('Night'),
      );
    const tuesday = new StringSelectMenuBuilder()
      .setCustomId('tuesday')
      .setMinValues(0)
      .setMaxValues(4)
      .setPlaceholder('Tuesday Availability')
      .addOptions(
        // String select menu options
        new StringSelectMenuOptionBuilder()
          // Label displayed to user
          .setLabel('Morning')
          // Description of option
          .setDescription('6am to 12am')
          // Value returned in select menu interaction
          .setValue('Morning'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Afternoon')
          .setDescription('12pm to 6pm')
          .setValue('Afternoon'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Evening')
          .setDescription('6pm to 12pm')
          .setValue('Evening'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Night')
          .setDescription('12am to 6am')
          .setValue('Night'),
      );
    const wednesday = new StringSelectMenuBuilder()
      .setCustomId('wednesday')
      .setMinValues(0)
      .setMaxValues(4)
      .setPlaceholder('Wednesday Availability')
      .addOptions(
        // String select menu options
        new StringSelectMenuOptionBuilder()
          // Label displayed to user
          .setLabel('Morning')
          // Description of option
          .setDescription('6am to 12am')
          // Value returned in select menu interaction
          .setValue('Morning'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Afternoon')
          .setDescription('12pm to 6pm')
          .setValue('Afternoon'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Evening')
          .setDescription('6pm to 12pm')
          .setValue('Evening'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Night')
          .setDescription('12am to 6am')
          .setValue('Night'),
      );
    const thursday = new StringSelectMenuBuilder()
      .setCustomId('thursday')
      .setMinValues(0)
      .setMaxValues(4)
      .setPlaceholder('Thursday Availability')
      .addOptions(
        // String select menu options
        new StringSelectMenuOptionBuilder()
          // Label displayed to user
          .setLabel('Morning')
          // Description of option
          .setDescription('6am to 12am')
          // Value returned in select menu interaction
          .setValue('Morning'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Afternoon')
          .setDescription('12pm to 6pm')
          .setValue('Afternoon'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Evening')
          .setDescription('6pm to 12pm')
          .setValue('Evening'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Night')
          .setDescription('12am to 6am')
          .setValue('Night'),
      );
    const button = new ButtonBuilder()
      .setCustomId('nextPage')
      .setLabel('Next Page')
      .setStyle(ButtonStyle.Primary);

    const mon = new ActionRowBuilder().addComponents(monday);
    const tues = new ActionRowBuilder().addComponents(tuesday);
    const weds = new ActionRowBuilder().addComponents(wednesday);
    const thurs = new ActionRowBuilder().addComponents(thursday);
    const buttonRow = new ActionRowBuilder().addComponents(button);
    await interaction.reply({
      content: 'Set Your Schedule\nPage 1/2',
      components: [mon, tues, weds, thurs, buttonRow],
      flags: MessageFlags.Ephemeral,
    });
  }
});
// Log in to Discord with your client's token
client.login(token);
