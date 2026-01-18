import { Titulo } from '../models/financeiro/Titulo';
import { Contrato } from '../models/contratos/Contrato';
import { Cliente } from '../models/clientes/Cliente';
import { Plano } from '../models/cadastros/Plano';
import { Banco } from '../models/cadastros/Banco';
import { Usuario } from '../models/cadastros/Usuario';
import { NotaFiscal } from '../models/nfse/NotaFiscal';
import { ContaPagar } from '../models/financeiro/ContaPagar';
import { Fornecedor } from '../models/financeiro/Fornecedor';
import { TermoContrato } from '../models/contratos/TermoContrato';
import { Auditoria } from '../models/sistema/Auditoria';
import { ClienteArquivo } from '../models/clientes/ClienteArquivo';
import { SortConfig } from '../utils/sortHelper';

/**
 * Configuração de ordenação para Titulo
 */
export const TITULO_SORT_CONFIG: SortConfig = {
  model: Titulo,
  tableName: 'titulos',
  virtualColumns: {
    valor_aberto: {
      sql: `COALESCE(\`Titulo\`.\`valor_aberto\`, \`Titulo\`.\`valor\` - COALESCE(\`Titulo\`.\`valor_pago\`, 0))`,
      description: 'Valor em aberto do título (valor - valor_pago)'
    }
  },
  relationshipColumns: {
    cliente: {
      association: 'cliente',
      field: 'razao_social',
      description: 'Razão social do cliente'
    },
    plano_nome: {
      association: 'plano',
      field: 'nome_plano',
      description: 'Nome do plano'
    },
    nfse_numero: {
      association: 'nota_fiscal',
      field: 'numero',
      description: 'Número da NFS-e'
    },
    nfse_status: {
      association: 'nota_fiscal',
      field: 'nfse_status',
      description: 'Status da NFS-e'
    },
  }
};

/**
 * Configuração de ordenação para Contrato
 */
export const CONTRATO_SORT_CONFIG: SortConfig = {
  model: Contrato,
  tableName: 'contratos',
  virtualColumns: {
    valor_mensal: {
      sql: `\`plano\`.\`valor_mensal\``,
      description: 'Valor mensal do plano (campo virtual)'
    },
    desconto: {
      sql: `COALESCE(\`Contrato\`.\`desconto_valor\`, 0)`,
      description: 'Desconto em valor R$ (desconto_valor)'
    },
    desconto_num: {
      sql: `COALESCE(\`Contrato\`.\`desconto_valor\`, 0)`,
      description: 'Desconto numérico em R$ - ordena por desconto_valor'
    },
    valor_final_num: {
      sql: `COALESCE(\`Contrato\`.\`valor_final\`, 0)`,
      description: 'Valor final numérico em R$ (alias para valor_final)'
    }
  },
  relationshipColumns: {
    cliente: {
      association: 'cliente',
      field: 'razao_social',
      description: 'Razão social do cliente'
    },
    cliente_razao_social: {
      association: 'cliente',
      field: 'razao_social',
      description: 'Razão social do cliente (alias)'
    },
    plano: {
      association: 'plano',
      field: 'nome_plano',
      description: 'Nome do plano'
    },
    plano_nome: {
      association: 'plano',
      field: 'nome_plano',
      description: 'Nome do plano (alias)'
    },
    valor_plano_num: {
      association: 'plano',
      field: 'valor_mensal',
      description: 'Valor mensal do plano'
    },
    banco_nome: {
      association: 'bancoBoleto',
      field: 'nome',
      description: 'Nome do banco de boleto'
    }
  }
};

/**
 * Configuração de ordenação para Cliente
 */
export const CLIENTE_SORT_CONFIG: SortConfig = {
  model: Cliente,
  tableName: 'clientes',
  virtualColumns: {},
  relationshipColumns: {}
};

/**
 * Configuração de ordenação para Plano
 */
export const PLANO_SORT_CONFIG: SortConfig = {
  model: Plano,
  tableName: 'planos',
  virtualColumns: {},
  relationshipColumns: {}
};

/**
 * Configuração de ordenação para Banco
 */
export const BANCO_SORT_CONFIG: SortConfig = {
  model: Banco,
  tableName: 'bancos',
  virtualColumns: {},
  relationshipColumns: {}
};

/**
 * Configuração de ordenação para Usuario
 */
export const USUARIO_SORT_CONFIG: SortConfig = {
  model: Usuario,
  tableName: 'usuarios',
  virtualColumns: {},
  relationshipColumns: {}
};

/**
 * Configuração de ordenação para NotaFiscal
 */
export const NOTA_FISCAL_SORT_CONFIG: SortConfig = {
  model: NotaFiscal,
  tableName: 'notas_fiscais',
  relationshipColumns: {
    cliente: {
      association: 'cliente',
      field: 'razao_social',
      description: 'Razão social do cliente'
    }
  }
};

/**
 * Configuração de ordenação para ContaPagar
 */
export const CONTA_PAGAR_SORT_CONFIG: SortConfig = {
  model: ContaPagar,
  tableName: 'contas_pagar',
  virtualColumns: {
    saldo_devedor: {
      sql: `COALESCE(\`ContaPagar\`.\`valor\`, 0) - COALESCE(\`ContaPagar\`.\`valor_pago\`, 0)`,
      description: 'Saldo devedor (valor - valor_pago)'
    }
  },
  relationshipColumns: {
    fornecedor: {
      association: 'fornecedor',
      field: 'nome_razao_social',
      description: 'Nome/Razão social do fornecedor'
    }
  }
};

/**
 * Configuração de ordenação para Fornecedor
 */
export const FORNECEDOR_SORT_CONFIG: SortConfig = {
  model: Fornecedor,
  tableName: 'fornecedores',
  virtualColumns: {},
  relationshipColumns: {}
};

/**
 * Configuração de ordenação para TermoContrato
 */
export const TERMO_CONTRATO_SORT_CONFIG: SortConfig = {
  model: TermoContrato,
  tableName: 'termos_contrato',
  virtualColumns: {},
  relationshipColumns: {
    nome_termo: {
      association: 'modeloDocumento',
      field: 'nome',
      description: 'Nome do termo (do modelo de documento)'
    }
  }
};

/**
 * Configuração de ordenação para Auditoria
 */
export const AUDITORIA_SORT_CONFIG: SortConfig = {
  model: Auditoria,
  tableName: 'auditoria',
  virtualColumns: {
    timestamp: {
      sql: `\`Auditoria\`.\`created_at\``,
      description: 'Timestamp (alias para created_at)'
    }
  },
  relationshipColumns: {
    usuario: {
      association: 'usuario',
      field: 'nome',
      description: 'Nome do usuário'
    },
    usuario_nome: {
      association: 'usuario',
      field: 'nome',
      description: 'Nome do usuário (alias)'
    },
    usuario_email: {
      association: 'usuario',
      field: 'email',
      description: 'Email do usuário'
    }
  }
};

/**
 * Configuração de ordenação para ClienteArquivo
 */
export const CLIENTE_ARQUIVO_SORT_CONFIG: SortConfig = {
  model: ClienteArquivo,
  tableName: 'cliente_arquivos',
  virtualColumns: {},
  relationshipColumns: {}
};
