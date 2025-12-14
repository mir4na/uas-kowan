import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export interface User {
  id: string;
  username: string;
  created_at: Date;
}

export interface Authenticator {
  id: string;
  user_id: string;
  credential_id: Buffer;
  credential_public_key: Buffer;
  counter: number;
  credential_device_type: string;
  credential_backed_up: boolean;
  transports: string;
}

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS authenticators (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_id BYTEA UNIQUE NOT NULL,
        credential_public_key BYTEA NOT NULL,
        counter BIGINT NOT NULL,
        credential_device_type VARCHAR(50) NOT NULL,
        credential_backed_up BOOLEAN NOT NULL,
        transports TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_authenticators_credential_id ON authenticators(credential_id)
    `);
  } finally {
    client.release();
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0] || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createUser(id: string, username: string): Promise<User> {
  const result = await pool.query(
    'INSERT INTO users (id, username) VALUES ($1, $2) RETURNING *',
    [id, username]
  );
  return result.rows[0];
}

export async function getAuthenticatorsByUserId(userId: string): Promise<Authenticator[]> {
  const result = await pool.query('SELECT * FROM authenticators WHERE user_id = $1', [userId]);
  return result.rows;
}

export async function getAuthenticatorByCredentialId(credentialId: Buffer): Promise<Authenticator | null> {
  const result = await pool.query('SELECT * FROM authenticators WHERE credential_id = $1', [credentialId]);
  return result.rows[0] || null;
}

export async function saveAuthenticator(
  userId: string,
  credentialId: Buffer,
  credentialPublicKey: Buffer,
  counter: number,
  deviceType: string,
  backedUp: boolean,
  transports: string[]
): Promise<Authenticator> {
  const result = await pool.query(
    `INSERT INTO authenticators
    (user_id, credential_id, credential_public_key, counter, credential_device_type, credential_backed_up, transports)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [userId, credentialId, credentialPublicKey, counter, deviceType, backedUp, JSON.stringify(transports)]
  );
  return result.rows[0];
}

export async function updateAuthenticatorCounter(credentialId: Buffer, counter: number): Promise<void> {
  await pool.query('UPDATE authenticators SET counter = $1 WHERE credential_id = $2', [counter, credentialId]);
}

export default pool;
