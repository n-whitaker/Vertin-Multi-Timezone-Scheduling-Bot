const {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const {findBestMatch} = require('string-similarity');
const fs = require('fs');
const {DateTime} = require("luxon");
const {createCanvas} = require("canvas");
const sqlite3 = require('sqlite3').verbose();


function dbAllAsync(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  data: new SlashCommandBuilder().setName('compare')
    .setDescription('compare one schedule with another (the timezone used is based off the first user)')
    .addUserOption(option => option.setName('first_user').setDescription('the user schedule to be compared').setRequired(true))
    .addUserOption(option => option.setName('second_user').setDescription('the user schedule to be compared').setRequired(true)),
  async execute(interaction) {

    const db = new sqlite3.Database('./timezones.db', (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log('Connected to the SQLite database.');
        readUserData(db, interaction.options.getUser('first_user').id, interaction.guild.id, interaction.options.getUser('second_user').id, interaction);
      }
    });
  },
};

async function readUserData(db, id, serverId, id2, interaction) {
  let state = [
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
  ];
  let combinedState = [
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
  ];

  const serverTable = `server_${serverId}`
  const query = `SELECT * FROM ${serverTable} WHERE userId = ?`;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const times = ['Morning', 'Afternoon', 'Evening', 'Night'];

  try {

    const firstUserRow = await dbAllAsync(db, query, [id]);
    if (firstUserRow.length === 0) {
      return interaction.reply({content: 'first user profile not found!'});
    }

    for (let timeIndex = 0; timeIndex < times.length; timeIndex++) {
      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const fieldName = days[dayIndex] + times[timeIndex];
        state[timeIndex][dayIndex] = firstUserRow[0][fieldName];

      }
    }


    const secondUserRow = await dbAllAsync(db, query, [id2]);
    if (secondUserRow.length === 0) {
      return interaction.reply({content: 'second user profile not found!'});
    }


    const secondState = await getConvertedTime(db, id, id2, serverId, interaction);


    for (let i = 0; i < times.length; i++) {
      for (let k = 0; k < days.length; k++) {

        combinedState[i][k] = (state[i][k] === 'green' && secondState[i][k] === 'green') ? 'green' : 'red';
      }
    }

    createEmbed(db, interaction, combinedState, id, id2);
  } catch (error) {
    console.error(error);
    if (!interaction.replied) {
      interaction.reply({content: 'An error occurred while comparing schedules.', flags: MessageFlags.Ephemeral});
    }
  }
}

function getConvertedTime(db, userId, targetUserId, serverId, interaction) {
  return new Promise((resolve, reject) => {
    let state = [
      ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
      ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
      ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
      ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    ];
    let convertedState = [
      ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
      ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
      ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
      ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    ];
    let callerTimezone = '';
    let firstTimezone = '';
    let secondTimezone = '';

    const serverTable = `server_${serverId}`
    const query = `SELECT * FROM ${serverTable} WHERE userId = ?`;
    const userQuery = `SELECT * FROM users WHERE userId = ?`;

    db.all(userQuery, [userId], (err, firstUserRow) => {
      if (err) return reject(err);
      if (firstUserRow.length === 0) {
        interaction.reply({content: 'no profile found, please do /setup!'});
        return reject(new Error('No first user profile'));
      }
      firstTimezone = firstUserRow[0].timezone;

      db.all(userQuery, [targetUserId], (err, secondUserRow) => {
        if (err) return reject(err);
        if (secondUserRow.length === 0) {
          interaction.reply({content: 'target user does not have a profile yet!'});
          return reject(new Error('No target user profile'));
        }
        secondTimezone = secondUserRow[0].timezone;

        db.all(query, [targetUserId], (err, tables) => {
          if (err) return reject(err);


          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const times = ['Morning', 'Afternoon', 'Evening', 'Night'];

          for (let timeIndex = 0; timeIndex < times.length; timeIndex++) {
            for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
              const fieldName = days[dayIndex] + times[timeIndex];
              state[timeIndex][dayIndex] = tables[0][fieldName];

              const dayOfWeek = dayIndex + 1;
              let hourOfDay;
              switch (times[timeIndex]) {
                case 'Morning':
                  hourOfDay = 6;
                  break;
                case 'Afternoon':
                  hourOfDay = 12;
                  break;
                case 'Evening':
                  hourOfDay = 18;
                  break;
                case 'Night':
                  hourOfDay = 0;
                  break;
              }

              const localSlot = DateTime.fromObject(
                {weekday: dayOfWeek, hour: hourOfDay},
                {zone: secondTimezone}
              );

              const converted = localSlot.setZone(firstTimezone);

              const newDayIndex = converted.weekday - 1;

              let newTimeIndex;
              const h = converted.hour;
              if (h >= 6 && h < 12) newTimeIndex = 0;
              else if (h >= 12 && h < 18) newTimeIndex = 1;
              else if (h >= 18 && h < 24) newTimeIndex = 2;
              else newTimeIndex = 3;

              convertedState[newTimeIndex][newDayIndex] = tables[0][fieldName];

            }
          }

          const firstTime = DateTime.now().setZone(firstTimezone);
          const secondTime = DateTime.now().setZone(secondTimezone);
          const offsetDiffMinutes = firstTime.offset - secondTime.offset;
          const timeDifference = offsetDiffMinutes / 60;

          resolve(convertedState);
        });
      });
    });
  });
}

function createEmbed(db, interaction, cstate, id, targetUserId) {
  db.all('SELECT * FROM users WHERE UserId = ?', [targetUserId], async (err, secondUserRow) => {
    db.all('SELECT * FROM users WHERE UserId = ?', [id], async (err, userRow) => {
      const firstTimezone = userRow[0].timezone;
      const imageBuffer = await drawTable(id, cstate, userRow[0].nickname, secondUserRow[0].nickname, firstTimezone);

      const profileEmbed = new EmbedBuilder()
        .setImage('attachment://profile.png');
      await interaction.reply({
        embeds: [profileEmbed],
        files: [{attachment: imageBuffer, name: 'profile.png'}],
      });
    })
  })
}

function drawTable(id, cstate, name, secondName, timezone) {
  const headerHeight = 80;
  const rowHeight = 40;
  const rows = 5;
  const cols = 8;

  const tableWidth = 1000;
  const tableHeight = rows * rowHeight;
  const canvasWidth = tableWidth;
  const canvasHeight = headerHeight + tableHeight;

  const colWidths = new Array(cols);
  colWidths[0] = 220;
  const remainingWidth = tableWidth - colWidths[0];
  for (let c = 1; c < cols; c++) {
    colWidths[c] = remainingWidth / 7;
  }

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const times = [
    '',
    'Morning (6AM-12PM)',
    'Afternoon (12PM-6PM)',
    'Evening (6PM-12AM)',
    'Night (12AM-6AM)'
  ];

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 30px Arial';
  ctx.fillText(`Schedule Comparison of ${name} & ${secondName}`, canvasWidth / 2, headerHeight / 2 - 10);

  ctx.font = 'italic 18px Arial';
  ctx.fillText(`Converted To ${timezone} Time`, canvasWidth / 2, headerHeight / 2 + 15);

  let x = 0;
  for (let c = 0; c < cols; c++) {
    let y = headerHeight;
    for (let r = 0; r < rows; r++) {
      if (r > 0 && c > 0) {
        ctx.fillStyle = cstate[r - 1][c - 1];
        ctx.fillRect(x, y, colWidths[c], rowHeight);
      }

      ctx.strokeRect(x, y, colWidths[c], rowHeight);

      if (r === 0) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(days[c], x + colWidths[c] / 2, y + rowHeight / 2);
      }

      if (c === 0) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(times[r], x + colWidths[c] / 2, y + rowHeight / 2);
      }

      y += rowHeight;
    }
    x += colWidths[c];
  }

  return canvas.toBuffer('image/png');
}
