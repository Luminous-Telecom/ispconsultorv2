import React from 'react';
import { CopiarIconButton } from 'components/ui';
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

interface ClassificationCardProps {
  title: string;
  items: string[];
  headerClassName: string;
  copyKey: string;
  copyVariant?: 'primary' | 'outline-light' | 'outline-dark' | 'secondary';
  emptyLabel: string;
  onCopied?: () => void;
  onCopyFailed?: () => void;
}

function ClassificationCard({
  title,
  items,
  headerClassName,
  copyKey,
  copyVariant = 'outline-light',
  emptyLabel,
  onCopied,
  onCopyFailed,
}: ClassificationCardProps) {
  return (
    <div className="card ilb-class-card">
      <div className={`card-header d-flex justify-content-between align-items-center gap-2 ${headerClassName}`}>
        <span>
          {title} ({items.length})
        </span>
        <CopiarIconButton
          text={items.join('\n')}
          copyKey={copyKey}
          variant={copyVariant}
          disabled={items.length === 0}
          onCopied={onCopied}
          onCopyFailed={onCopyFailed}
        />
      </div>
      <div className="card-body overflow-auto user-select-text">
        {items.length === 0 ? (
          <span className="text-muted small">{emptyLabel}</span>
        ) : (
          renderImportarListaBlockdomiList(items)
        )}
      </div>
    </div>
  );
}

interface ImportarListaBlockdomiClassificationCardsProps {
  t: BlockdomiImportTranslateFn;
  classified: ClassifiedList;
  onCopied?: () => void;
  onCopyFailed?: () => void;
}

const ImportarListaBlockdomiClassificationCards: React.FC<ImportarListaBlockdomiClassificationCardsProps> = ({
  t,
  classified,
  onCopied,
  onCopyFailed,
}) => {
  const emptyLabel = t('blockdomi.none');
  const copyProps = { onCopied, onCopyFailed, emptyLabel };

  return (
    <div className="ilb-classification-cards">
      <ClassificationCard
        title={t('blockdomi.domains')}
        items={classified.dominios}
        headerClassName="bg-primary text-white"
        copyKey="blockdomi-domains"
        {...copyProps}
      />
      <ClassificationCard
        title="IPv4"
        items={classified.ipv4}
        headerClassName="bg-info text-white"
        copyKey="blockdomi-ipv4"
        {...copyProps}
      />
      <ClassificationCard
        title="IPv6"
        items={classified.ipv6}
        headerClassName="bg-secondary text-white"
        copyKey="blockdomi-ipv6"
        {...copyProps}
      />
      <ClassificationCard
        title={t('blockdomi.alreadyRegistered')}
        items={classified.jaCadastrados}
        headerClassName="bg-dark text-white"
        copyKey="blockdomi-already-registered"
        {...copyProps}
      />
      <ClassificationCard
        title={t('blockdomi.willBeRegistered')}
        items={classified.seraoCadastrados}
        headerClassName="bg-success text-white"
        copyKey="blockdomi-will-be-registered"
        {...copyProps}
      />
      <ClassificationCard
        title={t('blockdomi.invalid')}
        items={classified.invalidos}
        headerClassName="bg-danger text-white"
        copyKey="blockdomi-invalid"
        {...copyProps}
      />
    </div>
  );
};

export default ImportarListaBlockdomiClassificationCards;
