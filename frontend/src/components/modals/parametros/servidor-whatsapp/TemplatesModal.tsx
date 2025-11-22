import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '@/services/core';
import DraggableModal from '@/components/common/DraggableModal';

interface Template {
  name: string;
  language: string;
  status: string;
  category: string;
  components?: Array<{
    type: string;
    format?: string;
    text?: string;
    buttons?: Array<{
      type: string;
      text: string;
      url?: string;
    }>;
  }>;
}

interface TemplatesResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    aprovados: number;
    templates: Template[];
  };
}

interface TemplatesModalProps {
  show: boolean;
  onClose: () => void;
}

const TemplatesModal: React.FC<TemplatesModalProps> = ({ show, onClose }) => {

  const { data, isLoading, error, refetch } = useQuery<TemplatesResponse['data']>({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const response = await defaultApiClient.get<TemplatesResponse>('/servidores-whatsapp/templates');
      if (!response.success) {
        throw new Error(response.message || 'Erro ao buscar templates');
      }
      
      // response.data já é o objeto { total, aprovados, templates }
      if (response.data && 'total' in response.data && 'aprovados' in response.data && 'templates' in response.data) {
        return response.data as TemplatesResponse['data'];
      }
      
      // Fallback: retornar objeto vazio
      return {
        total: 0,
        aprovados: 0,
        templates: []
      };
    },
    enabled: show,
    retry: false
  });

  const handleCopyName = (name: string) => {
    // Copiar o nome do template (para usar no template_mapping)
    navigator.clipboard.writeText(name);
  };
  
  const handleCopyMappingExample = (name: string, language: string) => {
    // Copiar JSON do template individual para usar no template_mapping
    const templateJson = {
      name,
      language,
      variables: ["cliente.razao_social", "titulo.valor_final", "titulo.data_vencimento", "dias_vencimento"]
    };
    navigator.clipboard.writeText(JSON.stringify(templateJson, null, 2));
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Templates Ativos - WhatsApp Cloud API"
      size="xl"
      modalId="templates-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-info btn-sm"
            data-bs-toggle="collapse"
            data-bs-target="#template-help"
            aria-expanded="false"
            aria-controls="template-help"
          >
            <i className="bi bi-question-circle me-1"></i>
            Ajuda
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            {isLoading ? 'Carregando...' : 'Atualizar'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      }
    >
      <div className="modal-body p-3">
        {/* Seção de Ajuda */}
        <div className="collapse mb-3" id="template-help">
          <div className="card card-body bg-light">
            <h6 className="fw-bold mb-2">Como configurar variáveis nos templates:</h6>
            <div className="small">
              <p className="mb-2"><strong>Variáveis disponíveis no BODY do template:</strong></p>
              <p className="small mb-2">A ordem das variáveis é configurável no campo <code>template_mapping</code>. Use o array <code>variables</code> para definir a ordem:</p>
              <ul className="mb-3">
                <li><code>cliente.razao_social</code> - Razão Social do Cliente (texto)</li>
                <li><code>titulo.valor_final</code> - Valor da fatura (texto: "300.00")</li>
                <li><code>titulo.valor_final_currency</code> - Valor da fatura (moeda: BRL - R$)</li>
                <li><code>titulo.data_vencimento</code> - Data de vencimento (texto: "DD/MM/AAAA")</li>
                <li><code>dias_vencimento</code> - Dias até vencimento (texto: "X dias", "hoje", "X dias atrás")</li>
              </ul>
              <p className="small mb-2"><strong>Exemplo de configuração:</strong></p>
              <pre className="bg-dark text-light p-2 rounded small mb-3">
{`{
  "10_dias_antes_vencimento": {
    "name": "fatura_pdf",
    "language": "en",
    "variables": [
      "cliente.razao_social",    // {{1}}
      "titulo.valor_final",       // {{2}}
      "titulo.data_vencimento",  // {{3}}
      "dias_vencimento"           // {{4}}
    ]
  }
}`}
              </pre>
              
              <p className="mb-2"><strong>HEADER com documento:</strong></p>
              <ul className="mb-3">
                <li>Se o template tiver HEADER do tipo DOCUMENT, o sistema automaticamente anexa o PDF da fatura</li>
                <li>O template <code>fatura_pdf</code> já está configurado para receber o PDF no header</li>
              </ul>
              
              <p className="mb-2"><strong>BUTTONS (URL dinâmica):</strong></p>
              <ul className="mb-3">
                <li>Botões devem ser pré-configurados no template no Facebook Business Manager</li>
                <li>O sistema preenche automaticamente URLs dinâmicas com o link de pagamento público</li>
                <li>Use <code>{'{{1}}'}</code> na URL do botão para inserir o token de pagamento</li>
              </ul>
              
              <p className="mb-2"><strong>Exemplo de template BODY:</strong></p>
              <pre className="bg-dark text-light p-2 rounded small">
{`Olá *{{1}}*,

Sua fatura de *R$ {{2}}* com vencimento em *{{3}}* está disponível.

Atenção: Faltam apenas *{{4}}* para o vencimento!`}
              </pre>
              
              <p className="mb-2"><strong>Ordem das variáveis:</strong></p>
              <p className="text-muted small mb-0">
                As variáveis devem ser usadas na ordem: {'{{1}}'}, {'{{2}}'}, {'{{3}}'}, {'{{4}}'}. 
                Você pode pular variáveis, mas a ordem deve ser respeitada.
              </p>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando templates...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Erro ao buscar templates: {error instanceof Error ? error.message : 'Erro desconhecido'}
          </div>
        )}

        {data && (
          <>
            <div className="mb-3">
              <div className="d-flex gap-3">
                <div>
                  <strong>Total:</strong> {data.total || 0}
                </div>
                <div>
                  <strong>Aprovados:</strong> {data.aprovados || 0}
                </div>
              </div>
            </div>

            {!data.templates || data.templates.length === 0 ? (
              <div className="alert alert-info">
                Nenhum template aprovado encontrado.
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="table table-sm table-hover">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Nome</th>
                      <th>Idioma</th>
                      <th>Categoria</th>
                      <th>Componentes</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.templates.map((template, index) => (
                      <tr key={`${template.name}-${template.language}-${index}`}>
                        <td>
                          <code className="text-primary">{template.name}</code>
                        </td>
                        <td>
                          <span className="badge bg-secondary">{template.language}</span>
                        </td>
                        <td>
                          <span className="badge bg-info">{template.category}</span>
                        </td>
                        <td>
                          <small>
                            {template.components?.map((comp, idx) => (
                              <span key={idx} className="badge bg-light text-dark me-1">
                                {comp.type}
                                {comp.format && ` (${comp.format})`}
                              </span>
                            ))}
                          </small>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleCopyName(template.name)}
                              title="Copiar nome do template"
                            >
                              <i className="bi bi-clipboard"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleCopyMappingExample(template.name, template.language)}
                              title="Copiar exemplo de JSON para template_mapping"
                            >
                              <i className="bi bi-code-square"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </DraggableModal>
  );
};

export default TemplatesModal;

