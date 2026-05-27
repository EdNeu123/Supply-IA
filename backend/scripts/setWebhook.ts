import axios from 'axios';
import { env } from '../src/config/env';

(async () => {
  try {
    const { data } = await axios.post(
      `https://api.telegram.org/bot${env.telegram.botToken}/setWebhook`,
      { url: env.telegram.webhookUrl, secret_token: env.telegram.webhookSecret }
    );
    console.log('✅ Webhook configurado:', data);
  } catch (error: any) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
})();
