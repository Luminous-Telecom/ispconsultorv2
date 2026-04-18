/**
 * Bootstrap único: ILM, component templates, index templates e data streams.
 *
 * Execução (a partir da pasta backend):
 *   npx ts-node src/scripts/setupElasticsearch.ts
 *
 * Requer ELASTICSEARCH_NODE e, se aplicável, ELASTICSEARCH_USERNAME / ELASTICSEARCH_PASSWORD.
 */
import 'dotenv/config';
import { Client } from '@elastic/elasticsearch';
import {
  ES_ALL_DATA_STREAMS,
  ES_DATA_STREAM
} from '../services/elasticsearch/dataStreams';

function createClient(): Client {
  const node = process.env.ELASTICSEARCH_NODE;
  if (!node) {
    throw new Error('ELASTICSEARCH_NODE não definido no ambiente.');
  }
  const cfg: ConstructorParameters<typeof Client>[0] = {
    node,
    requestTimeout: 120_000,
    pingTimeout: 30_000
  };
  const username = process.env.ELASTICSEARCH_USERNAME;
  const password = process.env.ELASTICSEARCH_PASSWORD;
  if (username && password) {
    cfg.auth = { username: username.trim(), password: password.trim() };
  }
  return new Client(cfg);
}

const ngramAudit = {
  filter: ['lowercase'],
  type: 'custom' as const,
  tokenizer: 'audit_ngram_tokenizer'
};

const ngramTokenizer = {
  type: 'ngram' as const,
  min_gram: 2,
  max_gram: 12,
  // Tipos gerados do cliente exigem union literal; valores alinhados à documentação ES.
  token_chars: ['letter', 'digit', 'punctuation', 'symbol'] as unknown as Array<
    'letter' | 'digit' | 'punctuation' | 'symbol' | 'custom'
  >
};

async function putIlmpolicies(client: Client): Promise<void> {
  const policies: Array<{ name: string; deleteMinAge: string }> = [
    { name: 'backnet-app-policy', deleteMinAge: '30d' },
    { name: 'backnet-auditoria-policy', deleteMinAge: '1825d' },
    { name: 'backnet-rotinas-policy', deleteMinAge: '90d' },
    { name: 'backnet-mensagens-policy', deleteMinAge: '180d' },
    { name: 'backnet-blockdomi-policy', deleteMinAge: '90d' },
    { name: 'backnet-saas-acesso-policy', deleteMinAge: '365d' }
  ];

  for (const { name, deleteMinAge } of policies) {
    await client.ilm.putLifecycle({
      name,
      policy: {
        phases: {
          hot: {
            actions: {
              rollover: {
                max_primary_shard_size: '50gb',
                max_age: '30d'
              }
            }
          },
          delete: {
            min_age: deleteMinAge,
            actions: {
              delete: {}
            }
          }
        }
      }
    });
    // eslint-disable-next-line no-console
    console.log(`ILM policy OK: ${name} (delete após ${deleteMinAge})`);
  }
}

async function putComponentTemplates(client: Client): Promise<void> {
  const analysis = {
    analyzer: {
      audit_ngram: ngramAudit
    },
    tokenizer: {
      audit_ngram_tokenizer: ngramTokenizer
    }
  };

  await client.cluster.putComponentTemplate({
    name: 'logs-backnet-auditoria-mappings',
    template: {
      settings: {
        index: {
          lifecycle: { name: 'backnet-auditoria-policy' },
          mapping: { total_fields: { limit: 512 } },
          max_result_window: 10_000,
          // O tokenizer ngram usa min_gram=2 e max_gram=12; o padrão do cluster é max_ngram_diff=1.
          max_ngram_diff: 12
        },
        analysis
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          '@timestamp': { type: 'date' },
          timestamp: { type: 'date' },
          log_tipo: { type: 'keyword' },
          saas: { type: 'boolean' },
          empresa_id: { type: 'integer' },
          usuario_id: { type: 'integer' },
          usuario_nome: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword', ignore_above: 512 },
              partial: { type: 'text', analyzer: 'audit_ngram' }
            }
          },
          usuario_email: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword', ignore_above: 512 },
              partial: { type: 'text', analyzer: 'audit_ngram' }
            }
          },
          acao: { type: 'keyword' },
          entidade: {
            type: 'keyword',
            fields: {
              partial: { type: 'text', analyzer: 'audit_ngram' }
            }
          },
          entidade_id: { type: 'long' },
          related_entity_ids: { type: 'keyword' },
          dados_anteriores: { type: 'object', enabled: false },
          dados_novos: { type: 'object', enabled: false },
          ip_address: { type: 'ip', ignore_malformed: true },
          user_agent: { type: 'text' },
          rota: {
            type: 'keyword',
            ignore_above: 2048,
            fields: {
              partial: { type: 'text', analyzer: 'audit_ngram' }
            }
          },
          metodo_http: { type: 'keyword' },
          observacoes: { type: 'text' },
          origem_auditoria: { type: 'keyword' }
        }
      }
    }
  });

  await client.cluster.putComponentTemplate({
    name: 'logs-backnet-app-mappings',
    template: {
      settings: {
        index: {
          lifecycle: { name: 'backnet-app-policy' },
          mapping: { total_fields: { limit: 256 } },
          max_result_window: 5000
        }
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          '@timestamp': { type: 'date' },
          timestamp: { type: 'date' },
          log_tipo: { type: 'keyword' },
          level: { type: 'keyword' },
          message: { type: 'text' },
          error: { type: 'text' },
          stack: { type: 'text' },
          meta: { type: 'object', enabled: false }
        }
      }
    }
  });

  await client.cluster.putComponentTemplate({
    name: 'logs-backnet-rotinas-mappings',
    template: {
      settings: {
        index: {
          lifecycle: { name: 'backnet-rotinas-policy' },
          mapping: { total_fields: { limit: 256 } },
          max_result_window: 5000
        }
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          '@timestamp': { type: 'date' },
          timestamp: { type: 'date' },
          log_tipo: { type: 'keyword' },
          saas: { type: 'boolean' },
          routine_id: { type: 'integer' },
          routine_nome: { type: 'keyword' },
          routine_tipo: { type: 'keyword' },
          status: { type: 'keyword' },
          data_inicio: { type: 'date' },
          data_fim: { type: 'date' },
          duracao_ms: { type: 'long' },
          resultado: { type: 'object', enabled: false },
          erro: { type: 'text' }
        }
      }
    }
  });

  await client.cluster.putComponentTemplate({
    name: 'logs-backnet-mensagens-mappings',
    template: {
      settings: {
        index: {
          lifecycle: { name: 'backnet-mensagens-policy' },
          mapping: { total_fields: { limit: 256 } },
          max_result_window: 5000
        }
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          '@timestamp': { type: 'date' },
          timestamp: { type: 'date' },
          log_tipo: { type: 'keyword' },
          tipo_mensagem: { type: 'keyword' },
          destinatario: { type: 'keyword' },
          titulo: { type: 'text' },
          mensagem: { type: 'text' },
          status: { type: 'keyword' },
          erro_mensagem: { type: 'text' },
          entidade_tipo: { type: 'keyword' },
          entidade_id: { type: 'integer' },
          servidor_id: { type: 'integer' },
          usuario_id: { type: 'integer' },
          usuario_nome: { type: 'keyword' },
          usuario_email: { type: 'keyword' },
          ip_address: { type: 'ip', ignore_malformed: true },
          user_agent: { type: 'text' }
        }
      }
    }
  });

  await client.cluster.putComponentTemplate({
    name: 'logs-backnet-blockdomi-mappings',
    template: {
      settings: {
        index: {
          lifecycle: { name: 'backnet-blockdomi-policy' },
          mapping: { total_fields: { limit: 256 } },
          max_result_window: 5000
        }
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          '@timestamp': { type: 'date' },
          timestamp: { type: 'date' },
          log_tipo: { type: 'keyword' },
          ip: { type: 'keyword' },
          rota: { type: 'keyword' },
          metodo: { type: 'keyword' },
          status_http: { type: 'integer' },
          sucesso: { type: 'boolean' },
          mensagem_erro: { type: 'text' },
          user_agent: { type: 'text' }
        }
      }
    }
  });

  await client.cluster.putComponentTemplate({
    name: 'logs-backnet-saas-acesso-mappings',
    template: {
      settings: {
        index: {
          lifecycle: { name: 'backnet-saas-acesso-policy' },
          mapping: { total_fields: { limit: 256 } },
          max_result_window: 5000
        }
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          '@timestamp': { type: 'date' },
          timestamp: { type: 'date' },
          log_tipo: { type: 'keyword' },
          saas: { type: 'boolean' },
          usuario_id: { type: 'integer' },
          empresa_id: { type: 'integer' },
          acao: { type: 'keyword' },
          ip: { type: 'ip', ignore_malformed: true },
          user_agent: { type: 'text' }
        }
      }
    }
  });

  // eslint-disable-next-line no-console
  console.log('Component templates OK (7).');
}

async function putIndexTemplates(client: Client): Promise<void> {
  const defs: Array<{
    name: string;
    pattern: string;
    composedOf: string[];
  }> = [
    {
      name: 'logs-backnet-auditoria-template',
      pattern: 'logs-backnet-auditoria*',
      composedOf: ['logs-backnet-auditoria-mappings']
    },
    {
      name: 'logs-backnet-app-template',
      pattern: 'logs-backnet-app*',
      composedOf: ['logs-backnet-app-mappings']
    },
    {
      name: 'logs-backnet-rotinas-template',
      pattern: 'logs-backnet-rotinas*',
      composedOf: ['logs-backnet-rotinas-mappings']
    },
    {
      name: 'logs-backnet-mensagens-template',
      pattern: 'logs-backnet-mensagens*',
      composedOf: ['logs-backnet-mensagens-mappings']
    },
    {
      name: 'logs-backnet-blockdomi-template',
      pattern: 'logs-backnet-blockdomi*',
      composedOf: ['logs-backnet-blockdomi-mappings']
    },
    {
      name: 'logs-backnet-saas-acesso-template',
      pattern: 'logs-backnet-saas-acesso*',
      composedOf: ['logs-backnet-saas-acesso-mappings']
    }
  ];

  for (const { name, pattern, composedOf } of defs) {
    await client.indices.putIndexTemplate({
      name,
      index_patterns: [pattern],
      data_stream: {},
      composed_of: composedOf,
      priority: 220,
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0
        }
      }
    });
    // eslint-disable-next-line no-console
    console.log(`Index template OK: ${name}`);
  }
}

async function ensureDataStreams(client: Client): Promise<void> {
  for (const stream of ES_ALL_DATA_STREAMS) {
    try {
      await client.indices.createDataStream({ name: stream });
      // eslint-disable-next-line no-console
      console.log(`Data stream criado: ${stream}`);
    } catch (err: unknown) {
      const meta = err as { meta?: { body?: { error?: { type?: string } } } };
      const t = meta?.meta?.body?.error?.type;
      const msg = err instanceof Error ? err.message : String(err);
      if (t === 'resource_already_exists_exception' || msg.includes('resource_already_exists_exception')) {
        // eslint-disable-next-line no-console
        console.log(`Data stream já existe: ${stream}`);
      } else {
        throw err;
      }
    }
  }
}

async function main(): Promise<void> {
  const client = createClient();
  await client.ping();
  // eslint-disable-next-line no-console
  console.log('Conectado ao Elasticsearch.');

  await putIlmpolicies(client);
  await putComponentTemplates(client);
  await putIndexTemplates(client);
  await ensureDataStreams(client);

  // eslint-disable-next-line no-console
  console.log('\nBootstrap concluído.');
  // eslint-disable-next-line no-console
  console.log(
    `Data streams: ${ES_DATA_STREAM.AUDITORIA}, ${ES_DATA_STREAM.APP}, ${ES_DATA_STREAM.ROTINAS}, …`
  );
  // eslint-disable-next-line no-console
  console.log(
    '\nNota: migre dados do índice legado `backnet-auditoria` com reindex manual se necessário.'
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
