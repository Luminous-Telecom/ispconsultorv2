import React, { useState, useEffect } from 'react';
import DraggableModal from '../../common/DraggableModal';
import { DiasVencimentoService } from '../../../services/diasVencimentoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';

interface DiasVencimentoModalProps {
  show: boolean;
  onClose: () => void;
}

const DiasVencimentoModal: React.FC<DiasVencimentoModalProps> = ({ show, onClose }) => {
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
      const dias = response.data.filter((item: any) => item.ativo).map((item: any) => item.dia);
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
    } catch (err: any) {
      error(err?.response?.data?.message || 'Erro ao salvar dias de vencimento');
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
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
          Salvar
        </button>
      }
    >
      <div className="modal-body p-3">
        <div className="row g-2">
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
