import crypto from 'crypto';
const algorithm='aes-256-gcm';
function key(){const secret=process.env.NEXTAUTH_SECRET;if(!secret)throw new Error('NEXTAUTH_SECRET is missing');return crypto.createHash('sha256').update(secret).digest();}
export function encryptSensitive(value:string){const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv(algorithm,key(),iv);const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);const tag=cipher.getAuthTag();return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;}
export function decryptSensitive(payload:string){const [ivB,tagB,dataB]=payload.split('.');if(!ivB||!tagB||!dataB)throw new Error('Invalid encrypted value');const decipher=crypto.createDecipheriv(algorithm,key(),Buffer.from(ivB,'base64'));decipher.setAuthTag(Buffer.from(tagB,'base64'));return Buffer.concat([decipher.update(Buffer.from(dataB,'base64')),decipher.final()]).toString('utf8');}
