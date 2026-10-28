import React, { useState } from 'react';
import FormField from 'components/ui/FormField';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useEntityRecordEdit } from 'hooks/useEntityRecordEdit';
import { LabelWithHelp } from 'components/ui/LabelWithHelp';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import ContratoTab from '../abas/ContratoTab';
import AdesaoTab from '../abas/AdesaoTab';
import PermanenciaTab from '../abas/PermanenciaTab';
import ReciboTab from '../abas/ReciboTab';
import CartaTab from '../abas/CartaTab';
import ConteudoTab from '../abas/ConteudoTab';
import { MODELOS_ORDEM_SERVICO_PADRAO } from 'constants/modelosOrdemServicoPadrao';
import { DocumentoForm, DocumentoModalProps, DocumentoUnion } from '../types';
import { DocumentoActiveTab } from './constants';

interface ClienteOption {
  id: number;
  razao_social: string;
}

interface DocumentoModalBodyProps {
  tipo: DocumentoModalProps['tipo'];
  formData: DocumentoForm;
  setFormData: React.Dispatch<React.SetStateAction<DocumentoForm>>;
  isEditing: boolean;
  currentDocumento: DocumentoUnion | null;
  activeTab: DocumentoActiveTab;
  tipoLabel: string;
  contentPlaceholder: string;
  clientesDisponiveis: ClienteOption[];
  clienteTesteId: number;
  setClienteTesteId: (id: number) => void;
  onShowClienteModal: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function DocumentoModalBody({
  tipo,
  formData,
  setFormData,
  isEditing,
  currentDocumento,
  activeTab,
  tipoLabel,
  contentPlaceholder,
  clientesDisponiveis,
  clienteTesteId,
  setClienteTesteId,
  onShowClienteModal,
  onSubmit,
}: DocumentoModalBodyProps) {
  const { t } = useI18n();
  const clienteEdit = useEntityRecordEdit('cliente');
  const [modeloPadraoPreset, setModeloPadraoPreset] = useState('');
  const editorKeyPrefix = `${isEditing ? currentDocumento?.id : 'create'}`;
  const ultimaAtualizacao = isEditing && currentDocumento?.updated_at
    ? formatDateTime(currentDocumento.updated_at)
    : '-';

  return (
    <div className="documento-modal-content">
      <form onSubmit={onSubmit} className="form-modal-simple">
        <div className="tab-content documento-tab-content documento-tab-content-padded">
        <div className="row g-2 mb-0">
          <div className="col-12">
            <FormField
              name="nome"
              type="text"
              label={t('document.name')}
              value={formData.nome}
              onChange={(value) => setFormData((prev) => ({ ...prev, nome: String(value ?? '') }))}
              placeholder={isEditing ? undefined : `Ex: ${tipoLabel} Padrão`}
              required
              size="sm"
            />
          </div>
          <div className="col-12">
            <FormField
              name="descricao"
              type="text"
              label={t('document.description')}
              value={formData.descricao}
              onChange={(value) => setFormData((prev) => ({ ...prev, descricao: String(value ?? '') }))}
              placeholder={t('placeholder.description')}
              size="sm"
            />
          </div>
        </div>

        {tipo === 'ordem_servico' && (
          <div className="row g-2 mb-0">
            <div className="col-12">
              <FormField
                name="modelo_padrao"
                type="select"
                label="Modelo padrão"
                value={modeloPadraoPreset}
                onChange={(value) => {
                  const presetId = String(value ?? '');
                  setModeloPadraoPreset(presetId);
                  const preset = MODELOS_ORDEM_SERVICO_PADRAO.find((item) => item.id === presetId);
                  if (!preset) return;
                  setFormData((prev) => ({
                    ...prev,
                    conteudo: preset.conteudo,
                    nome: prev.nome.trim() ? prev.nome : preset.nome,
                  }));
                }}
                options={MODELOS_ORDEM_SERVICO_PADRAO.map((item) => ({
                  value: item.id,
                  label: item.nome,
                }))}
                helpText="Carrega um layout pré-definido no editor. Você pode ajustar o conteúdo antes de salvar."
                size="sm"
              />
            </div>
          </div>
        )}

        <div className="documento-editor-layout">
          <div className="form-field form-field--rich-text">
            <LabelWithHelp id="conteudo-label" as="span" className="form-label small mb-0" required>
              {tipo === 'contrato' ? t('document.contractContent') : t('document.content')}
            </LabelWithHelp>
            <div className="form-field-control">
              {tipo === 'contrato' ? (
                <>
                  {activeTab === 'contrato' && (
                    <ContratoTab
                      value={formData.conteudo_contrato}
                      onChange={(value) => setFormData((prev) => ({ ...prev, conteudo_contrato: value }))}
                      editorKey={`${editorKeyPrefix}-contrato`}
                    />
                  )}
                  {activeTab === 'adesao' && (
                    <AdesaoTab
                      value={formData.conteudo_adesao}
                      onChange={(value) => setFormData((prev) => ({ ...prev, conteudo_adesao: value }))}
                      editorKey={`${editorKeyPrefix}-adesao`}
                    />
                  )}
                  {activeTab === 'permanencia' && (
                    <PermanenciaTab
                      value={formData.conteudo_permanencia}
                      onChange={(value) => setFormData((prev) => ({ ...prev, conteudo_permanencia: value }))}
                      editorKey={`${editorKeyPrefix}-permanencia`}
                    />
                  )}
                  {activeTab === 'recibo' && (
                    <ReciboTab
                      value={formData.conteudo_recibo}
                      onChange={(value) => setFormData((prev) => ({ ...prev, conteudo_recibo: value }))}
                      editorKey={`${editorKeyPrefix}-recibo`}
                    />
                  )}
                  {activeTab === 'carta' && (
                    <CartaTab
                      value={formData.conteudo_carta}
                      onChange={(value) => setFormData((prev) => ({ ...prev, conteudo_carta: value }))}
                      editorKey={`${editorKeyPrefix}-carta`}
                    />
                  )}
                </>
              ) : (
                <ConteudoTab
                  value={formData.conteudo}
                  onChange={(value) => setFormData((prev) => ({ ...prev, conteudo: value }))}
                  editorKey={`${editorKeyPrefix}-conteudo`}
                  placeholder={contentPlaceholder}
                />
              )}
            </div>
          </div>
        </div>

        <div className="row g-2 mb-0">
          <div className="col-12">
            <FormField
              name="ultima_atualizacao"
              type="text"
              label={t('form.lastUpdated')}
              value={ultimaAtualizacao}
              readOnly
              disabled
              size="sm"
            />
          </div>
        </div>

        <div className="row g-2 mb-0">
          <div className="col-12">
            <EntitySelectField
              value={clienteTesteId || 0}
              onChange={(value) => setClienteTesteId(value)}
              onShowModal={onShowClienteModal}
              onEdit={() => clienteEdit.open(clienteTesteId || 0)}
              entities={clientesDisponiveis.map((c) => ({
                id: c.id,
                nome: c.razao_social,
              }))}
              label={t('document.testClient')}
              idFieldTitle={t('document.idPlaceholder')}
              helpText={t('document.testClientHelp')}
            />
          </div>
        </div>
        </div>
      </form>
      {clienteEdit.modal}
    </div>
  );
}

export default DocumentoModalBody;
