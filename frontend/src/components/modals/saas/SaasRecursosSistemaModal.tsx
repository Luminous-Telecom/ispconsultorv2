import React from 'react';
import RecursosSistemaModalCore, {
  type RecursosSistemaModalCoreProps,
} from 'components/modals/recursos/RecursosSistemaModalCore';

type Props = Omit<RecursosSistemaModalCoreProps, 'variant'>;

const SaasRecursosSistemaModal: React.FC<Props> = (props) => (
  <RecursosSistemaModalCore variant="saas" {...props} />
);

export default SaasRecursosSistemaModal;
