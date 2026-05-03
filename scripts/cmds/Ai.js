const axios = require('axios');

// Configuration du service Gemini
const services = [
  {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    param: { key: 'prompt' },
    apiKey: 'AIzaSyA8ANmlCPbKxdXBY1-G6SPphDhivLBUdL0', // Remplacez par votre clé API Gemini
    isCustom: true
  }
];

// Fonction pour appeler un service spécifique (Gemini dans ce cas)
async function callService(service, prompt) {
  if (service.isCustom) {
    const requestPayload = {
      prompt: {
        messages: [{ author: 'user', content: prompt }]
      },
      temperature: 0.9, // Contrôle de la créativité
    };

    try {
      const response = await axios.post(
        `${service.url}?key=${service.apiKey}`,
        requestPayload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data.candidates[0]?.content || 'Je n’ai pas pu générer de réponse.';
    } catch (error) {
      console.error(`Erreur avec le service Gemini (${service.url}): ${error.message}`);
      throw new Error(`Erreur avec Gemini: ${error.message}`);
    }
  }
}

// Fonction pour obtenir la réponse la plus rapide
async function getFastestValidAnswer(prompt) {
  const promises = services.map(service => callService(service, prompt));
  const results = await Promise.allSettled(promises);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
  }
  throw new Error('Tous les services ont échoué à fournir une réponse valide.');
}

// Préfixes pour déclencher l'IA
const prefixes = ['ai', '-ai'];

module.exports = {
  config: {
    name: 'ai',
    version: '1.0.1',
    author: 'Metoushela Walker', // Nom du développeur
    role: 0,
    category: 'ai',
    longDescription: {
      en: 'This is a large AI language model trained by OpenAI and integrated with Gemini. It is designed to assist with a wide range of tasks.',
    },
    guide: {
      en: '\nAi <question>\n\n🔎 𝗚𝘂𝗶𝗱𝗲\nExample: Ai what is the capital of France?',
    },
  },

  langs: {
    en: {
      final: '',
      header: '🧋✨ | 𝐌𝐢𝐧𝐚𝐭𝐨\n━━━━━━━━━━━━━━━━',
      footer: '━━━━━━━━━━━━━━━━',
    },
  },

  onStart: async function () {
    console.log('AI module successfully started by Metoushela Walker.');
  },

  onChat: async function ({ api, event, args, getLang, message }) {
    try {
      const prefix = prefixes.find(p => event.body && event.body.toLowerCase().startsWith(p));
      let prompt;

      // Gestion des réponses aux messages
      if (event.type === 'message_reply') {
        const replyMessage = event.messageReply;

        if (replyMessage.body && replyMessage.body.startsWith(getLang("header"))) {
          prompt = event.body.trim();
          prompt = `${replyMessage.body}\n\nUser reply: ${prompt}`;
        } else {
          return;
        }
      } else if (prefix) {
        prompt = event.body.substring(prefix.length).trim() || 'hello';
      } else {
        return;
      }

      // Gérer le message de salutation
      if (prompt === 'hello') {
        const greetingMessage = `${getLang("header")}\nHello! How can I assist you today?\n${getLang("footer")}`;
        api.sendMessage(greetingMessage, event.threadID, event.messageID);
        console.log('Sent greeting message as a reply to user');
        return;
      }

      // Obtenir la réponse depuis Gemini
      try {
        const fastestAnswer = await getFastestValidAnswer(prompt);
        const finalMsg = `${getLang("header")}\n${fastestAnswer}\n${getLang("footer")}`;
        api.sendMessage(finalMsg, event.threadID, event.messageID);
        console.log('Sent answer as a reply to user');
      } catch (error) {
        console.error(`Failed to get answer: ${error.message}`);
        api.sendMessage(`${error.message}.`, event.threadID, event.messageID);
      }
    } catch (error) {
      console.error(`Failed to process chat: ${error.message}`);
      api.sendMessage(`${error.message}.`, event.threadID, event.messageID);
    }
  },
};
