import React, { useState, useEffect } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import DraggableModal from 'components/common/DraggableModal';
import { Button } from 'components/ui';
import FormField from 'components/ui/FormField';
import { Dominio } from 'types';
import { DominioService } from 'services/dominioService';

interface DominioBulkEditModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  dominios: Dominio[];
}

const DominioBulkEditModal: React.FC<DominioBulkEditModalProps> = ({
  show,
  onClose,
  onSuccess,
  dominios
}) => {
  const { t } = useI18n();
  const { success, error } = useNotificationContext();

  const [formData, setFormData] = useState({
    nome_oficio: '',
    data_inicio_bloqueio: '',
    data_fim_bloqueio: '',
    link_oficio_anatel: '',
    link_oficio_justica: '',
    link_planilha_dominios: '',
    descricao: '',
    ativo: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (show && dominios.length > 0) {
      const first = dominios[0];
      const dInicio = first.data_inicio_bloqueio;
      const dFim = first.data_fim_bloqueio;
      setFormData({
        nome_oficio: first.nome_oficio || '',
        data_inicio_bloqueio: dInicio ? String(dInicio).slice(0, 10) : '',
        data_fim_bloqueio: dFim ? String(dFim).slice(0, 10) : '',
        link_oficio_anatel: first.link_oficio_anatel || '',
        link_oficio_justica: first.link_oficio_justica || '',
        link_planilha_dominios: first.link_planilha_dominios || '',
        descricao: first.descricao || '',
        ativo: first.ativo ?? true
      });
    }
  }, [show, dominios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dominios.length === 0) return;

    setIsSubmitting(true);
    try {
      const baseData = {
        nome_oficio: formData.nome_oficio.trim() || null,
        data_inicio_bloqueio: formData.data_inicio_bloqueio.trim() || null,
        data_fim_bloqueio: formData.data_fim_bloqueio.trim() || null,
        link_oficio_anatel: formData.link_oficio_anatel.trim() || null,
        link_oficio_justica: formData.link_oficio_justica.trim() || null,
        link_planilha_dominios: formData.link_planilha_dominios.trim() || null,
        descricao: formData.descricao.trim() || null,
        ativo: formData.ativo
      };

      for (const d of dominios) {
        await DominioService.update(d.id, { ...baseData, dominio: d.dominio });
      }

      success(t('blockdomi.bulkEditSuccess').replace('{count}', String(dominios.length)));
      onSuccess?.();
    } catch (err) {
      const msg = (err as Error)?.message ?? 'Erro ao atualizar domínios';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const count = dominios.length;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('blockdomi.bulkEditDomains').replace('{count}', String(count))}
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
        <p className="text-muted small mb-3">
          {t('blockdomi.bulkEditIntro').replace('{count}', String(count))}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
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
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="bulk-ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="bulk-ativo">
                  {t('status.active')}
                </label>
              </div>
            </div>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default DominioBulkEditModal;
