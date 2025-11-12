#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Obfusca arquivos JavaScript gerados na pasta dist.
 * Mantém opções equilibradas para produção sem comprometer desempenho.
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: false,
  debugProtection: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: true,
  stringArray: true,
  stringArrayThreshold: 0.75,
  target: 'node'
};

function shouldProcess(filePath) {
  if (!filePath.endsWith('.js')) {
    return false;
  }

  // Evitar reprocessar arquivos já ofuscados
  const buffer = fs.readFileSync(filePath, 'utf8');
  return !buffer.includes('JavaScript Obfuscator');
}

function obfuscateFile(filePath) {
  if (!shouldProcess(filePath)) {
    return;
  }

  const sourceCode = fs.readFileSync(filePath, 'utf8');
  const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
  fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode(), 'utf8');
  console.log(`Ofuscado: ${path.relative(DIST_DIR, filePath)}`);
}

function walkDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  entries.forEach((entry) => {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walkDirectory(entryPath);
    } else {
      obfuscateFile(entryPath);
    }
  });
}

walkDirectory(DIST_DIR);

