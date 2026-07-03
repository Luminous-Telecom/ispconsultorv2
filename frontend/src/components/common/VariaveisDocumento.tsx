import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Loading, LabelWithHelp, CopiarIconButton, NavLinkButton } from 'components/ui';
import SearchBar from 'components/ui/SearchBar';
import { useI18n } from 'contexts/I18nContext';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';

interface Variavel {
  variavel: string;
  descricao: string;
}


interface VariaveisDocumentoProps {
  onInserirVariavel?: (variavel: string) => void;
}

const VariaveisDocumento: React.FC<VariaveisDocumentoProps> = ({ onInserirVariavel }) => {
  const { t } = useI18n();
  const { copy: copyToClipboard } = useCopyToClipboard();
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
      void copyToClipboard(variavel);
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
      <Loading variant="centered" size="sm" showMessage={false} className="p-3" />
    );
  }

  return (
    <div className="variaveis-documento">
      <div className="mb-3">
        <LabelWithHelp
          className="form-label small fw-bold"
          helpText={`${t('variables.tip')} ${onInserirVariavel ? t('variables.clickToInsert') : t('variables.clickToCopy')}`}
        >
          {t('variables.title')}
        </LabelWithHelp>
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
                <NavLinkButton
                  className={`accordion-button variavel-tab-btn ${grupoExpandido === chave ? '' : 'collapsed'}`}
                  onClick={() => toggleGrupo(chave)}
                  ariaLabel={grupoTyped.titulo}
                >
                  {grupoTyped.titulo}
                  <span className="badge bg-secondary ms-2">{variaveisFiltradas.length}</span>
                </NavLinkButton>
              </h2>
              <div className={`accordion-collapse collapse ${grupoExpandido === chave ? 'show' : ''}`}>
                <div className="accordion-body p-0">
                  <div className="list-group list-group-flush">
                    {variaveisFiltradas.map((variavel: Variavel) => (
                      <div
                        key={variavel.variavel}
                        className="list-group-item py-2 px-3 d-flex align-items-start gap-2"
                      >
                        <NavLinkButton
                          className="flex-grow-1 border-0 bg-transparent text-start p-0"
                          onClick={() => handleInserirVariavel(variavel.variavel)}
                          ariaLabel={variavel.variavel}
                        >
                          <code className="small">{variavel.variavel}</code>
                          <div className="text-muted small">{variavel.descricao}</div>
                        </NavLinkButton>
                        <CopiarIconButton
                          text={variavel.variavel}
                          copyKey={variavel.variavel}
                          type="button"
                          variant="ghost"
                          className="p-0 text-muted flex-shrink-0 fs-sm"
                          title={t('buttons.copy')}
                        />
                      </div>
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

