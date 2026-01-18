import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HotsiteService } from '@/services/hotsiteService';
import './Home.css';

const Home: React.FC = () => {
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
    return typeof html === 'string' ? html.trim() : '';
  }, [hotsiteResponse?.data?.html]);

  useEffect(() => {
    document.title = 'Hotsite';
  }, []);

  return (
    <div className="hotsite-page">
      {isLoading ? (
        <div className="hotsite-loading">Carregando...</div>
      ) : hotsiteHtml ? (
        <iframe
          title="Hotsite"
          className="hotsite-iframe"
          srcDoc={hotsiteHtml}
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
