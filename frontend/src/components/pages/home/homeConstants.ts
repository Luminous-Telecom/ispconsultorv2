import { wikiUrl } from 'constants/siteWiki';

export const HERO_CHECKS = [
  'Clientes, contratos, financeiro e NFS-e centralizados',
  'Equipamentos, SSH, backup e RPKI na mesma plataforma',
  '60 dias de teste grátis · wiki e suporte incluídos',
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
];

export const FAQ_ITEMS = [
  {
    question: 'Como funciona o período de teste?',
    answer: 'São 60 dias gratuitos para explorar o ERP, sem cartão de crédito.',
  },
  {
    question: 'Como escolho o plano?',
    answer: 'Compare limites e módulos na tabela de planos. Para algo sob medida, fale conosco pelo WhatsApp.',
  },
  {
    question: 'O sistema é seguro?',
    answer: 'Sim. Isolamento por empresa, auditoria e controle de acesso por usuário.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim. Sem fidelidade ou multas.',
  },
  {
    question: 'Vocês oferecem suporte?',
    answer: 'Suporte por WhatsApp e Telegram, além da wiki com tutoriais de cada tela do ERP.',
  },
];

export const CONTATO = {
  whatsapp: 'https://wa.me/5584998667245?text=Ol%C3%A1,%20queria%20acesso%20de%2060%20dias%20ao%20sistema%20ISP%20Consultor',
  telegram: 'https://t.me/LucasMidia',
};

export const WIKI_HOME_URL = wikiUrl('/doc/');

export const NAV_ITEMS = [
  { id: 'planos', label: 'Planos' },
  { id: 'modulos', label: 'Módulos' },
  { id: 'faq', label: 'FAQ' },
] as const;

export const FOOTER_WIKI_LINKS = [
  { label: 'Central de Ajuda', href: WIKI_HOME_URL },
  { label: 'Dashboard ERP', href: wikiUrl('/doc/geral/dashboard') },
  { label: 'API REST', href: wikiUrl('/doc/integracoes/api') },
];

export const FOOTER_LINKS = NAV_ITEMS;
