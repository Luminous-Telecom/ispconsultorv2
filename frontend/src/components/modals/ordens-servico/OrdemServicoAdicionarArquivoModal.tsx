import React, { useEffect, useState } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useUploadOrdemServicoArquivo } from 'hooks/useOrdensServico';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import FormField from 'components/ui/FormField';
import { FormValue } from 'types/common';

interface OrdemServicoAdicionarArquivoModalProps {
  show: boolean;
  onClose: () => void;
  ordemServicoId: number | string;
  onSuccess?: () => void;
}

const OrdemServicoAdicionarArquivoModal: React.FC<OrdemServicoAdicionarArquivoModalProps> = ({
  show,
  onClose,
  ordemServicoId,
  onSuccess,
}) => {
  const isMobile = useIsMobile();
  const { error } = useNotificationContext();
  const uploadMutation = useUploadOrdemServicoArquivo();

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
        ordemServicoId,
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
          formId="ordem-servico-adicionar-arquivo-form"
          isPending={isPending}
          saveType="button"
          onSave={handleSubmit}
        />
      }
      modalId="ordem-servico-adicionar-arquivo-modal"
    >
      <form id="ordem-servico-adicionar-arquivo-form" onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-12">
            <div style={{ padding: isMobile ? '0' : '16px' }}>
              <FormField
                name="arquivo"
                type="file"
                label="Arquivo"
                required
                accept="*/*"
                onChange={handleFileSelect}
                disabled={isPending}
                helpText={nomeArquivo ? `Arquivo selecionado: ${nomeArquivo}` : undefined}
              />

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
        </div>
      </form>
    </DraggableModal>
  );
};

export default OrdemServicoAdicionarArquivoModal;
