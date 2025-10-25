import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';
import ModeloReciboService, { ModeloRecibo } from '../../../services/modeloReciboService';
import ModeloCartaService, { ModeloCarta } from '../../../services/modeloCartaService';
import ModeloTermoService, { ModeloTermo } from '../../../services/modeloTermoService';
import RichTextEditor from '../../common/RichTextEditor';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import FormField from '../../ui/FormField';

interface CriarDocumentoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tipo: 'contrato' | 'recibo' | 'carta_cobranca' | 'termo';
}

const CriarDocumentoModal: React.FC<CriarDocumentoModalProps> = ({ show, onClose, onSuccess, tipo }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
  });

  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  // Mutation para criar documento
  const createDocumentoMutation = useMutation({
    mutationFn: async (data: any) => {
      switch (tipo) {
        case 'contrato':
          return DocumentoSistemaService.create({ ...data, tipo });
        case 'recibo':
          return ModeloReciboService.create(data);
        case 'carta_cobranca':
          return ModeloCartaService.create(data);
        case 'termo':
          return ModeloTermoService.create(data);
        default:
          return DocumentoSistemaService.create({ ...data, tipo });
      }
    },
    onSuccess: () => {
      addNotification('success', 'Documento criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema', tipo] });
      onSuccess();
    },
    onError: (error: any) => {
      addNotification('error', error.message || 'Erro ao criar documento');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.conteudo) {
      addNotification('error', 'Nome e conteúdo são obrigatórios');
      return;
    }
    createDocumentoMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData({
      nome: '',
      descricao: '',
      conteudo: '',
    });
  };

  const editorRef = useRef<any>(null);

  const handleInsertVariable = (variable: string) => {
    if (editorRef.current && editorRef.current.insertVariable) {
      editorRef.current.insertVariable(variable);
    }
  };


  const handleClose = () => {
    handleReset();
    onClose();
  };

  const getTipoLabel = (tipo: string) => {
    const labels = {
      contrato: 'Contrato',
      recibo: 'Recibo',
      carta_cobranca: 'Carta de Cobrança',
      termo: 'Termo',
    };
    return labels[tipo as keyof typeof labels];
  };

  // Ações para o header do modal
  const headerActions = (
    <div className="d-flex gap-2">
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={handleSubmit}
        disabled={createDocumentoMutation.isPending}
      >
        {createDocumentoMutation.isPending ? 'Salvando...' : 'Salvar'}
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={handleClose}
      >
        Cancelar
      </button>
    </div>
  );

  return (
    <DraggableModal 
      show={show} 
      onClose={handleClose} 
      title={`Novo ${getTipoLabel(tipo)}`} 
      size="xl" 
      modalId={`criar-documento-${tipo}-modal`}
      headerActions={headerActions}
    >
      <div className="p-2">
        <form onSubmit={handleSubmit}>
          <div className="row g-2">
            <div className="col-12">
              <div className="mb-2">
                <FormField
                  name="nome"
                  type="text"
                  label="Nome"
                  value={formData.nome}
                  onChange={(e: any) => setFormData(prev => ({ ...prev, nome: e.value }))}
                  placeholder={`Ex: ${getTipoLabel(tipo)} Padrão`}
                  required
                  size="sm"
                />
              </div>

              <div className="mb-2">
                <FormField
                  name="descricao"
                  type="text"
                  label="Descrição"
                  value={formData.descricao}
                  onChange={(e: any) => setFormData(prev => ({ ...prev, descricao: e.value }))}
                  placeholder="Breve descrição"
                  size="sm"
                />
              </div>
            </div>
            <div className="col-12">
              <div className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span id="conteudo-label" className="form-label small mb-0">
                    Conteúdo <span className="text-danger">*</span>
                  </span>
                </div>
                <RichTextEditor
                  ref={editorRef}
                  key={`criar-${tipo}`}
                  id="conteudo"
                  name="conteudo"
                  ariaLabelledBy="conteudo-label"
                  value={formData.conteudo}
                  onChange={(value) => setFormData(prev => ({ ...prev, conteudo: value }))}
                  placeholder="Digite o conteúdo do documento..."
                  height="400px"
                  onInsertVariable={handleInsertVariable}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default CriarDocumentoModal;
