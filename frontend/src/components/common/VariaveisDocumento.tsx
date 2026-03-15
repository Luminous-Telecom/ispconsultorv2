import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Spinner } from 'components/ui';
import SearchBar from 'components/ui/SearchBar';
import { useI18n } from 'contexts/I18nContext';

interface Variavel {
  variavel: string;
  descricao: string;
}


interface VariaveisDocumentoProps {
  onInserirVariavel?: (variavel: string) => void;
}

const VariaveisDocumento: React.FC<VariaveisDocumentoProps> = ({ onInserirVariavel }) => {
  const { t } = useI18n();
  const [grupoExpandido, setGrupoExpandido] = useState<string | null>('cliente');
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar variáveis disponíveis
  const { data: variaveisData, isLoading } = useQuery({
    queryKey: ['variaveis-documento'],
    queryFn: async () => {
      const response = await axios.get('/api/modelos-documento/variaveis');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const toggleGrupo = (grupo: string) => {
    setGrupoExpandido(grupoExpandido === grupo ? null : grupo);
  };

  const handleInserirVariavel = (variavel: string) => {
    if (onInserirVariavel) {
      onInserirVariavel(variavel);
    } else {
      // Copiar para clipboard
      navigator.clipboard.writeText(variavel);
    }
  };

  const filtrarVariaveis = (variaveis: Variavel[]) => {
    if (!searchTerm) return variaveis;
    return variaveis.filter(v => 
      v.variavel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (isLoading) {
    return (
      <div className="text-center p-3">
        <Spinner size="sm" variant="primary" aria-label={t('messages.loading')} />
      </div>
    );
  }

  return (
    <div className="variaveis-documento">
      <div className="mb-3">
        <label className="form-label small fw-bold">
          {t('variables.title')}
          <i
            className="bi bi-info-circle text-muted ms-1"
            style={{ cursor: 'help', fontSize: '0.85rem' }}
            title={`${t('variables.tip')} ${onInserirVariavel ? t('variables.clickToInsert') : t('variables.clickToCopy')}`}
          />
        </label>
        <SearchBar
          id="variaveis-documento-search"
          variant="table"
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={setSearchTerm}
          placeholder={t('variables.searchPlaceholder')}
          searchFields={[]}
        />
      </div>

      <div className="accordion accordion-flush" id="accordionVariaveis">
        {variaveisData && Object.entries(variaveisData).map(([chave, grupo]) => {
          const grupoTyped = grupo as { titulo: string; variaveis: Variavel[] };
          const variaveisFiltradas = filtrarVariaveis(grupoTyped.variaveis);
          
          if (variaveisFiltradas.length === 0 && searchTerm) return null;

          return (
            <div className="accordion-item" key={chave}>
              <h2 className="accordion-header">
                <button
                  className={`accordion-button ${grupoExpandido === chave ? '' : 'collapsed'}`}
                  type="button"
                  onClick={() => toggleGrupo(chave)}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  {grupoTyped.titulo}
                  <span className="badge bg-secondary ms-2">{variaveisFiltradas.length}</span>
                </button>
              </h2>
              <div className={`accordion-collapse collapse ${grupoExpandido === chave ? 'show' : ''}`}>
                <div className="accordion-body p-0">
                  <div className="list-group list-group-flush">
                    {variaveisFiltradas.map((variavel: Variavel) => (
                      <button
                        key={variavel.variavel}
                        type="button"
                        className="list-group-item list-group-item-action py-2 px-3"
                        onClick={() => handleInserirVariavel(variavel.variavel)}
                      >
                        <div className="d-flex w-100 justify-content-between align-items-start">
                          <div>
                            <code className="small">{variavel.variavel}</code>
                            <div className="text-muted small">{variavel.descricao}</div>
                          </div>
                          <i className="bi bi-clipboard text-muted"></i>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="alert alert-info mt-3 p-2 small">
        <i className="bi bi-info-circle me-1"></i>
        <strong>{t('messages.warning')}:</strong> {t('variables.tip')}
      </div>
    </div>
  );
};

export default VariaveisDocumento;

