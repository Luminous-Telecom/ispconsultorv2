import React from 'react';
import {
  ConfirmarButton,
  FormField,
  GerarRequisicaoCaFilhaButton,
  SincronizarButton,
} from 'components/ui';
import type { CaItem } from './types';
import type { RpkiCaParent } from 'services/rpkiCaService';
import type { useRpkiKrillConfig } from './useRpkiKrillConfig';

type CasPaiSectionProps = {
  cardRef: React.RefObject<HTMLDivElement | null>;
} & ReturnType<typeof useRpkiKrillConfig>['casPaiSection'];

const CasPaiSection: React.FC<CasPaiSectionProps> = ({
  cardRef,
  parentCaId,
  setParentCaId,
  parentChildRequestXml,
  setParentChildRequestXml,
  parentResponseXml,
  setParentResponseXml,
  parentNome,
  setParentNome,
  caOptions,
  cas,
  parentsFromApi,
  asnBlocks,
  ipv4Blocks,
  ipv6Blocks,
  generateChildRequestMutation,
  importParentResponseMutation,
  syncParentResourcesMutation,
  handleGenerateChildRequest,
  handleImportParentResponse,
  handleSyncParentResources,
}) => (
  <div ref={cardRef} className="card mb-3">
    <div className="card-header">CAs-pai</div>
    <div className="card-body">
      <div className="row g-2 mb-2">
        <div className="col-12">
          <FormField
            name="parent_ca_id"
            type="select"
            label="CA"
            size="sm"
            value={parentCaId}
            options={caOptions}
            onChange={(value) => setParentCaId(String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <div className="form-modal-input-col">
            <GerarRequisicaoCaFilhaButton
              type="button"
              disabled={generateChildRequestMutation.isPending}
              isPending={generateChildRequestMutation.isPending}
              onClick={handleGenerateChildRequest}
            />
          </div>
        </div>
        <div className="col-12">
          <FormField
            name="parent_child_request_xml"
            type="textarea"
            label="Requisicao da CA-filha (XML)"
            size="sm"
            rows={3}
            value={parentChildRequestXml}
            onChange={(value) => setParentChildRequestXml(String(value ?? ''))}
          />
        </div>
      </div>

      <div className="row g-2 mb-2">
        <div className="col-12">
          <FormField
            name="parent_response_xml"
            type="textarea"
            label="Resposta da CA-pai (XML)"
            size="sm"
            rows={3}
            value={parentResponseXml}
            onChange={(value) => setParentResponseXml(String(value ?? ''))}
          />
        </div>
      </div>

      <div className="row g-2 mb-2">
        <div className="col-12">
          <FormField
            name="parent_nome"
            label="Nome da CA-pai"
            size="sm"
            value={parentNome}
            onChange={(value) => setParentNome(String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <div className="form-modal-input-col">
            <ConfirmarButton
              type="button"
              disabled={importParentResponseMutation.isPending}
              isPending={importParentResponseMutation.isPending}
              onClick={handleImportParentResponse}
            />
          </div>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-striped mb-0">
          <thead>
            <tr>
              <th>CA</th>
              <th>Nome da CA-pai</th>
              <th>CA-pai</th>
              <th>ASN</th>
              <th>IPv4</th>
              <th>IPv6</th>
              <th>Ultima troca</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {(parentsFromApi as RpkiCaParent[]).map((item) => (
              <tr key={item.id}>
                <td>{(cas as CaItem[]).find((ca) => Number(ca.id) === item.ca_id)?.nome ?? '-'}</td>
                <td>{item.parent_name}</td>
                <td>{item.service_uri || '-'}</td>
                <td>{asnBlocks}</td>
                <td>{ipv4Blocks}</td>
                <td>{ipv6Blocks}</td>
                <td>{item.last_sync_at ? new Date(item.last_sync_at).toLocaleString('pt-BR') : '-'}</td>
                <td>
                  <div>{item.provisioning_status}</div>
                  {item.last_error && <div className="text-danger small mt-1">{item.last_error}</div>}
                </td>
                <td>
                  <SincronizarButton
                    type="button"
                    variant="secondary"
                    label="Atualizar"
                    disabled={syncParentResourcesMutation.isPending}
                    isPending={syncParentResourcesMutation.isPending}
                    onClick={() => handleSyncParentResources(Number(item.ca_id), Number(item.id))}
                  />
                </td>
              </tr>
            ))}
            {parentsFromApi.length === 0 && (
              <tr>
                <td colSpan={9} className="text-muted">
                  Nenhuma CA-pai configurada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default CasPaiSection;
