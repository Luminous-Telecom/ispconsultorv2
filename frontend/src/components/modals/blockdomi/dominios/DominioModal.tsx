import React, { useState, useEffect } from 'react';
import { useDominio, useCreateDominio, useUpdateDominio } from '@/hooks/useDominios';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import { sanitizeDominio } from '@/utils/stringUtils';

interface DominioModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  dominioId?: number | null;
}

const DominioModal: React.FC<DominioModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  dominioId 
}) => {
  const { t } = useI18n();
  const isEditing = !!dominioId;
  
  const { data: dominioData, isLoading } = useDominio(dominioId || 0);
  const createMutation = useCreateDominio();
  const updateMutation = useUpdateDominio();

  const [formData, setFormData] = useState({
    dominio: '',
    descricao: '',
    ativo: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (show) {
      if (isEditing && dominioData) {
        setFormData({
          dominio: dominioData.dominio || '',
          descricao: dominioData.descricao || '',
          ativo: dominioData.ativo ?? true
        });
      } else {
        setFormData({
          dominio: '',
          descricao: '',
          ativo: true
        });
      }
      setErrors({});
    }
  }, [show, isEditing, dominioData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dominioLimpo = sanitizeDominio(formData.dominio);
    const newErrors: Record<string, string> = {};
    if (!formData.dominio.trim()) {
      newErrors.dominio = 'Domínio é obrigatório';
    } else if (!dominioLimpo) {
      newErrors.dominio = 'Use o domínio sem protocolo (ex: exemplo.com ou t.co/rtg5bj3jkz). Não use https://, http:// ou www. no início.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const dataToSend = { ...formData, dominio: dominioLimpo };

    try {
      if (isEditing && dominioId) {
        await updateMutation.mutateAsync({
          id: dominioId,
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
      title={isEditing ? 'Editar Domínio' : 'Criar Domínio'}
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
                  name="dominio"
                  type="text"
                  label="Domínio"
                  value={formData.dominio}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, dominio: String(value ?? '') }));
                    if (errors.dominio) {
                      setErrors(prev => ({ ...prev, dominio: '' }));
                    }
                  }}
                  error={errors.dominio}
                  required
                  size="sm"
                  placeholder="exemplo.com ou t.co/rtg5bj3jkz"
                  helpText="Domínio sem protocolo (ex: exemplo.com ou t.co/rtg5bj3jkz). Sem https://, http:// ou www. no início."
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

export default DominioModal;
