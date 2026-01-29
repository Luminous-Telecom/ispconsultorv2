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
    ativo: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (show) {
      if (isEditing && ipv4Data) {
        setFormData({
          ip: ipv4Data.ip || '',
          descricao: ipv4Data.descricao || '',
          ativo: ipv4Data.ativo ?? true
        });
      } else {
        setFormData({
          ip: '',
          descricao: '',
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
      newErrors.ip = 'IP é obrigatório';
    } else if (!isValidIPv4(formData.ip)) {
      newErrors.ip = 'Informe um IPv4 válido com 4 octetos (ex: 192.168.1.1). Não use pontos no final.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (isEditing && ipv4Id) {
        await updateMutation.mutateAsync({
          id: ipv4Id,
          data: formData
        });
      } else {
        await createMutation.mutateAsync(formData);
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
      title={isEditing ? 'Editar IPv4' : 'Criar IPv4'}
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
            Salvar
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
