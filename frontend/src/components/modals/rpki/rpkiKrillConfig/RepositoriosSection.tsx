import React from 'react';
import { ConfirmarButton, FormField, GerarButton } from 'components/ui';
import type { RpkiCaRepository } from 'services/rpkiCaService';
import type { useRpkiKrillConfig } from './useRpkiKrillConfig';

type RepositoriosSectionProps = {
  cardRef: React.RefObject<HTMLDivElement | null>;
} & ReturnType<typeof useRpkiKrillConfig>['repositoriosSection'];

const RepositoriosSection: React.FC<RepositoriosSectionProps> = ({
  cardRef,
  repositoryCaId,
  repositoryReferralParentId,
  setRepositoryReferralParentId,
  repositoryParentResponseSnippet,
  setRepositoryParentResponseSnippet,
  repositoryRequestXml,
  setRepositoryRequestXml,
  repositoryResponseXml,
  setRepositoryResponseXml,
  caOptions,
  repositoryReferralParentOptions,
  selectedRepoCaId,
  repositoriesFromApi,
  generatePublisherRequestMutation,
  importRepositoryResponseMutation,
  handleRepositoryCaChange,
  handleGeneratePublisherRequest,
  handleImportRepositoryResponse,
}) => (
  <div ref={cardRef} className="card mb-3">
    <div className="card-header">Repositório (RFC 8183)</div>
    <div className="card-body">
      <p className="text-muted form-hint small mb-2">
        Gere o <code>publisher_request</code> (XML RFC 8183) e envie no fluxo do repositório (ex.: Registro.br). O{' '}
        <code>publisher_bpki_ta</code> deve ser o mesmo certificado BPKI da sua <strong>child_request</strong> já aceita
        pela CA-pai. O <code>publisher_handle</code> é normalizado para o padrão do RFC (apenas letras, dígitos,{' '}
        <code>_</code>, <code>-</code> e <code>/</code>). Na prática do Registro.br (publicação no repositório deles), o{' '}
        <code>publisher_request</code> precisa trazer o <code>&lt;referral&gt;</code> que vem no{' '}
        <code>parent_response</code> (RFC 8183). Sem isso o portal costuma responder só com &quot;erro no processamento&quot;.
        Após atualizar o sistema, <strong>importe de novo</strong> o XML da CA-pai para gravar o referral.
      </p>
      <div className="row g-2 mb-2">
        <div className="col-md-3">
          <FormField
            name="repository_ca_id"
            type="select"
            label="CA"
            size="sm"
            value={repositoryCaId}
            options={caOptions}
            onChange={(value) => handleRepositoryCaChange(String(value ?? ''))}
          />
        </div>
        <div className="col-md-5">
          <FormField
            name="repository_referral_parent_id"
            type="select"
            label="CA-pai (referral de publicação, se houver)"
            size="sm"
            value={repositoryReferralParentId}
            options={repositoryReferralParentOptions}
            onChange={(value) => setRepositoryReferralParentId(String(value ?? ''))}
          />
        </div>
        <div className="col-md-12">
          <FormField
            name="repository_parent_response_snippet"
            type="textarea"
            label="Opcional: XML parent_response (se o referral não foi gravado na importação)"
            size="sm"
            rows={3}
            value={repositoryParentResponseSnippet}
            onChange={(value) => setRepositoryParentResponseSnippet(String(value ?? ''))}
          />
        </div>
        <div className="col-12 d-flex align-items-end">
          <GerarButton
            type="button"
            label="Gerar Requisicao de Repositorio"
            disabled={!repositoryCaId.trim() || generatePublisherRequestMutation.isPending}
            isPending={generatePublisherRequestMutation.isPending}
            onClick={handleGeneratePublisherRequest}
          />
        </div>
        <div className="col-md-12">
          <FormField
            name="repository_request_xml"
            type="textarea"
            label="publisher_request (XML)"
            size="sm"
            rows={5}
            value={repositoryRequestXml}
            onChange={(value) => setRepositoryRequestXml(String(value ?? ''))}
          />
        </div>
      </div>

      <div className="row g-2 mb-2">
        <div className="col-md-10">
          <FormField
            name="repository_response_xml"
            type="textarea"
            label="repository_response (XML)"
            size="sm"
            rows={5}
            value={repositoryResponseXml}
            onChange={(value) => setRepositoryResponseXml(String(value ?? ''))}
          />
        </div>
        <div className="col-md-2 d-flex align-items-end">
          <ConfirmarButton
            type="button"
            label="Vincular Repositorio"
            disabled={
              !repositoryCaId.trim() ||
              !repositoryResponseXml.trim() ||
              importRepositoryResponseMutation.isPending
            }
            isPending={importRepositoryResponseMutation.isPending}
            onClick={handleImportRepositoryResponse}
          />
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-striped mb-0">
          <thead>
            <tr>
              <th>publisher_handle</th>
              <th>Publicação (service_uri)</th>
              <th>rsync (sia_base)</th>
              <th>RRDP</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {repositoriesFromApi.map((item: RpkiCaRepository) => (
              <tr key={item.id}>
                <td>{item.repository_name}</td>
                <td className="text-break small">{item.publication_service_uri ?? '—'}</td>
                <td className="text-break small">{item.rsync_base_uri ?? '—'}</td>
                <td className="text-break small">{item.rrdp_notify_uri ?? '—'}</td>
                <td>{item.publication_status}</td>
              </tr>
            ))}
            {selectedRepoCaId > 0 && repositoriesFromApi.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  Nenhum repositório vinculado a esta CA
                </td>
              </tr>
            )}
            {selectedRepoCaId <= 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  Selecione uma CA para listar repositórios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default RepositoriosSection;
