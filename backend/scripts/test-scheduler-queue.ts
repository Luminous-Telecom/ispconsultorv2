/**
 * Testa a fila de rotinas disparando todas de uma vez.
 * Conecta no banco, inicia o scheduler e enfileira todas as rotinas ativas.
 *
 * Uso: npx ts-node scripts/test-scheduler-queue.ts
 * Não precisa do backend rodando.
 */
import 'dotenv/config';
import { disconnectPrisma, prisma } from '../src/db/prisma';

async function main(): Promise<void> {
  console.log('=== Teste da fila de rotinas ===\n');

  await prisma.$queryRawUnsafe('SELECT 1');
  console.log('Banco conectado.\n');

  const { SchedulerService } = await import('../src/services/scheduler/SchedulerService');

  const scheduler = SchedulerService.getInstance();
  await scheduler.start();
  console.log('Scheduler iniciado.\n');

  const rotinas = await prisma.sistema_scheduled_routines.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, tipo: true },
  });

  if (rotinas.length === 0) {
    console.log('Nenhuma rotina ativa. Crie rotinas no Agendador de Tarefas.');
    await scheduler.stop();
    await disconnectPrisma();
    process.exit(0);
  }

  console.log(`Rotinas ativas: ${rotinas.length}\n`);
  rotinas.forEach((rotina) => console.log(`  ${rotina.nome} (id=${rotina.id})`));
  console.log('');

  console.log('Enfileirando todas as rotinas...');
  for (const rotina of rotinas) {
    scheduler.executeRoutineManually(rotina.id);
  }
  console.log(`${rotinas.length} rotinas enfileiradas.\n`);

  console.log('Monitorando fila (Ctrl+C para interromper):');
  const interval = setInterval(async () => {
    const status = await scheduler.getStatus();
    const line = `  Fila: ${status.queueSize} | Executando: ${status.queueRunning}/${status.queueConcurrency}`;
    process.stdout.write(`\r${line}`);
    if (status.queueSize === 0 && status.queueRunning === 0) {
      clearInterval(interval);
      console.log('\n\nFila vazia. Todas as rotinas foram processadas.');
      scheduler.stop().then(() => disconnectPrisma()).then(() => process.exit(0));
    }
  }, 1000);
}

main().catch(async (error) => {
  console.error(error);
  await disconnectPrisma();
  process.exit(1);
});
