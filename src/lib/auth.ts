import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db';

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  verified?: number;
  verification_token?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export function createToken(userId: number): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: number };
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const query = db.prepare('SELECT id, email, name, created_at, verified, verification_token FROM users WHERE email = ?');
  return (query.get(email) as User | undefined) || null;
}

export async function getUserById(id: number): Promise<User | null> {
  const query = db.prepare('SELECT id, email, name, created_at, verified, verification_token FROM users WHERE id = ?');
  return (query.get(id) as User | undefined) || null;
}

export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const hashedPassword = await hashPassword(password);
  const insert = db.prepare(
    'INSERT INTO users (email, password, name) VALUES (?, ?, ?)'
  );
  
  const result = insert.run(email, hashedPassword, name);
  const user = await getUserById(result.lastInsertRowid as number);
  
  if (!user) throw new Error('Failed to create user');
  return user;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  const query = db.prepare('SELECT * FROM users WHERE email = ?');
  const user = query.get(email) as any;
  
  if (!user) return null;
  
  const passwordMatch = await verifyPassword(password, user.password);
  if (!passwordMatch) return null;
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
    verified: user.verified,
    verification_token: user.verification_token,
  };
}

export async function updateUserPassword(email: string, newPassword: string): Promise<void> {
  if (!email || !newPassword) {
    throw new Error('Email and new password are required');
  }
  const hashedPassword = await hashPassword(newPassword);
  const update = db.prepare('UPDATE users SET password = ? WHERE email = ?');
  update.run(hashedPassword, email);

}