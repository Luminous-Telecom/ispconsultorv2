import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HotsiteService } from '@/services/hotsiteService';
import { DadosEmpresaService } from '@/services/dadosEmpresaService';
import './Home.css';

function sanitizeSrcDocHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  try {
    // Remove APENAS as meta tags que causam erros no console.
    // Scripts e handlers são mantidos para o hotsite funcionar normalmente.
    let sanitized = rawHtml;

    // Remove meta tags com X-Frame-Options (não funcionam em iframes)
    sanitized = sanitized.replace(/<meta[^>]*http-equiv\s*=\s*["']x-frame-options["'][^>]*>/gi, '');
    
    // Remove meta tags com Content-Security-Policy que contenham frame-ancestors (não funcionam em iframes)
    sanitized = sanitized.replace(/<meta[^>]*http-equiv\s*=\s*["']content-security-policy["'][^>]*frame-ancestors[^>]*>/gi, '');
    sanitized = sanitized.replace(/<meta[^>]*name\s*=\s*["']content-security-policy["'][^>]*frame-ancestors[^>]*>/gi, '');

    return sanitized;
  } catch {
    return rawHtml;
  }
}

const Home: React.FC = () => {
  const [blobUrl, setBlobUrl] = React.useState<string>('');

  // Buscar dados públicos da empresa
  const { data: empresaData } = useQuery({
    queryKey: ['dados-empresa-public'],
    queryFn: () => DadosEmpresaService.getPublic(),
    staleTime: 5 * 60 * 1000,
  });

  // Buscar hotsite público (HTML configurável)
  const { data: hotsiteResponse, isLoading } = useQuery({
    queryKey: ['hotsite-public'],
    queryFn: () => HotsiteService.getPublic(),
    staleTime: 60 * 1000,
    retry: false,
    throwOnError: false,
  });

  const hotsiteHtml = useMemo(() => {
    const html = hotsiteResponse?.data?.html;
    const raw = typeof html === 'string' ? html.trim() : '';
    
    if (!raw) return '';
    
    // Remove apenas meta tags inválidas que geram erros no console
    // (X-Frame-Options e CSP frame-ancestors não funcionam dentro de iframes)
    return sanitizeSrcDocHtml(raw);
  }, [hotsiteResponse?.data?.html]);

  // Criar Blob URL do HTML sanitizado (evita problemas com srcDoc)
  useEffect(() => {
    if (!hotsiteHtml) {
      setBlobUrl('');
      return;
    }

    // Criar blob com o HTML sanitizado
    const blob = new Blob([hotsiteHtml], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);

    // Limpar URL ao desmontar
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [hotsiteHtml]);

  useEffect(() => {
    // Usar nome fantasia ou razão social da empresa no título
    const nomeEmpresa = empresaData?.nome_fantasia || empresaData?.razao_social;
    document.title = nomeEmpresa || 'Hotsite';
  }, [empresaData]);

  return (
    <div className="hotsite-page">
      {isLoading ? (
        <div className="hotsite-loading">Carregando...</div>
      ) : blobUrl ? (
        <iframe
          key={blobUrl}
          title="Hotsite"
          className="hotsite-iframe"
          src={blobUrl}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
        />
      ) : (
        <div className="hotsite-empty">
          <div className="hotsite-empty-card">
            <div className="hotsite-empty-title">Hotsite não configurado</div>
            <div className="hotsite-empty-text">
              Configure o HTML em <strong>Parâmetros → Hotsite</strong>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
