import React from 'react';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';
import type { ClassifiedList } from './importarListaBlockdomiTypes';

export function renderImportarListaBlockdomiList(items: string[]) {
  return (
    <ul className="list-unstyled mb-0 small">
      {items.map((item, i) => (
        <li key={i} className="text-nowrap overflow-x-auto ilb-list-item">
          {item}
        </li>
      ))}
    </ul>
  );
}

interface ImportarListaBlockdomiClassificationCardsProps {
  t: BlockdomiImportTranslateFn;
  classified: ClassifiedList;
}

const ImportarListaBlockdomiClassificationCards: React.FC<ImportarListaBlockdomiClassificationCardsProps> = ({
  t,
  classified,
}) => (
  <div className="ilb-classification-cards">
    <div className="card ilb-class-card">
      <div className="card-header bg-primary text-white">
        {t('blockdomi.domains')} ({classified.dominios.length})
      </div>
      <div className="card-body overflow-auto user-select-text">
        {classified.dominios.length === 0 ? (
          <span className="text-muted small">{t('blockdomi.none')}</span>
        ) : (
          renderImportarListaBlockdomiList(classified.dominios)
        )}
      </div>
    </div>
    <div className="card ilb-class-card">
      <div className="card-header bg-info text-white">
        IPv4 ({classified.ipv4.length})
      </div>
      <div className="card-body overflow-auto user-select-text">
        {classified.ipv4.length === 0 ? (
          <span className="text-muted small">{t('blockdomi.none')}</span>
        ) : (
          renderImportarListaBlockdomiList(classified.ipv4)
        )}
      </div>
    </div>
    <div className="card ilb-class-card">
      <div className="card-header bg-secondary text-white">
        IPv6 ({classified.ipv6.length})
      </div>
      <div className="card-body overflow-auto user-select-text">
        {classified.ipv6.length === 0 ? (
          <span className="text-muted small">{t('blockdomi.none')}</span>
        ) : (
          renderImportarListaBlockdomiList(classified.ipv6)
        )}
      </div>
    </div>
    <div className="card ilb-class-card">
      <div className="card-header bg-dark text-white">
        {t('blockdomi.alreadyRegistered')} ({classified.jaCadastrados.length})
      </div>
      <div className="card-body overflow-auto user-select-text">
        {classified.jaCadastrados.length === 0 ? (
          <span className="text-muted small">{t('blockdomi.none')}</span>
        ) : (
          renderImportarListaBlockdomiList(classified.jaCadastrados)
        )}
      </div>
    </div>
    <div className="card ilb-class-card">
      <div className="card-header bg-success text-white">
        {t('blockdomi.willBeRegistered')} ({classified.seraoCadastrados.length})
      </div>
      <div className="card-body overflow-auto user-select-text">
        {classified.seraoCadastrados.length === 0 ? (
          <span className="text-muted small">{t('blockdomi.none')}</span>
        ) : (
          renderImportarListaBlockdomiList(classified.seraoCadastrados)
        )}
      </div>
    </div>
    <div className="card ilb-class-card">
      <div className="card-header bg-danger text-white">
        {t('blockdomi.invalid')} ({classified.invalidos.length})
      </div>
      <div className="card-body overflow-auto user-select-text">
        {classified.invalidos.length === 0 ? (
          <span className="text-muted small">{t('blockdomi.none')}</span>
        ) : (
          renderImportarListaBlockdomiList(classified.invalidos)
        )}
      </div>
    </div>
  </div>
);

export default ImportarListaBlockdomiClassificationCards;
