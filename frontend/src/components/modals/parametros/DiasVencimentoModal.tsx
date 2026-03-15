import React, { useState, useEffect, useCallback } from 'react';
import { DiasVencimentoService, type DiasVencimento } from 'services/diasVencimentoService';
import { saasDiasVencimentoService } from 'services/saas/saasCrudService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import { Button } from 'components/ui';

interface DiasVencimentoModalProps {
  show: boolean;
  onClose: () => void;
  variant?: 'erp' | 'saas';
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const DiasVencimentoModal: React.FC<DiasVencimentoModalProps> = ({
  show,
  onClose,
  variant = 'erp',
  skipWrapper = false,
}) => {
  const isMobile = useIsMobile();
  const [diasAtivos, setDiasAtivos] = useState<number[]>([]);
  const { success, error } = useNotificationContext();

  const loadDiasAtivosErp = useCallback(async () => {
    const response = await DiasVencimentoService.get();
    if (response.success && Array.isArray(response.data)) {
      const dias = response.data
        .filter((item: DiasVencimento) => item.ativo)
        .map((item: DiasVencimento) => item.dia ?? item.dia_padrao)
        .filter((dia): dia is number => dia !== undefined);
      setDiasAtivos(dias);
    }
  }, []);

  const loadDiasAtivosSaas = useCallback(async () => {
    const response = await saasDiasVencimentoService.getConfig();
    const data = (response as { data?: { data?: DiasVencimento[] } })?.data?.data ?? (response as { data?: DiasVencimento[] })?.data ?? [];
    if (Array.isArray(data)) {
      const dias = data
        .filter((item: DiasVencimento) => item.ativo)
        .map((item: DiasVencimento) => item.dia ?? item.dia_padrao)
        .filter((dia): dia is number => dia !== undefined);
      setDiasAtivos(dias);
    }
  }, []);

  useEffect(() => {
    if (show && variant === 'erp') {
      loadDiasAtivosErp();
    } else if (show && variant === 'saas') {
      loadDiasAtivosSaas();
    }
  }, [show, variant, loadDiasAtivosErp, loadDiasAtivosSaas]);

  const toggleDia = (dia: number) => {
    setDiasAtivos((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort((a, b) => a - b)
    );
  };

  const handleSave = useCallback(async () => {
    try {
      if (variant === 'erp') {
        await DiasVencimentoService.update({ dias: diasAtivos });
      } else {
        await saasDiasVencimentoService.updateConfig(diasAtivos);
        await loadDiasAtivosSaas();
      }
      success('Dias de vencimento salvos com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar dias de vencimento';
      error(msg);
    }
  }, [variant, diasAtivos, success, error, loadDiasAtivosSaas]);

  const canSave = true;

  const saveButton = (
    <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={!canSave}>
      Salvar
    </Button>
  );

  const content = (
    <div style={{ padding: isMobile ? '0' : '16px' }}>
      <div className="d-flex justify-content-start align-items-center mb-3">
        {saveButton}
      </div>
      <div className="row g-0">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((dia) => (
          <div key={dia} className="col-12 col-sm-6 col-md-4 col-lg-3">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id={`dia-${variant}-${dia}`}
                checked={diasAtivos.includes(dia)}
                onChange={() => toggleDia(dia)}
                style={{ cursor: 'pointer' }}
              />
              <label
                className="form-check-label"
                htmlFor={`dia-${variant}-${dia}`}
                style={{ cursor: 'pointer' }}
              >
                Ativar dia {String(dia).padStart(2, '0')}
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (skipWrapper) return content;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Dias de Vencimento"
      size="xl"
      modalId={variant === 'saas' ? 'saas-dias-vencimento-modal' : 'dias-vencimento-modal'}
    >
      {content}
    </DraggableModal>
  );
};

export default DiasVencimentoModal;
