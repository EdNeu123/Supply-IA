import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY',
  'TELEGRAM_BOT_TOKEN', 'BOT_USERNAME', 'TELEGRAM_WEBHOOK_URL', 'TELEGRAM_WEBHOOK_SECRET',
  'GEMINI_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`🚨 Erro Fatal: Variável de ambiente ${envVar} não definida.`);
    process.exit(1);
  }
}

export const env = {
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID as string,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') as string,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN as string,
    botUsername: process.env.BOT_USERNAME as string,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL as string,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET as string,
  },
  gemini: { apiKey: process.env.GEMINI_API_KEY as string },
};
