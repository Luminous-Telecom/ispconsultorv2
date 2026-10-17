import { readFileSync } from 'fs';
import { prisma } from '../../../db/prisma';
import { formatDateISOForAPI } from '../../../utils/timezoneUtils';
import { getStartOfLocalDay } from '../../../utils/dateUtils';
import { buildSaasDashboardStatsGraficos } from '../../sistema/dashboardGraficosStats';

// Formato compatível com DashboardData do admin (mapeamento empresa=cliente)
export class SaasDashboardService {
  static parseStartDate(start?: string): Date {
    if (start) {
      const [year, month, day] = start.split('-').map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      }
    }
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0, 0);
  }

  static parseEndDate(end: string | undefined, start: Date): Date {
    if (end) {
      const [year, month, day] = end.split('-').map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        const parsed = new Date(year, month - 1, day, 23, 59, 59, 999);
        if (parsed < start) {
          const ajustado = new Date(start);
          ajustado.setHours(23, 59, 59, 999);
          return ajustado;
        }
        return parsed;
      }
    }
    return new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  static async getDashboardData(startDate?: string, endDate?: string): Promise<Record<string, unknown>> {
    const parsedStart = this.parseStartDate(startDate);
    const parsedEnd = this.parseEndDate(endDate, parsedStart);

    const inicioPeriodo = new Date(parsedStart);
    inicioPeriodo.setHours(0, 0, 0, 0);
    const fimPeriodo = new Date(parsedEnd);
    fimPeriodo.setHours(23, 59, 59, 999);

    const [empresas, planos, contratos, contratosTodos, titulos, titulosTodos, receitaUltimosMeses, aReceberPeriodo, recebidosPeriodo, clientesPorTipoPlano, resumoPeriodo, contasPagarUltimosMeses, statusContratos, queueStats] = await Promise.all([
      this.getEmpresasCompat(),
      this.getPlanosCompat(),
      this.getContratosCompat(inicioPeriodo, fimPeriodo),
      this.getAllContratosCompat(),
      this.getTitulosCompat(inicioPeriodo, fimPeriodo),
      this.getAllTitulosCompat(),
      this.getReceitaUltimos12Meses(),
      this.getAReceberPorPeriodo(parsedStart, parsedEnd),
      this.getRecebidosPorPeriodo(parsedStart, parsedEnd),
      this.getClientesPorTipoPlano(),
      this.getResumoFinanceiroPeriodo(parsedStart, parsedEnd),
      this.getContasPagarUltimos12Meses(),
      this.getStatusContratosSaaS(),
      this.getQueueStats(),
    ]);

    const clientesPeriodoArr = empresas.filter(e => {
      const created = e.created_at ? new Date(e.created_at) : null;
      return created && created >= inicioPeriodo && created <= fimPeriodo;
    });
    const contratosAtivosList = contratosTodos.filter((c: { status: string }) => c.status === 'ativo');
    const contratosParaPlano = contratosAtivosList.length > 0 ? contratosAtivosList : contratos;

    const statsGraficos = buildSaasDashboardStatsGraficos({
      clientesTodos: empresas,
      clientesPeriodo: clientesPeriodoArr,
      planos,
      contratosTodos,
      titulosTodos: titulosTodos as unknown as { status: string; pago?: boolean; data_vencimento: string | Date }[],
      contratosBloqueados: statusContratos.bloqueados,
      contratosEmAtraso: statusContratos.emAtraso,
      contratosAtivosSaaS: statusContratos.contratosAtivos,
      contratosParaPlano: contratosParaPlano as unknown as { status: string; plano_id?: number; cliente_id?: number }[],
      receitaUltimosMeses,
      recebidosPeriodo,
      aReceberPeriodo,
      contasPagarUltimosMeses,
    });

    return {
      stats: {
        totalClientes: empresas.length,
        planosAtivos: planos.filter(p => (p as { status?: string }).status === 'ativo').length,
      },
      contratosBloqueados: statusContratos.bloqueados,
      contratosEmAtraso: statusContratos.emAtraso,
      contratosAtivosSaaS: statusContratos.contratosAtivos,
      titulosRecentes: [],
      titulosVencidos: [],
      clientes: clientesPeriodoArr,
      clientesTodos: empresas,
      planos,
      contratos,
      contratosTodos,
      contratosAtivosTodos: contratosTodos.filter((c: { status: string }) => c.status === 'ativo'),
      clientesPorTipoPlano,
      titulos,
      titulosTodos,
      receitaUltimosMeses,
      clientesPorStatus: {
        labels: ['Ativos', 'Inativos'],
        data: [empresas.length, 0],
      },
      aReceberPeriodo,
      recebidosPeriodo,
      contasPagarUltimosMeses,
      filtros: {
        startDate: formatDateISOForAPI(parsedStart) || '',
        endDate: formatDateISOForAPI(parsedEnd) || '',
      },
      resumoPeriodo,
      queueStats,
      statsGraficos,
    };
  }

  static async getServerStats(): Promise<{
    ram: { total: number; free: number; used: number; usedPercent: number };
    disk: { total: number; free: number; used: number; usedPercent: number };
    diskIo: {
      readBytesPerSec: number;
      writeBytesPerSec: number;
      readOpsPerSec: number;
      writeOpsPerSec: number;
    };
    queueStats: { queueSize: number; queueRunning: number; queueConcurrency: number };
    uptime: number;
    cpuLoad: number[];
    cpu: { usedPercent: number; cores: number };
  }> {
    const os = await import('os');
    const { execSync } = await import('child_process');

    const cores = os.cpus().length;
    const [{ cpuUsedPercent, diskIo }, queueStats] = await Promise.all([
      SaasDashboardService.getSampledMetrics(os),
      SaasDashboardService.getQueueStats(),
    ]);

    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const usedRam = totalRam - freeRam;

    let diskTotal = 0;
    let diskFree = 0;
    let diskUsed = 0;
    try {
      const dfOutput = execSync('df -k /').toString();
      const lines = dfOutput.trim().split('\n');
      const parts = lines[1].trim().split(/\s+/);
      diskTotal = parseInt(parts[1], 10) * 1024;
      diskUsed = parseInt(parts[2], 10) * 1024;
      diskFree = parseInt(parts[3], 10) * 1024;
    } catch {
      // ignora erro ao obter info de disco
    }

    return {
      ram: {
        total: totalRam,
        free: freeRam,
        used: usedRam,
        usedPercent: Math.round((usedRam / totalRam) * 100),
      },
      disk: {
        total: diskTotal,
        free: diskFree,
        used: diskUsed,
        usedPercent: diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0,
      },
      diskIo,
      queueStats,
      uptime: os.uptime(),
      cpuLoad: os.loadavg(),
      cpu: { usedPercent: cpuUsedPercent, cores },
    };
  }

  private static readonly SAMPLE_MS = 250;

  private static async getSampledMetrics(os: typeof import('os')): Promise<{
    cpuUsedPercent: number;
    diskIo: {
      readBytesPerSec: number;
      writeBytesPerSec: number;
      readOpsPerSec: number;
      writeOpsPerSec: number;
    };
  }> {
    const cpuSnapshot = () => {
      let idle = 0;
      let total = 0;
      for (const cpu of os.cpus()) {
        const { user, nice, sys, idle: idleTime, irq } = cpu.times;
        idle += idleTime;
        total += user + nice + sys + idleTime + irq;
      }
      return { idle, total };
    };

    const startCpu = cpuSnapshot();
    const startDisk = SaasDashboardService.readDiskIoCounters();
    await new Promise((resolve) => setTimeout(resolve, SaasDashboardService.SAMPLE_MS));
    const endCpu = cpuSnapshot();
    const endDisk = SaasDashboardService.readDiskIoCounters();

    const elapsedSec = SaasDashboardService.SAMPLE_MS / 1000;
    const idleDiff = endCpu.idle - startCpu.idle;
    const totalDiff = endCpu.total - startCpu.total;
    const cpuUsedPercent =
      totalDiff <= 0
        ? 0
        : Math.max(0, Math.min(100, Math.round((1 - idleDiff / totalDiff) * 100)));

    const sectorSize = 512;
    const readBytesPerSec = Math.max(0, ((endDisk.readSectors - startDisk.readSectors) * sectorSize) / elapsedSec);
    const writeBytesPerSec = Math.max(0, ((endDisk.writeSectors - startDisk.writeSectors) * sectorSize) / elapsedSec);
    const readOpsPerSec = Math.max(0, (endDisk.readOps - startDisk.readOps) / elapsedSec);
    const writeOpsPerSec = Math.max(0, (endDisk.writeOps - startDisk.writeOps) / elapsedSec);

    return {
      cpuUsedPercent,
      diskIo: {
        readBytesPerSec: Math.round(readBytesPerSec),
        writeBytesPerSec: Math.round(writeBytesPerSec),
        readOpsPerSec: Math.round(readOpsPerSec * 10) / 10,
        writeOpsPerSec: Math.round(writeOpsPerSec * 10) / 10,
      },
    };
  }

  private static isBlockDeviceName(name: string): boolean {
    if (name.startsWith('loop') || name.startsWith('ram') || name.startsWith('sr') || name.startsWith('zram')) {
      return false;
    }
    if (/^(sd[a-z]|hd[a-z]|vd[a-z]|xvd[a-z])\d+$/.test(name)) return false;
    if (/^nvme\d+n\d+p\d+$/.test(name)) return false;
    if (/^mmcblk\d+p\d+$/.test(name)) return false;
    return true;
  }

  private static readDiskIoCounters(): {
    readSectors: number;
    writeSectors: number;
    readOps: number;
    writeOps: number;
  } {
    try {
      const content = readFileSync('/proc/diskstats', 'utf8');
      let readSectors = 0;
      let writeSectors = 0;
      let readOps = 0;
      let writeOps = 0;

      for (const line of content.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 10) continue;
        const name = parts[2];
        if (!SaasDashboardService.isBlockDeviceName(name)) continue;
        readOps += parseInt(parts[3], 10) || 0;
        readSectors += parseInt(parts[5], 10) || 0;
        writeOps += parseInt(parts[7], 10) || 0;
        writeSectors += parseInt(parts[9], 10) || 0;
      }

      return { readSectors, writeSectors, readOps, writeOps };
    } catch {
      return { readSectors: 0, writeSectors: 0, readOps: 0, writeOps: 0 };
    }
  }

  private static async getQueueStats(): Promise<{ queueSize: number; queueRunning: number; queueConcurrency: number }> {
    try {
      const { SchedulerService } = await import('../../scheduler/SchedulerService');
      const status = await SchedulerService.getInstance().getStatus();
      return {
        queueSize: status.queueSize,
        queueRunning: status.queueRunning,
        queueConcurrency: status.queueConcurrency,
      };
    } catch {
      return { queueSize: 0, queueRunning: 0, queueConcurrency: 0 };
    }
  }

  private static async getEmpresasCompat() {
    const rows = await prisma.sistema_tenants.findMany({
      select: { id: true, created_at: true },
    });
    return rows.map(e => ({
      id: e.id,
      ativo: true,
      created_at: e.created_at,
    }));
  }

  private static async getPlanosCompat() {
    return [] as Array<{ id: number; nome_plano: string; tipo_servico: string; status: string; valor_mensal: number; created_at: Date }>;
  }

  private static async getContratosCompat(_inicio: Date, _fim: Date) {
    return [] as Array<Record<string, unknown>>;
  }

  private static async getAllContratosCompat() {
    return [] as Array<{ id: number; status: string; plano_id: number; cliente_id: number; isento_mensalidade: boolean }>;
  }

  private static async getTitulosCompat(_inicio: Date, _fim: Date) {
    return [] as Array<Record<string, unknown>>;
  }

  private static async getAllTitulosCompat() {
    return [] as Array<Record<string, unknown>>;
  }

  private static async getClientesPorTipoPlano(): Promise<Array<{ tipo_servico: string; quantidade: number }>> {
    return [];
  }

  private static async getReceitaUltimos12Meses() {
    const hoje = new Date();
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1, 0, 0, 0, 0);
      const totalMes = 0;
      labels.push(`${String(mes.getMonth() + 1).padStart(2, '0')}/${String(mes.getFullYear()).slice(-2)}`);
      data.push(totalMes);
    }
    return { labels, data };
  }

  private static async getAReceberPorPeriodo(start: Date, end: Date) {
    const { formatDate } = await import('../../../utils/dateUtils');
    const inicio = new Date(start);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(end);
    fim.setHours(23, 59, 59, 999);
    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const titulos: Array<{ valor: number; data_vencimento: Date | null }> = [];

    const valoresPorDia = new Array(Math.max(dias, 0)).fill(0);
    const MS_POR_DIA = 1000 * 60 * 60 * 24;

    for (const t of titulos) {
      if (!t.data_vencimento) continue;
      const inicioDia = getStartOfLocalDay(t.data_vencimento);
      if (!inicioDia) continue;
      const indice = Math.floor((inicioDia.getTime() - inicio.getTime()) / MS_POR_DIA);
      if (indice >= 0 && indice < valoresPorDia.length) {
        valoresPorDia[indice] += parseFloat(String(t.valor || 0));
      }
    }

    return {
      labels: valoresPorDia.map((_, i) => {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        return formatDate(d) || '';
      }),
      data: valoresPorDia,
    };
  }

  private static async getRecebidosPorPeriodo(start: Date, end: Date) {
    const { formatDate } = await import('../../../utils/dateUtils');
    const inicio = new Date(start);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(end);
    fim.setHours(23, 59, 59, 999);
    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const titulos: Array<{ valor: number; valor_pago: number | null; data_pagamento: Date | null }> = [];

    const valoresPorDia = new Array(Math.max(dias, 0)).fill(0);
    const MS_POR_DIA = 1000 * 60 * 60 * 24;

    for (const t of titulos) {
      if (!t.data_pagamento) continue;
      const inicioDia = getStartOfLocalDay(t.data_pagamento);
      if (!inicioDia) continue;
      const indice = Math.floor((inicioDia.getTime() - inicio.getTime()) / MS_POR_DIA);
      if (indice >= 0 && indice < valoresPorDia.length) {
        const v = t.valor_pago != null ? parseFloat(String(t.valor_pago)) : parseFloat(String(t.valor));
        valoresPorDia[indice] += v;
      }
    }

    return {
      labels: valoresPorDia.map((_, i) => {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        return formatDate(d) || '';
      }),
      data: valoresPorDia,
    };
  }

  private static async getResumoFinanceiroPeriodo(start: Date, end: Date) {
    const inicio = new Date(start);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(end);
    fim.setHours(23, 59, 59, 999);

    const titulos: Array<{ valor: number; valor_pago: number | null; status: string; empresa_id: number | null }> = [];

    let totalPrevisto = 0;
    let totalRecebido = 0;
    let totalPendente = 0;
    const clientesSet = new Set<number>();

    for (const t of titulos) {
      const valor = parseFloat(String(t.valor || 0));
      const valorPago = t.valor_pago != null ? parseFloat(String(t.valor_pago)) : valor;
      if (t.empresa_id) clientesSet.add(t.empresa_id);

      switch (t.status) {
        case 'pago':
        case 'pago_atraso':
          totalRecebido += valorPago;
          totalPrevisto += valor;
          break;
        case 'parcial':
          totalRecebido += Math.min(valorPago, valor);
          totalPendente += Math.max(valor - valorPago, 0);
          totalPrevisto += valor;
          break;
        case 'pendente':
        case 'vencido':
          totalPendente += valor;
          totalPrevisto += valor;
          break;
        default:
          if (t.status !== 'cancelado') {
            totalPendente += valor;
            totalPrevisto += valor;
          }
      }
    }

    const valorTotalPlanos = 0;
    const clientesComPlanos = new Set<number>();

    return {
      totalPrevisto,
      totalRecebido,
      totalPendente,
      clientesComTitulos: clientesSet.size,
      ticketMedio: clientesComPlanos.size > 0 ? valorTotalPlanos / clientesComPlanos.size : 0,
    };
  }

  private static async getContasPagarUltimos12Meses() {
    const hoje = new Date();
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      labels.push(`${String(mes.getMonth() + 1).padStart(2, '0')}/${String(mes.getFullYear()).slice(-2)}`);
      data.push(0); // SaaS não tem contas a pagar agregadas
    }
    return { labels, data };
  }

  /** Retorna contagens para o gráfico de contratos (evita duplicar ativo+bloqueado) */
  private static async getStatusContratosSaaS(): Promise<{ bloqueados: number; emAtraso: number; contratosAtivos: number }> {
    const bloqueados = await prisma.sistema_tenants.count({ where: { bloqueado_por_atraso: true } });
    return { bloqueados, emAtraso: 0, contratosAtivos: 0 };
  }
}
