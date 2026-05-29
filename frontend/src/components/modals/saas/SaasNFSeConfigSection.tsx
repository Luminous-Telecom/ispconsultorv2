import React from 'react';
import NFSeConfigSectionCore, {
  type NFSeConfigSectionCoreProps,
} from 'components/modals/nfse/NFSeConfigSectionCore';

type SaasNFSeConfigSectionProps = Omit<NFSeConfigSectionCoreProps, 'variant'>;

const SaasNFSeConfigSection: React.FC<SaasNFSeConfigSectionProps> = (props) => (
  <NFSeConfigSectionCore variant="saas" {...props} />
);

export default SaasNFSeConfigSection;
