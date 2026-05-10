import React, { useEffect, useState } from 'react';
import { Button, FormField, Badge } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { RpkiCaService, type RpkiValidateRouteResult, type RpkiValidatingRoa, type RpkiBgpStatus } from 'services/rpkiCaService';

interface RpkiValidateRouteModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const STATE_BADGE: Record<string, { variant: 'success' | 'danger' | 'secondary'; label: string }> = {
  valid:       { variant: 'success',   label: 'Válido' },
  invalid:     { variant: 'danger',    label: 'Inválido' },
  'not-found': { variant: 'secondary', label: 'Sem cobertura' },
};

const VALIDITY_BADGE: Record<string, { variant: 'success' | 'danger' | 'warning'; label: string; tip: string }> = {
  valid:          { variant: 'success', label: 'Válido',                 tip: 'ASN autorizado e comprimento dentro do maxLength.' },
  invalid_asn:    { variant: 'danger',  label: 'ASN não autorizado',     tip: 'O ASN de origem do anúncio não é o ASN autorizado por este ROA.' },
  invalid_length: { variant: 'warning', label: 'Comprimento excedido',   tip: 'O comprimento do prefixo anunciado excede o maxLength deste ROA.' },
};

function getValidity(v: string) {
  return VALIDITY_BADGE[v] ?? { variant: 'secondary' as const, label: v, tip: v };
}

function InfoTip({ tip }: { tip: string }) {
  return (
    <i
      className="bi bi-info-circle text-muted ms-1"
      title={tip}
      style={{ cursor: 'help', fontSize: '0.85rem' }}
      aria-hidden
    />
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function BgpPanel({ bgp }: { bgp: RpkiBgpStatus }) {
  return (
    <div className="card mb-2">
      <div className="card-header py-1 px-3 d-flex align-items-center gap-1 small fw-semibold">
        Status BGP
        <InfoTip tip="Visibilidade e anúncios BGP coletados via RIPE Routing Information Service (RIS)." />
      </div>
      <div className="card-body py-2 px-3">
        <div className="row g-3 small">

          <div className="col-auto">
            <div className="text-muted">Anunciado</div>
            <div className="mt-1">
              <Badge variant={bgp.announced ? 'success' : 'secondary'} pill>
                {bgp.announced ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>

          {bgp.visibility_pct !== null && (
            <div className="col-auto">
              <div className="text-muted d-flex align-items-center gap-1">
                Visibilidade
                <InfoTip tip="Percentual de peers RIS full-feed que enxergam este prefixo." />
              </div>
              <div className="mt-1 fw-semibold">
                {bgp.visibility_pct}%
                {bgp.visibility_peers != null && bgp.total_peers != null && (
                  <span className="text-muted fw-normal ms-1">
                    ({bgp.visibility_peers}/{bgp.total_peers} peers)
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="col-auto">
            <div className="text-muted">Primeira vez visto</div>
            <div className="mt-1">{formatDate(bgp.first_seen)}</div>
          </div>

          <div className="col-auto">
            <div className="text-muted">Última vez visto</div>
            <div className="mt-1">{formatDate(bgp.last_seen)}</div>
          </div>

          {bgp.covering_prefix && (
            <div className="col-auto">
              <div className="text-muted d-flex align-items-center gap-1">
                Prefixo agregado
                <InfoTip tip="Prefixo menos específico (covering prefix) que engloba este bloco." />
              </div>
              <div className="mt-1 font-monospace">{bgp.covering_prefix}</div>
            </div>
          )}

          {bgp.origins.length > 0 && (
            <div className="col-12">
              <div className="text-muted mb-1">Originado por</div>
              <div className="d-flex flex-wrap gap-1">
                {bgp.origins.map((o) => (
                  <span key={o.asn} className="badge bg-light text-dark border font-monospace">
                    AS{o.asn}{o.holder ? ` — ${o.holder}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const RpkiValidateRouteModal: React.FC<RpkiValidateRouteModalProps> = ({ show, onClose: _onClose, skipWrapper: _skipWrapper }) => {
  const { error: showError } = useNotificationContext();
  const [prefix, setPrefix] = useState('');
  const [asn, setAsn] = useState('');
  const [result, setResult] = useState<RpkiValidateRouteResult | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!show) return;
    setPrefix('');
    setAsn('');
    setResult(null);
  }, [show]);

  const handleValidate = (): void => {
    setIsPending(true);
    setResult(null);
    RpkiCaService.validateRoute({ prefix: prefix.trim(), asn: asn.trim() })
      .then((data) => setResult(data))
      .catch((err) => showError(err instanceof Error ? err.message : 'Erro ao validar rota'))
      .finally(() => setIsPending(false));
  };

  const stateBadge = result ? (STATE_BADGE[result.state] ?? STATE_BADGE['not-found']) : null;

  return (
    <div className="p-3">
      {/* Formulário */}
      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-5">
          <FormField
            name="rpki_validate_prefix"
            label="Prefixo (CIDR)"
            size="sm"
            value={prefix}
            placeholder="203.0.113.0/24"
            onChange={(v) => setPrefix(String(v ?? ''))}
          />
        </div>
        <div className="col-md-4">
          <FormField
            name="rpki_validate_asn"
            label="ASN de origem"
            size="sm"
            value={asn}
            placeholder="64512"
            onChange={(v) => setAsn(String(v ?? ''))}
          />
        </div>
        <div className="col-md-3 d-flex align-items-end pb-1">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isPending || !prefix.trim() || !asn.trim()}
            onClick={handleValidate}
          >
            Validar
          </Button>
        </div>
      </div>

      {/* Estado inicial */}
      {!result && (
        <div className="alert alert-info d-flex align-items-center gap-2 py-2 small mb-0">
          <i className="bi bi-info-circle flex-shrink-0" aria-hidden />
          <span>
            Consulta a base global de ROAs via <strong>RIPE Stat</strong>.
            Informe o prefixo em CIDR e o ASN de origem para validar o anúncio BGP.
          </span>
        </div>
      )}

      {/* Resultado */}
      {result && stateBadge && (
        <>
          {/* Resultado RPKI */}
          <div className="card mb-2">
            <div className="card-body py-2 px-3">
              <div className="d-flex align-items-center gap-2">
                <Badge variant={stateBadge.variant} pill>{stateBadge.label}</Badge>
                <span className="small text-muted">{result.message}</span>
                <span
                  className="text-muted ms-auto small d-flex align-items-center gap-1"
                  title="Dados fornecidos pelo RIPE Stat — mesma base usada pelo Routinator e outros validadores RPKI."
                  style={{ cursor: 'help' }}
                >
                  <i className="bi bi-info-circle" aria-hidden /> RIPE Stat
                </span>
              </div>
              {result.state === 'invalid' && (
                <div className="small text-muted mt-1">{result.reason}</div>
              )}
            </div>
          </div>

          {/* Painel BGP */}
          {result.bgp && <BgpPanel bgp={result.bgp} />}

          {/* Tabela de ROAs */}
          <div className="card">
            <div className="card-header py-1 px-3 d-flex align-items-center gap-1 small fw-semibold">
              ROAs analisados
              <InfoTip tip="Lista de ROAs publicados globalmente que cobrem este prefixo. Cada um é verificado contra o ASN e comprimento do anúncio." />
              {result.validatingRoas.length > 0 && (
                <span className="badge bg-secondary ms-1 fw-normal">{result.validatingRoas.length}</span>
              )}
            </div>
            <div className="card-body p-0">
              {result.validatingRoas.length === 0 ? (
                <div className="text-muted small p-3">
                  Nenhum ROA publicado globalmente cobre este prefixo.
                </div>
              ) : (
                <table className="table table-sm table-hover mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Prefixo ROA</th>
                      <th>
                        maxLength
                        <InfoTip tip="Comprimento máximo permitido para sub-prefixos deste ROA." />
                      </th>
                      <th>ASN autorizado</th>
                      <th className="text-center">
                        ASN
                        <InfoTip tip="Se o ASN do anúncio coincide com o ASN autorizado pelo ROA." />
                      </th>
                      <th className="text-center">
                        Comprimento
                        <InfoTip tip="Se o comprimento do prefixo anunciado está dentro do maxLength do ROA." />
                      </th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.validatingRoas.map((roa: RpkiValidatingRoa, idx: number) => {
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
                            <Badge variant={vConf.variant} pill>
                              {vConf.label}
                            </Badge>
                            <InfoTip tip={roa.validity_reason} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RpkiValidateRouteModal;
