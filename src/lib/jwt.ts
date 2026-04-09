import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
}

const SECRET = process.env.JWT_SECRET!;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign({ sub: payload.sub, role: payload.role }, SECRET, {
    expiresIn: EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
  return { sub: decoded.sub as string, role: decoded.role as Role };
}
