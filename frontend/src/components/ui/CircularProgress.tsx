import React from 'react';
import { ElementWithCssVars } from './DynamicStyleElements';

export interface CircularProgressProps {
  percent: number;
  label: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ percent, label }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(Number.isFinite(percent) ? percent : 0)));

  return (
    <ElementWithCssVars
      className="circular-progress"
      vars={{ 'circular-progress': clamped }}
    >
      <svg
        className="circular-progress__svg"
        viewBox="0 0 100 100"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <circle className="circular-progress__track" cx="50" cy="50" r="42" />
        <circle className="circular-progress__value" cx="50" cy="50" r="42" />
      </svg>
      <span className="circular-progress__percent">{clamped}%</span>
    </ElementWithCssVars>
  );
};

export default CircularProgress;
