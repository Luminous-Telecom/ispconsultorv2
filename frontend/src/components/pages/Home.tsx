import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
              <i className="bi bi-broadcast me-2"></i>
              <span>BackNet</span>
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
                    Acessar Sistema
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
                Sistema de Gestão Completo para sua Empresa
              </h1>
              <p className="hero-subtitle">
                Gerencie clientes, contratos, planos e finanças de forma integrada e eficiente.
                Tudo em um único lugar, com segurança e praticidade.
              </p>
              <div className="hero-buttons">
                <Link to="/adm" className="btn btn-primary btn-lg me-3">
                  Começar Agora
                </Link>
                <button className="btn btn-outline-primary btn-lg" onClick={() => scrollToSection('sobre')}>
                  Saiba Mais
                </button>
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <div className="hero-image">
                <i className="bi bi-graph-up-arrow"></i>
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
              <h2 className="section-title">Sobre o BackNet</h2>
              <p className="section-subtitle">
                Uma solução completa de gestão empresarial desenvolvida para simplificar
                e otimizar os processos do seu negócio.
              </p>
            </div>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-shield-check"></i>
                </div>
                <h3>Seguro e Confiável</h3>
                <p>
                  Seus dados protegidos com as melhores práticas de segurança
                  e criptografia.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-lightning-charge"></i>
                </div>
                <h3>Rápido e Eficiente</h3>
                <p>
                  Interface intuitiva e processos otimizados para máxima
                  produtividade.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-phone"></i>
                </div>
                <h3>Totalmente Responsivo</h3>
                <p>
                  Acesse de qualquer dispositivo, a qualquer momento,
                  de qualquer lugar.
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
                Soluções integradas para gerenciar todos os aspectos do seu negócio
              </p>
            </div>
          </div>
          <div className="row g-4">
            <div className="col-md-6 col-lg-4">
              <div className="service-card">
                <i className="bi bi-people service-icon"></i>
                <h4>Gestão de Clientes</h4>
                <p>
                  Cadastro completo, histórico de interações e controle
                  de relacionamento com seus clientes.
                </p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="service-card">
                <i className="bi bi-file-earmark-text service-icon"></i>
                <h4>Gestão de Contratos</h4>
                <p>
                  Criação, acompanhamento e renovação de contratos
                  de forma automatizada e organizada.
                </p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="service-card">
                <i className="bi bi-wifi service-icon"></i>
                <h4>Gestão de Planos</h4>
                <p>
                  Controle de planos e serviços oferecidos, com
                  flexibilidade para personalização.
                </p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="service-card">
                <i className="bi bi-bank service-icon"></i>
                <h4>Integração Bancária</h4>
                <p>
                  Integração com principais gateways de pagamento
                  para emissão automática de boletos.
                </p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="service-card">
                <i className="bi bi-cash-coin service-icon"></i>
                <h4>Controle Financeiro</h4>
                <p>
                  Acompanhamento de receitas, despesas e relatórios
                  financeiros detalhados.
                </p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="service-card">
                <i className="bi bi-graph-up service-icon"></i>
                <h4>Dashboard Inteligente</h4>
                <p>
                  Visão geral do negócio com gráficos e indicadores
                  em tempo real.
                </p>
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
              <h2 className="section-title">Recursos Avançados</h2>
              <div className="feature-list">
                <div className="feature-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <div>
                    <h5>Agendamento Automático</h5>
                    <p>Geração automática de títulos e boletos conforme configuração</p>
                  </div>
                </div>
                <div className="feature-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <div>
                    <h5>Webhooks Integrados</h5>
                    <p>Notificações em tempo real de eventos e atualizações</p>
                  </div>
                </div>
                <div className="feature-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <div>
                    <h5>Relatórios Personalizados</h5>
                    <p>Geração de relatórios e documentos personalizados</p>
                  </div>
                </div>
                <div className="feature-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <div>
                    <h5>Multi-usuário</h5>
                    <p>Sistema preparado para múltiplos usuários e permissões</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <div className="features-image">
                <i className="bi bi-gear-wide-connected"></i>
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
                Tem alguma dúvida ou precisa de suporte? Estamos aqui para ajudar!
              </p>
              <div className="contact-info">
                <div className="contact-item">
                  <i className="bi bi-envelope"></i>
                  <span>contato@backnet.com.br</span>
                </div>
                <div className="contact-item">
                  <i className="bi bi-telephone"></i>
                  <span>(00) 0000-0000</span>
                </div>
              </div>
              <div className="mt-5">
                <Link to="/adm" className="btn btn-primary btn-lg">
                  Acessar Sistema Administrativo
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
              <h5>
                <i className="bi bi-broadcast me-2"></i>
                BackNet
              </h5>
              <p className="text-muted">
                Sistema de gestão empresarial completo e integrado.
              </p>
            </div>
            <div className="col-md-6 text-md-end">
              <p className="text-muted mb-0">
                &copy; {new Date().getFullYear()} BackNet. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

