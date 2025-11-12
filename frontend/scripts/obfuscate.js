#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Ofusca os bundles JavaScript gerados pelo build do CRA.
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const JS_BUILD_DIR = path.resolve(__dirname, '..', 'build', 'static', 'js');

const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.7,
  deadCodeInjection: false,
  debugProtection: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  target: 'browser'
};

function shouldProcess(filePath) {
  return filePath.endsWith('.js') && !filePath.endsWith('.js.map');
}

function obfuscateFile(filePath) {
  const sourceCode = fs.readFileSync(filePath, 'utf8');
  const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
  fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode(), 'utf8');
  console.log(`Ofuscado: ${path.basename(filePath)}`);
}

function run() {
  if (!fs.existsSync(JS_BUILD_DIR)) {
    console.warn('Pasta build/static/js não encontrada. Execute npm run build antes da ofuscação.');
    process.exit(0);
  }

  const files = fs.readdirSync(JS_BUILD_DIR);
  files.forEach((file) => {
    const fullPath = path.join(JS_BUILD_DIR, file);
    if (shouldProcess(fullPath)) {
      obfuscateFile(fullPath);
    }
  });
}

run();

