import { defaultApiClient } from './core';
import type { ApiResponse } from 'types';

export interface WhoisRecord {
  key: string;
  value: string;
}

export interface WhoisResult {
  ip: string;
  organizacao: string | null;
  bloco: string | null;
  cidr: string | null;
  netname: string | null;
  pais: string | null;
  asn: string | null;
  blocks?: WhoisRecord[][];
}

export class BlockdomiWhoisService {
  static async consultar(ip: string): Promise<WhoisResult> {
    const response = await defaultApiClient.get<WhoisResult>(
      `/blockdomi/whois/${encodeURIComponent(ip.trim())}`
    );
    const api = response as ApiResponse<WhoisResult>;
    return api.data ?? { ip: ip.trim(), organizacao: null, bloco: null, cidr: null, netname: null, pais: null, asn: null };
  }
}
