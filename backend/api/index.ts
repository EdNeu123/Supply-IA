import express from 'express';
import cors from 'cors';
import apiRoutes from '../src/routes';
import { errorHandler } from '../src/middlewares/errorHandler';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', message: 'Supply IA API rodando.' }));
app.use('/api', apiRoutes);
app.use(errorHandler);

export default app;
