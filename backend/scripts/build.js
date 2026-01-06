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

// 2. Limpar pastas antigas se existirem
const distPath = path.join(process.cwd(), 'dist');
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
  if (fs.existsSync(arquivosDest)) {
    // Remover apenas images se existir, manter outras pastas
    if (fs.existsSync(imagesDest)) {
      fs.rmSync(imagesDest, { recursive: true, force: true });
    }
  } else {
    fs.mkdirSync(arquivosDest, { recursive: true });
  }
  
  // Limpar e criar estrutura de pastas vazias para uploads (não copiar conteúdo)
  const subpastas = ['empresa', 'clientes', 'documentos'];
  subpastas.forEach(subpasta => {
    const fullPath = path.join(arquivosDest, subpasta);
    // Remover pasta se existir (para limpar arquivos antigos)
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
    // Criar pasta vazia
    fs.mkdirSync(fullPath, { recursive: true });
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
  const subpastas = ['images/bancos', 'images/sistema', 'empresa', 'clientes', 'documentos'];
  subpastas.forEach(subpasta => {
    const fullPath = path.join(arquivosDest, subpasta);
    fs.mkdirSync(fullPath, { recursive: true });
  });
  console.log('✅ Estrutura de pastas criada');
}

console.log('🎉 Build concluído com sucesso!');

