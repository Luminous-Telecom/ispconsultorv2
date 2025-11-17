import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DadosEmpresaService, type DadosEmpresa } from '../../services/dadosEmpresaService';
import { getBrandLogo } from '../../utils/brandLogos';
import { useTheme } from '../../contexts/ThemeContext';
import './Home.css';

// Throttle function para otimizar scroll handler
const throttle = <T extends (...args: unknown[]) => void>(func: T, limit: number): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

const Home: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Buscar dados públicos da empresa (incluindo logo) para o site público
  const { data: dadosEmpresa } = useQuery<Partial<DadosEmpresa>>({
    queryKey: ['dados-empresa-public'],
    queryFn: () => DadosEmpresaService.getPublic(),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: false, // Não tentar novamente se falhar
    throwOnError: false, // Não lançar erro para evitar redirecionamento
  });

  // Throttled scroll handler para melhorar INP
  useEffect(() => {
    const throttledScroll = throttle(() => {
      setIsScrolled(window.scrollY > 50);
    }, 100);
    
    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, []);

  const companyName = useMemo(
    () => dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || 'Luminous Telecom',
    [dadosEmpresa]
  );

  // Atualizar título da página com o nome da empresa
  useEffect(() => {
    if (companyName) {
      document.title = `${companyName} - Consultoria e Assessoria Técnica em Telecomunicações`;
    }
  }, [companyName]);

  // Memoizar scrollToSection para melhorar INP
  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  }, []);

  // Memoizar funções de formatação para melhorar performance
  const formatWhatsAppNumber = useCallback((phone: string): string => {
    const numbersOnly = phone.replace(/\D/g, '');
    if (numbersOnly.length > 0 && !numbersOnly.startsWith('55')) {
      const cleaned = numbersOnly.startsWith('0') ? numbersOnly.substring(1) : numbersOnly;
      return `55${cleaned}`;
    }
    return numbersOnly;
  }, []);

  const getWhatsAppLink = useCallback((phone: string): string => {
    const formatted = formatWhatsAppNumber(phone);
    return `https://wa.me/${formatted}`;
  }, [formatWhatsAppNumber]);

  const getEmailLink = useCallback((email: string): string => {
    return `mailto:${email}`;
  }, []);

  const getPhoneLink = useCallback((phone: string): string => {
    return `tel:${phone}`;
  }, []);

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
                  alt={companyName}
                  className="brand-logo"
                  loading="eager"
                  fetchPriority="high"
                  width="40"
                  height="40"
                />
              ) : (
                <div className="brand-icon">
                  <i className="bi bi-broadcast-tower"></i>
                </div>
              )}
              <span className="brand-name">{companyName}</span>
            </Link>
            <button
              className={`navbar-toggler ${isMobileMenuOpen ? 'active' : ''}`}
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div className={`navbar-collapse ${isMobileMenuOpen ? 'show' : ''}`}>
              <ul className="navbar-nav ms-auto">
                <li className="nav-item">
                  <button className="nav-link" onClick={() => scrollToSection('inicio')}>
                    Início
                  </button>
                </li>
                <li className="nav-item">
                  <button className="nav-link" onClick={() => scrollToSection('sobre')}>
                    Sobre
                  </button>
                </li>
                <li className="nav-item">
                  <button className="nav-link" onClick={() => scrollToSection('servicos')}>
                    Serviços
                  </button>
                </li>
                <li className="nav-item">
                  <button className="nav-link" onClick={() => scrollToSection('tecnologias')}>
                    Tecnologias
                  </button>
                </li>
                <li className="nav-item">
                  <button className="nav-link" onClick={() => scrollToSection('recursos')}>
                    Recursos
                  </button>
                </li>
                <li className="nav-item">
                  <button className="nav-link" onClick={() => scrollToSection('contato')}>
                    Contato
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className="nav-link theme-toggle-btn"
                    onClick={toggleTheme}
                    aria-label={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
                    title={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
                  >
                    <i className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`}></i>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="hero-section">
        <div className="hero-background">
          <div className="hero-bg-circle hero-bg-circle-1"></div>
          <div className="hero-bg-circle hero-bg-circle-2"></div>
        </div>
        <div className="container">
          <div className="row align-items-center min-vh-100">
            <div className="col-lg-6">
              <div className="hero-badge">
                Consultoria Especializada
              </div>
              <h1 className="hero-title">
                <span className="hero-title-gradient">{companyName}</span>
              </h1>
              <h2 className="h4 mb-0 hero-subtitle">
                Consultoria e Assessoria Técnica em Telecomunicações
              </h2>
              <p className="hero-description">
                Soluções especializadas para empresas de telecomunicações.
                Otimização de processos, gestão eficiente e suporte técnico especializado
                para impulsionar seu negócio.
              </p>
              <div className="hero-buttons">
                <button className="btn btn-primary-gradient btn-lg me-3" onClick={() => scrollToSection('contato')}>
                  Solicitar Orçamento
                </button>
                <button className="btn btn-outline-gradient btn-lg" onClick={() => scrollToSection('sobre')}>
                  Conheça Nossos Serviços
                </button>
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <div className="hero-image-wrapper">
                <div className="hero-image-glow"></div>
                <div className="hero-image-content">
                  {dadosEmpresa?.logo ? (
                    <img 
                      src={dadosEmpresa.logo} 
                      alt={companyName}
                      className="hero-logo"
                      loading="eager"
                      fetchPriority="high"
                      width="200"
                      height="200"
                    />
                  ) : (
                    <i className="bi bi-broadcast-tower"></i>
                  )}
                </div>
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
              <h2 className="section-title">
                <span className="section-title-gradient">Sobre Nós</span>
              </h2>
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
                <div className="feature-icon feature-icon-purple">
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
                <div className="feature-icon feature-icon-cyan">
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
                <div className="feature-icon feature-icon-gradient">
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
              <h2 className="section-title">
                <span className="section-title-gradient">Nossos Serviços</span>
              </h2>
              <p className="section-subtitle">
                Soluções completas de consultoria e assessoria técnica para empresas de telecomunicações
              </p>
            </div>
          </div>
          <div className="row g-4">
            {[
              { icon: 'bi-gear', title: 'Assessoria Técnica', description: 'Suporte técnico especializado para implementação, configuração e manutenção de sistemas de telecomunicações.' },
              { icon: 'bi-laptop', title: 'Implementação de Sistemas', description: 'Implementação e customização de sistemas de gestão específicos para empresas de telecomunicações.' },
              { icon: 'bi-graph-up', title: 'Análise e Planejamento', description: 'Análise de performance, planejamento estratégico e definição de métricas para crescimento sustentável.' },
              { icon: 'bi-headset', title: 'Suporte Contínuo', description: 'Acompanhamento contínuo, suporte técnico e consultoria para garantir operação eficiente e sem interrupções.' },
              { icon: 'bi-diagram-3', title: 'Otimização de Rede', description: 'Análise e otimização de infraestrutura de rede para melhor desempenho e confiabilidade.' },
              { icon: 'bi-shield-check', title: 'Segurança e Compliance', description: 'Implementação de políticas de segurança e conformidade com regulamentações do setor.' },
            ].map((service, index) => (
              <div key={index} className="col-md-6 col-lg-4">
                <div className="service-card">
                  <i className={`bi ${service.icon} service-icon`}></i>
                  <h4>{service.title}</h4>
                  <p>{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marcas e Tecnologias Section */}
      <section id="tecnologias" className="section-technologies">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mx-auto text-center mb-5">
              <h2 className="section-title">
                <span className="section-title-gradient">Marcas e Tecnologias</span>
              </h2>
              <p className="section-subtitle">
                Trabalhamos com as principais marcas e tecnologias do mercado de telecomunicações
              </p>
            </div>
          </div>
          <div className="row g-4">
            {[
              { icon: 'bi-server', title: 'OLT', brands: ['VSOL', 'Fiberhome', 'Overteck'] },
              { icon: 'bi-wifi', title: 'Roteador de Borda', brands: ['Huawei', 'Mikrotik'] },
              { icon: 'bi-diagram-3', title: 'Switch', brands: ['Mikrotik', 'Intelbras', 'Grandstream'] },
              { icon: 'bi-laptop', title: 'ERPs', brands: ['IXC Provedor', 'SGP', 'Mikweb', 'Atlaz', 'MKAuth', 'Receitanet'] },
              { icon: 'bi-hdd', title: 'Virtualização', brands: ['Proxmox'] },
              { icon: 'bi-globe', title: 'DNS', brands: ['Unbound', 'Bind9'] },
              { icon: 'bi-graph-up', title: 'Monitoramento', brands: ['Zabbix', 'Grafana', 'The Dude', 'LibreNMS'] },
              { icon: 'bi-code-slash', title: 'API', brands: ['Bloqueio Anatel'] },
              { icon: 'bi-cpu', title: 'Sistemas Operacionais', brands: ['Windows Server', 'Debian', 'Ubuntu', 'Windows'] },
              { icon: 'bi-broadcast-tower', title: 'Rádios', brands: ['Intelbras', 'Mimosa', 'Mikrotik', 'Grandstream', 'Ubiquiti'] },
            ].map((category, index) => (
              <div key={index} className="col-md-6 col-lg-3">
                <div className="tech-category">
                  <div className="tech-category-header">
                    <i className={`bi ${category.icon}`}></i>
                    <h5 className="tech-category-title">{category.title}</h5>
                  </div>
                  <div className="tech-badges">
                    {category.brands.map((brand) => {
                      const logo = getBrandLogo(brand);
                      const isInvert = brand === 'Bloqueio Anatel';
                      return (
                        <span key={brand} className="tech-badge" title={brand}>
                          {logo && (
                            <img 
                              src={logo} 
                              alt={brand} 
                              className={`tech-badge-logo ${isInvert ? 'tech-badge-logo-invert' : ''}`}
                              loading="lazy"
                              width="40"
                              height="40"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                            />
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos Section */}
      <section id="recursos" className="section-features">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h2 className="section-title">
                <span className="section-title-gradient">Por Que Escolher Nossa Consultoria?</span>
              </h2>
              <div className="feature-list">
                {[
                  { title: 'Conhecimento Especializado', description: 'Equipe com vasta experiência no mercado de telecomunicações e tecnologias relacionadas' },
                  { title: 'Soluções Personalizadas', description: 'Cada projeto é desenvolvido sob medida para atender às necessidades específicas do cliente' },
                  { title: 'Resultados Comprovados', description: 'Histórico de projetos bem-sucedidos que geraram aumento de eficiência e rentabilidade' },
                  { title: 'Suporte Dedicado', description: 'Acompanhamento próximo e suporte técnico contínuo para garantir o sucesso do projeto' },
                ].map((feature, index) => (
                  <div key={index} className="feature-item">
                    <i className="bi bi-check-circle-fill"></i>
                    <div>
                      <h5>{feature.title}</h5>
                      <p>{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <div className="features-image-wrapper">
                <div className="features-image-glow"></div>
                <div className="features-image-content">
                  <i className="bi bi-lightning-charge"></i>
                </div>
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
              <h2 className="section-title">
                <span className="section-title-gradient">Entre em Contato</span>
              </h2>
              <p className="section-subtitle mb-5">
                Estamos prontos para ajudar sua empresa a alcançar melhores resultados.
                Solicite um orçamento ou agende uma consultoria.
              </p>
              <div className="contact-info">
                {dadosEmpresa?.email && (
                  <a 
                    href={getEmailLink(dadosEmpresa.email)} 
                    className="contact-item"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-envelope"></i>
                    <span>{dadosEmpresa.email}</span>
                  </a>
                )}
                {dadosEmpresa?.telefone && (
                  <a 
                    href={getPhoneLink(dadosEmpresa.telefone)} 
                    className="contact-item"
                  >
                    <i className="bi bi-telephone"></i>
                    <span>{dadosEmpresa.telefone}</span>
                  </a>
                )}
                {dadosEmpresa?.celular && (
                  <a 
                    href={getWhatsAppLink(dadosEmpresa.celular)} 
                    className="contact-item"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-whatsapp"></i>
                    <span>{dadosEmpresa.celular}</span>
                  </a>
                )}
                {(!dadosEmpresa?.email && !dadosEmpresa?.telefone && !dadosEmpresa?.celular) && (
                  <>
                    <a 
                      href={getEmailLink('contato@consultoriatelecom.com.br')} 
                      className="contact-item"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="bi bi-envelope"></i>
                      <span>contato@consultoriatelecom.com.br</span>
                    </a>
                    <a 
                      href={getPhoneLink('(00) 0000-0000')} 
                      className="contact-item"
                    >
                      <i className="bi bi-telephone"></i>
                      <span>(00) 0000-0000</span>
                    </a>
                  </>
                )}
              </div>
              <div className="mt-5">
                <button className="btn btn-primary-gradient btn-lg" onClick={() => scrollToSection('contato')}>
                  Solicitar Orçamento
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="footer-brand">
                {dadosEmpresa?.logo ? (
                  <img 
                    src={dadosEmpresa.logo} 
                    alt={companyName}
                    className="footer-logo"
                    loading="lazy"
                    width="40"
                    height="40"
                  />
                ) : (
                  <div className="footer-icon">
                    <i className="bi bi-broadcast-tower"></i>
                  </div>
                )}
                <div>
                  <h5 className="footer-brand-name">{companyName}</h5>
                  <p className="footer-description">
                    Consultoria e assessoria técnica especializada em telecomunicações.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6 text-md-end">
              <p className="footer-copyright">
                &copy; {new Date().getFullYear()} {companyName}. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
