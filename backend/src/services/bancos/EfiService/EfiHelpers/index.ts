import type { cadastros_bancos, financeiro_titulos } from '@prisma/client';

type Banco = cadastros_bancos;
type Titulo = financeiro_titulos;
import { logger } from '../../../../utils/logger';
import { formatDateOnly } from '../../../../utils/timezoneUtils';
import { efiConfig } from '../../../../config/bancos/efi';
import type { JsonValue } from '../../../../types/index';
import type { TituloWithRelations } from '../../types';
import { stripCnpj } from '../../../../utils/cnpj';

interface ClienteForBoleto {
  razao_social: string;
  cnpj: string;
  telefone: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
}

interface PlanoForBoleto {
  nome_plano: string;
}

interface BoletoData {
  items: Array<{
    name: string;
    value: number;
    amount: number;
  }>;
  metadata?: {
    custom_id?: string;
    notification_url?: string;
  };
  payment?: {
    banking_billet?: {
      customer?: JsonValue;
      expire_at?: string;
      configurations?: {
        fine?: number;
        interest?: number;
      };
      message?: string;
      [key: string]: JsonValue | undefined;
    };
  };
}

interface CustomerData {
  name: string;
  phone_number: string;
  juridical_person: {
    corporate_name: string;
    cnpj: string;
  };
  address: {
    street: string;
    number: string;
    neighborhood: string;
    zipcode: string;
    city: string;
    complement?: string;
    state: string;
  };
}

export class EfiHelpers {
  /**
   * Preparar dados do boleto para API da Efi
   */
  static async prepararDadosBoleto(
    banco: Banco,
    titulo: TituloWithRelations,
    cliente: ClienteForBoleto,
    plano: PlanoForBoleto
  ): Promise<BoletoData> {
    const { DadosEmpresaService } = await import('../../../../services/sistema/DadosEmpresaService');
    const empresaId = (titulo as { empresa_id?: number | null }).empresa_id ?? undefined;
    const dadosEmpresa = await DadosEmpresaService.findOne(empresaId);

    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não configurados');
    }

    if (!cliente.razao_social) throw new Error('Cliente deve ter razão social preenchida');
    if (!cliente.telefone) throw new Error('Cliente deve ter telefone preenchido');
    if (!cliente.cnpj) throw new Error('Cliente deve ter CNPJ preenchido');
    if (!cliente.endereco) throw new Error('Cliente deve ter endereço preenchido');
    if (!cliente.numero) throw new Error('Cliente deve ter número do endereço preenchido');
    if (!cliente.bairro) throw new Error('Cliente deve ter bairro preenchido');
    if (!cliente.cep) throw new Error('Cliente deve ter CEP preenchido');
    if (!cliente.cidade) throw new Error('Cliente deve ter cidade preenchida');
    if (!cliente.estado) throw new Error('Cliente deve ter estado preenchido');

    const valorCentavos = Math.round(Number(titulo.valor) * 100);
    const fineBp = Math.round(Number(banco.percentual_multa || 0) * 100);
    const interestBp = Math.round(Number(banco.percentual_juros || 0) * 100);

    const nomeCliente = cliente.razao_social || 'Cliente';
    const nomeFormatado = nomeCliente.includes(' ') ? nomeCliente : `${nomeCliente}  `;

    const customerData: CustomerData = {
      name: nomeFormatado,
      phone_number: this.formatarTelefoneEFI(cliente.telefone, titulo.id),
      juridical_person: {
        corporate_name: nomeFormatado,
        cnpj: stripCnpj(cliente.cnpj),
      },
      address: {
        street: cliente.endereco,
        number: cliente.numero,
        neighborhood: cliente.bairro,
        zipcode: cliente.cep.replace(/\D/g, ''),
        city: cliente.cidade,
        complement: cliente.complemento,
        state: cliente.estado
      }
    };

    const mensagem = `Cobrança referente ao serviço ${plano.nome_plano || 'Internet'} - Título ${titulo.numero_titulo}`;
    const mensagemFormatada = this.formatarMensagemEFI(mensagem);

    return {
      items: [{
        name: plano.nome_plano || 'Serviço de Internet',
        value: valorCentavos,
        amount: 1
      }],
      payment: {
        banking_billet: {
          customer: JSON.parse(JSON.stringify(customerData)) as JsonValue,
          expire_at: formatDateOnly(titulo.data_vencimento) || '',
          configurations: {
            fine: fineBp,
            interest: interestBp
          },
          message: mensagemFormatada
        }
      },
      metadata: {
        custom_id: `titulo_${titulo.id}`
      }
    };
  }

  /**
   * Formatar telefone para EFI
   */
  static formatarTelefoneEFI(telefone: string, tituloId?: number): string {
    let numero = telefone.replace(/\D/g, '');

    if (numero.length > 11) {
      numero = numero.substring(numero.length - 11);
    }

    if (numero.length === 11) {
      const regex11 = /^[1-9]{1}[1-9]{1}9[0-9]{8}$/;
      if (regex11.test(numero)) {
        return numero;
      }

      const ddd = numero.substring(0, 2);
      const resto = numero.substring(2);

      if (resto.length === 9) {
        const primeiroDigito = resto.substring(0, 1);

        if (primeiroDigito === '9') {
          const numeroFormatado = resto.substring(1);
          numero = ddd + '9' + numeroFormatado;
        } else {
          numero = ddd + '9' + resto.substring(0, 8);
        }
      }
    }

    if (numero.length === 10) {
      const regex10 = /^[1-9]{1}[1-9]{1}[0-9]{8}$/;
      if (regex10.test(numero)) {
        return numero;
      }
    }

    if (numero.length < 10) {
      logger.warn('Telefone muito curto, usando formato genérico', {
        telefone_original: telefone,
        telefone_limpo: numero,
        titulo_id: tituloId
      });
      return '11999999999';
    }

    if (numero.length > 10) {
      numero = numero.substring(0, 2) + numero.substring(numero.length - 8);
    }

    return numero;
  }

  /**
   * Formatar mensagem para EFI (máximo 4 linhas, 100 caracteres cada)
   */
  static formatarMensagemEFI(mensagem: string): string {
    const maxCharsPorLinha = 100;
    const maxLinhas = 4;

    const texto = mensagem.replace(/\s+/g, ' ').trim();

    if (texto.length <= maxCharsPorLinha) {
      return texto;
    }

    const palavras = texto.split(' ');
    const linhas: string[] = [];
    let linhaAtual = '';

    for (const palavra of palavras) {
      const novaLinha = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;

      if (novaLinha.length <= maxCharsPorLinha) {
        linhaAtual = novaLinha;
      } else {
        if (linhaAtual) {
          linhas.push(linhaAtual);
          linhaAtual = palavra;
        } else {
          linhas.push(palavra.substring(0, maxCharsPorLinha));
          linhaAtual = palavra.substring(maxCharsPorLinha);
        }

        if (linhas.length >= maxLinhas - 1) {
          const linhaRestante = linhaAtual.length > maxCharsPorLinha 
            ? linhaAtual.substring(0, maxCharsPorLinha)
            : linhaAtual;
          linhas.push(linhaRestante);
          return linhas.join('\n');
        }
      }
    }

    if (linhaAtual && linhas.length < maxLinhas) {
      linhas.push(linhaAtual);
    }

    return linhas.join('\n');
  }

  /**
   * Construir headers de autenticação
   */
  static buildAuthHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Obter valor aninhado de um objeto usando notação de ponto
   */
  static getNestedValue(obj: Record<string, JsonValue>, path: string): JsonValue | undefined {
    return path.split('.').reduce<JsonValue | undefined>((current, key) => {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        return (current as Record<string, JsonValue>)[key];
      }
      return undefined;
    }, obj as JsonValue);
  }
}
