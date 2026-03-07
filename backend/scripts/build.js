#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Iniciando build...');

// 1. Compilar TypeScript
console.log('📦 Compilando TypeScript...');
try {
  execSync('tsc', { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' } });
  console.log('✅ TypeScript compilado com sucesso');
} catch (error) {
  console.error('❌ Erro ao compilar TypeScript');
  process.exit(1);
}

// 2. Limpar pastas antigas e arquivos conflitantes (arquivo .js plano quando existe pasta com mesmo nome)
const distPath = path.join(process.cwd(), 'dist');
function removeConflictingFlatFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removeConflictingFlatFiles(fullPath);
    } else if (entry.isFile()) {
      const base = path.basename(entry.name, path.extname(entry.name));
      const siblingDir = path.join(dir, base);
      if (fs.existsSync(siblingDir) && fs.statSync(siblingDir).isDirectory()) {
        if (/\.(js|d\.ts|js\.map|d\.ts\.map)$/.test(entry.name)) {
          fs.unlinkSync(fullPath);
        }
      }
    }
  }
}
removeConflictingFlatFiles(path.join(distPath, 'services'));
removeConflictingFlatFiles(path.join(distPath, 'controllers'));
const oldImagesPath = path.join(distPath, 'images');

if (fs.existsSync(oldImagesPath)) {
  console.log('🗑️  Removendo pasta antiga dist/images/...');
  fs.rmSync(oldImagesPath, { recursive: true, force: true });
  console.log('✅ Pasta antiga removida');
}

// 3. Copiar templates
const templatesSource = path.join(process.cwd(), 'src', 'templates');
const templatesDest = path.join(distPath, 'templates');

if (fs.existsSync(templatesSource)) {
  console.log('📄 Copiando templates...');
  if (fs.existsSync(templatesDest)) {
    fs.rmSync(templatesDest, { recursive: true, force: true });
  }
  fs.cpSync(templatesSource, templatesDest, { recursive: true });
  console.log('✅ Templates copiados');
} else {
  console.warn('⚠️  Pasta src/templates não encontrada');
}

// 4. Copiar apenas pasta images de arquivos para dist
const arquivosSource = path.join(process.cwd(), 'arquivos');
const arquivosDest = path.join(distPath, 'arquivos');
const imagesSource = path.join(arquivosSource, 'images');
const imagesDest = path.join(arquivosDest, 'images');

console.log('📁 Copiando apenas pasta images de arquivos...');
if (fs.existsSync(imagesSource)) {
  // Criar estrutura de diretórios necessária
  if (!fs.existsSync(arquivosDest)) {
    fs.mkdirSync(arquivosDest, { recursive: true });
  }
  
  // Remover apenas images se existir (para atualizar com versão mais recente)
  if (fs.existsSync(imagesDest)) {
    fs.rmSync(imagesDest, { recursive: true, force: true });
  }
  
  // Criar estrutura de pastas para uploads apenas se não existirem (não limpar conteúdo existente)
  const subpastas = ['empresa', 'clientes', 'documentos', 'blockdomi'];
  subpastas.forEach(subpasta => {
    const fullPath = path.join(arquivosDest, subpasta);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
  
  // Copiar apenas images
  fs.cpSync(imagesSource, imagesDest, { recursive: true });
  console.log('✅ Pasta images copiada');
} else {
  // Se não existir, criar estrutura básica
  console.log('📁 Criando estrutura de pastas de arquivos...');
  if (!fs.existsSync(arquivosDest)) {
    fs.mkdirSync(arquivosDest, { recursive: true });
  }
  const subpastas = ['images/bancos', 'images/sistema', 'empresa', 'clientes', 'documentos', 'blockdomi'];
  subpastas.forEach(subpasta => {
    const fullPath = path.join(arquivosDest, subpasta);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
  console.log('✅ Estrutura de pastas criada');
}

// 5. Copiar script Python e requirements para dist (necessário para extração de PDF)
const scriptsSource = path.join(process.cwd(), 'scripts');
const scriptsDest = path.join(distPath, 'scripts');

if (fs.existsSync(scriptsSource)) {
  console.log('🐍 Copiando scripts Python...');
  if (!fs.existsSync(scriptsDest)) {
    fs.mkdirSync(scriptsDest, { recursive: true });
  }
  const pyScript = path.join(scriptsSource, 'extrair-dominios.py');
  const requirementsFile = path.join(scriptsSource, 'requirements.txt');
  if (fs.existsSync(pyScript)) {
    fs.copyFileSync(pyScript, path.join(scriptsDest, 'extrair-dominios.py'));
    console.log('✅ extrair-dominios.py copiado');
  }
  if (fs.existsSync(requirementsFile)) {
    fs.copyFileSync(requirementsFile, path.join(scriptsDest, 'requirements.txt'));
    console.log('✅ requirements.txt copiado');
  }
  const installScript = path.join(scriptsSource, 'install-python-deps.sh');
  if (fs.existsSync(installScript)) {
    fs.copyFileSync(installScript, path.join(scriptsDest, 'install-python-deps.sh'));
    fs.chmodSync(path.join(scriptsDest, 'install-python-deps.sh'), 0o755);
    console.log('✅ install-python-deps.sh copiado');
  }
}

console.log('🎉 Build concluído com sucesso!');

