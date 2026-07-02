import React from 'react';
import { Titulo } from 'types';
import { SaasTitulo } from 'services/saas/saasCrudService';
import { formatContasReceberCurrency } from './contasReceberListUtils';
import { TituloItemUnion, ContasReceberTranslateFn } from './contasReceberListTypes';

interface ContasReceberListResumoProps {
  filteredData: TituloItemUnion[];
  showCancelados: boolean;
  isMobile: boolean;
  t: ContasReceberTranslateFn;
}

export const ContasReceberListResumo: React.FC<ContasReceberListResumoProps> = ({
  filteredData,
  showCancelados,
  isMobile,
  t,
}) => {
  if (filteredData.length === 0) return null;

  return (
    <div
      className={`d-flex justify-content-end align-items-center p-3 bg-light financeiro-resumo financeiro-resumo-adaptive ${isMobile ? 'financeiro-resumo-container-mobile' : 'financeiro-resumo-container'}`}
    >
      <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
        <div className="text-end">
          <div className="small text-muted">{t('summary.value')}</div>
          <strong>
            {formatContasReceberCurrency(
              (filteredData as TituloItemUnion[]).reduce((sum: number, item: TituloItemUnion) => {
                const v =
                  'valor' in item
                    ? Number(item.valor)
                    : Number((item as Titulo).valor_final || (item as Titulo).valor || 0);
                return sum + v;
              }, 0)
            )}
          </strong>
        </div>
        <div className="text-end">
          <div className="small text-muted">{t('summary.paidValue')}</div>
          <strong>
            {formatContasReceberCurrency(
              (filteredData as TituloItemUnion[]).reduce((sum: number, item: TituloItemUnion) => {
                if ('pago' in item && item.pago) return sum + Number(item.valor);
                const vp = (item as Titulo).valor_pago;
                if (vp != null && Number(vp) > 0) return sum + Number(vp);
                return sum;
              }, 0)
            )}
          </strong>
        </div>
        <div className="text-end">
          <div className="small text-muted">{t('summary.openValue')}</div>
          <strong>
            {formatContasReceberCurrency(
              (filteredData as TituloItemUnion[]).reduce((sum: number, item: TituloItemUnion) => {
                if (item.status === 'pago' || item.status === 'cancelado') return sum;
                if ('pago' in item && (item as SaasTitulo).pago) return sum;
                const v = Number(
                  (item as { valor?: number }).valor ??
                    (item as Titulo).valor_final ??
                    (item as Titulo).valor ??
                    0
                );
                const vp = (item as Titulo).valor_pago;
                const valorAberto = vp != null ? v - Number(vp) : v;
                return sum + (valorAberto > 0 ? valorAberto : v);
              }, 0)
            )}
          </strong>
        </div>
        {showCancelados && (
          <div className="text-end">
            <div className="small text-muted">{t('summary.canceledValue')}</div>
            <strong>
              {formatContasReceberCurrency(
                (filteredData as TituloItemUnion[]).reduce((sum: number, item: TituloItemUnion) => {
                  if (item.status !== 'cancelado') return sum;
                  const v =
                    'valor' in item
                      ? Number(item.valor)
                      : Number((item as Titulo).valor_final || (item as Titulo).valor || 0);
                  return sum + v;
                }, 0)
              )}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
};
