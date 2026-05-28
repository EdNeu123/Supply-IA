import cors from 'cors';
import express from 'express';
import { errorHandler } from '../src/middlewares/errorHandler';
import apiRoutes from '../src/routes';

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://supply-ia.web.app',
    'https://supply-ia.firebaseapp.com'
  ]
}));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', message: 'Supply IA API rodando.' }));
app.use('/api', apiRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Supply IA API rodando na porta ${PORT}`);
});

export default app;
