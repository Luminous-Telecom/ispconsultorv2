import React, { useMemo } from 'react';
import type { HotsitePlanoPublico } from 'services/publicHotsitePlanosService';
import {
  buildHotsitePlanosCompareLimites,
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
  const limites = useMemo(() => buildHotsitePlanosCompareLimites(planos), [planos]);

  if (planos.length === 0) return null;

  return (
    <div className="home-planos-compare-wrap">
      <div className="home-planos-compare-scroll" role="region" aria-label="Comparação de planos">
        <table className="home-planos-compare-table">
          <thead>
            <tr>
              <th scope="col" className="home-planos-compare-feature-col">
                Limite
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
            {limites.map((row) => {
              const bestCols = getBestLimiteColumnIndexes(row);

              return (
                <tr key={`lim-${row.chave}`}>
                  <th scope="row" className="home-planos-compare-feature-col">
                    {row.label}
                  </th>
                  {row.values.map((value, colIndex) => (
                    <td
                      key={`${row.chave}-${colIndex}`}
                      className={`home-planos-compare-cell home-planos-compare-limit${
                        bestCols.has(colIndex) ? ' is-best' : ''
                      }`}
                    >
                      {value ?? '—'}
                    </td>
                  ))}
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
