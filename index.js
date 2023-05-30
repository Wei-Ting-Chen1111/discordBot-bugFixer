require("dotenv/config");
const { Client, IntentsBitField } = require("discord.js");
const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");
const axios = require("axios");
const path = require("path");

//create a client
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

//inform us when the bot is running
client.once("ready", () => {
  console.log("The bot is online");
});

//config openai
const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});

const openai = new OpenAIApi(configuration);

// listen for message attachments
client.on("messageCreate", async (message) => {
  if (message.attachments.size > 0) {
    await message.channel.sendTyping();
    const attachment = message.attachments.first();
    if (attachment) {
      const filePath = path.join(__dirname, "code", attachment.name);
      const file = fs.createWriteStream(filePath);
      const response = await axios.get(attachment.url, {
        responseType: "arraybuffer",
      });

      fs.writeFileSync(filePath, response.data);

      // File download is complete, you can read its content now
      const fileContent = fs.readFileSync(filePath, "utf8");

      //ask chat gpt to fix bug

      const result = await fix(fileContent);
      // Clean up the import file
      fs.unlinkSync(filePath);

      // reply the message
      return message.reply(result);
    }
  } else return;
});

const fix = async (code) => {
  let conversationLog = [
    {
      role: "system",
      content: "You are an excellent developer and good at fixing bugs",
    },
    {
      role: "user",
      content: `Review the whole code I provide and check if there is any potential bug,   missing part, or typo that would cuase this app not working from """${code}""" reply the correct code if you find a bug and comment which part you modifed on top of the file. If there is no bug in the code, review the whole code and check if there is any part that can be modify to have better run time or space performance then comment which part you modify and expalin why your code is better then """${code}""". Please conclude the result in the maximum of 1800 characters`,
    },
  ];

  try {
    const result = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: conversationLog,
    });
    return result.data.choices[0].message.content;
  } catch (err) {
    return err.response.data.error.message;
  }
};

//log in the bot
client.login(process.env.TOKEN);
