import axios from 'axios';
import { Cliente } from '../../../../models/clientes/Cliente';
import { Banco } from '../../../../models/cadastros/Banco';
import { logger } from '../../../../utils/logger';

interface AsaasClientePayload {
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  externalReference: string;
  notificationDisabled: boolean;
}

export class AsaasClienteService {
  /**
   * Obtém ou cria cliente no Asaas
   */
  static async obterOuCriarCliente(
    baseUrl: string,
    headers: Record<string, string>,
    cliente: Cliente,
    banco: Banco
  ): Promise<string | null> {
    try {
      // Buscar cliente existente por CPF/CNPJ
      const cpfCnpj = this.sanitizeDigits(cliente.cnpj);
      if (cpfCnpj) {
        try {
          const searchUrl = `${baseUrl}/customers?cpfCnpj=${cpfCnpj}&limit=1`;
          const searchResponse = await axios.get(searchUrl, { headers, timeout: 10000 });
          const data = searchResponse.data as { data?: Array<{ id?: string | number }> };
          const customers = Array.isArray(data?.data) ? data.data : [];
          
          if (customers.length > 0) {
            const first = customers[0];
            const id = first?.id;
            const customerId = typeof id === 'string' ? id : typeof id === 'number' ? String(id) : null;
            if (customerId) {
              return customerId;
            }
          }
        } catch (searchError: unknown) {
          // Se falhar na busca, continuar para criar novo
          logger.warn('Erro ao buscar cliente no Asaas, criando novo', {
            cliente_id: cliente.id,
            error: searchError instanceof Error ? searchError.message : 'Erro desconhecido'
          });
        }
      }

      const customerPayload = this.montarPayloadCliente(cliente);
      const createEndpoint = `${baseUrl}/customers`;
      
      const createResponse = await axios.post(createEndpoint, customerPayload, {
        headers,
        timeout: 30000
      });

      if (createResponse.status >= 200 && createResponse.status < 300 && createResponse.data?.id) {
        const newCustomerId = createResponse.data.id;
        return typeof newCustomerId === 'string' ? newCustomerId : String(newCustomerId);
      }

      logger.error('Resposta inesperada ao criar cliente no Asaas', {
        cliente_id: cliente.id,
        status: createResponse.status,
        data: createResponse.data
      });
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao obter/criar cliente no Asaas', {
        cliente_id: cliente.id,
        error: errorMessage
      });
      return null;
    }
  }

  /**
   * Monta payload para criação/atualização de cliente no Asaas
   */
  private static montarPayloadCliente(cliente: Cliente): AsaasClientePayload {
    const telefone = this.normalizePhone(cliente.telefone);
    const cpfCnpj = this.sanitizeDigits(cliente.cnpj || '');

    return {
      name: cliente.razao_social || cliente.nome_fantasia || 'Cliente',
      email: cliente.email || undefined,
      phone: telefone,
      mobilePhone: telefone,
      cpfCnpj: cpfCnpj || undefined,
      postalCode: this.sanitizeDigits(cliente.cep || ''),
      address: cliente.endereco || undefined,
      addressNumber: cliente.numero || undefined,
      complement: cliente.complemento || undefined,
      province: cliente.bairro || undefined,
      city: cliente.cidade || undefined,
      state: cliente.estado || undefined,
      externalReference: `cliente_${cliente.id}`,
      notificationDisabled: true
    };
  }

  /**
   * Normaliza telefone para formato do Asaas
   */
  private static normalizePhone(telefone: string | null | undefined): string | undefined {
    if (!telefone) return undefined;
    const digits = telefone.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 11) {
      return digits;
    }
    return undefined;
  }

  /**
   * Remove caracteres não numéricos
   */
  private static sanitizeDigits(value: string | null | undefined): string {
    if (!value) return '';
    return value.replace(/\D/g, '');
  }
}
