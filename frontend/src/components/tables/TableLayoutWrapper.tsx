import React from 'react';

interface TableLayoutWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/** Layout flex padrão para tabelas em modais e abas (scroll interno). */
const TableLayoutWrapper: React.FC<TableLayoutWrapperProps> = ({ children, className = '' }) => {
  return (
    <div className={['list-modal-table-wrapper', className].filter(Boolean).join(' ')}>
      <div className="list-modal-scroll-wrapper">
        {children}
      </div>
    </div>
  );
};

export default TableLayoutWrapper;
