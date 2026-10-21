'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const AVISO_INDICE_UNICO =
  /^A unique constraint covering the columns `\[[^\]]+\]` on the table `[^`]+` will be added\. If there are existing duplicate values, this will fail\.$/;

/**
 * O Prisma trata índice único novo como perda de dados. Esse aviso não apaga
 * linha: se houver duplicata, o próprio banco recusa o índice. Remoção de
 * coluna ou tabela continua sem --accept-data-loss.
 */
function avisosDePerdaSaoSoIndiceUnico(saida) {
  const texto = String(saida || '').replace(/\u001b\[[0-9;]*m/g, '');
  if (!texto.includes('accept-data-loss')) return false;

  const avisos = [...texto.matchAll(/•\s+([^\n]+)/g)].map((item) => item[1].trim());
  if (avisos.length === 0) return false;

  return avisos.every((aviso) => AVISO_INDICE_UNICO.test(aviso));
}

function executarPrisma(args) {
  const backendRoot = path.join(__dirname, '..');
  const prismaBin = path.join(backendRoot, 'node_modules', '.bin', 'prisma');
  const resultado = spawnSync(prismaBin, args, {
    cwd: backendRoot,
    encoding: 'utf8',
    env: process.env,
  });

  if (resultado.stdout) process.stdout.write(resultado.stdout);
  if (resultado.stderr) process.stderr.write(resultado.stderr);
  if (resultado.error) process.stderr.write(`${resultado.error.message}\n`);

  return resultado;
}

function main() {
  const primeiro = executarPrisma(['db', 'push']);
  if ((primeiro.status ?? 1) === 0) return;

  const saida = [primeiro.stdout, primeiro.stderr, primeiro.error && primeiro.error.message]
    .filter(Boolean)
    .join('\n');

  if (!avisosDePerdaSaoSoIndiceUnico(saida)) {
    process.exit(primeiro.status == null ? 1 : primeiro.status);
  }

  process.stderr.write(
    'Migrations: criando índice único com --accept-data-loss. Nenhuma coluna será removida.\n'
  );
  const segundo = executarPrisma(['db', 'push', '--accept-data-loss']);
  process.exit(segundo.status == null ? 1 : segundo.status);
}

module.exports = { avisosDePerdaSaoSoIndiceUnico };

if (require.main === module) {
  main();
}
