import React, { useState, useEffect } from 'react';
import { ParametroService, Parametro, ParametroUpdate } from '../../services/parametroService';
import { useNotificationContext } from '../../contexts/NotificationContext';
import DraggableModal from '../common/DraggableModal';

const Parametros: React.FC = () => {
  const { addNotification } = useNotificationContext();
  const [parametros, setParametros] = useState<Record<string, Parametro[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const categorias = [
    { key: 'validacao', nome: 'Validação de Documentos', icon: '📋' },
    { key: 'titulos', nome: 'Geração de Títulos', icon: '📄' },
    { key: 'carne', nome: 'Geração de Carnê', icon: '📚' }
  ];

  useEffect(() => {
    loadParametros();
  }, []);


  const loadParametros = async () => {
    try {
      setLoading(true);
      const data = await ParametroService.getParametrosPorCategoria();
      setParametros(data);
    } catch (error) {
      console.error('❌ Erro ao carregar parâmetros:', error);
      addNotification('error', '❌ Erro ao carregar parâmetros');
    } finally {
      setLoading(false);
    }
  };

  const handleParametroChange = (categoria: string, chave: string, valor: string | boolean) => {
    setParametros(prev => ({
      ...prev,
      [categoria]: prev[categoria].map(param => 
        param.chave === chave 
          ? { ...param, valor: valor.toString() }
          : param
      )
    }));
  };

  const saveParametros = async () => {
    try {
      setSaving(true);
      
      // Atualizar cada parâmetro individualmente para melhor controle de erros
      const allParametros = Object.values(parametros).flat();
      
      const updatePromises = allParametros.map(parametro => 
        ParametroService.updateParametro(parametro.chave, {
          valor: parametro.valor,
          ativo: parametro.ativo
        })
      );

      const responses = await Promise.all(updatePromises);
      
      // Verificar se todas as atualizações foram bem-sucedidas
      const allSuccess = responses.every(response => response.success);
      const successCount = responses.filter(response => response.success).length;
      
      if (allSuccess) {
        addNotification('success', `✅ ${successCount} parâmetros salvos com sucesso!`);
      } else {
        const errorCount = responses.length - successCount;
        addNotification('error', `❌ ${errorCount} de ${responses.length} parâmetros não puderam ser salvos`);
      }
    } catch (error) {
      console.error('Erro ao salvar parâmetros:', error);
      addNotification('error', '❌ Erro ao salvar parâmetros');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    try {
      setSaving(true);
      const response = await ParametroService.resetDefaults();
      
      if (response.success) {
        addNotification('success', '✅ Parâmetros resetados para valores padrão!');
        await loadParametros(); // Recarregar dados após reset
      } else {
        addNotification('error', '❌ Erro ao resetar parâmetros');
      }
    } catch (error) {
      console.error('Erro ao resetar parâmetros:', error);
      addNotification('error', '❌ Erro ao resetar parâmetros');
    } finally {
      setSaving(false);
      setShowResetModal(false);
    }
  };

  const renderParametro = (parametro: Parametro) => {
    const isBoolean = parametro.tipo === 'boolean';
    const isNumber = parametro.tipo === 'number';
    const isString = parametro.tipo === 'string';

    return (
      <div key={parametro.chave} className="mb-3">
        <label className="form-label fw-bold">{parametro.descricao}</label>
        
        {isBoolean && (
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id={parametro.chave}
              checked={parametro.valor === 'true'}
              onChange={(e) => handleParametroChange(parametro.categoria, parametro.chave, e.target.checked)}
            />
            <label className="form-check-label" htmlFor={parametro.chave}>
              {parametro.valor === 'true' ? 'Ativado' : 'Desativado'}
            </label>
          </div>
        )}
        
        {isNumber && (
          <input
            type="number"
            className="form-control"
            value={parametro.valor}
            onChange={(e) => handleParametroChange(parametro.categoria, parametro.chave, e.target.value)}
            min="0"
          />
        )}
        
        {isString && (
          <input
            type="text"
            className="form-control"
            value={parametro.valor}
            onChange={(e) => handleParametroChange(parametro.categoria, parametro.chave, e.target.value)}
          />
        )}
        
        <div className="form-text">
          <small className="text-muted">Chave: {parametro.chave}</small>
        </div>
      </div>
    );
  };

  const renderCategoria = (categoria: typeof categorias[0]) => {
    const parametrosCategoria = parametros[categoria.key] || [];

    if (parametrosCategoria.length === 0) {
      return null;
    }

    return (
      <div key={categoria.key} className="col-md-6 mb-4">
        <div className="card h-100">
          <div className="card-header">
            <h5 className="card-title mb-0">
              {categoria.icon} {categoria.nome}
            </h5>
          </div>
          <div className="card-body">
            {parametrosCategoria.map(renderParametro)}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <div className="d-flex justify-content-end align-items-center">
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setShowResetModal(true)}
                disabled={saving}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Resetar Padrões
              </button>
              <button
                className="btn btn-primary"
                onClick={saveParametros}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1"></i>
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Parâmetros por categoria */}
      <div className="row">
        {Object.keys(parametros).length === 0 ? (
          <div className="col-12">
            <div className="alert alert-info text-center">
              <i className="bi bi-info-circle me-2"></i>
              Nenhum parâmetro encontrado. Clique em "Resetar Padrões" para criar os parâmetros padrão.
            </div>
          </div>
        ) : (
          categorias.map(renderCategoria)
        )}
      </div>

      {/* Modal de confirmação para resetar */}
      <DraggableModal
        show={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Resetar Parâmetros"
        size="md"
      >
        <div className="text-center">
          <div className="mb-3">
            <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
          </div>
          <h5>Confirmar Reset</h5>
          <p className="text-muted">
            Tem certeza que deseja resetar todos os parâmetros para os valores padrão? 
            Esta ação não pode ser desfeita.
          </p>
          
          <div className="d-flex justify-content-center gap-2 mt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setShowResetModal(false)}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              className="btn btn-warning"
              onClick={resetDefaults}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Resetando...
                </>
              ) : (
                'Resetar Parâmetros'
              )}
            </button>
          </div>
        </div>
      </DraggableModal>
    </div>
  );
};

export default Parametros;
