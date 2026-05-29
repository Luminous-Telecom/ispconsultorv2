import React from 'react';
import RecursosSistemaModalCore, {
  type RecursosSistemaModalCoreProps,
} from 'components/modals/recursos/RecursosSistemaModalCore';

type RecursosSistemaModalProps = Omit<RecursosSistemaModalCoreProps, 'variant'>;

const RecursosSistemaModal: React.FC<RecursosSistemaModalProps> = (props) => (
  <RecursosSistemaModalCore variant="erp" {...props} />
);

export default RecursosSistemaModal;
