import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useClienteArquivos } from '@/hooks/useClienteArquivos';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import { FormValue } from '@/types/common';

interface AdicionarArquivoModalProps {
  show: boolean;
  onClose: () => void;
  clienteId: number;
  onSuccess?: () => void;
}

const AdicionarArquivoModal: React.FC<AdicionarArquivoModalProps> = ({
  show,
  onClose,
  clienteId,
  onSuccess
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { success, error } = useNotificationContext();
  const { createMutation } = useClienteArquivos({ clienteId });

  const [nome, setNome] = useState<string>('');
  const [tipo, setTipo] = useState<'documento' | 'foto' | 'assinatura' | 'outro'>('documento');
  const [descricao, setDescricao] = useState<string>('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!show) {
      setNome('');
      setTipo('documento');
      setDescricao('');
      setArquivo(null);
      setNomeArquivo('');
      setIsSubmitting(false);
    }
  }, [show]);

  const handleFileSelect = (value: FormValue) => {
    const file = value as File | null;
    if (!file || !(file instanceof File)) return;

    setArquivo(file);
    setNomeArquivo(file.name);
    
    // Se nome não foi preenchido, usar nome do arquivo
    if (!nome) {
      setNome(file.name);
    }

    // Detectar tipo automaticamente se for imagem
    if (file.type.startsWith('image/')) {
      setTipo('foto');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!arquivo) {
      error(t('messages.selectFile'));
      return;
    }

    if (!nome.trim()) {
      error(t('messages.enterFileName'));
      return;
    }

    setIsSubmitting(true);

    try {
      await createMutation.mutateAsync({
        cliente_id: clienteId,
        nome: nome.trim(),
        tipo,
        arquivo,
        descricao: descricao.trim() || undefined,
        origem: 'manual'
      });

      success(t('messages.fileAddedSuccess'));
      onSuccess?.();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('messages.fileAddedError');
      error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerActions = (
    <>
      <Button
        variant="primary"
        onClick={onClose}
        disabled={isSubmitting}
      >
        {t('actions.cancel')}
      </Button>
      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={isSubmitting}
        isLoading={isSubmitting}
        form="adicionar-arquivo-form"
      >
        {t('actions.save')}
      </Button>
    </>
  );

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('modal.addFile')}
      size="md"
      headerActions={headerActions}
      modalId="adicionar-arquivo-modal"
    >
      <form id="adicionar-arquivo-form" onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-12">
            <div style={{ padding: isMobile ? '0' : '16px' }}>
              <FormField
                name="arquivo"
                type="file"
                label={t('form.file')}
                required
                accept="*/*"
                onChange={handleFileSelect}
                disabled={isSubmitting}
                helpText={nomeArquivo ? `${t('form.fileSelected')}: ${nomeArquivo}` : undefined}
              />

              <FormField
                name="nome"
                type="text"
                label={t('form.name')}
                value={nome}
                onChange={(value) => setNome(String(value || ''))}
                placeholder={t('placeholder.fileName')}
                required
                disabled={isSubmitting}
              />

              <FormField
                name="tipo"
                type="select"
                label={t('form.fileType')}
                value={tipo}
                onChange={(value) => setTipo(value as 'documento' | 'foto' | 'assinatura' | 'outro')}
                options={[
                  { value: 'documento', label: t('form.fileTypeDocument') },
                  { value: 'foto', label: t('form.fileTypePhoto') },
                  { value: 'assinatura', label: t('form.fileTypeSignature') },
                  { value: 'outro', label: t('form.fileTypeOther') }
                ]}
                disabled={isSubmitting}
              />

              <FormField
                name="descricao"
                type="textarea"
                label={t('form.description')}
                value={descricao}
                onChange={(value) => setDescricao(String(value || ''))}
                placeholder={t('placeholder.description')}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default AdicionarArquivoModal;
