import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(process.env.TAX_ID_ENCRYPTION_KEY!, 'hex');

export function encryptTaxId(plain: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptTaxId(stored: string): string {
  const [ivHex, encHex] = stored.split(':');
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

export function maskTaxId(stored: string): string {
  const plain = decryptTaxId(stored);
  return `***-**-${plain.slice(-4)}`;
}
