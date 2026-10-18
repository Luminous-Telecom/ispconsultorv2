import React, { useRef, type ElementType } from 'react';
import { useElementProperties } from 'hooks/useElementProperties';

type CssPropertyMap = Record<string, string | number | undefined | null>;

interface DynamicStyledElementProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  properties: CssPropertyMap;
  deps?: readonly unknown[];
}

/** Elemento genérico com propriedades CSS dinâmicas via ref */
export const DynamicStyledElement: React.FC<DynamicStyledElementProps> = ({
  as: Tag = 'div',
  properties,
  deps = [],
  className,
  children,
  ...rest
}) => {
  const ref = useRef<HTMLElement>(null);
  useElementProperties(ref, properties, deps);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
};

interface DynamicProgressBarProps {
  percent: number;
  className?: string;
  children?: React.ReactNode;
}

/** Barra de progresso com width dinâmico — sem style inline no JSX */
export const DynamicProgressBar: React.FC<DynamicProgressBarProps> = ({
  percent,
  className = 'progress-bar progress-bar-striped progress-bar-animated bg-primary',
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useElementProperties(ref, { width: `${percent}%` }, [percent]);

  return (
    <div
      ref={ref}
      className={className}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {children}
    </div>
  );
};

interface PositionedFixedProps {
  left: number;
  top: number;
  transform?: string;
  className?: string;
  children: React.ReactNode;
}

/** Elemento fixed posicionado via ref — tooltips de gráfico, etc. */
export const PositionedFixed: React.FC<PositionedFixedProps> = ({
  left,
  top,
  transform,
  className,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useElementProperties(
    ref,
    {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      transform: transform ?? undefined,
    },
    [left, top, transform]
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

interface ElementWithMaxWidthProps {
  maxWidth: number | string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}

/** Truncate com maxWidth dinâmico via ref */
export const ElementWithMaxWidth: React.FC<ElementWithMaxWidthProps> = ({
  maxWidth,
  className = 'text-truncate',
  title,
  children,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const width = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
  useElementProperties(ref, { maxWidth: width }, [width]);

  return (
    <span ref={ref} className={className} title={title}>
      {children}
    </span>
  );
};

interface ElementWithZIndexProps {
  zIndex: number;
  className?: string;
  children?: React.ReactNode;
}

export const ElementWithZIndex: React.FC<ElementWithZIndexProps> = ({ zIndex, className, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useElementProperties(ref, { zIndex: String(zIndex) }, [zIndex]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

interface ElementWithCssVarsProps {
  vars: Record<string, string | number>;
  className?: string;
  children?: React.ReactNode;
  as?: 'div' | 'table' | 'colgroup';
}

/** Define CSS variables no elemento via ref (ex.: --table-min-width) */
export const ElementWithCssVars: React.FC<ElementWithCssVarsProps> = ({
  vars,
  className,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const cssVars = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [`--${k.replace(/^--/, '')}`, v]),
  );
  useElementProperties(ref, cssVars, [JSON.stringify(vars)]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

interface ColWithWidthProps {
  width: number | string;
  className?: string;
}

export const ColWithWidth: React.FC<ColWithWidthProps> = ({ width, className }) => {
  const ref = useRef<HTMLTableColElement>(null);
  const w = typeof width === 'number' ? `${width}px` : width;
  useElementProperties(ref, { width: w }, [w]);

  return <col ref={ref} className={className} />;
};

interface LoadingBarFillProps {
  progress: number;
}

export const LoadingBarFill: React.FC<LoadingBarFillProps> = ({ progress }) => {
  const ref = useRef<HTMLDivElement>(null);
  useElementProperties(ref, { width: `${progress}%` }, [progress]);

  return <div ref={ref} className="loading-bar-fill" />;
};

interface PieLegendDotProps {
  color: string;
}

export const PieLegendDot: React.FC<PieLegendDotProps> = ({ color }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useElementProperties(ref, { backgroundColor: color }, [color]);

  return <span ref={ref} className="pie-legend-dot" />;
};

interface IspConsultorLogoImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  maxHeight?: number;
}

export const IspConsultorLogoImg: React.FC<IspConsultorLogoImgProps> = ({
  maxHeight = 40,
  className,
  alt = 'ISP Consultor',
  ...rest
}) => {
  const ref = useRef<HTMLImageElement>(null);
  useElementProperties(ref, { '--logo-max-height': `${maxHeight}px` }, [maxHeight]);

  return (
    <img
      ref={ref}
      className={`ispconsultor-logo-img ${className ?? ''}`.trim()}
      alt={alt}
      {...rest}
    />
  );
};
