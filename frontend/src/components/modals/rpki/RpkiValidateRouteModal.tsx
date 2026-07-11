import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, FormField, ValidarButton } from 'components/ui';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { RpkiCaService, type RpkiValidateRouteResult, type RpkiValidatingRoa } from 'services/rpkiCaService';

interface RpkiValidateRouteModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  /** Preenchimento ao abrir (ex.: a partir de um ROA selecionado). */
  initialPrefix?: string;
  initialAsn?: string;
}

const VALIDITY_BADGE: Record<string, { variant: 'success' | 'danger' | 'warning' | 'secondary'; label: string }> = {
  valid:          { variant: 'success', label: 'Válido' },
  invalid_asn:    { variant: 'danger',  label: 'ASN não autorizado' },
  invalid_length: { variant: 'warning', label: 'Comprimento excedido' },
  prefix_listing: { variant: 'secondary', label: 'Listagem' },
};

function getValidity(v: string) {
  return VALIDITY_BADGE[v] ?? { variant: 'secondary' as const, label: v };
}

function ValidatingRoasTable({ rows }: { rows: RpkiValidatingRoa[] }) {
  return (
    <table className="table table-sm table-hover mb-0 small">
      <thead className="table-light">
        <tr>
          <th>Prefixo ROA</th>
          <th>maxLength</th>
          <th>ASN</th>
          <th className="text-center">ASN ok</th>
          <th className="text-center">Compr. ok</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((roa, idx) => {
          const vConf = getValidity(roa.validity);
          return (
            <tr key={idx}>
              <td className="font-monospace">{roa.prefix}</td>
              <td>/{roa.max_length}</td>
              <td>AS{roa.asn}</td>
              <td className="text-center">
                {roa.asn_match
                  ? <i className="bi bi-check-circle-fill text-success" aria-label="Sim" />
                  : <i className="bi bi-x-circle-fill text-danger" aria-label="Não" />}
              </td>
              <td className="text-center">
                {roa.length_ok
                  ? <i className="bi bi-check-circle-fill text-success" aria-label="Sim" />
                  : <i className="bi bi-x-circle-fill text-danger" aria-label="Não" />}
              </td>
              <td>
                <span title={roa.validity_reason}>
                  <Badge variant={vConf.variant} pill>
                    {vConf.label}
                  </Badge>
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const RpkiValidateRouteModal: React.FC<RpkiValidateRouteModalProps> = ({
  show,
  onClose: _onClose,
  skipWrapper: _skipWrapper,
  initialPrefix,
  initialAsn,
}) => {
  const { showApiError } = useApiError();
  const [prefix, setPrefix] = useState('');
  const [asn, setAsn] = useState('');
  const [result, setResult] = useState<RpkiValidateRouteResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const validateSeqRef = useRef(0);
  const showApiErrorRef = useRef(showApiError);
  showApiErrorRef.current = showApiError;

  const runValidate = useCallback((prefixValue: string, asnValue: string): void => {
    const trimmedPrefix = prefixValue.trim();
    if (!trimmedPrefix) return;
    const trimmedAsn = asnValue.replace(/^AS/i, '').trim();
    const seq = ++validateSeqRef.current;
    setIsPending(true);
    setResult(null);
    RpkiCaService.validateRoute({
      prefix: trimmedPrefix,
      asn: trimmedAsn || undefined,
    })
      .then((data) => {
        if (validateSeqRef.current === seq) setResult(data);
      })
      .catch((err) => {
        if (validateSeqRef.current === seq) {
          showApiErrorRef.current(err, CONTEXT_ERROR_MESSAGES.RPKI_ROUTE_VALIDATE_ERROR);
        }
      })
      .finally(() => {
        if (validateSeqRef.current === seq) setIsPending(false);
      });
  }, []);

  useEffect(() => {
    if (!show) return;
    const nextPrefix = typeof initialPrefix === 'string' ? initialPrefix.trim() : '';
    const nextAsnRaw = typeof initialAsn === 'string' ? initialAsn.trim() : '';
    const nextAsn = nextAsnRaw.replace(/^AS/i, '').trim();
    setPrefix(nextPrefix);
    setAsn(nextAsn);
    setResult(null);

    if (!nextPrefix) return;
    runValidate(nextPrefix, nextAsnRaw);
  }, [show, initialPrefix, initialAsn, runValidate]);

  const handleValidate = (): void => {
    runValidate(prefix, asn);
  };

  return (
    <form className="form-modal-simple p-3" onSubmit={(event) => event.preventDefault()}>
      <div className="row g-2 mb-3">
        <div className="col-12">
          <FormField
            id="rpki_validate_prefix"
            name="rpki_validate_prefix"
            type="text"
            size="sm"
            label="Prefixo (CIDR)"
            placeholder="203.0.113.0/24"
            value={prefix}
            onChange={(value) => setPrefix(String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <FormField
            id="rpki_validate_asn"
            name="rpki_validate_asn"
            type="text"
            size="sm"
            label="ASN de origem (opcional)"
            placeholder="64512"
            value={asn}
            onChange={(value) => setAsn(String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <div className="form-modal-input-col">
            <ValidarButton
              id="rpki_validate_submit"
              type="button"
              disabled={isPending || !prefix.trim()}
              onClick={handleValidate}
              isPending={isPending}
            />
          </div>
        </div>
      </div>

      {!result && !isPending && (
        <div className="alert alert-info py-2 small mb-0">
          Prefixo em CIDR. Com ASN, valida o anúncio; sem ASN, lista ROAs do Routinator público (NLnet Labs).
        </div>
      )}

      {result && (
        <div>
          <div className="form-section-heading-row">
            <span className="form-section-heading-pill">
              ROAs
              {result.validatingRoas.length > 0
                ? ` (${result.validatingRoas.length})`
                : ''}
            </span>
            <div className="form-section-heading-line" aria-hidden />
          </div>
            {result.validatingRoas.length === 0 ? (
              <div className="text-muted small">
                Nenhum ROA para este prefixo. Confira o CIDR; com ASN o resultado reflete a rota anunciada.
              </div>
            ) : (
              <ValidatingRoasTable rows={result.validatingRoas} />
            )}
        </div>
      )}
    </form>
  );
};

export default RpkiValidateRouteModal;
