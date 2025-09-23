#!/usr/bin/env node

/**
 * Script principal para gerenciar logs de webhook EFI
 */
class WebhookLogManager {
  constructor() {
    this.scripts = {
      monitor: './scripts/monitor-webhook.js',
      test: './scripts/test-webhook.js',
      view: './scripts/view-webhook-logs.js'
    };
  }

  async run() {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    switch (command) {
      case 'monitor':
        await this.runMonitor(args);
        break;
      case 'test':
        await this.runTest(args);
        break;
      case 'view':
        await this.runView(args);
        break;
      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        break;
      default:
        console.log('❌ Comando não reconhecido:', command);
        this.showHelp();
        process.exit(1);
    }
  }

  async runMonitor(args) {
    console.log('🔍 Iniciando monitoramento de webhook...');
    const { spawn } = require('child_process');
    
    const child = spawn('node', [this.scripts.monitor, ...args], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      console.log(`\n👋 Monitoramento finalizado com código ${code}`);
    });
  }

  async runTest(args) {
    console.log('🧪 Executando testes de webhook...');
    const { spawn } = require('child_process');
    
    const child = spawn('node', [this.scripts.test, ...args], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      console.log(`\n👋 Testes finalizados com código ${code}`);
    });
  }

  async runView(args) {
    console.log('📋 Visualizando logs de webhook...');
    const { spawn } = require('child_process');
    
    const child = spawn('node', [this.scripts.view, ...args], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      console.log(`\n👋 Visualização finalizada com código ${code}`);
    });
  }

  showHelp() {
    console.log(`
🔧 Gerenciador de Logs de Webhook EFI

Uso:
  node webhook-logs.js <comando> [opções]

Comandos:
  monitor          Monitorar logs em tempo real
  test             Testar webhook com dados simulados
  view             Visualizar logs existentes
  help             Mostrar esta ajuda

Exemplos:
  node webhook-logs.js monitor
  node webhook-logs.js test
  node webhook-logs.js view --lines 100
  node webhook-logs.js view --follow
  node webhook-logs.js view --filter "efi" --lines 20

Opções para 'view':
  --lines N        Mostrar últimas N linhas (padrão: 50)
  --follow         Seguir logs em tempo real
  --filter TEXT    Filtrar logs por texto
  --format FORMAT  Formato: pretty, json (padrão: pretty)

Opções para 'monitor':
  (sem opções específicas)

Opções para 'test':
  (sem opções específicas)
`);
  }
}

// Executar o gerenciador
const manager = new WebhookLogManager();
manager.run().catch(console.error);
