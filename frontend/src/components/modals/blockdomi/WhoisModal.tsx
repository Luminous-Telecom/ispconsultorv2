import React, { useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import Spinner from '@/components/ui/Spinner';
import { BlockdomiWhoisService, type WhoisResult } from '@/services/blockdomiWhoisService';

interface WhoisModalProps {
  show: boolean;
  onClose: () => void;
  ip: string;
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner size="lg" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="alert alert-danger mb-0">
          {error}
        </div>
      );
    }
    if (!data) return null;
    const items = [
      { label: t('blockdomi.whoisOrganizacao'), value: data.organizacao },
      { label: t('blockdomi.whoisBloco'), value: data.bloco },
      { label: t('blockdomi.whoisCidr'), value: data.cidr },
      { label: t('blockdomi.whoisNetname'), value: data.netname },
      { label: t('blockdomi.whoisPais'), value: data.pais },
      { label: t('blockdomi.whoisAsn'), value: data.asn }
    ].filter((i) => i.value);
    if (items.length === 0) {
      return (
        <div className="text-muted">
          {t('blockdomi.whoisNenhumDado')}
        </div>
      );
    }
    return (
      <dl className="row mb-0">
        {items.map(({ label, value }) => (
          <React.Fragment key={label}>
            <dt className="col-sm-3 text-muted">{label}</dt>
            <dd className="col-sm-9">{value}</dd>
          </React.Fragment>
        ))}
      </dl>
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
