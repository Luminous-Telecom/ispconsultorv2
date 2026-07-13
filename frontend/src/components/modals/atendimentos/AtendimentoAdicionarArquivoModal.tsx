import React, { useEffect, useState } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useUploadAtendimentoArquivo } from 'hooks/useAtendimentos';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import FormField from 'components/ui/FormField';
import { FormValue } from 'types/common';

interface AtendimentoAdicionarArquivoModalProps {
  show: boolean;
  onClose: () => void;
  atendimentoId: number | string;
  clienteId?: number;
  onSuccess?: () => void;
}

const AtendimentoAdicionarArquivoModal: React.FC<AtendimentoAdicionarArquivoModalProps> = ({
  show,
  onClose,
  atendimentoId,
  clienteId,
  onSuccess,
}) => {
  const { error } = useNotificationContext();
  const uploadMutation = useUploadAtendimentoArquivo();

  const [descricao, setDescricao] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');

  useEffect(() => {
    if (!show) {
      setDescricao('');
      setArquivo(null);
      setNomeArquivo('');
    }
  }, [show]);

  const handleFileSelect = (value: FormValue) => {
    const file = value as File | null;
    if (!file || !(file instanceof File)) return;

    setArquivo(file);
    setNomeArquivo(file.name);
    if (!descricao.trim()) {
      setDescricao(file.name);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!arquivo) {
      error('Selecione um arquivo');
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        atendimentoId,
        clienteId,
        data: {
          arquivo,
          descricao: descricao.trim() || arquivo.name,
        },
      });
      onSuccess?.();
      onClose();
    } catch {
      // Erro tratado pelo hook
    }
  };

  const isPending = uploadMutation.isPending;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Arquivo"
      size="md"
      headerActions={
        <ModalFormActions
          onCancel={onClose}
          formId="atendimento-adicionar-arquivo-form"
          isPending={isPending}
          saveType="button"
          onSave={handleSubmit}
        />
      }
      modalId="atendimento-adicionar-arquivo-modal"
    >
      <form id="atendimento-adicionar-arquivo-form" onSubmit={handleSubmit} className="form-modal-simple">
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="arquivo"
              type="file"
              size="sm"
              label="Arquivo"
              required
              accept="*/*"
              onChange={handleFileSelect}
              disabled={isPending}
              helpText={nomeArquivo ? `Arquivo selecionado: ${nomeArquivo}` : undefined}
            />
          </div>

          <div className="col-12">
            <FormField
              name="descricao"
              type="text"
              label="Descrição"
              value={descricao}
              onChange={(value) => setDescricao(String(value || ''))}
              placeholder="Descrição do arquivo"
              required
              disabled={isPending}
            />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default AtendimentoAdicionarArquivoModal;
