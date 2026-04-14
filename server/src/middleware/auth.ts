import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'admin' | 'engineer' | 'field_officer';

export interface AuthPayload {
  sub: string;
  role: Role;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

const SECRET = () => process.env.JWT_SECRET || 'dev-insecure-change-me';

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, SECRET(), { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, SECRET()) as AuthPayload;
  } catch {
    return null;
  }
}

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    const p = verifyToken(h.slice(7));
    if (p) req.auth = p;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const p = verifyToken(h.slice(7));
  if (!p) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  req.auth = p;
  next();
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
