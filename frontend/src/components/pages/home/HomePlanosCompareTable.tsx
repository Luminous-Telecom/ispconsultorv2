import React, { useMemo } from 'react';
import type { HotsitePlanoPublico } from 'services/publicHotsitePlanosService';
import {
  buildHotsitePlanosCompareLimites,
  buildHotsitePlanosCompareModulos,
  getBestLimiteColumnIndexes,
  getHotsitePlanoDisplayPrice,
  type HotsiteBillingPeriod,
} from 'utils/hotsitePlanosCompare';

interface Props {
  planos: HotsitePlanoPublico[];
  billingPeriod: HotsiteBillingPeriod;
  featuredIndex?: number;
  buildWhatsappUrl: (planoNome: string) => string;
}

const HomePlanosCompareTable: React.FC<Props> = ({
  planos,
  billingPeriod,
  featuredIndex = -1,
  buildWhatsappUrl,
}) => {
  const modulos = useMemo(() => buildHotsitePlanosCompareModulos(planos), [planos]);
  const limites = useMemo(() => buildHotsitePlanosCompareLimites(planos), [planos]);

  if (planos.length === 0) return null;

  return (
    <div className="home-planos-compare-wrap">
      <div className="home-planos-compare-scroll" role="region" aria-label="Comparação de planos">
        <table className="home-planos-compare-table">
          <thead>
            <tr>
              <th scope="col" className="home-planos-compare-feature-col">
                Recurso
              </th>
              {planos.map((plano, index) => {
                const price = getHotsitePlanoDisplayPrice(plano, billingPeriod);
                const isFeatured = index === featuredIndex;
                return (
                  <th
                    key={plano.id}
                    scope="col"
                    className={`home-planos-compare-plan-col${isFeatured ? ' is-featured' : ''}`}
                  >
                    {isFeatured && <span className="home-planos-compare-featured-badge">Popular</span>}
                    <span className="home-planos-compare-plan-name">{plano.nome}</span>
                    <span className="home-planos-compare-plan-price">{price.main}</span>
                    {price.detail && (
                      <span className="home-planos-compare-plan-price-detail">{price.detail}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {modulos.length > 0 && (
              <tr className="home-planos-compare-section-row">
                <th scope="row" colSpan={planos.length + 1}>
                  Módulos
                </th>
              </tr>
            )}
            {modulos.map((row) => (
              <tr key={`mod-${row.id}`}>
                <th scope="row" className="home-planos-compare-feature-col">
                  {row.label}
                </th>
                {row.included.map((included, colIndex) => (
                  <td
                    key={`${row.id}-${colIndex}`}
                    className={`home-planos-compare-cell home-planos-compare-modulo${
                      included ? ' is-yes' : ' is-no'
                    }`}
                  >
                    <span
                      className={`bi ${included ? 'bi-check-lg' : 'bi-x-lg'} home-planos-compare-icon`}
                      aria-hidden
                    />
                    <span className="visually-hidden">{included ? 'Incluído' : 'Não incluído'}</span>
                  </td>
                ))}
              </tr>
            ))}
            {limites.length > 0 && (
              <tr className="home-planos-compare-section-row">
                <th scope="row" colSpan={planos.length + 1}>
                  Limites
                </th>
              </tr>
            )}
            {limites.map((row) => {
              const bestCols = getBestLimiteColumnIndexes(row);

              return (
                <tr key={`lim-${row.chave}`}>
                  <th scope="row" className="home-planos-compare-feature-col">
                    {row.label}
                  </th>
                  {row.values.map((value, colIndex) => {
                    const available = row.moduleAvailable[colIndex];
                    const isBest = available && bestCols.has(colIndex);

                    return (
                      <td
                        key={`${row.chave}-${colIndex}`}
                        className={`home-planos-compare-cell home-planos-compare-limit${
                          isBest ? ' is-best' : ''
                        }${!available ? ' is-no' : ''}`}
                      >
                        {!available ? (
                          <>
                            <span className="bi bi-x-lg home-planos-compare-icon" aria-hidden />
                            <span className="visually-hidden">Não incluído</span>
                          </>
                        ) : (
                          value ?? '—'
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="home-planos-compare-cta-row">
              <td className="home-planos-compare-feature-col" />
              {planos.map((plano, index) => (
                <td
                  key={`cta-${plano.id}`}
                  className={`home-planos-compare-cell${index === featuredIndex ? ' is-featured' : ''}`}
                >
                  <a
                    href={buildWhatsappUrl(plano.nome)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="home-planos-compare-cta"
                  >
                    <span className="home-planos-compare-cta-name">{plano.nome}</span>
                    <span className="home-planos-compare-cta-label">Quero este plano</span>
                  </a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HomePlanosCompareTable;
