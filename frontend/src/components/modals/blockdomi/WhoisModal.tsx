import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import Spinner from '@/components/ui/Spinner';
import { BlockdomiWhoisService, type WhoisResult } from '@/services/blockdomiWhoisService';

interface WhoisModalProps {
  show: boolean;
  onClose: () => void;
  ip: string;
}

const KEY_LABELS: Record<string, string> = {
  origin: 'AS',
  descr: 'Titular',
  orgname: 'Titular',
  organization: 'Titular',
  org: 'Titular',
  route: 'Bloco',
  route6: 'Bloco',
  inetnum: 'Bloco',
  netrange: 'Bloco',
  cidr: 'CIDR',
  netname: 'Netname',
  country: 'País',
  countrycode: 'País',
  'admin-c': 'Contato do Titular',
  'tech-c': 'Contato de Roteamento',
  'abuse-c': 'Contato de Abuso',
  'mnt-by': 'Mantido por',
  source: 'Fonte',
  'last-modified': 'Alterado',
  created: 'Criado',
  person: 'Contato',
  role: 'Contato',
  'nic-hdl': 'ID',
  'e-mail': 'Email',
  email: 'Email',
  address: 'Endereço',
  notify: 'Notificação',
  'org-name': 'Organização',
  document: 'Documento',
  responsible: 'Responsável'
};

function formatKey(key: string): string {
  return KEY_LABELS[key.toLowerCase()] ?? key.replace(/^./, (c) => c.toUpperCase());
}

function formatValue(key: string, value: string): string {
  const k = key.toLowerCase();
  if (k === 'origin' && value && !value.toUpperCase().startsWith('AS')) {
    return `AS${value}`;
  }
  return value;
}

function formatDate(v: string): string {
  if (!v) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const BLOCO_KEYS = ['route', 'route6', 'inetnum', 'netrange', 'bloco', 'cidr', 'bloco pai'];
const CONTATO_KEYS = ['admin-c', 'tech-c', 'abuse-c', 'person', 'role', 'nic-hdl', 'e-mail', 'email', 'address', 'notify', 'id', 'titular', 'responsável', 'documento', 'contato do titular', 'contato de roteamento', 'contato de abuso'];
const INFO_KEYS = ['origin', 'descr', 'orgname', 'organization', 'org', 'netname', 'country', 'countrycode', 'source', 'last-modified', 'created', 'mnt-by', 'org-name', 'document', 'responsible', 'as', 'país', 'tipo', 'criado', 'alterado'];
const SKIP_KEYS = ['geoidx', 'member-of', 'remarks'];

function getRecordLabel(
  t: (k: string) => string,
  key: string
): string {
  const special: Record<string, string> = {
    origin: 'blockdomi.whoisAsn',
    descr: 'blockdomi.whoisOrganizacao',
    route: 'blockdomi.whoisBloco',
    route6: 'blockdomi.whoisBloco',
    country: 'blockdomi.whoisPais',
    countrycode: 'blockdomi.whoisPais'
  };
  const i18n = special[key.toLowerCase()];
  return i18n ? t(i18n) : formatKey(key);
}

const WhoisModal: React.FC<WhoisModalProps> = ({ show, onClose, ip }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WhoisResult | null>(null);

  useEffect(() => {
    if (!show || !ip?.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    BlockdomiWhoisService.consultar(ip)
      .then(setData)
      .catch((err) => setError(err?.message || 'Erro ao consultar Whois'))
      .finally(() => setLoading(false));
  }, [show, ip]);

  const { infoItems, blocos, contatoItems } = useMemo(() => {
    if (!data) return { infoItems: [], blocos: [], contatoItems: [] };

    const blocks = data.blocks ?? [];
    const infoMap = new Map<string, string>();
    const blocosSet = new Set<string>();
    const contatoMap = new Map<string, string>();

    for (const block of blocks) {
      for (const r of block) {
        const k = r.key.toLowerCase();
        const v = r.value?.trim() || '';
        if (!v || SKIP_KEYS.includes(k)) continue;
        if (BLOCO_KEYS.includes(k)) blocosSet.add(formatValue(r.key, v));
        else if (CONTATO_KEYS.includes(k)) contatoMap.set(k, v);
        else if (INFO_KEYS.includes(k) && !infoMap.has(k)) infoMap.set(k, v);
      }
    }

    if (blocks.length === 0 && (data.organizacao || data.asn || data.bloco || data.pais)) {
      if (data.asn) infoMap.set('origin', data.asn);
      if (data.organizacao) infoMap.set('descr', data.organizacao);
      if (data.bloco || data.cidr) blocosSet.add(data.bloco || data.cidr || '');
      if (data.pais) infoMap.set('country', data.pais);
    }

    const infoItems = Array.from(infoMap.entries()).map(([key, val]) => ({
      key,
      label: getRecordLabel(t as (k: string) => string, key),
      value: ['last-modified', 'created', 'criado', 'alterado'].includes(key) ? formatDate(val) : formatValue(key, val)
    }));

    const contatoItems = Array.from(contatoMap.entries()).map(([key, val]) => ({
      key,
      label: formatKey(key),
      value: val
    }));

    return {
      infoItems,
      blocos: Array.from(blocosSet).filter(Boolean).sort(),
      contatoItems
    };
  }, [data, t]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-3 d-flex justify-content-center align-items-center py-5">
          <Spinner size="lg" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-3">
          <div className="alert alert-danger mb-0">{error}</div>
        </div>
      );
    }
    if (!data) return null;

    const temDados = infoItems.length > 0 || blocos.length > 0 || contatoItems.length > 0;
    if (!temDados) {
      return (
        <div className="p-3 text-muted">
          {t('blockdomi.whoisNenhumDado')}
        </div>
      );
    }

    return (
      <div className="p-3">
        <div className="mb-3">
          <label className="form-label small text-muted mb-1">IP</label>
          <input
            type="text"
            className="form-control form-control-sm bg-secondary bg-opacity-10 font-monospace"
            value={ip}
            readOnly
            autoComplete="off"
          />
        </div>

        {infoItems.length > 0 && (
          <div className="mb-3">
            <div className="row g-2">
              {infoItems.map(({ key, label, value }) => (
                <div key={key} className="col-md-6">
                  <label className="form-label small text-muted mb-1">{label}</label>
                  <input
                    type="text"
                    className="form-control form-control-sm bg-secondary bg-opacity-10"
                    value={value}
                    readOnly
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {blocos.length > 0 && (
          <div className="mb-3">
            <h6 className="small text-muted mb-2">{t('blockdomi.whoisBlocos')}</h6>
            <textarea
              className="form-control form-control-sm bg-secondary bg-opacity-10 font-monospace small"
              value={blocos.join('\n')}
              readOnly
              rows={Math.min(blocos.length + 1, 8)}
              style={{ resize: 'none' }}
              autoComplete="off"
            />
          </div>
        )}

        {contatoItems.length > 0 && (
          <div>
            <h6 className="small text-muted mb-2">{t('blockdomi.whoisContato')}</h6>
            <div className="row g-2">
              {contatoItems.map(({ key, label, value }) => (
                <div key={key} className="col-md-6">
                  <label className="form-label small text-muted mb-1">{label}</label>
                  <input
                    type="text"
                    className="form-control form-control-sm bg-secondary bg-opacity-10"
                    value={value}
                    readOnly
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={`${t('blockdomi.whois')} - ${ip || ''}`}
      size="md"
    >
      {renderContent()}
    </DraggableModal>
  );
};

export default WhoisModal;
