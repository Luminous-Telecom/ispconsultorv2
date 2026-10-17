import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd(); // backend/
const distPath = path.join(ROOT, 'dist');

function log(msg: string) { console.log(msg); }
function warn(msg: string) { console.warn(msg); }
function fail(msg: string): never { console.error(msg); process.exit(1); }

// ─── 1. Prisma Client ─────────────────────────────────────────────────────────
// O npm do CI não roda o postinstall do @prisma/client. Sem generate, o tsc
// vê um client vazio e acusa que os models não existem.
log('🗄 Gerando Prisma Client...');
try {
  execSync('npx prisma generate', {
    stdio: 'inherit',
    cwd: ROOT,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'mysql://build:build@127.0.0.1:3306/build',
    },
  });
  log('✓ Prisma Client gerado');
} catch {
  fail('✗ Erro ao gerar o Prisma Client');
}

// ─── 2. Compilar TypeScript ───────────────────────────────────────────────────
log('📦 Compilando TypeScript...');
try {
  execSync('tsc', { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' } });
  log('✓ TypeScript compilado');
} catch {
  fail('✗ Erro ao compilar TypeScript');
}

// ─── 3. Remover arquivos .js "planos" que conflitam com pastas de mesmo nome ──
//
// Ocorre quando há, p.ex., dist/services/Foo.js e dist/services/Foo/ ao mesmo
// tempo. O TypeScript antigo gerava ambos; removemos o arquivo plano.
function removeConflictingFlatFiles(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removeConflictingFlatFiles(full);
    } else if (entry.isFile()) {
      const base = path.basename(entry.name, path.extname(entry.name));
      const sibling = path.join(dir, base);
      if (fs.existsSync(sibling) && fs.statSync(sibling).isDirectory()) {
        if (/\.(js|d\.ts|js\.map|d\.ts\.map)$/.test(entry.name)) {
          fs.unlinkSync(full);
        }
      }
    }
  }
}
removeConflictingFlatFiles(path.join(distPath, 'services'));
removeConflictingFlatFiles(path.join(distPath, 'controllers'));

// Remover pasta legada dist/images/ (substituída por dist/arquivos/images/)
const oldImages = path.join(distPath, 'images');
if (fs.existsSync(oldImages)) {
  fs.rmSync(oldImages, { recursive: true, force: true });
  log('✓ Pasta legada dist/images/ removida');
}

// ─── 4. Copiar templates ──────────────────────────────────────────────────────
const templatesSrc  = path.join(ROOT, 'src', 'templates');
const templatesDest = path.join(distPath, 'templates');

if (fs.existsSync(templatesSrc)) {
  if (fs.existsSync(templatesDest)) fs.rmSync(templatesDest, { recursive: true, force: true });
  fs.cpSync(templatesSrc, templatesDest, { recursive: true });
  log('✓ Templates copiados');
} else {
  warn('⚠ src/templates não encontrado');
}

// ─── 5. Copiar arquivos estáticos (images do sistema) ────────────────────────
//
// Copia apenas arquivos/images (logos, bancos, etc.) — não toca em uploads de
// clientes que vivem em arquivos/empresa, clientes, documentos, blockdomi.
const arquivosSrc   = path.join(ROOT, 'arquivos');
const arquivosDest  = path.join(distPath, 'arquivos');
const imagesSrc     = path.join(arquivosSrc, 'images');
const imagesDest    = path.join(arquivosDest, 'images');

const uploadDirs = ['empresa', 'clientes', 'documentos', 'blockdomi'];

if (fs.existsSync(imagesSrc)) {
  fs.mkdirSync(arquivosDest, { recursive: true });
  if (fs.existsSync(imagesDest)) fs.rmSync(imagesDest, { recursive: true, force: true });
  fs.cpSync(imagesSrc, imagesDest, { recursive: true });
  for (const sub of uploadDirs) {
    fs.mkdirSync(path.join(arquivosDest, sub), { recursive: true });
  }
  log('✓ arquivos/images copiado');
} else {
  log('📁 Criando estrutura de pastas de arquivos...');
  fs.mkdirSync(arquivosDest, { recursive: true });
  for (const sub of ['images/bancos', 'images/sistema', ...uploadDirs]) {
    fs.mkdirSync(path.join(arquivosDest, sub), { recursive: true });
  }
  log('✓ Estrutura de pastas criada');
}

// ─── 6. Copiar scripts Python para dist/python/ ───────────────────────────────
//
// Os scripts ficam em backend/python/ (separados dos scripts TS).
// Em produção o controller os encontra em dist/python/.
const pythonSrc  = path.join(ROOT, 'python');
const pythonDest = path.join(distPath, 'python');

if (fs.existsSync(pythonSrc)) {
  fs.mkdirSync(pythonDest, { recursive: true });

  const toCopy = [
    'extrair-dominios.py',
    'extrair-sei-anatel.py',
    'requirements.txt',
    'install-python-deps.sh',
  ];

  for (const file of toCopy) {
    const src = path.join(pythonSrc, file);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(pythonDest, file);
    fs.copyFileSync(src, dest);
    if (file.endsWith('.sh')) fs.chmodSync(dest, 0o755);
    log(`✓ ${file} copiado para dist/python/`);
  }
} else {
  warn('⚠ backend/python/ não encontrado — scripts Python não serão incluídos');
}

log('\n🎉 Build concluído com sucesso!');
