import { Request, Response } from 'express';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { BancoApiService } from '../services/BancoApiService';
import { BarcodeService } from '../services/BarcodeService';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

export class TituloController {
  
  // Método auxiliar para processar um único boleto
  private static async processarBoletoHtml(titulo: any): Promise<string> {
    // Carregar dados da empresa
    const { DadosEmpresa } = await import('../models/DadosEmpresa');
    const dadosEmpresa = await DadosEmpresa.findOne();
    
    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não configurados');
    }

    // Preparar variáveis para o template
    const dataVencimento = new Date(titulo.data_vencimento).toLocaleDateString('pt-BR');
    const dataProcessamento = new Date().toLocaleDateString('pt-BR');
    const valorBoleto = Number(titulo.valor).toFixed(2).replace('.', ',');
    
    // Carregar templates
    const fs = await import('fs');
    const path = await import('path');
    
    const topoTemplatePath = path.join(__dirname, '../templates/boleto-topo-inner.html');
    const corpoTemplatePath = path.join(__dirname, '../templates/boleto-corpo-inner.html');
    
    const topoTemplate = fs.readFileSync(topoTemplatePath, 'utf8');
    const corpoTemplate = fs.readFileSync(corpoTemplatePath, 'utf8');

    // Variáveis para substituição no template - Padrão FEBRABAN
    const templateVars = {
      // Dados da empresa (Beneficiário)
      LOGOMARCA: dadosEmpresa.logo || '',
      CEDENTE: dadosEmpresa.razao_social || 'CTM Telecom',
      EMPRESACPF: dadosEmpresa.cnpj || '',
      EMPRESAENDERECO: `${dadosEmpresa.endereco || ''} ${dadosEmpresa.numero || ''}`.trim(),
      EMPRESABAIRRO: dadosEmpresa.bairro || '',
      EMPRESACEP: dadosEmpresa.cep || '',
      EMPRESACIDADE: dadosEmpresa.cidade || '',
      EMPRESAESTADO: dadosEmpresa.estado || '',
      
      // Dados do banco - FEBRABAN
      LOGOBANCO: (titulo.banco as any).logo || TituloController.getLogoBancoPadrao(titulo.banco.tipo_banco) || dadosEmpresa.logo || '',
      CODIGO_BANCO_COM_DV: titulo.banco.codigo ? `${titulo.banco.codigo}-${BarcodeService.calcularDVCodigoBanco(titulo.banco.codigo)}` : '364-9',
      LINHA_DIGITAVEL: titulo.linha_digitavel || titulo.codigo_barras || '',
      AGENCIA_CODIGO: titulo.banco.agencia_codigo || 'Não configurado',
      
      // Dados do boleto - FEBRABAN
      LOCAL_PAGAMENTO: 'Pagável em qualquer banco até o vencimento',
      DATA_VENC: dataVencimento,
      DATA_DOCUMENTO: dataProcessamento,
      NUMERO_DOCUMENTO: titulo.numero_titulo || titulo.id?.toString() || '',
      ESPECIE_DOC: 'DM',
      DATA_PROC: dataProcessamento,
      NOSSO_NUMERO: titulo.charge_id || titulo.nosso_numero || '',
      CARTEIRA: 'SR',
      VAR_CARTEIRA: '',
      ESPECIE: 'R$',
      VALOR_BOLETO: valorBoleto,
      
      // Dados do cliente (Pagador) - FEBRABAN
      SACADO_NOME: titulo.cliente.razao_social || titulo.cliente.nome || '',
      TIPO_PSACADO: titulo.cliente.cnpj ? 'CNPJ' : 'CPF',
      SACADO_CPF: titulo.cliente.cnpj || titulo.cliente.cpf || '',
      SACADO_ENDERECO: `${titulo.cliente.endereco || ''} ${titulo.cliente.numero || ''}`.trim(),
      SACADO_BAIRRO: titulo.cliente.bairro || '',
      SACADO_COMPLEMENTO: titulo.cliente.complemento || '',
      SACADO_CIDADE: titulo.cliente.cidade || '',
      SACADO_ESTADO: titulo.cliente.estado || '',
      SACADO_CEP: titulo.cliente.cep || '',
      SACADO_IDNOME: titulo.cliente.razao_social || titulo.cliente.nome || '',
      
      // Dados do plano
      NOME_PLANO: titulo.plano.nome_plano || titulo.plano.nome || '',
      DESCRICAO_PLANO: titulo.plano.descricao || '',
      TIPO_SERVICO: titulo.plano.tipo_servico || 'Internet',
      QUANTIDADE_USUARIOS: titulo.plano.quantidade_usuarios || '1',
      VALOR_PLANO: valorBoleto,
      PERIODICIDADE: 'Mensal',
      
      // Instruções
      TEXTO_MULTAMORA: titulo.banco.percentual_multa || titulo.banco.percentual_juros ? 
        `Multa de ${titulo.banco.percentual_multa || 2}% + Juros de ${titulo.banco.percentual_juros || 0.033}% ao dia após o vencimento` : '',
      INSTRUCOES1: TituloController.processarInstrucao(titulo.banco.instrucao_linha_1 || '', titulo),
      INSTRUCOES2: TituloController.processarInstrucao(titulo.banco.instrucao_linha_2 || '', titulo),
      INSTRUCOES3: TituloController.processarInstrucao(titulo.banco.instrucao_linha_3 || '', titulo),
      INSTRUCOES4: TituloController.processarInstrucao(titulo.banco.instrucao_linha_4 || '', titulo),
      INSTRUCOES5: TituloController.processarInstrucao(titulo.banco.instrucao_linha_5 || '', titulo),
      
      // QR Code PIX e Código de Barras
      QRCODE: titulo.qrcode_image || '',
      QRCODE_HTML: titulo.qrcode_image 
        ? `<img src="${titulo.qrcode_image}" style="width: 100px; height: 100px; max-width: 100px; max-height: 100px;" /><br><span style="font-size: 8px; font-weight: bold;">PIX - Pagamento Instantâneo</span>`
        : '<div style="color: #666; font-size: 8px;">QR Code PIX<br>Não disponível</div>',
      BOLETO_BARCODE2: titulo.codigo_barras ? BarcodeService.generateFebrabanBarcodeSvg(titulo.codigo_barras) : ''
    };

    // Processar templates
    let topoProcessado = topoTemplate;
    let corpoProcessado = corpoTemplate;
    
    Object.entries(templateVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      topoProcessado = topoProcessado.replace(regex, String(value));
      corpoProcessado = corpoProcessado.replace(regex, String(value));
    });

    return `${topoProcessado}${corpoProcessado}`;
  }
  
  // Método para processar template do topo
  private static processarTemplateTopo(template: string, variables: any): string {
    let resultado = template;
    
    // Substituir variáveis do template
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      resultado = resultado.replace(regex, variables[key] || '');
    });
    
    return resultado;
  }





  // Obter logo padrão do banco
  private static getLogoBancoPadrao(tipoBanco: string): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const logosPadrao: Record<string, string> = {
      'efi': `${baseUrl}/images/bancos/efi.png`,
      'asaas': `${baseUrl}/images/bancos/asaas.png`,
      'bancario': `${baseUrl}/images/bancos/boletoproprio.png`,
      'outros': `${baseUrl}/images/bancos/boletoproprio.png`
    };

    return logosPadrao[tipoBanco] || logosPadrao['outros'];
  }

  // Processar instruções com substituição de variáveis
  private static processarInstrucao(instrucao: string, titulo: any): string {
    if (!instrucao) return '';
    
    return instrucao
      .replace(/%quantidade_usuarios%/g, titulo.plano?.quantidade_usuarios || '1')
      .replace(/%tipo_servico%/g, titulo.plano?.tipo_servico || 'Internet')
      .replace(/%nome_plano%/g, titulo.plano?.nome_plano || 'Plano')
      .replace(/%valor_plano%/g, Number(titulo.plano?.valor_mensal || 0).toFixed(2).replace('.', ','))
      .replace(/%cliente_nome%/g, titulo.cliente?.razao_social || '')
      .replace(/%cliente_cnpj%/g, titulo.cliente?.cnpj || '')
      .replace(/%data_vencimento%/g, new Date(titulo.data_vencimento).toLocaleDateString('pt-BR'))
      .replace(/%valor_boleto%/g, Number(titulo.valor).toFixed(2).replace('.', ','));
  }

  // Listar títulos com filtros
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        cliente_id, 
        data_vencimento_inicio,
        data_vencimento_fim,
        search 
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      
      // Construir filtros
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (cliente_id) {
        where.cliente_id = cliente_id;
      }
      
      if (data_vencimento_inicio || data_vencimento_fim) {
        where.data_vencimento = {};
        
        if (data_vencimento_inicio) {
          where.data_vencimento[Op.gte] = new Date(data_vencimento_inicio as string);
        }
        
        if (data_vencimento_fim) {
          where.data_vencimento[Op.lte] = new Date(data_vencimento_fim as string);
        }
      }

      // Filtro de busca
      if (search) {
        where[Op.or] = [
          { numero_titulo: { [Op.like]: `%${search}%` } },
          { observacoes: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await Titulo.findAndCountAll({
        where,
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email']
          },
          {
            model: Plano,
            as: 'plano',
            attributes: ['id', 'nome_plano', 'valor_mensal']
          },
          {
            model: Banco,
            as: 'banco',
            attributes: ['id', 'nome', 'tipo_banco']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit))
        }
      });
    } catch (error: any) {
      logger.error('Erro ao listar títulos', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Buscar título por ID
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, {
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email', 'telefone', 'whatsapp']
          },
          {
            model: Plano,
            as: 'plano',
            attributes: ['id', 'nome_plano', 'valor_mensal', 'descricao']
          },
          {
            model: Banco,
            as: 'banco',
            attributes: ['id', 'nome', 'tipo_banco', 'codigo']
          }
        ]
      });

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: titulo
      });
    } catch (error: any) {
      logger.error('Erro ao buscar título', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Criar novo título
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { 
        cliente_id, 
        plano_id, 
        contrato_id,
        data_vencimento, 
        observacoes,
        desconto_percentual,
        desconto_valor,
        acrescimo_percentual,
        acrescimo_valor,
        descricao
      } = req.body;

      // Validar dados obrigatórios
      if (!cliente_id) {
        res.status(400).json({
          success: false,
          message: 'Cliente é obrigatório'
        });
        return;
      }

      // Buscar cliente
      const cliente = await Cliente.findByPk(cliente_id);

      if (!cliente) {
        res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
        return;
      }

      // Buscar plano - se não foi informado, buscar o plano ativo do cliente
      let plano;
      if (plano_id) {
        plano = await Plano.findByPk(plano_id);
        if (!plano) {
          res.status(404).json({
            success: false,
            message: 'Plano não encontrado'
          });
          return;
        }
      } else {
        // Buscar plano ativo do cliente
        const contratoAtivo = await Contrato.findOne({
          where: { 
            cliente_id: cliente.id, 
            status: 'ativo' 
          },
          include: [{ model: Plano, as: 'plano' }]
        });

        if (!contratoAtivo) {
          res.status(400).json({
            success: false,
            message: 'Cliente não possui plano ativo'
          });
          return;
        }

        plano = await Plano.findByPk(contratoAtivo.plano_id);
        if (!plano) {
          res.status(400).json({
            success: false,
            message: 'Plano do contrato não encontrado'
          });
          return;
        }
      }

      // Calcular data de vencimento se não foi informada
      let dataVencimentoFinal = data_vencimento;
      if (!dataVencimentoFinal) {
        // Buscar contrato ativo para pegar o dia de vencimento
        const contratoAtivo = await Contrato.findOne({
          where: { 
            cliente_id: cliente.id, 
            status: 'ativo' 
          }
        });

        let diaVencimento = 15; // Dia padrão
        if (contratoAtivo && contratoAtivo.dia_vencimento) {
          diaVencimento = contratoAtivo.dia_vencimento;
        }

        // Calcular próxima data de vencimento
        const hoje = new Date();
        const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento);
        
        // Se o dia já passou neste mês, usar o próximo mês
        const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
        const dataFinal = vencimento > hoje ? vencimento : proximoMes;
        
        dataVencimentoFinal = dataFinal.toISOString().split('T')[0];
      }

      // Selecionar banco
      let banco;
      // Buscar banco do contrato ativo do cliente
      const contratoAtivo = await Contrato.findOne({
        where: { 
          cliente_id: cliente.id, 
          status: 'ativo' 
        },
        include: [{ model: Banco, as: 'bancoBoleto' }]
      });
      
      if (contratoAtivo?.conta_boleto) {
        banco = await Banco.findByPk(contratoAtivo.conta_boleto);
        if (!banco || !banco.ativo) {
          res.status(400).json({
            success: false,
            message: 'Banco configurado no cliente não está ativo'
          });
          return;
        }
      } else {
        // Usar banco padrão ativo
        banco = await Banco.findOne({ where: { ativo: true } });
        if (!banco) {
          res.status(400).json({
            success: false,
            message: 'Nenhum banco ativo encontrado'
          });
          return;
        }
      }

      // Gerar número único do título
      const gerarNumeroTitulo = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `TIT-${timestamp}-${random}`;
      };

      // Calcular valor final com desconto/acréscimo
      let valorFinal = parseFloat(plano.valor_mensal.toString());
      
      // Aplicar desconto percentual
      if (desconto_percentual && desconto_percentual > 0) {
        valorFinal = valorFinal * (1 - (desconto_percentual / 100));
      }
      
      // Aplicar desconto em valor
      if (desconto_valor && desconto_valor > 0) {
        valorFinal = valorFinal - parseFloat(desconto_valor.toString());
      }
      
      // Aplicar acréscimo percentual
      if (acrescimo_percentual && acrescimo_percentual > 0) {
        valorFinal = valorFinal * (1 + (acrescimo_percentual / 100));
      }
      
      // Aplicar acréscimo em valor
      if (acrescimo_valor && acrescimo_valor > 0) {
        valorFinal = valorFinal + parseFloat(acrescimo_valor.toString());
      }
      
      // Garantir que o valor final não seja negativo
      valorFinal = Math.max(0, valorFinal);

      // Criar título
      const titulo = await Titulo.create({
        cliente_id,
        plano_id: plano.id,
        banco_id: banco.id,
        contrato_id: contrato_id || null,
        numero_titulo: gerarNumeroTitulo(),
        valor: plano.valor_mensal,
        valor_final: valorFinal,
        data_vencimento: dataVencimentoFinal,
        observacoes: observacoes || '',
        desconto_percentual: desconto_percentual || null,
        desconto_valor: desconto_valor || null,
        acrescimo_percentual: acrescimo_percentual || null,
        acrescimo_valor: acrescimo_valor || null,
        descricao: descricao || null,
        status: 'pendente',
        pago: false
      });

      res.status(201).json({
        success: true,
        message: 'Título criado com sucesso',
        data: titulo
      });
    } catch (error: any) {
      logger.error('Erro ao criar título', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar título
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, data_vencimento, observacoes } = req.body;

      const titulo = await Titulo.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Banco, as: 'banco' }
        ]
      }) as any;

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Validações de status
      if (status === 'cancelado' && titulo.status === 'pago') {
        res.status(400).json({
          success: false,
          message: 'Não é possível cancelar um título que já foi pago'
        });
        return;
      }

      if (status === 'cancelado' && titulo.status === 'cancelado') {
        res.status(400).json({
          success: false,
          message: 'Este título já está cancelado'
        });
        return;
      }

      if (status === 'pago' && titulo.status === 'cancelado') {
        res.status(400).json({
          success: false,
          message: 'Não é possível marcar como pago um título cancelado'
        });
        return;
      }

      // Verificar se está cancelando
      if (status === 'cancelado' && titulo.status !== 'cancelado') {
        // Cancelar na API do banco se tiver charge_id
        if (titulo.charge_id && titulo.banco.tipo_banco === 'efi') {
          try {
            await BancoApiService.cancelarTitulo(titulo as any);
            logger.info('Título cancelado na EFI', { 
              titulo_id: titulo.id, 
              charge_id: titulo.charge_id 
            });
          } catch (error: any) {
            logger.warn('Erro ao cancelar título na EFI', { 
              titulo_id: titulo.id, 
              error: error.message 
            });
          }
        }
      }

      // Verificar alteração de vencimento
      if (data_vencimento && new Date(data_vencimento).getTime() !== new Date(titulo.data_vencimento).getTime()) {
        // Não permitir alterar vencimento de títulos cancelados
        if (titulo.status === 'cancelado') {
          res.status(400).json({
            success: false,
            message: 'Não é possível alterar o vencimento de um título cancelado'
          });
          return;
        }

        logger.info('Verificando alteração de vencimento', {
          titulo_id: titulo.id,
          data_original: titulo.data_vencimento,
          data_nova: data_vencimento,
          mudou: true,
          banco: titulo.banco.tipo_banco
        });
      }

      // Atualizar título
      await titulo.update({
        status: status || titulo.status,
        data_vencimento: data_vencimento || titulo.data_vencimento,
        observacoes: observacoes !== undefined ? observacoes : titulo.observacoes
      });

      res.json({
        success: true,
        message: 'Título atualizado com sucesso',
        data: titulo
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar título', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Deletar título
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, {
        include: [{ model: Banco, as: 'banco' }]
      }) as any;

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Cancelar na API do banco se tiver charge_id
      if (titulo.charge_id && titulo.banco.tipo_banco === 'efi') {
        try {
          await BancoApiService.cancelarTitulo(titulo as any);
          logger.info('Título cancelado na EFI antes da exclusão', { 
            titulo_id: titulo.id, 
            charge_id: titulo.charge_id 
          });
        } catch (error: any) {
          logger.warn('Erro ao cancelar título na EFI', { 
            titulo_id: titulo.id, 
            error: error.message 
          });
        }
      }

      // Deletar título
      await titulo.destroy();

      res.json({
        success: true,
        message: 'Título deletado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao deletar título', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Imprimir boleto
  static async imprimirBoleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { 
            model: Banco, 
            as: 'banco', 
            attributes: [
              'id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox',
              'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 
              'instrucao_linha_4', 'instrucao_linha_5', 'logo'
            ] 
          }
        ]
      }) as any;

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Verificar se já está registrado no banco
      if (!titulo.charge_id) {
        logger.info('Título não registrado no banco, registrando agora antes de imprimir...', {
          titulo_id: titulo.id,
          banco_id: titulo.banco_id,
          cliente_id: titulo.cliente_id
        });

        try {
          // Registrar no banco e AGUARDAR resposta
          const resultado = await BancoApiService.gerarTitulo(titulo as any);
          
          if (!resultado.success || !resultado.data) {
            // Falha ao registrar - retornar erro
            logger.error('Falha ao registrar título no banco', {
              titulo_id: titulo.id,
              message: resultado.message
            });
            
            res.status(500).json({
              success: false,
              message: 'Não foi possível registrar o título no banco: ' + (resultado.message || 'Erro desconhecido'),
              error: 'ERRO_REGISTRO_BANCO'
            });
            return;
          }

          // Sucesso - atualizar título com dados do banco
          let codigoBarrasFinal = resultado.data.codigo_barras;
          if (resultado.data.codigo_barras && !BarcodeService.validarCodigoBarrasFebraban(resultado.data.codigo_barras)) {
            logger.warn('Código de barras da API inválido, usando mesmo assim', {
              titulo_id: titulo.id,
              codigo_original: resultado.data.codigo_barras
            });
            codigoBarrasFinal = resultado.data.codigo_barras;
          }

          // Atualizar título com dados do banco
          await titulo.update({
            charge_id: resultado.data.charge_id,
            url_boleto: resultado.data.url_boleto,
            qrcode: resultado.data.qrcode,
            qrcode_image: resultado.data.qrcode_image,
            codigo_barras: codigoBarrasFinal,
            linha_digitavel: resultado.data.linha_digitavel,
            nosso_numero: resultado.data.nosso_numero
          });

          logger.info('Título registrado no banco com sucesso, prosseguindo com impressão', {
            titulo_id: titulo.id,
            charge_id: resultado.data.charge_id
          });
          
          // Recarregar título com dados atualizados
          await titulo.reload();
          
        } catch (error: any) {
          logger.error('Erro ao registrar título no banco', { 
            titulo_id: titulo.id, 
            error: error.message,
            stack: error.stack
          });
          
          res.status(500).json({
            success: false,
            message: 'Erro ao registrar título no banco: ' + error.message,
            error: 'ERRO_REGISTRO_BANCO'
          });
          return;
        }
      }

      // Carregar dados da empresa
      const { DadosEmpresa } = await import('../models/DadosEmpresa');
      const dadosEmpresa = await DadosEmpresa.findOne();
      
      if (!dadosEmpresa) {
        res.status(500).json({
          success: false,
          message: 'Dados da empresa não configurados'
        });
        return;
      }

      // Preparar variáveis para o template
      const dataVencimento = new Date(titulo.data_vencimento).toLocaleDateString('pt-BR');
      const dataProcessamento = new Date().toLocaleDateString('pt-BR');
      const valorBoleto = Number(titulo.valor).toFixed(2).replace('.', ',');
      
      // Carregar templates
      const fs = await import('fs');
      const path = await import('path');
      
      const topoTemplatePath = path.join(__dirname, '../templates/boleto-topo-inner.html');
      const corpoTemplatePath = path.join(__dirname, '../templates/boleto-corpo-inner.html');
      
      let topoTemplate = '';
      let corpoTemplate = '';
      
      try {
        topoTemplate = fs.readFileSync(topoTemplatePath, 'utf8');
        corpoTemplate = fs.readFileSync(corpoTemplatePath, 'utf8');
      } catch (error: any) {
        logger.error('Erro ao carregar templates do boleto', { error: error.message });
        res.status(500).json({
          success: false,
          message: 'Erro ao carregar template do boleto'
        });
        return;
      }

      // Variáveis para substituição no template - Padrão FEBRABAN
      const templateVars = {
        // Dados da empresa (Beneficiário)
        LOGOMARCA: dadosEmpresa.logo || '',
        CEDENTE: dadosEmpresa.razao_social || 'CTM Telecom',
        EMPRESACPF: dadosEmpresa.cnpj || '',
        EMPRESAENDERECO: `${dadosEmpresa.endereco || ''} ${dadosEmpresa.numero || ''}`.trim(),
        EMPRESABAIRRO: dadosEmpresa.bairro || '',
        EMPRESACEP: dadosEmpresa.cep || '',
        EMPRESACIDADE: dadosEmpresa.cidade || '',
        EMPRESAESTADO: dadosEmpresa.estado || '',
        
        // Dados do banco - FEBRABAN
        LOGOBANCO: (titulo.banco as any).logo || TituloController.getLogoBancoPadrao(titulo.banco.tipo_banco) || dadosEmpresa.logo || '',
        CODIGO_BANCO_COM_DV: titulo.banco.codigo ? `${titulo.banco.codigo}-${BarcodeService.calcularDVCodigoBanco(titulo.banco.codigo)}` : '364-9',
        LINHA_DIGITAVEL: titulo.linha_digitavel || titulo.codigo_barras || '',
        AGENCIA_CODIGO: titulo.banco.agencia_codigo || 'Não configurado',
        
        // Dados do boleto - FEBRABAN
        LOCAL_PAGAMENTO: 'Pagável em qualquer banco até o vencimento',
        DATA_VENC: dataVencimento,
        DATA_DOCUMENTO: dataProcessamento,
        NUMERO_DOCUMENTO: titulo.numero_titulo || titulo.id?.toString() || '',
        ESPECIE_DOC: 'DM', // Duplicata de Venda Mercantil
        DATA_PROC: dataProcessamento,
        NOSSO_NUMERO: titulo.charge_id || titulo.nosso_numero || '',
        CARTEIRA: 'SR', // Sem Registro
        VAR_CARTEIRA: '',
        ESPECIE: 'R$',
        VALOR_BOLETO: valorBoleto,
        
        // Dados do cliente (Pagador) - FEBRABAN
        SACADO_NOME: titulo.cliente.razao_social || titulo.cliente.nome || '',
        TIPO_PSACADO: titulo.cliente.cnpj ? 'CNPJ' : 'CPF',
        SACADO_CPF: titulo.cliente.cnpj || titulo.cliente.cpf || '',
        SACADO_ENDERECO: `${titulo.cliente.endereco || ''} ${titulo.cliente.numero || ''}`.trim(),
        SACADO_BAIRRO: titulo.cliente.bairro || '',
        SACADO_COMPLEMENTO: titulo.cliente.complemento || '',
        SACADO_CIDADE: titulo.cliente.cidade || '',
        SACADO_ESTADO: titulo.cliente.estado || '',
        SACADO_CEP: titulo.cliente.cep || '',
        SACADO_IDNOME: titulo.cliente.razao_social || titulo.cliente.nome || '',
        
        // Dados do plano
        NOME_PLANO: titulo.plano.nome_plano || titulo.plano.nome || '',
        DESCRICAO_PLANO: titulo.plano.descricao || '',
        TIPO_SERVICO: titulo.plano.tipo_servico || 'Internet',
        QUANTIDADE_USUARIOS: titulo.plano.quantidade_usuarios || '1',
        VALOR_PLANO: valorBoleto,
        PERIODICIDADE: 'Mensal',
        
        // Instruções do banco - Padrão FEBRABAN
        TEXTO_MULTAMORA: `Após o vencimento, cobrar multa de ${titulo.banco.percentual_multa || 2}% e juros de ${titulo.banco.percentual_juros || 1}% ao mês.`,
        INSTRUCOES1: TituloController.processarInstrucao(titulo.banco.instrucao_linha_1 || 'Não receber após o vencimento.', titulo),
        INSTRUCOES2: TituloController.processarInstrucao(titulo.banco.instrucao_linha_2 || 'Em caso de dúvidas, entre em contato conosco.', titulo),
        INSTRUCOES3: TituloController.processarInstrucao(titulo.banco.instrucao_linha_3 || 'Pagável em qualquer banco até o vencimento.', titulo),
        INSTRUCOES4: TituloController.processarInstrucao(titulo.banco.instrucao_linha_4 || 'Ficha de Compensação do Boleto Bancário.', titulo),
        INSTRUCOES5: TituloController.processarInstrucao(titulo.banco.instrucao_linha_5 || '', titulo),
        
        // QR Code e código de barras - FEBRABAN
        QRCODE: titulo.qrcode_image || '',
        QRCODE_HTML: titulo.qrcode_image 
          ? `<img src="${titulo.qrcode_image}" style="width: 100px; height: 100px; max-width: 100px; max-height: 100px;" /><br><span style="font-size: 8px; font-weight: bold;">PIX - Pagamento Instantâneo</span>`
          : '<div style="color: #666; font-size: 8px;">QR Code PIX<br>Não disponível</div>',
        BOLETO_BARCODE2: titulo.codigo_barras ? BarcodeService.generateFebrabanBarcodeSvg(titulo.codigo_barras) : ''
      };

      // Processar templates
      let topoProcessado = topoTemplate;
      let corpoProcessado = corpoTemplate;
      
      Object.entries(templateVars).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        topoProcessado = topoProcessado.replace(regex, String(value));
        corpoProcessado = corpoProcessado.replace(regex, String(value));
      });

      // Template final
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boleto - ${titulo.numero_titulo}</title>
        </head>
        <body>
          ${topoProcessado}
          ${corpoProcessado}
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      // Não definir X-Frame-Options para permitir iframe em desenvolvimento
      res.send(template);
    } catch (error: any) {
      logger.error('Erro ao imprimir boleto', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Imprimir múltiplos boletos
  static async imprimirBoletosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      // Aceitar ids de POST (body) ou GET (query)
      let ids = req.body.ids || req.query.ids;
      
      // Se vier como string (form data ou query string), fazer parse
      if (typeof ids === 'string') {
        try {
          ids = JSON.parse(ids);
        } catch (e) {
          // Se não for JSON válido, tentar split por vírgula
          ids = ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        }
      }

      // Se for número único, transformar em array
      if (typeof ids === 'number') {
        ids = [ids];
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'IDs dos títulos não fornecidos'
        });
        return;
      }

      const titulos = await Titulo.findAll({
        where: { id: ids },
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { 
            model: Banco, 
            as: 'banco', 
            attributes: [
              'id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox',
              'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 
              'instrucao_linha_4', 'instrucao_linha_5', 'logo'
            ] 
          }
        ]
      });

      if (titulos.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Nenhum título encontrado'
        });
        return;
      }

      // Gerar HTML para cada boleto usando função auxiliar
      const boletosHtml: string[] = [];

      // Registrar títulos que ainda não foram registrados no banco
      for (const titulo of titulos) {
        if (!titulo.charge_id) {
          logger.info('Registrando título no banco antes de imprimir', {
            titulo_id: titulo.id
          });

          try {
            const resultado = await BancoApiService.gerarTitulo(titulo as any);
            
            if (resultado.success && resultado.data) {
              let codigoBarrasFinal = resultado.data.codigo_barras;
              if (resultado.data.codigo_barras && !BarcodeService.validarCodigoBarrasFebraban(resultado.data.codigo_barras)) {
                codigoBarrasFinal = resultado.data.codigo_barras;
              }

              await titulo.update({
                charge_id: resultado.data.charge_id,
                url_boleto: resultado.data.url_boleto,
                qrcode: resultado.data.qrcode,
                qrcode_image: resultado.data.qrcode_image,
                codigo_barras: codigoBarrasFinal,
                linha_digitavel: resultado.data.linha_digitavel,
                nosso_numero: resultado.data.nosso_numero
              });

              logger.info('Título registrado com sucesso', {
                titulo_id: titulo.id,
                charge_id: resultado.data.charge_id
              });

              // Recarregar título com dados atualizados
              await titulo.reload();
            } else {
              logger.error('Falha ao registrar título', {
                titulo_id: titulo.id,
                message: resultado.message
              });
              // Continua processando os outros mesmo se um falhar
            }
          } catch (error: any) {
            logger.error('Erro ao registrar título', { 
              error: error.message, 
              titulo_id: titulo.id 
            });
            // Continua processando os outros mesmo se um falhar
          }
        }

        // Processar HTML do boleto usando função auxiliar
        const boletoHtml = await TituloController.processarBoletoHtml(titulo);
        
        // Adicionar quebra de página
        boletosHtml.push(`
          <div style="page-break-after: always;">
            ${boletoHtml}
          </div>
        `);
      }

      // Verificar se deve auto-imprimir
      const autoPrint = req.query.print === 'true';
      
      // Template final com todos os boletos
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boletos - ${titulos.length} título(s)</title>
          <style>
            @media print {
              .page-break { page-break-after: always; }
            }
          </style>
          ${autoPrint ? '<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>' : ''}
        </head>
        <body>
          ${boletosHtml.join('\n')}
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      // Não definir X-Frame-Options para permitir iframe em desenvolvimento
      res.send(template);
    } catch (error: any) {
      logger.error('Erro ao imprimir boletos múltiplos', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Gerar PDF de múltiplos boletos
  static async gerarPdfBoletosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      // Aceitar ids de query
      let ids: number[] = [];
      const idsParam = req.query.ids as string;
      
      logger.info('Query params recebidos:', { query: req.query, idsParam });
      
      if (idsParam) {
        try {
          // Tentar parse como JSON primeiro
          const parsed = JSON.parse(idsParam);
          // Garantir que seja sempre um array
          ids = Array.isArray(parsed) ? parsed : [parsed];
          logger.info('IDs parseados como JSON:', { ids });
        } catch (e) {
          // Se não for JSON válido, tentar split por vírgula
          ids = idsParam.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
          logger.info('IDs parseados como CSV:', { ids });
        }
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'IDs dos títulos não fornecidos'
        });
        return;
      }

      logger.info('IDs recebidos para PDF:', { ids });

      const titulos = await Titulo.findAll({
        where: { id: { [Op.in]: ids } },
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { 
            model: Banco, 
            as: 'banco', 
            attributes: [
              'id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox',
              'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 
              'instrucao_linha_4', 'instrucao_linha_5', 'logo'
            ] 
          }
        ]
      });

      if (titulos.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Nenhum título encontrado'
        });
        return;
      }

      // Gerar HTML para cada boleto usando função auxiliar
      const boletosHtml: string[] = [];

      // Registrar títulos que ainda não foram registrados no banco
      for (const titulo of titulos) {
        if (!titulo.charge_id) {
          try {
            // Simular registro no banco (implementar conforme necessário)
            const chargeId = `charge_${titulo.id}_${Date.now()}`;
            if (chargeId) {
              await titulo.update({ 
                charge_id: chargeId,
                status: 'pendente'
              });
            }
          } catch (error: any) {
            logger.error('Erro ao registrar título no banco', { 
              titulo_id: titulo.id,
              error: error.message 
            });
            // Continua processando os outros mesmo se um falhar
          }
        }

        // Processar HTML do boleto usando função auxiliar
        const boletoHtml = await TituloController.processarBoletoHtml(titulo);
        
        // Adicionar quebra de página
        boletosHtml.push(`
          <div style="page-break-after: always;">
            ${boletoHtml}
          </div>
        `);
      }

      // Template final com todos os boletos
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boletos - ${titulos.length} título(s)</title>
          <style>
            @media print {
              .page-break { page-break-after: always; }
            }
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .boleto { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          ${boletosHtml.join('')}
        </body>
        </html>
      `;

      // Converter HTML para PDF usando html-pdf-node
      const htmlPdf = require('html-pdf-node');
      const file = { content: template };
      const options = {
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true,
        displayHeaderFooter: false
      };
      
      const pdfBuffer = await htmlPdf.generatePdf(file, options);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="boletos-${titulos.length}-titulos.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      logger.error('Erro ao gerar PDF de múltiplos boletos', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Marcar como pago
  static async marcarComoPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { valor_pago, data_pagamento } = req.body;

      const titulo = await Titulo.findByPk(id);
      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Validação: não pode marcar como pago se já estiver cancelado
      if (titulo.status === 'cancelado') {
        res.status(400).json({
          success: false,
          message: 'Não é possível marcar como pago um título cancelado'
        });
        return;
      }

      // Validação: não pode marcar como pago se já estiver pago
      if (titulo.status === 'pago') {
        res.status(400).json({
          success: false,
          message: 'Este título já foi marcado como pago'
        });
        return;
      }

      await titulo.marcarComoPago(valor_pago, data_pagamento ? new Date(data_pagamento) : undefined);

      res.json({
        success: true,
        message: 'Título marcado como pago',
        data: titulo
      });
    } catch (error: any) {
      logger.error('Erro ao marcar título como pago', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Desmarcar como pago
  static async desmarcarPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id);
      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      await titulo.desmarcarPago();

      res.json({
        success: true,
        message: 'Título desmarcado como pago',
        data: titulo
      });
    } catch (error: any) {
      logger.error('Erro ao desmarcar título como pago', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Estornar título (volta para pendente)
  // Consultar recebimento na API do banco
  static async consultarRecebimento(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { model: Banco, as: 'banco' }
        ]
      });

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      if (!titulo.charge_id) {
        res.status(400).json({
          success: false,
          message: 'Título não possui charge_id (não foi registrado no banco)'
        });
        return;
      }

      // Consultar status na API do banco
      const resultado = await BancoApiService.consultarStatus(titulo);

      if (resultado.success && resultado.data) {
        // Verificar se foi pago
        const statusPago = resultado.data.status === 'paid' || resultado.data.status === 'settled';
        
        if (statusPago) {
          const valorPago = resultado.data.valor_pago || titulo.valor;
          const dataPagamento = resultado.data.data_pagamento 
            ? new Date(resultado.data.data_pagamento) 
            : new Date();

          // Marcar como pago (lógica automática de parcial/atraso)
          await titulo.marcarComoPago(Number(valorPago), dataPagamento);

          res.json({
            success: true,
            message: 'Título atualizado com sucesso',
            data: {
              titulo_id: titulo.id,
              status_anterior: titulo.status,
              status_novo: titulo.status,
              valor_pago: valorPago,
              data_pagamento: dataPagamento
            }
          });
        } else {
          res.json({
            success: true,
            message: 'Título consultado - sem alterações (ainda não foi pago)',
            data: {
              titulo_id: titulo.id,
              status: titulo.status,
              status_banco: resultado.data.status
            }
          });
        }
      } else {
        res.status(400).json({
          success: false,
          message: resultado.message || 'Erro ao consultar status no banco'
        });
      }
    } catch (error: any) {
      logger.error('Erro ao consultar recebimento', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  static async estornar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id);
      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Validação: só pode estornar se estiver pago
      if (titulo.status !== 'pago') {
        res.status(400).json({
          success: false,
          message: 'Só é possível estornar títulos que estão pagos'
        });
        return;
      }

      // Estornar = desmarcar como pago (volta para pendente)
      await titulo.desmarcarPago();

      res.json({
        success: true,
        message: 'Título estornado com sucesso',
        data: titulo
      });
    } catch (error: any) {
      logger.error('Erro ao estornar título', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }


  // Buscar títulos por contrato
  static async getByContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;

      // Validar se o contrato existe
      const contrato = await Contrato.findByPk(contratoId);
      if (!contrato) {
        res.status(404).json({
          success: false,
          message: 'Contrato não encontrado'
        });
        return;
      }

      // Buscar títulos do contrato
      const titulos = await Titulo.findAll({
        where: {
          contrato_id: contratoId
        },
        include: [
          {
            model: Cliente,
            as: 'cliente',
            where: { id: contrato.cliente_id },
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj']
          },
          {
            model: Plano,
            as: 'plano',
            attributes: ['id', 'nome_plano', 'valor_mensal']
          },
          {
            model: Banco,
            as: 'banco',
            attributes: ['id', 'nome', 'tipo_banco']
          }
        ],
        order: [['data_vencimento', 'DESC']]
      });

      res.json({
        success: true,
        data: titulos
      });
    } catch (error: any) {
      logger.error('Erro ao buscar títulos por contrato', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas dos títulos
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { cliente_id } = req.query;

      const where: any = {};
      if (cliente_id) {
        where.cliente_id = cliente_id;
      }

      const [
        totalTitulos,
        titulosPendentes,
        titulosPagos,
        titulosVencidos,
        titulosCancelados
      ] = await Promise.all([
        Titulo.count({ where }),
        Titulo.count({ where: { ...where, status: 'pendente' } }),
        Titulo.count({ where: { ...where, status: 'pago' } }),
        Titulo.count({ where: { ...where, status: 'vencido' } }),
        Titulo.count({ where: { ...where, status: 'cancelado' } })
      ]);

      // Calcular valores
      const [
        valorTotal,
        valorPendente,
        valorPago,
        valorVencido,
        valorCancelado
      ] = await Promise.all([
        Titulo.sum('valor', { where }),
        Titulo.sum('valor', { where: { ...where, status: 'pendente' } }),
        Titulo.sum('valor', { where: { ...where, status: 'pago' } }),
        Titulo.sum('valor', { where: { ...where, status: 'vencido' } }),
        Titulo.sum('valor', { where: { ...where, status: 'cancelado' } })
      ]);

      res.json({
        success: true,
        data: {
          quantidade: {
            total: totalTitulos,
            pendentes: titulosPendentes,
            pagos: titulosPagos,
            vencidos: titulosVencidos,
            cancelados: titulosCancelados
          },
          valores: {
            total: valorTotal || 0,
            pendente: valorPendente || 0,
            pago: valorPago || 0,
            vencido: valorVencido || 0,
            cancelado: valorCancelado || 0
          }
        }
      });
    } catch (error: any) {
      logger.error('Erro ao buscar estatísticas dos títulos', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
