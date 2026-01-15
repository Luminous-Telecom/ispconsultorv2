import React, { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import { DiasVencimentoService, DiasVencimento } from '@/services/diasVencimentoService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';

interface DiasVencimentoModalProps {
  show: boolean;
  onClose: () => void;
}

const DiasVencimentoModal: React.FC<DiasVencimentoModalProps> = ({ show, onClose }) => {
  const isMobile = useIsMobile();
  const [diasAtivos, setDiasAtivos] = useState<number[]>([5, 10, 15, 20, 25, 30]);
  const { success, error } = useNotificationContext();
  
  useEffect(() => {
    if (show) {
      loadDiasAtivos();
    }
  }, [show]);

  const loadDiasAtivos = async () => {
    const response = await DiasVencimentoService.get();
    if (response.success && Array.isArray(response.data)) {
      const dias = response.data
        .filter((item: DiasVencimento) => item.ativo)
        .map((item: DiasVencimento) => item.dia || item.dia_padrao)
        .filter((dia): dia is number => dia !== undefined);
      if (dias.length > 0) setDiasAtivos(dias);
    }
  };
  
  const toggleDia = (dia: number) => {
    setDiasAtivos(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia].sort((a, b) => a - b));
  };

  const handleSave = async () => {
    try {
      await DiasVencimentoService.update({ dias: diasAtivos });
      success('Dias de vencimento salvos com sucesso!');
    } catch (err: unknown) {
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        error(axiosError.response?.data?.message || 'Erro ao salvar dias de vencimento');
      } else {
        error('Erro ao salvar dias de vencimento');
      }
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Dias de Vencimento"
      size="xl"
      modalId="dias-vencimento-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button 
            type="button" 
            variant="primary" 
            size="sm" 
            leftIcon={<i className="bi bi-check-lg"></i>}
            onClick={handleSave}
          >
            Salvar
          </Button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '0' : '16px' }}>
        <div className="row g-0">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(dia => (
            <div key={dia} className="col-12 col-sm-6 col-md-4 col-lg-3">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id={`dia-${dia}`}
                  checked={diasAtivos.includes(dia)}
                  onChange={() => toggleDia(dia)}
                  style={{ cursor: 'pointer' }}
                />
                <label className="form-check-label" htmlFor={`dia-${dia}`} style={{ cursor: 'pointer' }}>
                  Ativar dia {String(dia).padStart(2, '0')}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DraggableModal>
  );
};

export default DiasVencimentoModal;
