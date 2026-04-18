import React, { useState, useEffect } from 'react';
import { useDominio, useCreateDominio, useUpdateDominio } from 'hooks/useDominios';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { Button, FormField, AtivoInativoField } from 'components/ui';
import { sanitizeDominio } from 'utils/stringUtils';

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
    nome_oficio: '',
    data_inicio_bloqueio: '',
    data_fim_bloqueio: '',
    link_oficio_anatel: '',
    link_oficio_justica: '',
    link_planilha_dominios: '',
    numero_sei_anatel: '',
    ativo: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (show) {
      if (isEditing && dominioData) {
        const dInicio = dominioData.data_inicio_bloqueio;
        const dFim = dominioData.data_fim_bloqueio;
        setFormData({
          dominio: dominioData.dominio || '',
          descricao: dominioData.descricao || '',
          nome_oficio: dominioData.nome_oficio || '',
          data_inicio_bloqueio: dInicio ? String(dInicio).slice(0, 10) : '',
          data_fim_bloqueio: dFim ? String(dFim).slice(0, 10) : '',
          link_oficio_anatel: dominioData.link_oficio_anatel || '',
          link_oficio_justica: dominioData.link_oficio_justica || '',
          link_planilha_dominios: dominioData.link_planilha_dominios || '',
          numero_sei_anatel: dominioData.numero_sei_anatel || '',
          ativo: dominioData.ativo ?? true
        });
      } else {
        const today = new Date();
        const hoje = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setFormData({
          dominio: '',
          descricao: '',
          nome_oficio: '',
          data_inicio_bloqueio: hoje,
          data_fim_bloqueio: '',
          link_oficio_anatel: '',
          link_oficio_justica: '',
          link_planilha_dominios: '',
          numero_sei_anatel: '',
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
      newErrors.dominio = t('blockdomi.domainRequired');
    } else if (!dominioLimpo) {
      newErrors.dominio = t('blockdomi.domainInvalidFormat');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const dataToSend = {
      ...formData,
      dominio: dominioLimpo,
      nome_oficio: formData.nome_oficio.trim() || null,
      data_inicio_bloqueio: formData.data_inicio_bloqueio.trim() || null,
      data_fim_bloqueio: formData.data_fim_bloqueio.trim() || null,
      link_oficio_anatel: formData.link_oficio_anatel.trim() || null,
      link_oficio_justica: formData.link_oficio_justica.trim() || null,
      link_planilha_dominios: formData.link_planilha_dominios.trim() || null,
      numero_sei_anatel: formData.numero_sei_anatel.trim() || null
    };

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
    } catch (error) {
      // Erro tratado pelo hook
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEditing ? t('blockdomi.editDomain') : t('blockdomi.createDomain')}
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
                  name="dominio"
                  type="text"
                  label={t('blockdomi.domain')}
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
                  placeholder={t('blockdomi.placeholderDomain')}
                  helpText={t('blockdomi.helpDomain')}
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
              <div className="col-12 col-md-6">
                <FormField
                  name="numero_sei_anatel"
                  type="text"
                  label={t('blockdomi.numeroSeiAnatelOptional')}
                  value={formData.numero_sei_anatel}
                  onChange={(value) => setFormData(prev => ({ ...prev, numero_sei_anatel: String(value ?? '').replace(/\D/g, '').slice(0, 20) }))}
                  size="sm"
                  placeholder="15497675"
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
                <FormField
                  name="link_planilha_dominios"
                  type="text"
                  label={t('blockdomi.linkPlanilhaDominios')}
                  value={formData.link_planilha_dominios}
                  onChange={(value) => setFormData(prev => ({ ...prev, link_planilha_dominios: String(value ?? '') }))}
                  size="sm"
                  placeholder="https://..."
                />
              </div>
              <div className="col-12">
                <AtivoInativoField
                  value={formData.ativo}
                  onChange={(v) => setFormData(prev => ({ ...prev, ativo: v }))}
                  name="dominio-ativo"
                />
              </div>
            </div>
          </form>
        )}
      </div>
    </DraggableModal>
  );
};

export default DominioModal;
