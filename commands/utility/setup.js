const {LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder} = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder().setName('setup').setDescription('set your information in the bot'),
    async execute(interaction) {

        const modal = new ModalBuilder()
            .setCustomId('setupModal')
            .setTitle('Setup');


        const nicknameInput = new TextInputBuilder()
            .setCustomId('nicknameInput')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your preferred name (optional)')
            .setRequired(false);

        const timezoneInput = new TextInputBuilder()
            .setCustomId('timezoneInput')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('enter your timezone')
            .setRequired(true);

        const noteInput = new TextInputBuilder()
            .setCustomId('noteInput')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('enter your note')
            .setRequired(true);

        const timezoneLabel = new LabelBuilder()
            .setLabel('IANA Timezone')
            .setDescription('find your timezone at otakupug.github.io/timezonefinder')
            .setTextInputComponent(timezoneInput)
        const nicknameLabel = new LabelBuilder()
            .setLabel('Nickname')
            .setDescription('what would you like to be called')
            .setTextInputComponent(nicknameInput)
        const noteLabel = new LabelBuilder()
            .setLabel('Profile Note')
            .setDescription('note to be displayed on your profile')
            .setTextInputComponent(noteInput)


        modal.addLabelComponents(timezoneLabel, nicknameLabel, noteLabel);


        await interaction.showModal(modal);
    },
};
