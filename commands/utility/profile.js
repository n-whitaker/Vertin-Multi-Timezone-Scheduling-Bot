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

module.exports = {
  data: new SlashCommandBuilder().setName('profile').setDescription('view your own profile'),
  async execute(interaction) {
    const db = new sqlite3.Database('./timezones.db', (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log('Connected to the SQLite database.');

        readUserData(db, interaction.user.id, interaction.guild.id, interaction);
      }
    });
  },
};

function createEmbed(db, interaction, state) {
  const id = interaction.user.id
  db.all('SELECT * FROM users WHERE UserId = ?', [id], async (err, userRow) => {

    const imageBuffer = await drawTable(id, state, userRow[0].nickname);

    const profileEmbed = new EmbedBuilder()
      .setTitle(`${userRow[0].nickname}'s Profile`)
      .addFields({name: '', value: `**Timezone:** ${userRow[0].timezone}`})
      .setImage('attachment://profile.png');
    await interaction.reply({
      embeds: [profileEmbed],
      files: [{attachment: imageBuffer, name: 'profile.png'}],
    });

  })

}

function readUserData(db, id, serverId, interaction) {
  let state = [
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
    ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
  ];
  const serverTable = `server_${serverId}`
  const query = `SELECT * FROM ${serverTable} WHERE userId = ?`;


  db.all(query, [id], (err, tables) => {
    if (tables.length === 0) {
      interaction.reply({content: 'no profile found, please do /setup!'})
      return;
    }
    if (err) throw err;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const times = ['Morning', 'Afternoon', 'Evening', 'Night'];

    for (let timeIndex = 0; timeIndex < times.length; timeIndex++) {
      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const fieldName = days[dayIndex] + times[timeIndex];
        state[timeIndex][dayIndex] = tables[0][fieldName];
      }
    }
    createEmbed(db, interaction, state);
  });
}

function drawTable(id, state, name) {
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
  ctx.fillText(`${name}'s Schedule`, canvasWidth / 2, headerHeight / 2 - 10);


  ctx.font = 'italic 18px Arial';
  ctx.fillText('', canvasWidth / 2, headerHeight / 2 + 15);


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
