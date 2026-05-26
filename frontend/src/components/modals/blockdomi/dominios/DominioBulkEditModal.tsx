import React, { useState, useEffect } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import DraggableModal from 'components/common/DraggableModal';
import { FormField, AtivoInativoField, ModalFormActions } from 'components/ui';
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
    numero_sei_anatel: '',
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
        numero_sei_anatel: first.numero_sei_anatel || '',
        descricao: first.descricao || '',
        ativo: first.ativo ?? true
      });
    }
  }, [show, dominios]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (dominios.length === 0) return;

    setIsSubmitting(true);
    try {
      const baseData = {
        ids: dominios.map((d) => d.id),
        nome_oficio: formData.nome_oficio.trim() || null,
        data_inicio_bloqueio: formData.data_inicio_bloqueio.trim() || null,
        data_fim_bloqueio: formData.data_fim_bloqueio.trim() || null,
        link_oficio_anatel: formData.link_oficio_anatel.trim() || null,
        link_oficio_justica: formData.link_oficio_justica.trim() || null,
        link_planilha_dominios: formData.link_planilha_dominios.trim() || null,
        numero_sei_anatel: formData.numero_sei_anatel.trim() || null,
        descricao: formData.descricao.trim() || null,
        ativo: formData.ativo
      };

      await DominioService.bulkUpdate(baseData);

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
        <ModalFormActions
          onCancel={onClose}
          isPending={isSubmitting}
          saveType="button"
          onSave={handleSubmit}
        />
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
                name="dominio-bulk-ativo"
              />
            </div>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default DominioBulkEditModal;
