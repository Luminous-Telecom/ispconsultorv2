import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppButton, Loading } from 'components/ui';
import { publicHotsitePlanosService } from 'services/publicHotsitePlanosService';
import { CONTATO } from './homeConstants';
import HomePlanosCompareTable from './HomePlanosCompareTable';

type BillingPeriod = 'mensal' | 'anual';

const buildWhatsappPlanoUrl = (planoNome: string) => {
  const text = encodeURIComponent(`Olá, tenho interesse no plano ${planoNome} do ISP Consultor.`);
  return `https://wa.me/5584998667245?text=${text}`;
};

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
            Compare os planos e escolha o ideal para a sua consultoria. Valores finais de cobrança, com condições promocionais quando aplicável.
          </p>
        </div>

        {!isLoading && planos.length > 0 && hasAnnualPricing && (
          <div className="home-planos-toolbar">
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
          <HomePlanosCompareTable
            planos={planos}
            billingPeriod={billingPeriod}
            featuredIndex={featuredIndex}
            buildWhatsappUrl={buildWhatsappPlanoUrl}
          />
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
