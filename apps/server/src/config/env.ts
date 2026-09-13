import dotenv from 'dotenv';
import path from 'path';

// Load .env file from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  LOCAL_SERVER_IP: process.env.LOCAL_SERVER_IP || '192.168.1.100',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://sfoss_admin:SfossFury2026Password!@localhost:5432/sfoss_fury_db?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'SFOSS_FURY_LOCAL_SUPER_SECRET_KEY_2026',
  SHUFFLE_SALT: process.env.SHUFFLE_SALT || 'SFOSS_FURY_SHUFFLE_SALT_SECRET_2026',
  ALLOW_EXTERNAL_CALLS: process.env.ALLOW_EXTERNAL_CALLS === 'true',
  ENABLE_TEST_ROOM: process.env.ENABLE_TEST_ROOM === 'true',
};
