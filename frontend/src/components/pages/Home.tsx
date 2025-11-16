import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DadosEmpresaService } from '../../services/dadosEmpresaService';
import { getBrandLogo } from '../../utils/brandLogos';
import './Home.css';

const Home: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Buscar dados da empresa (incluindo logo)
  // Não requer autenticação - se falhar, apenas não exibe a logo
  const { data: dadosEmpresa } = useQuery({
    queryKey: ['dados-empresa'],
    queryFn: () => DadosEmpresaService.get(),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: false, // Não tentar novamente se falhar
    throwOnError: false, // Não lançar erro para evitar redirecionamento
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home-page">
      {/* Header */}
      <header className={`home-header ${isScrolled ? 'scrolled' : ''}`}>
        <nav className="navbar navbar-expand-lg">
          <div className="container">
            <Link to="/" className="navbar-brand">
              {dadosEmpresa?.logo ? (
                <img 
                  src={dadosEmpresa.logo} 
                  alt={dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || 'Luminous Telecom'} 
                  style={{ height: '60px', width: 'auto', marginRight: '0.75rem' }}
                />
              ) : (
                <i className="bi bi-broadcast me-2"></i>
              )}
              <span>{dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || 'Luminous Telecom'}</span>
            </Link>
            <button
              className="navbar-toggler"
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className={`collapse navbar-collapse ${isMobileMenuOpen ? 'show' : ''}`} id="navbarNav">
              <ul className="navbar-nav ms-auto">
                <li className="nav-item">
                  <button className="nav-link" onClick={() => {
                    scrollToSection('inicio');
                    setIsMobileMenuOpen(false);
                  }}>
                    Início
                  </button>
                </li>
                <li className="nav-item">
                  <button className="nav-link" onClick={() => {
                    scrollToSection('sobre');
                    setIsMobileMenuOpen(false);
                  }}>
                    Sobre
                  </button>
                </li>
                <li className="nav-item">
                  <button className="nav-link" onClick={() => {
                    scrollToSection('servicos');
                    setIsMobileMenuOpen(false);
                  }}>
                    Serviços
                  </button>
                </li>
                <li className="nav-item">
                  <button className="nav-link" onClick={() => {
                    scrollToSection('tecnologias');
                    setIsMobileMenuOpen(false);
                  }}>
                    Tecnologias
                  </button>
                </li>
                <li className="nav-item">
                  <button className="nav-link" onClick={() => {
                    scrollToSection('recursos');
                    setIsMobileMenuOpen(false);
                  }}>
                    Recursos
                  </button>
                </li>
                <li className="nav-item">
                  <button className="nav-link" onClick={() => {
                    scrollToSection('contato');
                    setIsMobileMenuOpen(false);
                  }}>
                    Contato
                  </button>
                </li>
                <li className="nav-item ms-3">
                  <Link to="/adm" className="btn btn-primary">
                    Área do Cliente
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="hero-section">
        <div className="container">
          <div className="row align-items-center min-vh-100">
            <div className="col-lg-6">
              <h1 className="hero-title">
                {dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || 'Luminous Telecom'}
              </h1>
              <h2 className="hero-subtitle" style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
                Consultoria e Assessoria Técnica em Telecomunicações
              </h2>
              <p className="hero-subtitle" style={{ fontSize: '1.125rem', fontWeight: 400 }}>
                Soluções especializadas para empresas de telecomunicações.
                Otimização de processos, gestão eficiente e suporte técnico especializado
                para impulsionar seu negócio.
              </p>
              <div className="hero-buttons">
                <button className="btn btn-primary btn-lg me-3" onClick={() => scrollToSection('contato')}>
                  Solicitar Orçamento
                </button>
                <button className="btn btn-outline-primary btn-lg" onClick={() => scrollToSection('sobre')}>
                  Conheça Nossos Serviços
                </button>
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <div className="hero-image">
                <i className="bi bi-broadcast"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre Section */}
      <section id="sobre" className="section-about">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mx-auto text-center mb-5">
              <h2 className="section-title">Sobre Nós</h2>
              <p className="section-subtitle">
                Especialistas em consultoria e assessoria técnica para empresas de telecomunicações.
                Oferecemos soluções personalizadas para otimizar operações, melhorar gestão
                e impulsionar o crescimento do seu negócio.
              </p>
            </div>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-award"></i>
                </div>
                <h3>Experiência Comprovada</h3>
                <p>
                  Anos de experiência no mercado de telecomunicações,
                  com conhecimento técnico especializado e resultados comprovados.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-people-fill"></i>
                </div>
                <h3>Atendimento Personalizado</h3>
                <p>
                  Soluções sob medida para cada cliente, com acompanhamento
                  próximo e suporte técnico especializado.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-graph-up-arrow"></i>
                </div>
                <h3>Resultados Mensuráveis</h3>
                <p>
                  Foco em resultados práticos que impactam diretamente
                  na eficiência operacional e na rentabilidade do negócio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços Section */}
      <section id="servicos" className="section-services">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mx-auto text-center mb-5">
              <h2 className="section-title">Nossos Serviços</h2>
              <p className="section-subtitle">
                Soluções completas de consultoria e assessoria técnica para empresas de telecomunicações
              </p>
            </div>
          </div>
          <div className="row g-4">
            <div className="col-md-6 col-lg-4">
              <div className="service-card">
                <i className="bi bi-gear service-icon"></i>
                <h4>Assessoria Técnica</h4>
                <p>
                  Suporte técnico especializado para implementação, configuração
                  e manutenção de sistemas de telecomunicações.
                </p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="service-card">
                <i className="bi bi-laptop service-icon"></i>
                <h4>Implementação de Sistemas</h4>
                <p>
                  Implementação e customização de sistemas de gestão
                  específicos para empresas de telecomunicações.
                </p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="service-card">
                <i className="bi bi-graph-up service-icon"></i>
                <h4>Análise e Planejamento</h4>
                <p>
                  Análise de performance, planejamento estratégico e
                  definição de métricas para crescimento sustentável.
                </p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="service-card">
                <i className="bi bi-headset service-icon"></i>
                <h4>Suporte Contínuo</h4>
                <p>
                  Acompanhamento contínuo, suporte técnico e consultoria
                  para garantir operação eficiente e sem interrupções.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marcas e Tecnologias Section */}
      <section id="tecnologias" className="section-technologies">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mx-auto text-center mb-5">
              <h2 className="section-title">Marcas e Tecnologias</h2>
              <p className="section-subtitle">
                Trabalhamos com as principais marcas e tecnologias do mercado de telecomunicações
              </p>
            </div>
          </div>
          <div className="row g-4">
            {/* OLT */}
            <div className="col-md-6 col-lg-3">
              <div className="tech-category">
                <h5 className="tech-category-title">
                  <i className="bi bi-router me-2"></i>
                  OLT
                </h5>
                <div className="tech-badges">
                  <span className="tech-badge">VSOL</span>
                  <span className="tech-badge">Fiberhome</span>
                  <span className="tech-badge">Overteck</span>
                </div>
              </div>
            </div>
            
            {/* Roteador de Borda */}
            <div className="col-md-6 col-lg-3">
              <div className="tech-category">
                <h5 className="tech-category-title">
                  <i className="bi bi-wifi me-2"></i>
                  Roteador de Borda
                </h5>
                <div className="tech-badges">
                  {['Huawei', 'Mikrotik'].map((brand) => {
                    const logo = getBrandLogo(brand);
                    return (
                      <span key={brand} className="tech-badge">
                        {logo && <img src={logo} alt={brand} className="tech-badge-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                        <span>{brand}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Switch */}
            <div className="col-md-6 col-lg-3">
              <div className="tech-category">
                <h5 className="tech-category-title">
                  <i className="bi bi-diagram-3 me-2"></i>
                  Switch
                </h5>
                <div className="tech-badges">
                  {['Mikrotik', 'Intelbras'].map((brand) => {
                    const logo = getBrandLogo(brand);
                    return (
                      <span key={brand} className="tech-badge">
                        {logo && <img src={logo} alt={brand} className="tech-badge-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                        <span>{brand}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* ERPs */}
            <div className="col-md-6 col-lg-3">
              <div className="tech-category">
                <h5 className="tech-category-title">
                  <i className="bi bi-laptop me-2"></i>
                  ERPs
                </h5>
                <div className="tech-badges">
                  {['IXC Provedor', 'SGP', 'Mikweb', 'Atlaz', 'MKAuth'].map((brand) => {
                    const logo = getBrandLogo(brand);
                    return (
                      <span key={brand} className="tech-badge">
                        {logo && <img src={logo} alt={brand} className="tech-badge-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                        <span>{brand}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Virtualização */}
            <div className="col-md-6 col-lg-3">
              <div className="tech-category">
                <h5 className="tech-category-title">
                  <i className="bi bi-server me-2"></i>
                  Virtualização
                </h5>
                <div className="tech-badges">
                  {['Proxmox'].map((brand) => {
                    const logo = getBrandLogo(brand);
                    return (
                      <span key={brand} className="tech-badge">
                        {logo && <img src={logo} alt={brand} className="tech-badge-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                        <span>{brand}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* DNS */}
            <div className="col-md-6 col-lg-3">
              <div className="tech-category">
                <h5 className="tech-category-title">
                  <i className="bi bi-globe me-2"></i>
                  DNS
                </h5>
                <div className="tech-badges">
                  {['Unbound', 'Bind9'].map((brand) => {
                    const logo = getBrandLogo(brand);
                    return (
                      <span key={brand} className="tech-badge">
                        {logo && <img src={logo} alt={brand} className="tech-badge-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                        <span>{brand}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Monitoramento */}
            <div className="col-md-6 col-lg-3">
              <div className="tech-category">
                <h5 className="tech-category-title">
                  <i className="bi bi-graph-up me-2"></i>
                  Monitoramento
                </h5>
                <div className="tech-badges">
                  {['Zabbix', 'Grafana', 'The Dude', 'LibreNMS'].map((brand) => {
                    const logo = getBrandLogo(brand);
                    return (
                      <span key={brand} className="tech-badge">
                        {logo && <img src={logo} alt={brand} className="tech-badge-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                        <span>{brand}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* API */}
            <div className="col-md-6 col-lg-3">
              <div className="tech-category">
                <h5 className="tech-category-title">
                  <i className="bi bi-code-slash me-2"></i>
                  API
                </h5>
                <div className="tech-badges">
                  {['Bloqueio Anatel'].map((brand) => {
                    const logo = getBrandLogo(brand);
                    return (
                      <span key={brand} className="tech-badge">
                        {logo && <img src={logo} alt={brand} className="tech-badge-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                        <span>{brand}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos Section */}
      <section id="recursos" className="section-features">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h2 className="section-title">Por Que Escolher Nossa Consultoria?</h2>
              <div className="feature-list">
                <div className="feature-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <div>
                    <h5>Conhecimento Especializado</h5>
                    <p>Equipe com vasta experiência no mercado de telecomunicações e tecnologias relacionadas</p>
                  </div>
                </div>
                <div className="feature-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <div>
                    <h5>Soluções Personalizadas</h5>
                    <p>Cada projeto é desenvolvido sob medida para atender às necessidades específicas do cliente</p>
                  </div>
                </div>
                <div className="feature-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <div>
                    <h5>Resultados Comprovados</h5>
                    <p>Histórico de projetos bem-sucedidos que geraram aumento de eficiência e rentabilidade</p>
                  </div>
                </div>
                <div className="feature-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <div>
                    <h5>Suporte Dedicado</h5>
                    <p>Acompanhamento próximo e suporte técnico contínuo para garantir o sucesso do projeto</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <div className="features-image">
                <i className="bi bi-broadcast"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contato Section */}
      <section id="contato" className="section-contact">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mx-auto text-center">
              <h2 className="section-title">Entre em Contato</h2>
              <p className="section-subtitle mb-5">
                Estamos prontos para ajudar sua empresa a alcançar melhores resultados.
                Solicite um orçamento ou agende uma consultoria.
              </p>
              <div className="contact-info">
                {dadosEmpresa?.email && (
                  <div className="contact-item">
                    <i className="bi bi-envelope"></i>
                    <span>{dadosEmpresa.email}</span>
                  </div>
                )}
                {dadosEmpresa?.telefone && (
                  <div className="contact-item">
                    <i className="bi bi-telephone"></i>
                    <span>{dadosEmpresa.telefone}</span>
                  </div>
                )}
                {dadosEmpresa?.celular && (
                  <div className="contact-item">
                    <i className="bi bi-whatsapp"></i>
                    <span>{dadosEmpresa.celular}</span>
                  </div>
                )}
                {(!dadosEmpresa?.email && !dadosEmpresa?.telefone && !dadosEmpresa?.celular) && (
                  <>
                    <div className="contact-item">
                      <i className="bi bi-envelope"></i>
                      <span>contato@consultoriatelecom.com.br</span>
                    </div>
                    <div className="contact-item">
                      <i className="bi bi-telephone"></i>
                      <span>(00) 0000-0000</span>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-5">
                <button className="btn btn-primary btn-lg me-3" onClick={() => scrollToSection('contato')}>
                  Solicitar Orçamento
                </button>
                <Link to="/adm" className="btn btn-outline-primary btn-lg">
                  Área do Cliente
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <h5 className="d-flex align-items-center">
                {dadosEmpresa?.logo ? (
                  <img 
                    src={dadosEmpresa.logo} 
                    alt={dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || 'Luminous Telecom'} 
                    style={{ height: '50px', width: 'auto', marginRight: '0.75rem' }}
                  />
                ) : (
                  <i className="bi bi-broadcast me-2"></i>
                )}
                {dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || 'Luminous Telecom'}
              </h5>
              <p className="text-muted">
                Consultoria e assessoria técnica especializada em telecomunicações.
              </p>
            </div>
            <div className="col-md-6 text-md-end">
              <p className="text-muted mb-0">
                &copy; {new Date().getFullYear()} {dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || 'Luminous Telecom'}. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

