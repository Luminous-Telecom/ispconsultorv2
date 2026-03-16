/**
 * Testa a fila de rotinas disparando todas de uma vez.
 * Conecta no banco, inicia o scheduler e enfileira todas as rotinas ativas.
 *
 * Uso: npx ts-node scripts/test-scheduler-queue.ts
 * Não precisa do backend rodando.
 */
import 'dotenv/config';

async function main(): Promise<void> {
  console.log('=== Teste da fila de rotinas ===\n');

  const { sequelize } = await import('../src/config/database');
  await import('../src/models');

  await sequelize.authenticate();
  console.log('Banco conectado.\n');

  const { ScheduledRoutine } = await import('../src/models/sistema/ScheduledRoutine');
  const SaasScheduledRoutine = (await import('../src/models/saas/SaasScheduledRoutine')).default;
  const { SchedulerService } = await import('../src/services/scheduler/SchedulerService');

  const scheduler = SchedulerService.getInstance();
  await scheduler.start();
  console.log('Scheduler iniciado.\n');

  const [erpRoutines, saasRoutines] = await Promise.all([
    ScheduledRoutine.findAll({ where: { ativo: true }, attributes: ['id', 'nome', 'tipo'] }),
    SaasScheduledRoutine.findAll({ where: { ativo: true }, attributes: ['id', 'nome', 'tipo'] }),
  ]);

  const total = erpRoutines.length + saasRoutines.length;
  if (total === 0) {
    console.log('Nenhuma rotina ativa. Crie rotinas no Agendador de Tarefas.');
    await scheduler.stop();
    await sequelize.close();
    process.exit(0);
  }

  console.log(`Rotinas ativas: ${total} (ERP: ${erpRoutines.length}, SaaS: ${saasRoutines.length})\n`);
  erpRoutines.forEach((r) => console.log(`  [ERP] ${r.nome} (id=${r.id})`));
  saasRoutines.forEach((r) => console.log(`  [SaaS] ${r.nome} (id=${r.id})`));
  console.log('');

  console.log('Enfileirando todas as rotinas...');
  for (const r of erpRoutines) {
    scheduler.executeRoutineManually(r.id);
  }
  for (const r of saasRoutines) {
    scheduler.executeSaasRoutineManually(r.id);
  }
  console.log(`${total} rotinas enfileiradas.\n`);

  console.log('Monitorando fila (Ctrl+C para interromper):');
  const interval = setInterval(async () => {
    const status = await scheduler.getStatus();
    const line = `  Fila: ${status.queueSize} | Executando: ${status.queueRunning}/${status.queueConcurrency}`;
    process.stdout.write(`\r${line}`);
    if (status.queueSize === 0 && status.queueRunning === 0) {
      clearInterval(interval);
      console.log('\n\nFila vazia. Todas as rotinas foram processadas.');
      scheduler.stop().then(() => sequelize.close()).then(() => process.exit(0));
    }
  }, 1000);
}

main().catch(async (e) => {
  console.error(e);
  const { sequelize } = await import('../src/config/database');
  await sequelize.close();
  process.exit(1);
});
