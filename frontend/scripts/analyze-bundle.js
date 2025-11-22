#!/usr/bin/env node

/**
 * Script para analisar o bundle do frontend usando webpack-bundle-analyzer
 * 
 * Uso:
 *   npm run build:analyze
 * 
 * Isso irá gerar um relatório visual do tamanho do bundle
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Analisando bundle do frontend...\n');

try {
  // Build do projeto
  console.log('📦 Construindo projeto...');
  execSync('npm run build', { 
    stdio: 'inherit',
    env: { ...process.env, GENERATE_SOURCEMAP: 'true' }
  });

  // Analisar bundle
  console.log('\n📊 Analisando bundle...');
  const bundleAnalyzer = require.resolve('webpack-bundle-analyzer/lib/bundle-analyzer');
  const buildPath = path.join(__dirname, '../build');
  
  execSync(`node ${bundleAnalyzer} ${buildPath}`, { 
    stdio: 'inherit' 
  });
  
  console.log('\n✅ Análise concluída!');
} catch (error) {
  console.error('\n❌ Erro ao analisar bundle:', error.message);
  process.exit(1);
}

