import React from 'react';

interface HomeSectionHeaderProps {
  title: string;
  description?: string;
  align?: 'center' | 'start';
  className?: string;
}

const HomeSectionHeader: React.FC<HomeSectionHeaderProps> = ({
  title,
  description,
  align = 'center',
  className = '',
}) => (
  <div className={`home-section-header home-section-header--${align} ${className}`.trim()}>
    <h2 className="home-section-title">{title}</h2>
    {description ? <p className="home-section-desc">{description}</p> : null}
  </div>
);

export default HomeSectionHeader;
