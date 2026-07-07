#!/usr/bin/env node
'use strict';

/**
 * Aplica e-mail e senha do SuperAdmin SaaS após as migrations (install.sh).
 * Uso: SAAS_SUPER_EMAIL=... SAAS_SUPER_PASSWORD=... node scripts/configure-install-users.js
 * (executar com cwd em backend/ para resolver bcryptjs/mysql2)
 */

const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const email = process.env.SAAS_SUPER_EMAIL?.trim();
const password = process.env.SAAS_SUPER_PASSWORD;

if (!email || !password) {
  console.error('Erro: SAAS_SUPER_EMAIL e SAAS_SUPER_PASSWORD são obrigatórios.');
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Erro: SAAS_SUPER_EMAIL inválido.');
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const senhaHash = await bcrypt.hash(password, 12);

  const [rows] = await conn.execute(
    'SELECT id FROM saas_usuarios_super WHERE nivel_acesso = ? ORDER BY id LIMIT 1',
    ['super'],
  );

  if (rows.length > 0) {
    await conn.execute(
      `UPDATE saas_usuarios_super
       SET email = ?, senha_hash = ?, precisa_trocar_senha = 0, ativo = 1, updated_at = NOW()
       WHERE id = ?`,
      [email, senhaHash, rows[0].id],
    );
    console.log(`SuperAdmin SaaS atualizado (id=${rows[0].id}).`);
  } else {
    await conn.execute(
      `INSERT INTO saas_usuarios_super
       (nome, email, senha_hash, nivel_acesso, precisa_trocar_senha, ativo, created_at, updated_at)
       VALUES (?, ?, ?, 'super', 0, 1, NOW(), NOW())`,
      ['Super Administrador', email, senhaHash],
    );
    console.log('SuperAdmin SaaS criado.');
  }

  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
