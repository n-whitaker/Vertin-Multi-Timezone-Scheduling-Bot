const {
  MessageFlags,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');
const {createCanvas} = require('canvas');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const {DateTime} = require("luxon");
module.exports = {
  data: new SlashCommandBuilder().setName('view').setDescription("view another person's profile").addUserOption(option => option.setName('user').setDescription('the profile to be viewed').setRequired(true)),
  async execute(interaction) {
    console.log(`user asking: ${interaction.user.name} target user: ${interaction.options.getUser('user').name}`);
    const db = new sqlite3.Database('./timezones.db', (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log('Connected to the SQLite database.');
        const targetUser = interaction.options.getUser('user');
        convertData(db, interaction.user.id, targetUser.id, interaction.guild.id, interaction);
      }
    });
  },
};

function convertData(db, userId, targetUserId, serverId, interaction) {
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
  let firstTimezone = '';
  let secondTimezone = '';

  const serverTable = `server_${serverId}`
  const query = `SELECT * FROM ${serverTable} WHERE userId = ?`;
  const userQuery = `SELECT * FROM users WHERE userId = ?`;

  db.all(userQuery, [userId], (err, firstUserRow) => {
    if (firstUserRow.length === 0) {
      interaction.reply({content: 'no profile found, please do /setup!'})
      return;
    }
    firstTimezone = firstUserRow[0].timezone;
    db.all(userQuery, [targetUserId], (err, secondUserRow) => {
      if (secondUserRow.length === 0) {
        interaction.reply({content: 'target user does not have a profile yet!'})
        return;
      }
      secondTimezone = secondUserRow[0].timezone;
      db.all(query, [targetUserId], (err, tables) => {
        console.log(firstTimezone)
        console.log(secondTimezone)
        if (err) throw err;
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

        const firstTime = DateTime.now().setZone(firstTimezone)
        const secondTime = DateTime.now().setZone(secondTimezone)
        const offsetDiffMinutes = firstTime.offset - secondTime.offset;
        const timeDifference = offsetDiffMinutes / 60;

        createEmbed(db, interaction, convertedState, targetUserId, DateTime.now().setZone(secondTimezone).toFormat('cccc, MMMM d, h:mm a'), timeDifference, firstTimezone);
      });

    })


  })

}

function createEmbed(db, interaction, state, targetUserId, currentTime, timeDifference, firstTimezone) {
  const id = targetUserId
  db.all('SELECT * FROM users WHERE UserId = ?', [id], async (err, userRow) => {

    const imageBuffer = await drawTable(id, state, userRow[0].nickname, firstTimezone);

    const profileEmbed = new EmbedBuilder()
      .setTitle(`${userRow[0].nickname}'s Profile`)
      .addFields({name: '', value: `**Timezone:** ${userRow[0].timezone}`})
      .addFields({name: '', value: `**Current Time:** ${currentTime}`})
      .addFields({name: '', value: `**Time Difference:** ${timeDifference} hours`})
      .setImage('attachment://profile.png');
    await interaction.reply({
      embeds: [profileEmbed],
      files: [{attachment: imageBuffer, name: 'profile.png'}],
    });

  })

}

function drawTable(id, state, name, timezone) {
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
  ctx.fillText(`${name}'s Schedule`, canvasWidth / 2, headerHeight / 2 - 10); // Slightly above center


  ctx.font = 'italic 18px Arial';
  ctx.fillText(`Converted To ${timezone} Time`, canvasWidth / 2, headerHeight / 2 + 15);


  let x = 0;
  for (let c = 0; c < cols; c++) {
    let y = headerHeight;
    for (let r = 0; r < rows; r++) {

      if (r > 0 && c > 0) {
        ctx.fillStyle = state[r - 1][c - 1];
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
