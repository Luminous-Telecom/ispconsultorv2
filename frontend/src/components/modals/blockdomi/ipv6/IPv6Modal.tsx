import React, { useState, useEffect } from 'react';
import { useIPv6, useCreateIPv6, useUpdateIPv6 } from '@/hooks/useIPv6';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import { isValidIPv6 } from '@/utils/validators';

interface IPv6ModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  ipv6Id?: number | null;
}

const IPv6Modal: React.FC<IPv6ModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  ipv6Id 
}) => {
  const { t } = useI18n();
  const isEditing = !!ipv6Id;
  
  const { data: ipv6Data, isLoading } = useIPv6(ipv6Id || 0);
  const createMutation = useCreateIPv6();
  const updateMutation = useUpdateIPv6();

  const [formData, setFormData] = useState({
    ip: '',
    descricao: '',
    ativo: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (show) {
      if (isEditing && ipv6Data) {
        setFormData({
          ip: ipv6Data.ip || '',
          descricao: ipv6Data.descricao || '',
          ativo: ipv6Data.ativo ?? true
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
  }, [show, isEditing, ipv6Data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.ip.trim()) {
      newErrors.ip = 'IP é obrigatório';
    } else if (!isValidIPv6(formData.ip)) {
      newErrors.ip = 'Informe um IPv6 válido (8 grupos hex separados por :). Ex: 2001:db8::1. Pode usar :: uma vez para comprimir zeros.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (isEditing && ipv6Id) {
        await updateMutation.mutateAsync({
          id: ipv6Id,
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
      title={isEditing ? 'Editar IPv6' : 'Criar IPv6'}
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
                  label="IPv6"
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
                  placeholder="2001:db8::1"
                  helpText="8 grupos hex (1-4 dígitos) separados por :. Ex: 2001:db8::1. Pode usar :: uma vez para comprimir zeros. Não use : no final."
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

export default IPv6Modal;
