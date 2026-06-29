import React from 'react';

interface LoadingBarProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Barra animada no topo do layout durante requisições globais (LoadingContext). */
const LoadingBar: React.FC<LoadingBarProps> = ({ className = '', style }) => (
  <>
    <div
      className={`loading-dots ${className}`.trim()}
      style={{
        width: '100%',
        height: '3px',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, #0d6efd, transparent)',
          animation: 'loading-dots-slide 1.5s infinite ease-in-out',
        }}
      />
    </div>
    <style>{`
      @keyframes loading-dots-slide {
        0% {
          left: -100%;
        }
        100% {
          left: 100%;
        }
      }
    `}</style>
  </>
);

export default LoadingBar;
