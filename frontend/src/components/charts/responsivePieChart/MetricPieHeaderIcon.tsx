export type MetricPieHeaderIconVariant = 'contracts' | 'payments' | 'clients' | 'plans';

export function MetricPieHeaderIcon({ variant }: { variant: MetricPieHeaderIconVariant }) {
  if (variant === 'plans') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="4" width="18" height="5" rx="1.5" stroke="#534AB7" strokeWidth="2" />
        <rect x="5" y="10" width="14" height="5" rx="1.5" stroke="#534AB7" strokeWidth="2" />
        <rect x="7" y="16" width="10" height="4" rx="1.5" stroke="#534AB7" strokeWidth="2" />
      </svg>
    );
  }
  if (variant === 'clients') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
          stroke="#534AB7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="7" r="4" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M23 21v-2a4 4 0 0 0-3-3.87"
          stroke="#534AB7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 3.13a4 4 0 0 1 0 7.75"
          stroke="#534AB7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (variant === 'payments') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="#534AB7" strokeWidth="2" />
        <path d="M2 10h20" stroke="#534AB7" strokeWidth="2" />
        <path d="M7 15h.01M12 15h.01M17 15h.01" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="#534AB7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h4" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
