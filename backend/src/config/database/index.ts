import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DATABASE_URL'] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Variáveis de ambiente faltando para conexão ao banco: ${missingEnv.join(', ')}`);
}

export { sequelize } from '../../db/orm';
