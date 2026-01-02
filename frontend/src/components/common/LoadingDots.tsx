import React from 'react';

interface LoadingDotsProps {
  className?: string;
  style?: React.CSSProperties;
}

const LoadingDots: React.FC<LoadingDotsProps> = ({ className = '', style }) => {
  return (
    <>
      <div
        className={`loading-dots ${className}`}
        style={{
          width: '100%',
          height: '3px',
          position: 'relative',
          overflow: 'hidden',
          ...style
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
            animation: 'loading-dots-slide 1.5s infinite ease-in-out'
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
};

export default LoadingDots;

