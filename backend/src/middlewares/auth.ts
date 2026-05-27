import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebaseAdmin';

export interface AuthRequest extends Request { user?: { uid: string }; }

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token de autenticação ausente ou inválido.' });

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = { uid: decodedToken.uid };
    next();
  } catch {
    res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
};
