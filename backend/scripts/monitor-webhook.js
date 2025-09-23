#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script para monitorar logs do webhook EFI em tempo real
 */
class WebhookMonitor {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.isRunning = false;
  }

  start() {
    console.log('🔍 Iniciando monitoramento de webhook EFI...');
    console.log('📁 Diretório de logs:', this.logDir);
    console.log('⏰ Aguardando logs de webhook...\n');

    this.isRunning = true;
    this.watchLogFiles();
    
    // Mostrar logs existentes primeiro
    this.showExistingWebhookLogs();
  }

  stop() {
    this.isRunning = false;
    console.log('\n🛑 Monitoramento interrompido');
  }

  showExistingWebhookLogs() {
    console.log('📋 Logs de webhook existentes:');
    console.log('=' .repeat(50));
    
    const logFiles = this.getLogFiles();
    let hasWebhookLogs = false;

    logFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const webhookLines = content.split('\n').filter(line => 
          line.includes('webhook') || 
          line.includes('WEBHOOK') || 
          line.includes('efi') ||
          line.includes('EFI') ||
          line.includes('notification')
        );

        if (webhookLines.length > 0) {
          hasWebhookLogs = true;
          console.log(`\n📄 ${path.basename(file)}:`);
          webhookLines.slice(-10).forEach(line => {
            try {
              const log = JSON.parse(line);
              console.log(`  ${log.timestamp} [${log.level}] ${log.message}`);
              if (log.parcela_id) console.log(`    Parcela ID: ${log.parcela_id}`);
              if (log.carnet_id) console.log(`    Carnê ID: ${log.carnet_id}`);
              if (log.endpoint) console.log(`    Endpoint: ${log.endpoint}`);
            } catch (e) {
              console.log(`  ${line}`);
            }
          });
        }
      } catch (error) {
        // Ignorar arquivos que não conseguimos ler
      }
    });

    if (!hasWebhookLogs) {
      console.log('❌ Nenhum log de webhook encontrado');
      console.log('💡 Dica: Teste o webhook enviando uma notificação da EFI');
    }
    
    console.log('\n' + '=' .repeat(50));
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

  watchLogFiles() {
    const logFiles = this.getLogFiles();
    
    logFiles.forEach(file => {
      try {
        // Monitorar mudanças no arquivo
        fs.watchFile(file, { interval: 1000 }, (curr, prev) => {
          if (curr.mtime > prev.mtime) {
            this.checkNewLogs(file);
          }
        });
      } catch (error) {
        console.error(`❌ Erro ao monitorar ${file}:`, error.message);
      }
    });
  }

  checkNewLogs(file) {
    try {
      const stats = fs.statSync(file);
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Pegar as últimas 5 linhas para verificar se são novas
      const recentLines = lines.slice(-5);
      
      recentLines.forEach(line => {
        if (this.isWebhookLog(line)) {
          this.displayWebhookLog(line);
        }
      });
    } catch (error) {
      // Ignorar erros de leitura
    }
  }

  isWebhookLog(line) {
    return line.includes('webhook') || 
           line.includes('WEBHOOK') || 
           line.includes('efi') ||
           line.includes('EFI') ||
           line.includes('notification') ||
           line.includes('charge') ||
           line.includes('carnet');
  }

  displayWebhookLog(line) {
    try {
      const log = JSON.parse(line);
      const timestamp = new Date(log.timestamp).toLocaleString('pt-BR');
      
      console.log(`\n🔔 NOVO LOG DE WEBHOOK:`);
      console.log(`⏰ ${timestamp}`);
      console.log(`📊 Nível: ${log.level}`);
      console.log(`💬 Mensagem: ${log.message}`);
      
      if (log.parcela_id) console.log(`🆔 Parcela ID: ${log.parcela_id}`);
      if (log.carnet_id) console.log(`📋 Carnê ID: ${log.carnet_id}`);
      if (log.charge_id) console.log(`💳 Charge ID: ${log.charge_id}`);
      if (log.endpoint) console.log(`🌐 Endpoint: ${log.endpoint}`);
      if (log.status) console.log(`📈 Status: ${log.status}`);
      if (log.error) console.log(`❌ Erro: ${log.error}`);
      
      console.log('─'.repeat(50));
    } catch (e) {
      console.log(`\n🔔 LOG RAW: ${line}`);
    }
  }
}

// Executar o monitor
const monitor = new WebhookMonitor();

// Capturar Ctrl+C para parar graciosamente
process.on('SIGINT', () => {
  monitor.stop();
  process.exit(0);
});

// Iniciar monitoramento
monitor.start();

// Manter o processo rodando
setInterval(() => {
  // Heartbeat para manter o processo vivo
}, 1000);
