import { wikiUrl } from 'constants/siteWiki';

export const HERO_CHECKS = [
  'Clientes, contratos, cobrança e NFS-e em um só lugar',
  'Bolix integrado com Asaas e Efí',
  'Dashboard, auditoria, SSH, backup e RPKI',
  'Central de ajuda com wiki e tutoriais passo a passo',
];

export const STATS_STRIP = [
  { value: '10+', label: 'Módulos do ERP' },
  { value: '60', label: 'Dias de teste grátis' },
  { value: 'API', label: 'REST + Webhooks' },
  { value: '24/7', label: 'Wiki e tutoriais' },
];

export const ERP_MODULES = [
  {
    icon: 'bi-people',
    title: 'Cadastros',
    description: 'Clientes, contratos, planos, bancos, documentos e usuários.',
    href: wikiUrl('/doc/clientes/cadastro-cliente'),
  },
  {
    icon: 'bi-wallet2',
    title: 'Financeiro',
    description: 'Contas a receber e a pagar, títulos, NFS-e e relatórios.',
    href: wikiUrl('/doc/financeiro/contas-a-receber'),
  },
  {
    icon: 'bi-hdd-network',
    title: 'Equipamentos',
    description: 'Agentes, túneis, SSH Manager e backup automático na rede.',
    href: wikiUrl('/doc/equipamentos/agentes'),
  },
  {
    icon: 'bi-shield-check',
    title: 'RPKI',
    description: 'CAs, ROAs, ASPAs, repositórios e validação de rotas BGP.',
    href: wikiUrl('/doc/rpki/rpki'),
  },
  {
    icon: 'bi-plug',
    title: 'Integrações',
    description: 'Asaas, Efí, e-mail, WhatsApp, IXC, Typebot e API REST.',
    href: wikiUrl('/doc/integracoes/api'),
  },
  {
    icon: 'bi-life-preserver',
    title: 'Suporte',
    description: 'Ordens de serviço e acompanhamento operacional.',
    href: wikiUrl('/doc/suporte/ordens-de-servico'),
  },
  {
    icon: 'bi-journal-text',
    title: 'Logs',
    description: 'Auditoria, comunicação, equipamentos e eventos RPKI.',
    href: wikiUrl('/doc/logs/auditoria'),
  },
  {
    icon: 'bi-gear',
    title: 'Parâmetros',
    description: 'Dados da empresa, rotinas, dias de vencimento e recursos.',
    href: wikiUrl('/doc/parametros/dados-empresa'),
  },
];

export const FEATURES = [
  {
    icon: 'bi-people',
    title: 'Clientes e Contratos',
    description: 'Gerencie clientes, contratos, planos adicionais e histórico completo.',
  },
  {
    icon: 'bi-currency-dollar',
    title: 'Cobrança Integrada',
    description: 'Bolix com Asaas e Efí. Boletos, Pix e lembretes automáticos.',
  },
  {
    icon: 'bi-cash-stack',
    title: 'Contas a Pagar e Receber',
    description: 'Títulos, inadimplência, recebidos e fluxo financeiro no dashboard.',
  },
  {
    icon: 'bi-file-earmark-text',
    title: 'NFS-e Automática',
    description: 'Emissão de notas fiscais de serviço com conformidade fiscal.',
  },
  {
    icon: 'bi-chat-dots',
    title: 'E-mail e WhatsApp',
    description: 'Comunicação multicanal com templates e rotinas automáticas.',
  },
  {
    icon: 'bi-pencil-square',
    title: 'Assinatura Digital',
    description: 'Contratos e termos com assinatura digital na Central do Assinante.',
  },
  {
    icon: 'bi-journal-text',
    title: 'Auditoria',
    description: 'Registro de operações para rastreabilidade e conformidade.',
  },
  {
    icon: 'bi-terminal',
    title: 'Acesso SSH',
    description: 'Terminal remoto nos equipamentos via agente e SSH Manager.',
  },
  {
    icon: 'bi-hdd-stack',
    title: 'Backup na Rede',
    description: 'Backups agendados com histórico de sucesso e falha no dashboard.',
  },
  {
    icon: 'bi-shield-check',
    title: 'RPKI',
    description: 'Gestão de ROAs, ASPAs, repositórios e validação BGP integrada.',
  },
];

export const COMPARE_ANTES = [
  'Planilhas e cadernos — clientes, contratos e contas espalhados',
  'Cobrança manual — depende de alguém lembrar do vencimento',
  'Dados desatualizados ou perdidos entre ferramentas',
  'NFS-e e contratos feitos um a um, na mão',
  'Difícil saber quem pagou, quem está em atraso ou o fluxo de caixa',
  'Sem auditoria — não sabe quem alterou ou quando',
];

export const COMPARE_DEPOIS = [
  'Tudo centralizado no ERP com dashboard em tempo real',
  'Cobranças e lembretes automáticos (e-mail e WhatsApp)',
  'Histórico completo de clientes, contratos e financeiro',
  'NFS-e, assinatura digital e documentos automatizados',
  'Relatórios de inadimplência, recebidos e contas a pagar',
  'Auditoria de todas as operações na plataforma',
  'RPKI, SSH, backup e integrações em um único sistema',
  'Wiki com tutoriais alinhados aos menus do ERP',
];

export const INTEGRATIONS = [
  {
    icon: 'bi-braces',
    title: 'API REST',
    desc: 'Integre sistemas externos com autenticação por token de API.',
    href: wikiUrl('/doc/integracoes/api'),
  },
  {
    icon: 'bi-lightning',
    title: 'Webhooks',
    desc: 'Receba notificações em tempo real de eventos do ERP.',
    href: wikiUrl('/doc/integracoes/api'),
  },
  {
    icon: 'bi-book',
    title: 'Documentação',
    desc: 'Central de ajuda com passo a passo de cada tela e integração.',
    href: wikiUrl('/doc/'),
  },
];

export const WIKI_HUBS = [
  {
    icon: 'bi-layout-text-window-reverse',
    title: 'Primeiros passos',
    description: 'Dashboard, listagens e visão geral do ERP.',
    href: wikiUrl('/doc/geral/dashboard'),
  },
  {
    icon: 'bi-person-vcard',
    title: 'Cadastros',
    description: 'Clientes, contratos, planos, bancos e documentos.',
    href: wikiUrl('/doc/clientes/cadastro-cliente'),
  },
  {
    icon: 'bi-cash-coin',
    title: 'Financeiro',
    description: 'Contas a receber, a pagar, títulos e NFS-e.',
    href: wikiUrl('/doc/financeiro/contas-a-receber'),
  },
  {
    icon: 'bi-router',
    title: 'Equipamentos e RPKI',
    description: 'Agentes, SSH, backup e certificação de rotas.',
    href: wikiUrl('/doc/equipamentos/agentes'),
  },
  {
    icon: 'bi-puzzle',
    title: 'Integrações',
    description: 'Asaas, Efí, WhatsApp, IXC, Typebot e API.',
    href: wikiUrl('/doc/integracoes/api'),
  },
  {
    icon: 'bi-search',
    title: 'Busca na wiki',
    description: 'Encontre procedimentos pelo menu ou barra de busca.',
    href: wikiUrl('/doc/'),
  },
];

export const AUTOATENDIMENTO = [
  {
    icon: 'bi-box-arrow-in-right',
    title: 'Acessar Sistema',
    desc: 'Entre no painel ERP com login e senha.',
    action: 'login' as const,
  },
  {
    icon: 'bi-receipt',
    title: '2ª via da fatura',
    desc: 'Consulte títulos pelo painel ou Central do Assinante.',
    action: 'none' as const,
  },
  {
    icon: 'bi-book',
    title: 'Central de ajuda',
    desc: 'Wiki com tutoriais de cada módulo do ERP.',
    action: 'wiki' as const,
  },
  {
    icon: 'bi-headset',
    title: 'Suporte',
    desc: 'WhatsApp e Telegram para dúvidas e demonstração.',
    action: 'contato' as const,
  },
  {
    icon: 'bi-file-earmark-text',
    title: 'Contratos',
    desc: 'Visualize e assine contratos na Central do Assinante.',
    action: 'none' as const,
  },
];

export const FUTURE_FEATURES = [
  {
    icon: 'bi-calculator',
    title: 'Calculadora IP',
    description: 'Sub-redes IPv4/IPv6, máscaras e endereçamento.',
  },
  {
    icon: 'bi-file-earmark-bar-graph',
    title: 'Relatório de Serviços',
    description: 'Relatório detalhado dos serviços por cliente.',
  },
  {
    icon: 'bi-clipboard-check',
    title: 'Ordem de Serviço',
    description: 'Controle de OS com acompanhamento e histórico.',
  },
  {
    icon: 'bi-plug',
    title: 'Teste de Portas',
    description: 'Verificação de portas em equipamentos e serviços.',
  },
  {
    icon: 'bi-diagram-3',
    title: 'Relatórios de CGNAT',
    description: 'Consultas e relatórios de sessões e mapeamentos CGNAT.',
  },
  {
    icon: 'bi-broadcast',
    title: 'RADIUS Emerencial',
    description: 'Acesso temporário e contingência via RADIUS para clientes e equipamentos.',
  },
  {
    icon: 'bi-shield-lock',
    title: 'Gerenciador de Senhas',
    description: 'Armazenamento seguro e organizado de credenciais de rede e equipamentos.',
  },
];

export const BENEFITS = [
  { title: 'Automação Completa', description: 'Reduza tarefas manuais com rotinas e integrações.' },
  { title: 'Relatórios em Tempo Real', description: 'Dashboard com métricas de clientes, contratos e financeiro.' },
  { title: 'Conformidade Legal', description: 'NFS-e, assinatura digital e exigências fiscais.' },
  { title: 'Suporte Dedicado', description: 'Equipe e wiki para tirar o máximo do sistema.' },
  { title: 'Escalabilidade', description: 'Do consultor solo à operação com múltiplos usuários.' },
  { title: 'Segurança de Dados', description: 'Multi-tenant, auditoria e boas práticas de acesso.' },
  { title: 'Auditoria de Operações', description: 'Rastreabilidade de alterações no ERP.' },
  { title: 'Atualizações Constantes', description: 'Evolução contínua com documentação na wiki.' },
];

export const FAQ_ITEMS = [
  {
    question: 'Quanto vai custar?',
    answer: 'Os valores variam conforme o tamanho da operação. Entre em contato pelo WhatsApp ou Telegram para uma proposta personalizada.',
  },
  {
    question: 'Como funciona o período de teste?',
    answer: 'São 60 dias de teste gratuito para explorar o ERP. Não é necessário cartão de crédito.',
  },
  {
    question: 'Preciso de cartão de crédito para começar?',
    answer: 'Não. Experimente o ISP Consultor e decida a assinatura depois.',
  },
  {
    question: 'O sistema é seguro?',
    answer: 'Sim. Criptografia, isolamento por empresa, auditoria e controle de acesso por usuário.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim. Sem fidelidade, multas ou burocracia.',
  },
  {
    question: 'Vocês oferecem suporte?',
    answer: 'Sim. Suporte por WhatsApp e Telegram, além da wiki com tutoriais de cada tela do ERP.',
  },
  {
    question: 'Onde fica a documentação?',
    answer: 'Na Central de Ajuda (wiki), com artigos espelhando os menus do sistema — cadastros, financeiro, integrações e mais.',
  },
  {
    question: 'Como faço para começar?',
    answer: 'Clique em "Agendar Demonstração" ou acesse a wiki para conhecer os módulos antes do teste.',
  },
  {
    question: 'Quando saem novos recursos?',
    answer: 'Atualizações frequentes. Acompanhe a seção "Módulos em desenvolvimento" e a wiki para novidades.',
  },
];

export const CONTATO = {
  whatsapp: 'https://wa.me/5584998667245?text=Ol%C3%A1,%20queria%20acesso%20de%2060%20dias%20ao%20sistema%20ISP%20Consultor',
  telegram: 'https://t.me/LucasMidia',
};

export const WIKI_HOME_URL = wikiUrl('/doc/');

export const NAV_ITEMS = [
  { id: 'compare', label: 'É para você?' },
  { id: 'modulos', label: 'Módulos' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'integracoes', label: 'Integrações' },
  { id: 'wiki', label: 'Wiki' },
  { id: 'autoatendimento', label: 'Autoatendimento' },
  { id: 'beneficios', label: 'Benefícios' },
  { id: 'recursos-futuros', label: 'Em desenvolvimento' },
  { id: 'faq', label: 'FAQ' },
] as const;

export const FOOTER_WIKI_LINKS = [
  { label: 'Central de Ajuda', href: WIKI_HOME_URL },
  { label: 'Dashboard ERP', href: wikiUrl('/doc/geral/dashboard') },
  { label: 'API REST', href: wikiUrl('/doc/integracoes/api') },
  { label: 'Listagens', href: wikiUrl('/doc/geral/listagens') },
];

export const FOOTER_LINKS = NAV_ITEMS;
