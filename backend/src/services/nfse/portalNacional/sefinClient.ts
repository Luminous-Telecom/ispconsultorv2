import axios from 'axios';
import https from 'https';
import zlib from 'zlib';
import { getSefinBaseUrl, type AmbientePortalNacional } from '../../../config/nfsePortal';
import type { CertificadoA1 } from './certificadoA1';
import { certificadoVencido } from './certificadoA1';

export interface RespostaEmissaoSefin {
  success: boolean;
  numero?: string | null;
  chave_acesso?: string | null;
  xml?: string | null;
  data_autorizacao?: Date;
  erro?: string;
  codigo_erro?: string;
}

function agenteTls(certificado: CertificadoA1): https.Agent {
  return new https.Agent({
    cert: certificado.cadeiaPem,
    key: certificado.keyPem,
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  });
}

function mensagemErros(data: unknown): { codigo: string; mensagem: string } | null {
  if (!data || typeof data !== 'object') return null;
  const corpo = data as Record<string, unknown>;
  const lista = corpo.erros || corpo.erro || corpo.Erros;
  if (!Array.isArray(lista) || lista.length === 0) return null;
  const primeiro = lista[0] as Record<string, unknown>;
  const codigo = String(primeiro.Codigo || primeiro.codigo || 'SEFIN').slice(0, 10);
  const descricao = String(primeiro.Descricao || primeiro.descricao || 'A Sefin Nacional recusou a DPS.');
  const complemento = primeiro.Complemento || primeiro.complemento;
  return {
    codigo,
    mensagem: complemento ? `${descricao} ${String(complemento)}` : descricao,
  };
}

function numeroDaNfse(xml: string): string | null {
  return xml.match(/<nNFSe>(\d+)<\/nNFSe>/i)?.[1] || null;
}

export function compactarDps(xmlAssinado: string): string {
  return zlib.gzipSync(Buffer.from(xmlAssinado, 'utf8')).toString('base64');
}

export async function emitirNaSefin(
  ambiente: AmbientePortalNacional,
  xmlAssinado: string,
  certificado: CertificadoA1
): Promise<RespostaEmissaoSefin> {
  if (certificadoVencido(certificado.validade)) {
    return {
      success: false,
      codigo_erro: 'CERT_VENCIDO',
      erro: 'O certificado A1 está vencido. Envie um certificado válido em Integrações → NFS-e.',
    };
  }

  let baseUrl: string;
  try {
    baseUrl = getSefinBaseUrl(ambiente);
  } catch (erro) {
    return {
      success: false,
      codigo_erro: 'URL_SEFIN',
      erro: erro instanceof Error ? erro.message : 'URL da Sefin não configurada.',
    };
  }

  try {
    const response = await axios.post(
      `${baseUrl}/nfse`,
      { dpsXmlGZipB64: compactarDps(xmlAssinado) },
      {
        httpsAgent: agenteTls(certificado),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: 60000,
        validateStatus: () => true,
      }
    );

    const erros = mensagemErros(response.data);
    if (erros) {
      return { success: false, codigo_erro: erros.codigo, erro: erros.mensagem };
    }

    const corpo = (response.data && typeof response.data === 'object')
      ? response.data as Record<string, unknown>
      : {};
    const chave = typeof corpo.chaveAcesso === 'string' ? corpo.chaveAcesso : null;
    const xmlCompactado = typeof corpo.nfseXmlGZipB64 === 'string' ? corpo.nfseXmlGZipB64 : null;
    let xml: string | null = null;
    if (xmlCompactado) {
      xml = zlib.gunzipSync(Buffer.from(xmlCompactado, 'base64')).toString('utf8');
    }

    if ((response.status === 200 || response.status === 201) && chave) {
      return {
        success: true,
        chave_acesso: chave,
        numero: xml ? numeroDaNfse(xml) : null,
        xml,
        data_autorizacao: new Date(),
      };
    }

    return {
      success: false,
      codigo_erro: String(response.status).slice(0, 10),
      erro: 'A Sefin Nacional não autorizou a NFS-e.',
    };
  } catch (erro) {
    const codigo = axios.isAxiosError(erro) ? erro.code : undefined;
    if (codigo === 'ENOTFOUND' || codigo === 'ECONNREFUSED' || codigo === 'ETIMEDOUT') {
      return {
        success: false,
        codigo_erro: 'SEFIN_REDE',
        erro: 'Não foi possível conectar à Sefin Nacional. Verifique a URL no .env e a conexão.',
      };
    }
    return {
      success: false,
      codigo_erro: 'SEFIN_TLS',
      erro: 'O certificado A1 não foi aceito na conexão com a Sefin Nacional.',
    };
  }
}

export async function testarConexaoSefin(
  ambiente: AmbientePortalNacional,
  certificado: CertificadoA1
): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  if (certificadoVencido(certificado.validade)) {
    return { ok: false, mensagem: 'O certificado A1 está vencido.' };
  }

  let baseUrl: string;
  try {
    baseUrl = getSefinBaseUrl(ambiente);
  } catch (erro) {
    return { ok: false, mensagem: erro instanceof Error ? erro.message : 'URL da Sefin não configurada.' };
  }

  try {
    const response = await axios.get(`${baseUrl}/nfse/${'0'.repeat(50)}`, {
      httpsAgent: agenteTls(certificado),
      timeout: 30000,
      validateStatus: () => true,
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, mensagem: 'A Sefin recusou o certificado A1.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, mensagem: 'Não foi possível abrir a conexão com a Sefin usando o certificado A1.' };
  }
}

export async function consultarNfseSefin(
  ambiente: AmbientePortalNacional,
  chaveAcesso: string,
  certificado: CertificadoA1
): Promise<{ success: boolean; status?: string; erro?: string }> {
  try {
    const baseUrl = getSefinBaseUrl(ambiente);
    const response = await axios.get(`${baseUrl}/nfse/${chaveAcesso}`, {
      httpsAgent: agenteTls(certificado),
      timeout: 30000,
      validateStatus: () => true,
    });
    if (response.status === 200) {
      return { success: true, status: 'AUTORIZADA' };
    }
    const erros = mensagemErros(response.data);
    return { success: false, erro: erros?.mensagem || 'NFS-e não encontrada na Sefin Nacional.' };
  } catch (erro) {
    return { success: false, erro: erro instanceof Error ? erro.message : 'Erro ao consultar a NFS-e.' };
  }
}
