import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppButton, Loading } from 'components/ui';
import {
  publicHotsitePlanosService,
  type HotsitePlanoPublico,
} from 'services/publicHotsitePlanosService';
import { CONTATO } from './homeConstants';

type BillingPeriod = 'mensal' | 'anual';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const buildWhatsappPlanoUrl = (planoNome: string) => {
  const text = encodeURIComponent(`Olá, tenho interesse no plano ${planoNome} do ISP Consultor.`);
  return `https://wa.me/5584998667245?text=${text}`;
};

interface PlanoPriceBlockProps {
  plano: HotsitePlanoPublico;
  billingPeriod: BillingPeriod;
}

const PlanoPriceBlock: React.FC<PlanoPriceBlockProps> = ({ plano, billingPeriod }) => {
  const hasAnual = plano.valor_anual != null && plano.valor_anual > 0;
  const useAnual = billingPeriod === 'anual' && hasAnual;
  const finalPrice = useAnual ? plano.valor_anual! : plano.valor_mensal;
  const originalPrice = useAnual ? plano.valor_anual_original : null;
  const periodLabel = useAnual ? '/ ano' : '/ mês';
  const showDiscountBadge = useAnual && plano.desconto_percentual > 0;
  const formatted = formatCurrency(finalPrice);
  const [inteiro, centavos] = formatted.replace(/\s/g, ' ').split(',');

  return (
    <div className="home-plano-price-block">
      {showDiscountBadge && (
        <span className="home-plano-discount-badge">
          {Math.round(plano.desconto_percentual)}% off no anual
        </span>
      )}
      {originalPrice != null && originalPrice > finalPrice && (
        <span className="home-plano-price-original">{formatCurrency(originalPrice)}</span>
      )}
      <div className="home-plano-price-main">
        <span className="home-plano-price-amount">{inteiro}</span>
        {centavos && <span className="home-plano-price-cents">,{centavos}</span>}
        <span className="home-plano-price-period">{periodLabel}</span>
      </div>
      {useAnual && plano.desconto_percentual > 0 && (
        <span className="home-plano-savings">
          Economize {Math.round(plano.desconto_percentual)}% em relação a 12× o mensal
        </span>
      )}
      {!useAnual && hasAnual && plano.desconto_percentual > 0 && (
        <span className="home-plano-price-alt">
          ou {formatCurrency(plano.valor_anual!)}/ano com {Math.round(plano.desconto_percentual)}% off
        </span>
      )}
      {!useAnual && hasAnual && plano.desconto_percentual <= 0 && (
        <span className="home-plano-price-alt">
          ou {formatCurrency(plano.valor_anual!)}/ano
        </span>
      )}
    </div>
  );
};

interface PlanoCardProps {
  plano: HotsitePlanoPublico;
  billingPeriod: BillingPeriod;
  featured?: boolean;
}

const PlanoCard: React.FC<PlanoCardProps> = ({ plano, billingPeriod, featured = false }) => (
  <article className={`home-plano-card${featured ? ' home-plano-card-featured' : ''}`}>
    {featured && <span className="home-plano-featured-badge">Mais popular</span>}

    <header className="home-plano-card-header">
      <h3 className="home-plano-card-title">{plano.nome}</h3>
      {plano.descricao?.trim() && <p className="home-plano-card-desc">{plano.descricao}</p>}
    </header>

    <PlanoPriceBlock plano={plano} billingPeriod={billingPeriod} />

    {plano.modulos.length > 0 && (
      <div className="home-plano-card-section">
        <h4 className="home-plano-card-section-title">Módulos incluídos</h4>
        <ul className="home-plano-card-list">
          {plano.modulos.map((modulo) => (
            <li key={modulo.id}>
              <span className="home-plano-check" aria-hidden="true">
                <span className="bi bi-check-lg" />
              </span>
              {modulo.label}
            </li>
          ))}
        </ul>
      </div>
    )}

    {plano.limites.length > 0 && (
      <div className="home-plano-card-section">
        <h4 className="home-plano-card-section-title">Limites</h4>
        <ul className="home-plano-limits-grid">
          {plano.limites.map((limite) => (
            <li key={limite.chave} className="home-plano-limit-chip">
              <span className="home-plano-limit-label">{limite.label}</span>
              <strong className="home-plano-limit-value">{limite.valor}</strong>
            </li>
          ))}
        </ul>
      </div>
    )}

    <a
      href={buildWhatsappPlanoUrl(plano.nome)}
      target="_blank"
      rel="noopener noreferrer"
      className="home-plano-card-cta"
    >
      Quero este plano
    </a>
  </article>
);

const HomePlanosSection: React.FC = () => {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('mensal');

  const { data: planos = [], isLoading, isError } = useQuery({
    queryKey: ['public-hotsite-planos'],
    queryFn: () => publicHotsitePlanosService.list(),
    staleTime: 5 * 60 * 1000,
  });

  const hasAnnualPricing = useMemo(
    () => planos.some((p) => p.valor_anual != null && p.valor_anual > 0),
    [planos]
  );

  const featuredIndex = planos.length >= 3 ? 1 : -1;

  return (
    <section id="planos" className="home-section home-planos">
      <div className="home-section-inner">
        <div className="home-section-header">
          <span className="home-planos-eyebrow">Preços transparentes</span>
          <h2 className="home-section-title">Planos</h2>
          <p className="home-section-desc">
            Escolha o plano ideal para a sua consultoria. Valores finais de cobrança, com condições promocionais quando aplicável.
          </p>
        </div>

        {!isLoading && planos.length > 0 && hasAnnualPricing && (
          <div className="home-planos-billing-toggle" role="group" aria-label="Período de cobrança">
            <AppButton
              type="button"
              label="Mensal"
              variant="unstyled"
              className={`home-planos-billing-option${billingPeriod === 'mensal' ? ' is-active' : ''}`}
              onClick={() => setBillingPeriod('mensal')}
            />
            <AppButton
              type="button"
              label="Anual"
              variant="unstyled"
              className={`home-planos-billing-option${billingPeriod === 'anual' ? ' is-active' : ''}`}
              onClick={() => setBillingPeriod('anual')}
            />
          </div>
        )}

        {isLoading && (
          <div className="home-planos-loading">
            <Loading />
          </div>
        )}

        {!isLoading && (isError || planos.length === 0) && (
          <p className="home-section-desc home-planos-empty">
            <span className="bi bi-chat-dots" />
            Planos sob consulta. Entre em contato para uma proposta personalizada.
          </p>
        )}

        {!isLoading && planos.length > 0 && (
          <div className="home-planos-grid">
            {planos.map((plano, index) => (
              <PlanoCard
                key={plano.id}
                plano={plano}
                billingPeriod={billingPeriod}
                featured={index === featuredIndex}
              />
            ))}
          </div>
        )}

        {!isLoading && (
          <div className="home-planos-cta">
            <p className="home-planos-cta-note">60 dias de teste gratuito · Sem cartão de crédito</p>
            <a href={CONTATO.whatsapp} target="_blank" rel="noopener noreferrer" className="home-btn home-btn-light">
              <span className="bi bi-whatsapp" />
              Falar no WhatsApp
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

export default HomePlanosSection;
