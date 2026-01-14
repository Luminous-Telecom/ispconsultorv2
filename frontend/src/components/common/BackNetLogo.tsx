import React from 'react';

interface BackNetLogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

const BackNetLogo: React.FC<BackNetLogoProps> = ({ 
  width = 480, 
  height = 170, 
  className = '' 
}) => {
  return (
    <svg 
      viewBox="38 15 365 90" 
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      className={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0891b2', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="secondaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#f97316', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#fb923c', stopOpacity: 1 }} />
        </linearGradient>
        <radialGradient id="nodeGrad">
          <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#0891b2', stopOpacity: 0.8 }} />
        </radialGradient>
      </defs>
      
      {/* Ícone: Rede mesh/topology com nó central de backup */}
      <g transform="translate(40, 20) scale(1.5)">
        {/* Conexões da rede */}
        <g stroke="#0891b2" strokeWidth="2.5" opacity="0.6">
          <line x1="35" y1="35" x2="15" y2="15"/>
          <line x1="35" y1="35" x2="55" y2="15"/>
          <line x1="35" y1="35" x2="15" y2="55"/>
          <line x1="35" y1="35" x2="55" y2="55"/>
          <line x1="15" y1="15" x2="55" y2="15"/>
          <line x1="15" y1="55" x2="55" y2="55"/>
        </g>
        
        {/* Nós periféricos (equipamentos) */}
        <circle cx="15" cy="15" r="7" fill="#e0f2fe" stroke="#0891b2" strokeWidth="2.5"/>
        <circle cx="55" cy="15" r="7" fill="#e0f2fe" stroke="#0891b2" strokeWidth="2.5"/>
        <circle cx="15" cy="55" r="7" fill="#e0f2fe" stroke="#0891b2" strokeWidth="2.5"/>
        <circle cx="55" cy="55" r="7" fill="#e0f2fe" stroke="#0891b2" strokeWidth="2.5"/>
        
        {/* Indicadores nos nós */}
        <circle cx="15" cy="15" r="3" fill="#10b981"/>
        <circle cx="55" cy="15" r="3" fill="#10b981"/>
        <circle cx="15" cy="55" r="3" fill="#3b82f6"/>
        <circle cx="55" cy="55" r="3" fill="#10b981"/>
        
        {/* Nó central (servidor de backup) */}
        <circle cx="35" cy="35" r="15" fill="url(#primaryGrad)" stroke="#0e7490" strokeWidth="3"/>
        <circle cx="35" cy="35" r="10" fill="white" opacity="0.3"/>
        
        {/* Símbolo de database no centro */}
        <g transform="translate(35, 35)">
          <ellipse cx="0" cy="-4" rx="6" ry="3" fill="white"/>
          <rect x="-6" y="-4" width="12" height="8" fill="white"/>
          <ellipse cx="0" cy="4" rx="6" ry="3" fill="white"/>
        </g>
      </g>
      
      {/* Texto BACKNET */}
      <text x="145" y="90" fontFamily="'Helvetica Neue', 'Arial', sans-serif" fontSize="58" fontWeight="800" fill="#0f172a" letterSpacing="-1">
        Back
      </text>
      <text x="275" y="90" fontFamily="'Helvetica Neue', 'Arial', sans-serif" fontSize="58" fontWeight="800" fill="url(#primaryGrad)" letterSpacing="-1">
        Net
      </text>
      
      {/* Detalhe visual */}
      <rect x="145" y="100" width="240" height="2" fill="url(#secondaryGrad)" opacity="0.5" rx="1"/>
    </svg>
  );
};

export default BackNetLogo;
