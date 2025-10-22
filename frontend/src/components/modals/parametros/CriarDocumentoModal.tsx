import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';
import ModeloReciboService, { ModeloRecibo } from '../../../services/modeloReciboService';
import ModeloCartaService, { ModeloCarta } from '../../../services/modeloCartaService';
import RichTextEditor from '../../common/RichTextEditor';
import { useNotificationContext } from '../../../contexts/NotificationContext';

interface CriarDocumentoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tipo: 'contrato' | 'recibo' | 'carta_cobranca';
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
        default:
          return DocumentoSistemaService.create({ ...data, tipo });
      }
    },
    onSuccess: () => {
      addNotification('success', 'Documento criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema'] });
      onSuccess();
      onClose();
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
    };
    return labels[tipo as keyof typeof labels];
  };

  return (
    <DraggableModal 
      show={show} 
      onClose={handleClose} 
      title={`Novo ${getTipoLabel(tipo)}`} 
      size="xl" 
      modalId={`criar-documento-${tipo}-modal`}
    >
      <div className="p-2">
        <form onSubmit={handleSubmit}>
          <div className="row g-2">
            <div className="col-12">
              <div className="mb-2">
                <label htmlFor="criar-doc-nome" className="form-label small mb-1">
                  Nome <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  id="criar-doc-nome"
                  name="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder={`Ex: ${getTipoLabel(tipo)} Padrão`}
                  required
                />
              </div>

              <div className="mb-2">
                <label htmlFor="criar-doc-descricao" className="form-label small mb-1">Descrição</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  id="criar-doc-descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Breve descrição"
                />
              </div>

              <div className="d-flex gap-1 mb-2">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={createDocumentoMutation.isPending}
                >
                  {createDocumentoMutation.isPending ? 'Salvando...' : 'Novo'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleReset}
                >
                  Limpar
                </button>
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
