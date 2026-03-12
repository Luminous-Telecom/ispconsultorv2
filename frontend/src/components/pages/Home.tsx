import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BackNetLogo from '@/components/common/BackNetLogo';
import { useTheme } from '@/contexts/ThemeContext';
import './Home.scss';

const FEATURES = [
  {
    icon: 'bi-people',
    title: 'Clientes e Contratos',
    description: 'Gerencie todos os seus clientes e contratos em um único lugar com histórico completo.',
  },
  {
    icon: 'bi-currency-dollar',
    title: 'Cobrança Integrada',
    description: 'Integração de Bolix com Asaas e Efí. Receba pagamentos de forma simples e segura.',
  },
  {
    icon: 'bi-cash-stack',
    title: 'Contas a Pagar e Receber',
    description: 'Controle completo de contas a pagar e a receber com relatórios financeiros.',
  },
  {
    icon: 'bi-file-earmark-text',
    title: 'NFS-e Automática',
    description: 'Emita notas fiscais de serviço eletrônicas automaticamente com conformidade total.',
  },
  {
    icon: 'bi-chat-dots',
    title: 'E-mail e WhatsApp',
    description: 'Comunique-se com seus clientes através de múltiplos canais integrados automaticamente.',
  },
  {
    icon: 'bi-pencil-square',
    title: 'Assinatura Digital',
    description: 'Assine documentos digitalmente com validade legal garantida.',
  },
  {
    icon: 'bi-journal-text',
    title: 'Auditoria',
    description: 'Registro de todas as operações realizadas na plataforma para rastreabilidade e conformidade.',
  },
];

/* Comparativo: quem ainda usa planilha/manual vs BackNet */
const COMPARE_ANTES = [
  'Planilhas ou cadernos espalhados — clientes, contratos e contas em vários lugares',
  'Precisa enviar cobranças manualmente — depende de alguém lembrar e às vezes esquece',
  'Clientes e contratos desatualizados ou perdidos',
  'NFS-e e contratos feitos na mão, um por um',
  'Difícil saber quem pagou, quem está em atraso ou o status financeiro',
  'Sem auditoria — não sabe quem alterou ou quando',
];
const COMPARE_DEPOIS = [
  'Tudo centralizado em um único sistema',
  'Cobranças e lembretes automáticos no vencimento (e-mail e WhatsApp)',
  'Histórico completo de clientes e contratos',
  'NFS-e e assinatura digital automáticas',
  'Relatórios financeiros — inadimplentes, pagamentos em dia e contas a pagar/receber',
  'Auditoria completa de todas as operações na plataforma',
  'Em breve: Acesso SSH, Backup na Rede, Calculadora IP e Teste de Portas — ferramentas de telecom integradas',
];

const INTEGRATIONS = [
  { emoji: '🔌', title: 'API REST', desc: 'Integre seus sistemas através da API REST com autenticação por token' },
  { emoji: '🔗', title: 'Webhooks', desc: 'Receba notificações em tempo real de eventos do sistema' },
  { emoji: '📚', title: 'Documentação', desc: 'Documentação completa para integração e desenvolvimento' },
];

/* Autoatendimento — containers de um lado a outro (estilo Brisanet) */
const AUTOATENDIMENTO = [
  { icon: 'bi-box-arrow-in-right', title: 'Acessar Sistema', desc: 'Entre no painel com seu login e senha para gerenciar sua operação' },
  { icon: 'bi-receipt', title: '2ª via da fatura', desc: 'Consulte e baixe suas faturas pelo painel ou Central do Assinante' },
  { icon: 'bi-question-circle', title: 'Central de ajuda', desc: 'Documentação e tutoriais para tirar o máximo do BackNet' },
  { icon: 'bi-headset', title: 'Suporte', desc: 'Entre em contato pelo WhatsApp ou Telegram para suporte dedicado' },
  { icon: 'bi-file-earmark-text', title: 'Contratos', desc: 'Visualize e assine contratos digitalmente na Central do Assinante' },
];

const FUTURE_FEATURES = [
  {
    icon: 'bi-terminal',
    title: 'Acesso SSH',
    description: 'Acesso via terminal SSH aos equipamentos do cliente, quando suportado pelo dispositivo.',
  },
  {
    icon: 'bi-hdd-stack',
    title: 'Backup na Rede',
    description: 'Integração com a rede do cliente para backups automáticos dos equipamentos compatíveis.',
  },
  {
    icon: 'bi-calculator',
    title: 'Calculadora IP',
    description: 'Calculadora de IPv4 e IPv6 para sub-redes, máscaras e endereçamento.',
  },
  {
    icon: 'bi-file-earmark-bar-graph',
    title: 'Relatório de Serviços',
    description: 'Relatório detalhado dos serviços realizados para cada cliente.',
  },
  {
    icon: 'bi-clipboard-check',
    title: 'Ordem de Serviço',
    description: 'Controle completo de ordens de serviço com acompanhamento e histórico.',
  },
  {
    icon: 'bi-plug',
    title: 'Teste de Portas',
    description: 'Verificação de portas abertas e fechadas em equipamentos e serviços da rede.',
  },
];

const BENEFITS = [
  { title: 'Automação Completa', description: 'Reduza tarefas manuais e aumente a produtividade com automação inteligente' },
  { title: 'Relatórios em Tempo Real', description: 'Acompanhe métricas importantes e tome decisões baseadas em dados' },
  { title: 'Conformidade Legal', description: 'NFS-e, assinatura digital e todas as exigências fiscais atendidas' },
  { title: 'Suporte Dedicado', description: 'Equipe especializada pronta para ajudar seu negócio a crescer' },
  { title: 'Escalabilidade', description: 'Cresce com você, desde pequenas consultorias até grandes operações' },
  { title: 'Segurança de Dados', description: 'Seus dados protegidos com os mais altos padrões de segurança' },
  { title: 'Auditoria de Operações', description: 'Registro completo das operações realizadas na plataforma para rastreabilidade e conformidade' },
  { title: 'Atualizações Constantes', description: 'Sistema em evolução contínua com novas funcionalidades e melhorias frequentes' },
];

const FAQ_ITEMS = [
  {
    question: 'Quanto vai custar?',
    answer: 'Os valores variam conforme o tamanho da sua operação e o plano escolhido. Entre em contato pelo WhatsApp ou Telegram para receber uma proposta personalizada.',
  },
  {
    question: 'Como funciona o período de teste?',
    answer: 'Você tem 60 dias de teste gratuito para explorar todas as funcionalidades do sistema. Não é necessário cartão de crédito para começar.',
  },
  {
    question: 'Preciso de cartão de crédito para começar?',
    answer: 'Não. O teste gratuito não exige cartão. Você pode experimentar o BackNet e decidir a assinatura depois.',
  },
  {
    question: 'O sistema é seguro?',
    answer: 'Sim. Utilizamos criptografia e boas práticas de segurança para proteger seus dados. Além disso, mantemos auditoria de operações na plataforma.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim. Não há fidelidade. Você pode cancelar quando quiser, sem multas ou burocracia.',
  },
  {
    question: 'Vocês oferecem suporte?',
    answer: 'Sim. Contamos com suporte dedicado e documentação completa na Wiki para ajudar você a tirar o máximo proveito do sistema.',
  },
  {
    question: 'Como faço para começar?',
    answer: 'Clique em "Agendar Demonstração" e escolha WhatsApp ou Telegram. Nossa equipe vai orientar você no cadastro e na configuração inicial.',
  },
  {
    question: 'Quando serão lançadas novas atualizações?',
    answer: 'Lançamos atualizações frequentemente com correções e melhorias. O sistema está em evolução contínua; acompanhe a Wiki e nossos canais de contato para novidades.',
  },
  {
    question: 'Quando serão lançados novos recursos?',
    answer: 'Os recursos da seção "Em breve" estão em desenvolvimento. Entre em contato conosco para saber o status ou sugerir prioridades.',
  },
];

const CONTATO = {
  whatsapp: 'https://wa.me/5584998667245?text=Olá,%20queria%20acesso%20de%2060%20dias%20ao%20sistema%20BackNet',
  telegram: 'https://t.me/LucasMidia',
};

const SHOW_WIKI = false; // provisório — ativar quando a Wiki estiver pronta

const Home: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showContato, setShowContato] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const ctaButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lightboxSrc) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxSrc(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [lightboxSrc]);

  useEffect(() => {
    if (!showContato) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ctaButtonsRef.current && !ctaButtonsRef.current.contains(e.target as Node)) {
        setShowContato(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showContato]);

  useEffect(() => {
    document.title = 'BackNet';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'BackNet — Gestão para consultores de telecomunicações');
    }
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <BackNetLogo width={120} height={38} className="home-logo" />
          <nav className="home-nav home-nav-desktop">
            <button type="button" className="home-nav-link" onClick={() => scrollTo('compare')}>
              É para você?
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('recursos')}>
              Recursos
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('integracoes')}>
              Integrações
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('autoatendimento')}>
              Autoatendimento
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('beneficios')}>
              Benefícios
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('recursos-futuros')}>
              Em breve
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('planos')}>
              Planos
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('faq')}>
              FAQ
            </button>
            {SHOW_WIKI && (
              <a href="https://wiki.backnet.app/" target="_blank" rel="noopener noreferrer" className="home-nav-link home-nav-link-external">
                Wiki
              </a>
            )}
          </nav>
          <div className="home-header-actions">
            <button
              type="button"
              className="home-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            >
              <span className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`} />
            </button>
            <button type="button" className="home-btn home-btn-accent" onClick={() => window.open('/login', '_blank', 'noopener,noreferrer')}>
              Acessar Sistema
            </button>
          </div>
          <button
            type="button"
            className="home-menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
          >
            <span className={`bi ${isMenuOpen ? 'bi-x-lg' : 'bi-list'}`} />
          </button>
        </div>
        {isMenuOpen && (
          <div className="home-nav-mobile">
            <button type="button" className="home-nav-link" onClick={() => scrollTo('compare')}>
              É para você?
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('recursos')}>
              Recursos
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('integracoes')}>
              Integrações
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('autoatendimento')}>
              Autoatendimento
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('beneficios')}>
              Benefícios
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('recursos-futuros')}>
              Em breve
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('planos')}>
              Planos
            </button>
            <button type="button" className="home-nav-link" onClick={() => scrollTo('faq')}>
              FAQ
            </button>
            {SHOW_WIKI && (
              <a href="https://wiki.backnet.app/" target="_blank" rel="noopener noreferrer" className="home-nav-link home-nav-link-external" onClick={() => setIsMenuOpen(false)}>
                Wiki
              </a>
            )}
            <button type="button" className="home-btn home-btn-accent home-btn-full" onClick={() => window.open('/login', '_blank', 'noopener,noreferrer')}>
              Acessar Sistema
            </button>
          </div>
        )}
      </header>

      <main className="home-main">
        <section className="home-hero">
          <div className="home-hero-content">
            <h1 className="home-hero-title">
              Gestão para consultores de <span className="home-hero-accent">telecomunicações</span>
            </h1>
            <p className="home-hero-desc">
              Clientes, contratos, cobrança e NFS-e em um só lugar.
            </p>
            <div className="home-hero-checks">
              <div className="home-hero-check">
                <span className="home-hero-check-icon">✓</span>
                <span>Gestão completa de clientes e contratos</span>
              </div>
              <div className="home-hero-check">
                <span className="home-hero-check-icon">✓</span>
                <span>Integração de Bolix com Asaas e Efí</span>
              </div>
              <div className="home-hero-check">
                <span className="home-hero-check-icon">✓</span>
                <span>Automação de processos e notificações</span>
              </div>
            </div>
            <div className="home-hero-buttons">
              <button type="button" className="home-btn home-btn-outline" onClick={() => scrollTo('recursos')}>
                Saiba mais
              </button>
            </div>
          </div>
          <div className="home-hero-visual">
            <div className="home-hero-visual-glow" />
            <button type="button" className="home-hero-visual-link" onClick={() => setLightboxSrc('/dashboard.png')}>
              <img src="/dashboard.png" alt="BackNet Dashboard" className="home-hero-visual-img" />
            </button>
          </div>
        </section>

        <section id="compare" className="home-section home-compare">
          <div className="home-section-inner">
            <div className="home-section-header">
              <h2 className="home-section-title">É para você?</h2>
              <p className="home-section-desc">
                Se você se identificou com "Planilha ou sistema descentralizado", o BackNet foi feito para sua consultoria.
              </p>
            </div>
            <div className="home-compare-grid">
              <div className="home-compare-col home-compare-antigo">
                <h3 className="home-compare-col-title">
                  <span className="bi bi-x-circle" />
                  Planilha ou sistema descentralizado
                </h3>
                <ul className="home-compare-list">
                  {COMPARE_ANTES.map((item) => (
                    <li key={item}>
                      <span className="bi bi-x" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="home-compare-col home-compare-novo">
                <h3 className="home-compare-col-title">
                  <span className="bi bi-check-circle-fill" />
                  Com o BackNet
                </h3>
                <ul className="home-compare-list">
                  {COMPARE_DEPOIS.map((item) => (
                    <li key={item}>
                      <span className="bi bi-check-lg" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="home-section home-features">
          <div className="home-section-inner">
            <div className="home-section-header">
              <h2 className="home-section-title">Recursos Completos</h2>
              <p className="home-section-desc">
                Todas as ferramentas que você precisa para gerenciar sua consultoria de telecomunicações
              </p>
            </div>
            <div className="home-features-grid">
              {FEATURES.map((f) => (
                <article key={f.title} className="home-feature-card">
                  <div className="home-feature-icon-wrap">
                    <span className={`bi ${f.icon}`} />
                  </div>
                  <h3 className="home-feature-title">{f.title}</h3>
                  <p className="home-feature-desc">{f.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="integracoes" className="home-section home-integrations">
          <div className="home-section-inner">
            <div className="home-section-header">
              <h2 className="home-section-title">Integração com API</h2>
              <p className="home-section-desc">
                Conecte seus sistemas através da API do BackNet
              </p>
            </div>
            <div className="home-integrations-grid">
              {INTEGRATIONS.map((item) => (
                <div key={item.title} className="home-integration-card">
                  <div className="home-integration-icon">{item.emoji}</div>
                  <h3 className="home-integration-title">{item.title}</h3>
                  <p className="home-integration-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="autoatendimento" className="home-section home-autoatendimento">
          <div className="home-section-inner">
            <div className="home-section-header">
              <h2 className="home-section-title">Autoatendimento para clientes</h2>
              <p className="home-section-desc">
                Acesse rapidamente os recursos disponíveis no BackNet
              </p>
            </div>
            <div className="home-autoatendimento-grid">
              {AUTOATENDIMENTO.map((item) => {
                const isSuporte = item.title === 'Suporte';
                const isAcessarSistema = item.title === 'Acessar Sistema';
                const isClickable = isSuporte || isAcessarSistema;
                const handleClick = isSuporte ? () => { setShowContato(true); scrollTo('cta'); } : isAcessarSistema ? () => window.open('/login', '_blank', 'noopener,noreferrer') : undefined;
                const handleKeyDown = isClickable ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick?.(); } } : undefined;
                return (
                <div
                  key={item.title}
                  className={`home-autoatendimento-card ${isClickable ? 'home-autoatendimento-card-clickable' : ''}`}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={handleClick}
                  onKeyDown={handleKeyDown}
                >
                  <span className={`bi ${item.icon} home-autoatendimento-icon`} />
                  <h3 className="home-autoatendimento-title">{item.title}</h3>
                  <p className="home-autoatendimento-desc">{item.desc}</p>
                  <span className="bi bi-chevron-right home-autoatendimento-arrow" />
                </div>
              );
              })}
            </div>
          </div>
        </section>

        <section id="beneficios" className="home-section home-benefits">
          <div className="home-section-inner home-benefits-inner">
          <div className="home-benefits-visual">
            <div className="home-benefits-glow" />
            <button type="button" className="home-benefits-visual-link" onClick={() => setLightboxSrc('/dashboard%20clara.png')}>
              <img src="/dashboard%20clara.png" alt="BackNet Dashboard" className="home-benefits-img" />
            </button>
          </div>
          <div className="home-benefits-content">
            <h2 className="home-section-title">Por que escolher BackNet?</h2>
            <p className="home-benefits-intro">
              Desenvolvido especificamente para consultores de telecomunicações que buscam eficiência e crescimento
            </p>
            <div className="home-benefits-list">
              {BENEFITS.map((b) => (
                <div key={b.title} className="home-benefit-item">
                  <span className="bi bi-check-circle-fill home-benefit-icon" />
                  <div>
                    <h3 className="home-benefit-title">{b.title}</h3>
                    <p className="home-benefit-desc">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </section>

        <section id="planos" className="home-section home-planos">
          <div className="home-section-inner">
          <div className="home-section-header">
            <h2 className="home-section-title">Planos</h2>
            <p className="home-section-desc home-planos-soon">
              <span className="bi bi-clock-history" /> Planos em breve. Entre em contato para uma proposta personalizada.
            </p>
          </div>
          </div>
        </section>

        <section id="faq" className="home-section home-faq">
          <div className="home-section-inner">
          <div className="home-section-header">
            <h2 className="home-section-title">Perguntas Frequentes</h2>
            <p className="home-section-desc">
              Tire suas dúvidas sobre o BackNet
            </p>
          </div>
          <div className="home-faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div key={item.question} className="home-faq-item">
                <button
                  type="button"
                  className="home-faq-question"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  aria-expanded={faqOpen === i}
                >
                  <span>{item.question}</span>
                  <span className={`bi ${faqOpen === i ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                </button>
                {faqOpen === i && <p className="home-faq-answer">{item.answer}</p>}
              </div>
            ))}
          </div>
          </div>
        </section>

        <section id="recursos-futuros" className="home-section home-future-features">
          <div className="home-section-inner">
          <div className="home-section-header">
            <h2 className="home-section-title">Recursos em breve</h2>
            <p className="home-section-desc">
              Novas funcionalidades em desenvolvimento para otimizar ainda mais sua operação
            </p>
          </div>
          <div className="home-features-grid">
            {FUTURE_FEATURES.map((f) => (
              <article key={f.title} className="home-feature-card home-feature-card-future">
                <div className="home-feature-icon-wrap">
                  <span className={`bi ${f.icon}`} />
                </div>
                <span className="home-feature-badge">Em breve</span>
                <h3 className="home-feature-title">{f.title}</h3>
                <p className="home-feature-desc">{f.description}</p>
              </article>
            ))}
          </div>
          </div>
        </section>

        <section id="cta" className="home-cta">
          <div className="home-cta-inner">
            <h2 className="home-cta-title">Pronto para transformar sua gestão?</h2>
            <p className="home-cta-desc">
              Comece a gerenciar seu negócio com eficiência usando o BackNet
            </p>
            <div className="home-cta-buttons" ref={ctaButtonsRef}>
              {!showContato ? (
                <button type="button" className="home-btn home-btn-cta-outline" onClick={() => setShowContato(true)}>
                  Agendar Demonstração
                </button>
              ) : (
                <>
                  <a href={CONTATO.whatsapp} target="_blank" rel="noopener noreferrer" className="home-btn home-btn-contato">
                    <span className="bi bi-whatsapp" />
                    WhatsApp
                  </a>
                  <a href={CONTATO.telegram} target="_blank" rel="noopener noreferrer" className="home-btn home-btn-contato">
                    <span className="bi bi-telegram" />
                    Telegram
                  </a>
                </>
              )}
            </div>
            <p className="home-cta-note">60 dias de teste gratuito. Sem cartão de crédito necessário.</p>
          </div>
        </section>

        <footer className="home-footer">
          <div className="home-footer-grid">
            <div className="home-footer-brand">
              <div className="home-footer-logo-wrap">
                <BackNetLogo width={32} height={32} className="home-footer-logo" />
                <span className="home-footer-brand-name">BackNet</span>
              </div>
              <p className="home-footer-tagline">Gestão completa para consultores de telecomunicações</p>
            </div>
            <div className="home-footer-links">
              <h3>Produto</h3>
              <a href="#compare" onClick={(e) => { e.preventDefault(); scrollTo('compare'); }}>É para você?</a>
              <a href="#recursos" onClick={(e) => { e.preventDefault(); scrollTo('recursos'); }}>Recursos</a>
              <a href="#integracoes" onClick={(e) => { e.preventDefault(); scrollTo('integracoes'); }}>Integrações</a>
              <a href="#autoatendimento" onClick={(e) => { e.preventDefault(); scrollTo('autoatendimento'); }}>Autoatendimento</a>
              <a href="#beneficios" onClick={(e) => { e.preventDefault(); scrollTo('beneficios'); }}>Benefícios</a>
              <a href="#recursos-futuros" onClick={(e) => { e.preventDefault(); scrollTo('recursos-futuros'); }}>Em breve</a>
              <a href="#planos" onClick={(e) => { e.preventDefault(); scrollTo('planos'); }}>Planos</a>
              <a href="#faq" onClick={(e) => { e.preventDefault(); scrollTo('faq'); }}>FAQ</a>
            </div>
          </div>
          <div className="home-footer-bottom">
            <p>© {new Date().getFullYear()} BackNet. Todos os direitos reservados.</p>
            <div className="home-footer-legal">
              <Link to="/privacidade" className="home-footer-legal-link">Privacidade</Link>
              <Link to="/termos" className="home-footer-legal-link">Termos</Link>
              <Link to="/cookies" className="home-footer-legal-link">Cookies</Link>
            </div>
          </div>
        </footer>
      </main>

      {lightboxSrc && (
        <div
          className="home-lightbox"
          onClick={() => setLightboxSrc(null)}
          aria-label="Fechar imagem (clique fora)"
        >
          <img src={lightboxSrc} alt="BackNet Dashboard" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default Home;
