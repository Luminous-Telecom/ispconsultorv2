import React, { useState, useEffect, useCallback } from 'react';
import { DiasVencimentoService, type DiasVencimento } from 'services/diasVencimentoService';
import { saasDiasVencimentoService } from 'services/saas/saasCrudService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import DraggableModal from 'components/common/DraggableModal';
import AtivoInativoField from 'components/ui/AtivoInativoField';
import { SalvarButton } from 'components/ui';

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

  const setDiaAtivo = (dia: number, ativo: boolean) => {
    setDiasAtivos((prev) => {
      const has = prev.includes(dia);
      if (ativo && !has) return [...prev, dia].sort((a, b) => a - b);
      if (!ativo && has) return prev.filter((d) => d !== dia);
      return prev;
    });
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

  const content = (
    <div className="form-modal-simple">
      <div className="d-flex justify-content-start align-items-center mb-3">
        <SalvarButton type="button" onClick={handleSave} />
      </div>
      <div className="row g-2">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((dia) => (
          <div key={dia} className="col-12">
            <AtivoInativoField
              value={diasAtivos.includes(dia)}
              onChange={(ativo) => setDiaAtivo(dia, ativo)}
              label={`Ativar dia ${String(dia).padStart(2, '0')}`}
              name={`dia-${variant}-${dia}`}
            />
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
