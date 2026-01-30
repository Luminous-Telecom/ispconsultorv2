import React, { useState, useEffect } from 'react';
import { useIPv4, useCreateIPv4, useUpdateIPv4 } from '@/hooks/useIPv4';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import { isValidIPv4 } from '@/utils/validators';

interface IPv4ModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  ipv4Id?: number | null;
}

const IPv4Modal: React.FC<IPv4ModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  ipv4Id 
}) => {
  const { t } = useI18n();
  const isEditing = !!ipv4Id;
  
  const { data: ipv4Data, isLoading } = useIPv4(ipv4Id || 0);
  const createMutation = useCreateIPv4();
  const updateMutation = useUpdateIPv4();

  const [formData, setFormData] = useState({
    ip: '',
    descricao: '',
    nome_oficio: '',
    data_inicio_bloqueio: '',
    data_fim_bloqueio: '',
    link_oficio_anatel: '',
    link_oficio_justica: '',
    ativo: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (show) {
      if (isEditing && ipv4Data) {
        const dInicio = ipv4Data.data_inicio_bloqueio;
        const dFim = ipv4Data.data_fim_bloqueio;
        setFormData({
          ip: ipv4Data.ip || '',
          descricao: ipv4Data.descricao || '',
          nome_oficio: ipv4Data.nome_oficio || '',
          data_inicio_bloqueio: dInicio ? String(dInicio).slice(0, 10) : '',
          data_fim_bloqueio: dFim ? String(dFim).slice(0, 10) : '',
          link_oficio_anatel: ipv4Data.link_oficio_anatel || '',
          link_oficio_justica: ipv4Data.link_oficio_justica || '',
          ativo: ipv4Data.ativo ?? true
        });
      } else {
        const today = new Date();
        const hoje = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setFormData({
          ip: '',
          descricao: '',
          nome_oficio: '',
          data_inicio_bloqueio: hoje,
          data_fim_bloqueio: '',
          link_oficio_anatel: '',
          link_oficio_justica: '',
          ativo: true
        });
      }
      setErrors({});
    }
  }, [show, isEditing, ipv4Data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.ip.trim()) {
      newErrors.ip = t('blockdomi.ipRequired');
    } else if (!isValidIPv4(formData.ip)) {
      newErrors.ip = t('blockdomi.ipv4InvalidFormat');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const dataToSend = {
      ...formData,
      nome_oficio: formData.nome_oficio.trim() || null,
      data_inicio_bloqueio: formData.data_inicio_bloqueio.trim() || null,
      data_fim_bloqueio: formData.data_fim_bloqueio.trim() || null,
      link_oficio_anatel: formData.link_oficio_anatel.trim() || null,
      link_oficio_justica: formData.link_oficio_justica.trim() || null
    };
    try {
      if (isEditing && ipv4Id) {
        await updateMutation.mutateAsync({
          id: ipv4Id,
          data: dataToSend
        });
      } else {
        await createMutation.mutateAsync(dataToSend);
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      // Erro tratado pelo hook
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEditing ? t('blockdomi.editIPv4') : t('blockdomi.createIPv4')}
      size="lg"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('buttons.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {t('buttons.save')}
          </Button>
        </div>
      }
    >
      <div style={{ padding: '16px' }}>
        {isLoading && isEditing ? (
          <div className="text-center p-4">
            <p>{t('messages.loading')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <FormField
                  name="ip"
                  type="text"
                  label="IPv4"
                  value={formData.ip}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, ip: String(value ?? '') }));
                    if (errors.ip) {
                      setErrors(prev => ({ ...prev, ip: '' }));
                    }
                  }}
                  error={errors.ip}
                  required
                  size="sm"
                  placeholder="192.168.1.1"
                  helpText="4 octetos separados por ponto (0-255). Ex: 192.168.1.1. Não use ponto no final."
                />
              </div>
              <div className="col-12">
                <FormField
                  name="descricao"
                  type="textarea"
                  label={t('form.description')}
                  value={formData.descricao}
                  onChange={(value) => setFormData(prev => ({ ...prev, descricao: String(value ?? '') }))}
                  size="sm"
                  rows={3}
                />
              </div>
              <div className="col-12">
                <FormField
                  name="nome_oficio"
                  type="text"
                  label={t('blockdomi.nomeOficio')}
                  value={formData.nome_oficio}
                  onChange={(value) => setFormData(prev => ({ ...prev, nome_oficio: String(value ?? '') }))}
                  size="sm"
                  placeholder={t('blockdomi.placeholderOficio')}
                />
              </div>
              <div className="col-12 col-md-6">
                <FormField
                  name="data_inicio_bloqueio"
                  type="date"
                  label={t('blockdomi.dataInicioBloqueio')}
                  value={formData.data_inicio_bloqueio}
                  onChange={(value) => setFormData(prev => ({ ...prev, data_inicio_bloqueio: String(value ?? '') }))}
                  size="sm"
                />
              </div>
              <div className="col-12 col-md-6">
                <FormField
                  name="data_fim_bloqueio"
                  type="date"
                  label={t('blockdomi.dataFimBloqueio')}
                  value={formData.data_fim_bloqueio}
                  onChange={(value) => setFormData(prev => ({ ...prev, data_fim_bloqueio: String(value ?? '') }))}
                  size="sm"
                />
              </div>
              <div className="col-12">
                <FormField
                  name="link_oficio_anatel"
                  type="text"
                  label={t('blockdomi.linkOficioAnatel')}
                  value={formData.link_oficio_anatel}
                  onChange={(value) => setFormData(prev => ({ ...prev, link_oficio_anatel: String(value ?? '') }))}
                  size="sm"
                  placeholder="https://..."
                />
              </div>
              <div className="col-12">
                <FormField
                  name="link_oficio_justica"
                  type="text"
                  label={t('blockdomi.linkOficioJustica')}
                  value={formData.link_oficio_justica}
                  onChange={(value) => setFormData(prev => ({ ...prev, link_oficio_justica: String(value ?? '') }))}
                  size="sm"
                  placeholder="https://..."
                />
              </div>
              <div className="col-12">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="ativo">
                    {t('status.active')}
                  </label>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </DraggableModal>
  );
};

export default IPv4Modal;
