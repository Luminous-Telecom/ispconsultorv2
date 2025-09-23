#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script para visualizar logs de webhook EFI de forma amigável
 */
class WebhookLogViewer {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
  }

  async viewLogs(options = {}) {
    const { 
      lines = 50, 
      follow = false, 
      filter = null,
      format = 'pretty'
    } = options;

    console.log('📋 Visualizador de Logs de Webhook EFI');
    console.log('=' .repeat(60));

    if (follow) {
      console.log('👀 Modo follow ativado (Ctrl+C para sair)');
      this.followLogs(filter);
    } else {
      this.showLogs(lines, filter, format);
    }
  }

  showLogs(lines, filter, format) {
    const logFiles = this.getLogFiles();
    let allLogs = [];

    // Coletar logs de todos os arquivos
    logFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const fileLogs = content.split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch (e) {
              return { raw: line, timestamp: new Date().toISOString() };
            }
          })
          .filter(log => this.isWebhookLog(log));

        allLogs = allLogs.concat(fileLogs);
      } catch (error) {
        console.error(`❌ Erro ao ler ${file}:`, error.message);
      }
    });

    // Ordenar por timestamp
    allLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Aplicar filtro se especificado
    if (filter) {
      allLogs = allLogs.filter(log => 
        JSON.stringify(log).toLowerCase().includes(filter.toLowerCase())
      );
    }

    // Pegar as últimas N linhas
    const recentLogs = allLogs.slice(-lines);

    if (recentLogs.length === 0) {
      console.log('❌ Nenhum log de webhook encontrado');
      return;
    }

    console.log(`📊 Mostrando ${recentLogs.length} logs de webhook:`);
    console.log('─'.repeat(60));

    recentLogs.forEach(log => {
      this.displayLog(log, format);
    });
  }

  followLogs(filter) {
    const logFiles = this.getLogFiles();
    let lastPositions = {};

    // Inicializar posições dos arquivos
    logFiles.forEach(file => {
      try {
        const stats = fs.statSync(file);
        lastPositions[file] = stats.size;
      } catch (error) {
        lastPositions[file] = 0;
      }
    });

    // Verificar mudanças a cada segundo
    const interval = setInterval(() => {
      logFiles.forEach(file => {
        try {
          const stats = fs.statSync(file);
          if (stats.size > lastPositions[file]) {
            const newContent = fs.readFileSync(file, 'utf8');
            const newLines = newContent.slice(lastPositions[file]);
            
            newLines.split('\n').forEach(line => {
              if (line.trim()) {
                try {
                  const log = JSON.parse(line);
                  if (this.isWebhookLog(log)) {
                    if (!filter || JSON.stringify(log).toLowerCase().includes(filter.toLowerCase())) {
                      this.displayLog(log, 'pretty');
                    }
                  }
                } catch (e) {
                  // Ignorar linhas que não são JSON válido
                }
              }
            });
            
            lastPositions[file] = stats.size;
          }
        } catch (error) {
          // Ignorar erros de leitura
        }
      });
    }, 1000);

    // Capturar Ctrl+C
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n👋 Saindo do modo follow...');
      process.exit(0);
    });
  }

  isWebhookLog(log) {
    if (log.raw) return false; // Ignorar logs raw
    
    const message = log.message || '';
    const level = log.level || '';
    
    return message.includes('webhook') || 
           message.includes('WEBHOOK') || 
           message.includes('efi') ||
           message.includes('EFI') ||
           message.includes('notification') ||
           message.includes('charge') ||
           message.includes('carnet') ||
           message.includes('liquidar') ||
           message.includes('cancelar') ||
           message.includes('alterar');
  }

  displayLog(log, format) {
    const timestamp = new Date(log.timestamp).toLocaleString('pt-BR');
    const level = log.level || 'info';
    const message = log.message || '';

    if (format === 'json') {
      console.log(JSON.stringify(log, null, 2));
      return;
    }

    // Formato pretty
    const levelEmoji = this.getLevelEmoji(level);
    console.log(`\n${levelEmoji} ${timestamp}`);
    console.log(`📝 ${message}`);

    // Informações adicionais
    if (log.parcela_id) console.log(`🆔 Parcela ID: ${log.parcela_id}`);
    if (log.carnet_id) console.log(`📋 Carnê ID: ${log.carnet_id}`);
    if (log.charge_id) console.log(`💳 Charge ID: ${log.charge_id}`);
    if (log.endpoint) console.log(`🌐 Endpoint: ${log.endpoint}`);
    if (log.status) console.log(`📈 Status HTTP: ${log.status}`);
    if (log.error) console.log(`❌ Erro: ${log.error}`);
    if (log.data) console.log(`📊 Dados: ${JSON.stringify(log.data)}`);

    console.log('─'.repeat(40));
  }

  getLevelEmoji(level) {
    const emojis = {
      'error': '❌',
      'warn': '⚠️',
      'info': 'ℹ️',
      'debug': '🐛'
    };
    return emojis[level] || '📝';
  }

  getLogFiles() {
    try {
      return fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'))
        .map(file => path.join(this.logDir, file))
        .sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime);
    } catch (error) {
      console.error('❌ Erro ao listar arquivos de log:', error.message);
      return [];
    }
  }

  showHelp() {
    console.log(`
📋 Visualizador de Logs de Webhook EFI

Uso:
  node view-webhook-logs.js [opções]

Opções:
  --lines N        Mostrar últimas N linhas (padrão: 50)
  --follow         Seguir logs em tempo real
  --filter TEXT    Filtrar logs por texto
  --format FORMAT  Formato de saída: pretty, json (padrão: pretty)
  --help           Mostrar esta ajuda

Exemplos:
  node view-webhook-logs.js --lines 100
  node view-webhook-logs.js --follow
  node view-webhook-logs.js --filter "efi" --lines 20
  node view-webhook-logs.js --format json --lines 10
`);
  }
}

// Processar argumentos da linha de comando
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    lines: 50,
    follow: false,
    filter: null,
    format: 'pretty'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--lines':
        options.lines = parseInt(args[++i]) || 50;
        break;
      case '--follow':
        options.follow = true;
        break;
      case '--filter':
        options.filter = args[++i];
        break;
      case '--format':
        options.format = args[++i] || 'pretty';
        break;
      case '--help':
        options.help = true;
        break;
    }
  }

  return options;
}

// Executar o visualizador
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    const viewer = new WebhookLogViewer();
    viewer.showHelp();
    return;
  }

  const viewer = new WebhookLogViewer();
  await viewer.viewLogs(options);
}

main().catch(console.error);
