/**
 * Cliente HTTP para a API REST do Krill (NLnet Labs).
 * Certificados, chaves BPKI, CMS, ROAs, ASPAs e publicação RFC 8181 são executados pelo Krill.
 * ISP Consultor usa este serviço como único ponto de integração com o motor RPKI.
 */
import https from 'https';
import axios, { type AxiosInstance } from 'axios';
import { RpkiClientError } from '../../../utils/errorUtils';

const DEFAULT_KRILL_URL = 'https://127.0.0.1:3100';

export interface KrillRoaEntry {
  asn: number;
  prefix: string;
  max_length?: number;
  comment?: string | null;
}

export interface KrillRoaDelta {
  added: KrillRoaEntry[];
  removed: Array<{ asn: number; prefix: string; max_length?: number }>;
}

export interface KrillAspaEntry {
  customer: number;
  providers: number[];
}

export interface KrillAspaDelta {
  add_or_replace: KrillAspaEntry[];
  remove: number[];
}

export interface KrillParentStatus {
  last_exchange?: { timestamp: number; uri: string; result: string } | null;
  last_success?: number | null;
  all_resources?: {
    asn?: string;
    ipv4?: string;
    ipv6?: string;
  };
  classes?: Array<{
    class_name: string;
    resource_set?: {
      asn?: string;
      ipv4?: string;
      ipv6?: string;
    };
  }>;
}

export interface KrillRepoStatus {
  last_exchange?: { timestamp: number; uri: string; result: string } | null;
  last_success?: number | null;
  published?: string[];
}

export interface KrillRepoConfig {
  publisher_handle?: string;
  service_uri?: string;
  repo_info?: {
    sia_base?: string;
    rrdp_notification_uri?: string | null;
  };
}

interface KrillErrorBody {
  label?: string;
  msg?: string;
  args?: Record<string, unknown>;
  delta_error?: {
    duplicates?: unknown[];
    notheld?: unknown[];
    unknowns?: unknown[];
    invalid_length?: unknown[];
  };
}

function krillBaseUrl(): string {
  const raw = process.env.KRILL_API_URL?.trim() || DEFAULT_KRILL_URL;
  return raw.replace(/\/+$/, '');
}

function krillToken(): string {
  const token = process.env.KRILL_API_TOKEN?.trim();
  if (!token) {
    throw new RpkiClientError(
      'KRILL_API_TOKEN não configurado. Defina no .env após instalar o Krill.'
    );
  }
  return token;
}

function createKrillClient(): AxiosInstance {
  return axios.create({
    baseURL: krillBaseUrl(),
    timeout: 60_000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      Authorization: `Bearer ${krillToken()}`,
    },
    validateStatus: () => true,
  });
}

function assertOk(status: number, body: unknown, fallback: string): void {
  if (status >= 200 && status < 300) return;
  if (body && typeof body === 'object' && 'msg' in body) {
    const krillBody = body as KrillErrorBody;
    throw new RpkiClientError(krillBody.msg || fallback);
  }
  if (typeof body === 'string' && body.trim()) {
    throw new RpkiClientError(body.slice(0, 400));
  }
  throw new RpkiClientError(`${fallback} (HTTP ${status})`);
}

export class KrillApiService {
  private static client(): AxiosInstance {
    return createKrillClient();
  }

  static async healthCheck(): Promise<void> {
    const res = await this.client().get('/api/v1/authorized');
    assertOk(res.status, res.data, 'Krill não autorizou a requisição (verifique KRILL_API_TOKEN)');
  }

  static async listCas(): Promise<string[]> {
    const res = await this.client().get<{ cas: Array<string | { handle: string }> }>('/api/v1/cas');
    assertOk(res.status, res.data, 'Falha ao listar CAs no Krill');
    const cas = res.data?.cas ?? [];
    return cas.map((item) => (typeof item === 'string' ? item : item.handle));
  }

  static async createCa(handle: string): Promise<void> {
    const res = await this.client().post(
      '/api/v1/cas',
      { handle },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (res.status === 200 || res.status === 201) return;
    const label = (res.data as KrillErrorBody | undefined)?.label;
    if (label === 'ca-duplicate') return;
    assertOk(res.status, res.data, `Falha ao criar CA "${handle}" no Krill`);
  }

  static async deleteCa(handle: string): Promise<void> {
    const res = await this.client().delete(`/api/v1/cas/${encodeURIComponent(handle)}`);
    if (res.status === 404) return;
    assertOk(res.status, res.data, `Falha ao remover CA "${handle}" no Krill`);
  }

  static async ensureCa(handle: string): Promise<void> {
    const existing = await this.listCas();
    if (existing.includes(handle)) return;
    await this.createCa(handle);
  }

  static async getChildRequestXml(handle: string): Promise<string> {
    const res = await this.client().get<string>(
      `/api/v1/cas/${encodeURIComponent(handle)}/id/child_request.xml`,
      { responseType: 'text', transformResponse: [(d) => d] }
    );
    assertOk(res.status, res.data, 'Falha ao gerar child_request no Krill');
    return String(res.data ?? '').trim();
  }

  static async getPublisherRequestXml(handle: string): Promise<string> {
    const res = await this.client().get<string>(
      `/api/v1/cas/${encodeURIComponent(handle)}/id/publisher_request.xml`,
      { responseType: 'text', transformResponse: [(d) => d] }
    );
    assertOk(res.status, res.data, 'Falha ao gerar publisher_request no Krill');
    return String(res.data ?? '').trim();
  }

  static async addParent(handle: string, parentName: string, parentResponseXml: string): Promise<void> {
    const res = await this.client().post(
      `/api/v1/cas/${encodeURIComponent(handle)}/parents/${encodeURIComponent(parentName)}`,
      parentResponseXml,
      { headers: { 'Content-Type': 'application/xml' } }
    );
    assertOk(res.status, res.data, `Falha ao vincular CA-pai "${parentName}" no Krill`);
  }

  static async removeParent(handle: string, parentName: string): Promise<void> {
    const res = await this.client().delete(
      `/api/v1/cas/${encodeURIComponent(handle)}/parents/${encodeURIComponent(parentName)}`
    );
    if (res.status === 404) return;
    assertOk(res.status, res.data, `Falha ao remover CA-pai "${parentName}" no Krill`);
  }

  static async getParentStatuses(handle: string): Promise<Record<string, KrillParentStatus>> {
    const res = await this.client().get<Record<string, KrillParentStatus>>(
      `/api/v1/cas/${encodeURIComponent(handle)}/parents`
    );
    assertOk(res.status, res.data, 'Falha ao consultar status das CAs-pai no Krill');
    return res.data ?? {};
  }

  static async syncParents(handle: string): Promise<void> {
    const res = await this.client().post(
      `/api/v1/cas/${encodeURIComponent(handle)}/sync/parents`
    );
    assertOk(res.status, res.data, 'Falha ao sincronizar CAs-pai no Krill');
  }

  static async configureRepository(handle: string, repositoryResponseXml: string): Promise<void> {
    const res = await this.client().post(
      `/api/v1/cas/${encodeURIComponent(handle)}/repo`,
      repositoryResponseXml,
      { headers: { 'Content-Type': 'application/xml' } }
    );
    assertOk(res.status, res.data, 'Falha ao configurar repositório no Krill');
  }

  static async getRepoConfig(handle: string): Promise<KrillRepoConfig | null> {
    const res = await this.client().get<KrillRepoConfig>(
      `/api/v1/cas/${encodeURIComponent(handle)}/repo`
    );
    if (res.status === 404) return null;
    assertOk(res.status, res.data, 'Falha ao consultar repositório no Krill');
    return res.data ?? null;
  }

  static async getRepoStatus(handle: string): Promise<KrillRepoStatus> {
    const res = await this.client().get<KrillRepoStatus>(
      `/api/v1/cas/${encodeURIComponent(handle)}/repo/status`
    );
    assertOk(res.status, res.data, 'Falha ao consultar status do repositório no Krill');
    return res.data ?? {};
  }

  static async syncRepository(handle: string): Promise<void> {
    const res = await this.client().post(
      `/api/v1/cas/${encodeURIComponent(handle)}/sync/repo`
    );
    assertOk(res.status, res.data, 'Falha ao sincronizar repositório no Krill');
  }

  static async listRoutes(handle: string): Promise<KrillRoaEntry[]> {
    const res = await this.client().get<KrillRoaEntry[]>(
      `/api/v1/cas/${encodeURIComponent(handle)}/routes`
    );
    assertOk(res.status, res.data, 'Falha ao listar ROAs no Krill');
    return Array.isArray(res.data) ? res.data : [];
  }

  static async updateRoutes(handle: string, delta: KrillRoaDelta): Promise<void> {
    const res = await this.client().post(
      `/api/v1/cas/${encodeURIComponent(handle)}/routes`,
      delta,
      { headers: { 'Content-Type': 'application/json' } }
    );
    assertOk(res.status, res.data, 'Falha ao atualizar ROAs no Krill');
  }

  static async listAspas(handle: string): Promise<KrillAspaEntry[]> {
    const res = await this.client().get<KrillAspaEntry[]>(
      `/api/v1/cas/${encodeURIComponent(handle)}/aspas`
    );
    assertOk(res.status, res.data, 'Falha ao listar ASPAs no Krill');
    return Array.isArray(res.data) ? res.data : [];
  }

  static async updateAspas(handle: string, delta: KrillAspaDelta): Promise<void> {
    const res = await this.client().post(
      `/api/v1/cas/${encodeURIComponent(handle)}/aspas`,
      delta,
      { headers: { 'Content-Type': 'application/json' } }
    );
    assertOk(res.status, res.data, 'Falha ao atualizar ASPAs no Krill');
  }

  static async bulkSyncParents(): Promise<void> {
    const res = await this.client().post('/api/v1/bulk/cas/sync/parent');
    assertOk(res.status, res.data, 'Falha no bulk sync de CAs-pai no Krill');
  }

  static async bulkSyncRepositories(): Promise<void> {
    const res = await this.client().post('/api/v1/bulk/cas/sync/repo');
    assertOk(res.status, res.data, 'Falha no bulk sync de repositórios no Krill');
  }

  static async bulkPublish(): Promise<void> {
    const res = await this.client().post('/api/v1/bulk/cas/publish');
    assertOk(res.status, res.data, 'Falha no bulk publish no Krill');
  }
}
