import React, { useMemo } from 'react';
import AspasSection from './rpkiKrillConfig/AspasSection';
import CasPaiSection from './rpkiKrillConfig/CasPaiSection';
import CasSection from './rpkiKrillConfig/CasSection';
import RepositoriosSection from './rpkiKrillConfig/RepositoriosSection';
import { useRpkiKrillConfig } from './rpkiKrillConfig/useRpkiKrillConfig';
import { useSectionScroll } from './rpkiKrillConfig/useSectionScroll';
import type { RpkiKrillConfigModalProps } from './rpkiKrillConfig/types';

const RpkiKrillConfigModal: React.FC<RpkiKrillConfigModalProps> = ({ initialSection }) => {
  const {
    refs,
    casSection,
    casPaiSection,
    repositoriosSection,
    aspasSection,
  } = useRpkiKrillConfig();

  useSectionScroll(initialSection, refs);

  const isSingleSectionMode = Boolean(initialSection);
  const sectionVisibility = useMemo(
    () => ({
      showCasSection: !isSingleSectionMode || initialSection === 'cas',
      showCasPaiSection: !isSingleSectionMode || initialSection === 'cas-pai',
      showRepositoriosSection: !isSingleSectionMode || initialSection === 'repositorios',
      showAspasSection: !isSingleSectionMode || initialSection === 'aspas',
    }),
    [initialSection, isSingleSectionMode]
  );

  return (
    <form className="form-modal-simple" onSubmit={(event) => event.preventDefault()}>
      {sectionVisibility.showCasSection && (
        <CasSection cardRef={refs.casCardRef} {...casSection} />
      )}

      {sectionVisibility.showCasPaiSection && (
        <CasPaiSection cardRef={refs.casPaiCardRef} {...casPaiSection} />
      )}

      {sectionVisibility.showRepositoriosSection && (
        <RepositoriosSection cardRef={refs.repositoriosCardRef} {...repositoriosSection} />
      )}

      {sectionVisibility.showAspasSection && (
        <AspasSection cardRef={refs.aspasCardRef} {...aspasSection} />
      )}
    </form>
  );
};

export default RpkiKrillConfigModal;
