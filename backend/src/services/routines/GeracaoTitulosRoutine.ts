import { Op } from 'sequelize';
import { Carne } from '../../models/Carne';
import { Cliente } from '../../models/Cliente';
import { Plano } from '../../models/Plano';
import { Banco } from '../../models/Banco';
import { CarneParcela } from '../../models/CarneParcela';
import { CarneAutoService } from '../CarneAutoService';
import { ParametroService } from '../ParametroService';

export interface GeracaoTitulosConfig {
  clientes_ids?: number[]; // IDs específicos de clientes (opcional)
  planos_ids?: number[]; // IDs específicos de planos (opcional)
  bancos_ids?: number[]; // IDs específicos de bancos (opcional)
  incluir_inativos?: boolean; // Se deve incluir clientes inativos
  quantidade_parcelas?: number; // Número de parcelas (padrão: 12)
  valor_mensal?: number; // Valor mensal (se não usar do plano)
  data_vencimento_primeira?: string; // Data da primeira parcela (YYYY-MM-DD)
  observacoes?: string; // Observações para o carnê
  auto_gerar_proximo?: boolean; // Se deve gerar próximo carnê automaticamente
}

export class GeracaoTitulosRoutine {
  /**
   * Executa a rotina de geração de títulos
   */
  public async execute(config: GeracaoTitulosConfig): Promise<any> {
    console.log('Iniciando rotina de geração de títulos...');
    
    const resultado = {
      total_clientes_processados: 0,
      carnês_gerados: 0,
      carnês_erro: 0,
      títulos_gerados: 0,
      títulos_erro: 0,
      detalhes: [] as any[]
    };

    try {
      // Buscar clientes baseado na configuração
      const clientes = await this.buscarClientes(config);
      resultado.total_clientes_processados = clientes.length;

      console.log(`Processando ${clientes.length} clientes...`);

      for (const cliente of clientes) {
        try {
          const processamentoResultado = await this.processarCliente(cliente, config);
          
          if (processamentoResultado.tipo === 'carne') {
            if (processamentoResultado.sucesso) {
              resultado.carnês_gerados++;
            } else {
              resultado.carnês_erro++;
            }
          } else if (processamentoResultado.tipo === 'titulo') {
            if (processamentoResultado.sucesso) {
              resultado.títulos_gerados++;
            } else {
              resultado.títulos_erro++;
            }
          }

          resultado.detalhes.push({
            cliente_id: cliente.id,
            cliente_nome: cliente.razao_social,
            tipo_cobranca: cliente.tipo_cobranca,
            tipo_processado: processamentoResultado.tipo,
            status: processamentoResultado.sucesso ? 'sucesso' : 'erro',
            ...processamentoResultado.detalhes
          });
        } catch (error: any) {
          resultado.carnês_erro++;
          resultado.detalhes.push({
            cliente_id: cliente.id,
            cliente_nome: cliente.razao_social,
            tipo_cobranca: cliente.tipo_cobranca,
            status: 'erro',
            erro: error.message
          });
          console.error(`Erro ao processar cliente ${cliente.id}:`, error);
        }
      }

      console.log(`Rotina concluída: ${resultado.carnês_gerados} carnês gerados, ${resultado.títulos_gerados} títulos gerados, ${resultado.carnês_erro + resultado.títulos_erro} erros`);
      return resultado;

    } catch (error: any) {
      console.error('Erro na rotina de geração de títulos:', error);
      throw error;
    }
  }

  /**
   * Processa um cliente baseado no tipo de cobrança
   */
  private async processarCliente(cliente: Cliente, config: GeracaoTitulosConfig): Promise<{
    tipo: 'carne' | 'titulo' | 'nenhum';
    sucesso: boolean;
    detalhes: any;
  }> {
    const tipoCobranca = cliente.tipo_cobranca?.toLowerCase();

    console.log(`Processando cliente ${cliente.id} (${cliente.razao_social}) - Tipo: ${tipoCobranca}`);

    if (tipoCobranca === 'carne') {
      return await this.processarClienteCarne(cliente, config);
    } else if (tipoCobranca === 'titulo') {
      return await this.processarClienteTitulo(cliente, config);
    } else {
      console.log(`Cliente ${cliente.id} não possui tipo de cobrança definido, pulando...`);
      return {
        tipo: 'nenhum',
        sucesso: true,
        detalhes: { motivo: 'Tipo de cobrança não definido' }
      };
    }
  }

  /**
   * Processa cliente com tipo de cobrança 'carne'
   */
  private async processarClienteCarne(cliente: Cliente, config: GeracaoTitulosConfig): Promise<{
    tipo: 'carne';
    sucesso: boolean;
    detalhes: any;
  }> {
    try {
      // Verificar se cliente precisa de novo carnê
      const precisaNovoCarne = await CarneAutoService.verificarNecessidadeNovoCarne(cliente.id);
      
      if (!precisaNovoCarne) {
        console.log(`Cliente ${cliente.id} já possui carnê ativo, pulando...`);
        return {
          tipo: 'carne',
          sucesso: false,
          detalhes: { motivo: 'Cliente já possui carnê ativo - não foi gerado novo carnê' }
        };
      }

      // Gerar novo carnê
      const carneGerado = await this.gerarCarneParaCliente(cliente, config);
      
      if (carneGerado) {
        // Recarregar o carnê para obter dados atualizados (carnet_id, status)
        await carneGerado.reload();
        
        return {
          tipo: 'carne',
          sucesso: true,
          detalhes: {
            carne_id: carneGerado.id,
            numero_carne: carneGerado.numero_carne,
            quantidade_parcelas: carneGerado.quantidade_parcelas,
            status: carneGerado.status,
            carnet_id: carneGerado.carnet_id,
            registrado_no_banco: !!carneGerado.carnet_id
          }
        };
      } else {
        return {
          tipo: 'carne',
          sucesso: false,
          detalhes: { motivo: 'Falha ao gerar carnê' }
        };
      }
    } catch (error: any) {
      return {
        tipo: 'carne',
        sucesso: false,
        detalhes: { erro: error.message }
      };
    }
  }

  /**
   * Processa cliente com tipo de cobrança 'titulo'
   */
  private async processarClienteTitulo(cliente: Cliente, config: GeracaoTitulosConfig): Promise<{
    tipo: 'titulo';
    sucesso: boolean;
    detalhes: any;
  }> {
    try {
      // Obter número mínimo de títulos
      const numeroMinimoTitulos = await ParametroService.getParametroNumber('numero_minimo_titulos');
      
      // Verificar quantos títulos o cliente tem ativos
      const titulosAtivos = await this.contarTitulosAtivos(cliente.id);
      
      if (titulosAtivos >= numeroMinimoTitulos) {
        console.log(`Cliente ${cliente.id} já possui ${titulosAtivos} títulos ativos (mínimo: ${numeroMinimoTitulos}), pulando...`);
        return {
          tipo: 'titulo',
          sucesso: true,
          detalhes: { 
            motivo: 'Cliente já possui número mínimo de títulos',
            titulos_ativos: titulosAtivos,
            minimo_requerido: numeroMinimoTitulos
          }
        };
      }

      // Calcular quantos títulos precisam ser gerados
      const titulosParaGerar = numeroMinimoTitulos - titulosAtivos;
      
      // Gerar títulos individuais
      const titulosGerados = await this.gerarTitulosParaCliente(cliente, config, titulosParaGerar);
      
      return {
        tipo: 'titulo',
        sucesso: true,
        detalhes: {
          titulos_gerados: titulosGerados.length,
          titulos_ids: titulosGerados.map((t: any) => t.id)
        }
      };
    } catch (error: any) {
      return {
        tipo: 'titulo',
        sucesso: false,
        detalhes: { erro: error.message }
      };
    }
  }

  /**
   * Conta títulos ativos do cliente
   */
  private async contarTitulosAtivos(clienteId: number): Promise<number> {
    const titulosAtivos = await CarneParcela.count({
      include: [
        {
          model: Carne,
          as: 'carne',
          where: {
            cliente_id: clienteId,
            status: { [Op.in]: ['ativo', 'pendente', 'registrado'] }
          }
        }
      ],
      where: {
        pago: false,
        status: { [Op.in]: ['pendente', 'ativo'] }
      }
    });

    return titulosAtivos;
  }

  /**
   * Gera títulos individuais para cliente
   */
  private async gerarTitulosParaCliente(cliente: Cliente, config: GeracaoTitulosConfig, quantidade: number): Promise<CarneParcela[]> {
    // Buscar o plano ativo do cliente
    const planoAtivo = await this.buscarPlanoAtivo(cliente.id);
    if (!planoAtivo) {
      throw new Error('Cliente não possui plano ativo');
    }

    // Buscar banco padrão ou específico
    const banco = await this.buscarBanco(config.bancos_ids);
    if (!banco) {
      throw new Error('Nenhum banco disponível para geração de títulos');
    }

    const titulosGerados: CarneParcela[] = [];

    for (let i = 0; i < quantidade; i++) {
      // Gerar número do carnê para este título individual
      const numeroCarne = await this.gerarNumeroCarne();

      // Calcular data de vencimento (próximos meses)
      const dataVencimento = new Date();
      dataVencimento.setMonth(dataVencimento.getMonth() + i + 1);
      dataVencimento.setDate(1);

      // Criar carnê individual (1 parcela apenas)
      const carne = await Carne.create({
        numero_carne: numeroCarne,
        cliente_id: cliente.id,
        plano_id: planoAtivo.id,
        banco_id: banco.id,
        valor_total: planoAtivo.valor_mensal,
        quantidade_parcelas: 1,
        data_vencimento_primeira: dataVencimento,
        observacoes: `Título individual gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`,
        status: 'pendente'
      });

      // Gerar a parcela do título
      const parcela = await CarneParcela.create({
        carne_id: carne.id,
        numero_parcela: 1,
        valor_parcela: planoAtivo.valor_mensal,
        data_vencimento: dataVencimento,
        status: 'pendente' as const,
        pago: false
      });

      titulosGerados.push(parcela);
    }

    return titulosGerados;
  }

  /**
   * Busca clientes baseado na configuração
   */
  private async buscarClientes(config: GeracaoTitulosConfig): Promise<Cliente[]> {
    const whereClause: any = {};

    // Filtrar por IDs específicos de clientes
    if (config.clientes_ids && config.clientes_ids.length > 0) {
      whereClause.id = { [Op.in]: config.clientes_ids };
    }

    // Filtrar por status (ativo/inativo)
    if (!config.incluir_inativos) {
      whereClause.ativo = true;
    }

    // Buscar clientes com seus planos
    const clientes = await Cliente.findAll({
      where: whereClause,
      include: [
        {
          model: Plano,
          as: 'planos',
          where: config.planos_ids && config.planos_ids.length > 0 
            ? { id: { [Op.in]: config.planos_ids } }
            : undefined,
          required: true
        }
      ]
    });

    return clientes;
  }

  /**
   * Gera carnê para um cliente específico
   */
  private async gerarCarneParaCliente(cliente: Cliente, config: GeracaoTitulosConfig): Promise<Carne | null> {
    // Buscar o plano ativo do cliente
    const planoAtivo = await this.buscarPlanoAtivo(cliente.id);
    if (!planoAtivo) {
      throw new Error('Cliente não possui plano ativo');
    }

    // Buscar banco do cliente
    const banco = await this.buscarBancoDoCliente(cliente.id);
    if (!banco) {
      throw new Error('Cliente não possui banco configurado');
    }

    // Verificar se já existe carnê ativo para este cliente/plano
    const carneExistente = await Carne.findOne({
      where: {
        cliente_id: cliente.id,
        plano_id: planoAtivo.id,
        status: { [Op.in]: ['pendente', 'ativo', 'registrado', 'parcial'] }
      },
      include: ['parcelas']
    });

    if (carneExistente) {
      // Verificar se o carnê existente precisa ser substituído
      const resumo = await carneExistente.getResumo();
      
      // Se o carnê está completamente pago, gerar um novo
      if (resumo.parcelas_pagas >= resumo.total_parcelas) {
        console.log(`Cliente ${cliente.id} possui carnê pago (ID: ${carneExistente.id}), gerando novo carnê...`);
        // Continuar com a geração do novo carnê
      } else {
        console.log(`Cliente ${cliente.id} já possui carnê ativo com parcelas pendentes (ID: ${carneExistente.id})`);
        return null;
      }
    }

    // Gerar número do carnê
    const numeroCarne = await this.gerarNumeroCarne();

    // Calcular data de vencimento da primeira parcela
    const dataVencimentoPrimeira = config.data_vencimento_primeira 
      ? new Date(config.data_vencimento_primeira)
      : this.calcularDataVencimentoPrimeira();

    // Obter número padrão de parcelas do sistema
    const numeroParcelasPadrao = await ParametroService.getNumeroParcelasPadrao();

    // Calcular valor total
    const valorMensal = config.valor_mensal || planoAtivo.valor_mensal;
    const valorTotal = valorMensal * numeroParcelasPadrao;

    // Criar o carnê
    const carne = await Carne.create({
      numero_carne: numeroCarne,
      cliente_id: cliente.id,
      plano_id: planoAtivo.id,
      banco_id: banco.id,
      valor_total: valorTotal,
      quantidade_parcelas: numeroParcelasPadrao,
      data_vencimento_primeira: dataVencimentoPrimeira,
      observacoes: config.observacoes || `Carnê gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`,
      status: 'pendente'
    });

    // Gerar parcelas do carnê
    await this.gerarParcelas(carne);

    // Registrar carnê no banco (se for EFI) - igual ao botão "Novo"
    if (banco.tipo_banco === 'efi') {
      console.log(`Registrando carnê no banco EFI: ${numeroCarne}`);
      
      // Carregar relacionamentos para geração de títulos (igual ao CarneController)
      const carneComRelacionamentos = await Carne.findByPk(carne.id, {
        include: ['cliente', 'plano', 'banco', 'parcelas']
      });
      
      if (carneComRelacionamentos) {
        const { BancoApiService } = await import('../BancoApiService');
        const resultadoBanco = await BancoApiService.gerarCarne(carneComRelacionamentos);
        
        if (resultadoBanco.success) {
          console.log(`Carnê registrado no banco EFI com sucesso: ${resultadoBanco.data?.carnet_id}`);
          
          // Atualizar carnê com dados retornados (igual ao CarneController)
          await carneComRelacionamentos.update({
            carnet_id: resultadoBanco.data?.carnet_id || null,
            codigo_barras: resultadoBanco.data?.codigo_barras || null,
            linha_digitavel: resultadoBanco.data?.linha_digitavel || null,
            status: 'ativo'
          });

          // Atualizar parcelas com charge_ids (igual ao CarneController)
          if (resultadoBanco.data?.charges && Array.isArray(resultadoBanco.data.charges)) {
            const parcelas = await carneComRelacionamentos.getParcelas();
            for (let i = 0; i < parcelas.length && i < resultadoBanco.data.charges.length; i++) {
              const parcela = parcelas[i];
              const charge = resultadoBanco.data.charges[i];
              await parcela.update({
                charge_id: charge.charge_id || null,
                codigo_barras: charge.barcode || null,
                url_boleto: charge.url || null,
                linha_digitavel: charge.line || null,
                numero_parcela: charge.parcel || (i + 1),
                status: 'pendente'
              });
            }
          }
          
          console.log('Carnê e parcelas atualizados com dados da EFI');
        } else {
          console.error(`Falha ao registrar carnê no banco EFI: ${resultadoBanco.message}`);
          // Manter status como pendente se falhou no banco
        }
      }
    } else {
      // Para outros bancos, manter como pendente
      console.log(`Carnê criado localmente (banco não EFI): ${numeroCarne}`);
    }

    console.log(`Carnê gerado para cliente ${cliente.id}: ${numeroCarne} (${numeroParcelasPadrao} parcelas)`);
    return carne;
  }

  /**
   * Busca o plano ativo do cliente
   */
  private async buscarPlanoAtivo(clienteId: number): Promise<Plano | null> {
    // Implementar lógica para buscar plano ativo do cliente
    // Por enquanto, vamos buscar o primeiro plano disponível
    const planos = await Plano.findAll({
      where: { status: 'ativo' },
      limit: 1
    });

    return planos.length > 0 ? planos[0] : null;
  }

  /**
   * Busca banco para geração de carnês
   */
  /**
   * Busca banco do cliente
   */
  private async buscarBancoDoCliente(clienteId: number): Promise<Banco | null> {
    const cliente = await Cliente.findByPk(clienteId, {
      include: [{ association: 'bancoBoleto' }]
    });

    if (!cliente || !cliente.conta_boleto) {
      return null;
    }

    // Buscar banco pela conta_boleto do cliente
    const banco = await Banco.findOne({
      where: { 
        id: cliente.conta_boleto,
        ativo: true 
      }
    });

    return banco;
  }

  private async buscarBanco(bancosIds?: number[]): Promise<Banco | null> {
    const whereClause: any = { ativo: true };

    if (bancosIds && bancosIds.length > 0) {
      whereClause.id = { [Op.in]: bancosIds };
    }

    const bancos = await Banco.findAll({
      where: whereClause,
      limit: 1
    });

    return bancos.length > 0 ? bancos[0] : null;
  }

  /**
   * Gera número único para o carnê (igual ao botão "Novo")
   */
  private async gerarNumeroCarne(): Promise<string> {
    const ano = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 899999).toString();
    return `CAR${ano}${rand}`;
  }

  /**
   * Calcula data de vencimento da primeira parcela
   */
  private calcularDataVencimentoPrimeira(): Date {
    const hoje = new Date();
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    return proximoMes;
  }

  /**
   * Gera parcelas do carnê
   */
  private async gerarParcelas(carne: Carne): Promise<void> {
    const parcelas = [];
    const valorParcela = carne.valor_total / carne.quantidade_parcelas;
    
    for (let i = 1; i <= carne.quantidade_parcelas; i++) {
      const dataVencimento = new Date(carne.data_vencimento_primeira);
      dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));

      parcelas.push({
        carne_id: carne.id,
        numero_parcela: i,
        valor_parcela: valorParcela,
        data_vencimento: dataVencimento,
        status: 'pendente' as const,
        pago: false
      });
    }

    // Inserir parcelas em lote
    const { CarneParcela } = await import('../../models');
    await CarneParcela.bulkCreate(parcelas);
  }
}
