import React from 'react';
import NFSeConfigSectionCore, {
  type NFSeConfigSectionCoreProps,
} from 'components/modals/nfse/NFSeConfigSectionCore';

type NFSeConfigSectionProps = Omit<NFSeConfigSectionCoreProps, 'variant'>;

const NFSeConfigSection: React.FC<NFSeConfigSectionProps> = (props) => (
  <NFSeConfigSectionCore variant="erp" {...props} />
);

export default NFSeConfigSection;
