import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DadosEmpresaService } from '@/services/dadosEmpresaService';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const { data: empresaData } = useQuery({
    queryKey: ['dados-empresa-public'],
    queryFn: () => DadosEmpresaService.getPublic(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const nomeEmpresa = empresaData?.nome_fantasia || empresaData?.razao_social;
    document.title = nomeEmpresa || 'BackNet';

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', nomeEmpresa || '');
    }
  }, [empresaData]);

  return (
    <div className="home-page">
      <div className="home-content">
        <h1 className="home-title">BackNet</h1>
        <p className="home-subtitle">
          {empresaData?.nome_fantasia || empresaData?.razao_social || 'Sistema de Gestão'}
        </p>
        <button
          type="button"
          className="btn btn-primary home-login-btn"
          onClick={() => navigate('/login')}
        >
          Acessar
        </button>
      </div>
    </div>
  );
};

export default Home;
