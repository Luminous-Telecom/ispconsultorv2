import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!client) {
    dotenv.config();
    client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  return client;
}

export const prisma = getPrisma();

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}
