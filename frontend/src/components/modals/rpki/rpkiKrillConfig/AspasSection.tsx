import React from 'react';
import { FormField, SalvarButton } from 'components/ui';
import type { useRpkiKrillConfig } from './useRpkiKrillConfig';

type AspasSectionProps = {
  cardRef: React.RefObject<HTMLDivElement | null>;
} & ReturnType<typeof useRpkiKrillConfig>['aspasSection'];

const AspasSection: React.FC<AspasSectionProps> = ({
  cardRef,
  aspaCaId,
  setAspaCaId,
  customerAsn,
  setCustomerAsn,
  providers,
  setProviders,
  caOptions,
  aspas,
  handleSaveAspa,
}) => (
  <div ref={cardRef} className="card">
    <div className="card-header">ASPAs</div>
    <div className="card-body">
      <div className="row g-2 mb-2">
        <div className="col-12">
          <FormField
            name="aspa_ca_id"
            type="select"
            label="CA"
            size="sm"
            value={aspaCaId}
            options={caOptions}
            onChange={(value) => setAspaCaId(String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <FormField
            name="customer_asn"
            label="Customer ASN"
            size="sm"
            value={customerAsn}
            onChange={(value) => setCustomerAsn(String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <FormField
            name="providers"
            label="Providers ASN (csv)"
            size="sm"
            value={providers}
            onChange={(value) => setProviders(String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <div className="form-modal-input-col">
            <SalvarButton type="button" onClick={handleSaveAspa} />
          </div>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-striped mb-0">
          <thead>
            <tr>
              <th>CA</th>
              <th>Customer ASN</th>
              <th>Providers</th>
            </tr>
          </thead>
          <tbody>
            {aspas.map((item) => (
              <tr key={item.id}>
                <td>{item.caNome}</td>
                <td>{item.customerAsn}</td>
                <td>{item.providers}</td>
              </tr>
            ))}
            {aspas.length === 0 && (
              <tr>
                <td colSpan={3} className="text-muted">
                  Nenhum ASPA configurado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default AspasSection;
