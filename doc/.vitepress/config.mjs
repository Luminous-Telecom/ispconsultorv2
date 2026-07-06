import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: '.',
  cleanUrls: true,
  /** Conteúdo em `erp/` no disco; URLs públicas permanecem em `/doc/` */
  rewrites(id) {
    if (id.startsWith('erp/')) return id.replace(/^erp\//, 'doc/')
  },
  lang: 'pt-BR',
  title: 'wiki ispconsultor',
  titleTemplate: false,
  transformPageData(pageData) {
    pageData.title = 'wiki ispconsultor'
    return pageData
  },
  description: "Wiki ISP Consultor — central de ajuda para consultores que atendem clientes",
  appearance: {
    initialValue: 'dark',
    valueLight: 'light',
    valueDark: 'dark',
  },
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/favicon-32x32.png' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }],
    // VueUse useDark grava "" no modo claro; o script check-dark-mode do VitePress trata "" como falsy e volta ao dark
    ['script', {}, `(function(){try{var k='vitepress-theme-appearance',v=localStorage.getItem(k);if(v==='')localStorage.setItem(k,'light')}catch(e){}})()`],
    ['script', {}, `(function(){try{var p=location.pathname;if(p==='/doc'||p.indexOf('/doc/')===0){document.documentElement.classList.add('isp-doc-route')}}catch(e){}})()`],
  ],
  themeConfig: {
    siteTitle: 'Central de Ajuda',
    logo: {
      src: '/favicon-32x32.png',
      alt: 'ISP Consultor'
    },

    // Textos da interface do tema (VitePress não traduz automaticamente com lang)
    outline: {
      label: 'Nesta página',
      level: [2, 3]
    },
    docFooter: {
      prev: 'Página anterior',
      next: 'Próxima página'
    },
    darkModeSwitchLabel: 'Aparência',
    lightModeSwitchTitle: 'Mudar para tema claro',
    darkModeSwitchTitle: 'Mudar para tema escuro',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Voltar ao topo',
    skipToContentLabel: 'Ir para o conteúdo',
    lastUpdated: {
      text: 'Atualizado em',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },
    notFound: {
      title: 'PÁGINA NÃO ENCONTRADA',
      quote: 'Não encontramos o que você procurava neste endereço.',
      linkLabel: 'ir para a página inicial',
      linkText: 'Voltar ao início'
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Buscar',
                buttonAriaLabel: 'Buscar documentação'
              },
              modal: {
                displayDetails: 'Exibir lista detalhada',
                resetButtonTitle: 'Limpar busca',
                backButtonTitle: 'Fechar busca',
                noResultsText: 'Nenhum resultado encontrado',
                footer: {
                  selectText: 'selecionar',
                  selectKeyAriaLabel: 'Enter',
                  navigateText: 'navegar',
                  navigateUpKeyAriaLabel: 'seta para cima',
                  navigateDownKeyAriaLabel: 'seta para baixo',
                  closeText: 'fechar',
                  closeKeyAriaLabel: 'Esc'
                }
              }
            }
          }
        }
      }
    },
    
    // Links do menu superior direito
    nav: [
      { text: 'Início', link: '/' },
      { text: 'Documentação', link: '/doc/' },
      { text: 'API', link: '/doc/integracoes/api' }
    ],
    
    // Menu lateral — somente nas páginas de documentação (/doc/)
    sidebar: {
      '/doc/': [
      { text: 'Visão geral', link: '/doc/' },
      {
        text: 'Referência',
        collapsed: true,
        items: [
          { text: 'Dashboard', link: '/doc/geral/dashboard' },
          { text: 'Listagens do ERP', link: '/doc/geral/listagens' }
        ]
      },
      {
        text: 'Cadastros',
        collapsed: true,
        items: [
          {
            text: 'Clientes',
            collapsed: true,
            items: [
              { text: 'Cadastro e listagem', link: '/doc/clientes/cadastro-cliente' },
              { text: 'Aba Contratos', link: '/doc/clientes/aba-contratos' },
              { text: 'Aba Financeiro', link: '/doc/clientes/aba-financeiro' },
              { text: 'Aba Arquivos', link: '/doc/clientes/aba-arquivos' },
              { text: 'Abas RPKI', link: '/doc/clientes/aba-rpki' },
              { text: 'Abas Equipamentos', link: '/doc/clientes/aba-equipamentos-provedor' }
            ]
          },
          { text: 'Contratos', link: '/doc/cadastros/contratos' },
          {
            text: 'Planos',
            collapsed: true,
            items: [
              { text: 'Cadastro e listagem', link: '/doc/cadastros/planos' },
              { text: 'Aba principal', link: '/doc/cadastros/planos#aba-principal' },
              { text: 'Aba Plano de Venda', link: '/doc/cadastros/planos#aba-plano-de-venda' },
              { text: 'Aba Observações', link: '/doc/cadastros/planos#aba-observacoes' }
            ]
          },
          {
            text: 'Bancos',
            collapsed: true,
            items: [
              { text: 'Cadastro e listagem', link: '/doc/cadastros/bancos' },
              { text: 'Aba Informações Básicas', link: '/doc/cadastros/bancos#aba-informacoes-basicas' },
              { text: 'Aba Configurações da API', link: '/doc/cadastros/bancos#aba-configuracoes-api' }
            ]
          },
          { text: 'Tipo de Cobrança', link: '/doc/cadastros/tipo-cobranca' },
          {
            text: 'Fornecedores',
            collapsed: true,
            items: [
              { text: 'Cadastro e listagem', link: '/doc/cadastros/fornecedores' },
              { text: 'Aba Dados Básicos', link: '/doc/cadastros/fornecedores#aba-dados-basicos' },
              { text: 'Aba Endereço', link: '/doc/cadastros/fornecedores#aba-endereco' },
              { text: 'Aba Observações', link: '/doc/cadastros/fornecedores#aba-observacoes' }
            ]
          }
        ]
      },
      {
        text: 'Financeiro',
        collapsed: true,
        items: [
          { text: 'Contas A Receber', link: '/doc/financeiro/contas-a-receber' },
          { text: 'Contas a Pagar', link: '/doc/financeiro/contas-a-pagar' },
          { text: 'Notas Fiscais', link: '/doc/financeiro/notas-fiscais' }
        ]
      },
      {
        text: 'Equipamentos',
        collapsed: true,
        items: [
          {
            text: 'Túneis (Agentes)',
            collapsed: true,
            items: [
              { text: 'Cadastro e listagem', link: '/doc/equipamentos/tuneis-agentes' },
              { text: 'Aba Configurações', link: '/doc/equipamentos/tuneis-agentes#aba-configuracoes' },
              { text: 'Aba Instalar Automático', link: '/doc/equipamentos/tuneis-agentes#aba-instalar-automatico' },
              { text: 'Aba Instalar Manual', link: '/doc/equipamentos/tuneis-agentes#aba-instalar-manual' }
            ]
          },
          {
            text: 'Equipamentos',
            collapsed: true,
            items: [
              { text: 'Cadastro e listagem', link: '/doc/equipamentos/equipamentos' },
              { text: 'Aba Dados Básicos', link: '/doc/equipamentos/equipamentos#aba-dados-basicos' },
              { text: 'Aba Backups SSH', link: '/doc/equipamentos/equipamentos#aba-backups-ssh' }
            ]
          }
        ]
      },
      {
        text: 'RPKI',
        collapsed: true,
        items: [
          { text: 'Visão geral', link: '/doc/rpki/rpki' },
          { text: 'Validar Rota', link: '/doc/rpki/rpki#validar-rota' }
        ]
      },
      {
        text: 'Integrações',
        collapsed: true,
        items: [
          { text: 'Asaas', link: '/doc/integracoes/asaas' },
          { text: 'Efí (EFI)', link: '/doc/integracoes/efi' },
          { text: 'IXC Provedor', link: '/doc/integracoes/ixc-provedor' },
          { text: 'Typebot', link: '/doc/integracoes/typebot' },
          { text: 'API REST', link: '/doc/integracoes/api' }
        ]
      },
      {
        text: 'Suporte',
        collapsed: true,
        items: [
          {
            text: 'Ordens de Serviço',
            collapsed: true,
            items: [
              { text: 'Cadastro e listagem', link: '/doc/suporte/ordens-de-servico' },
              { text: 'Aba Principal', link: '/doc/suporte/ordens-de-servico#aba-principal' },
              { text: 'Aba Histórico', link: '/doc/suporte/ordens-de-servico#aba-historico' },
              { text: 'Aba Arquivos', link: '/doc/suporte/ordens-de-servico#aba-arquivos' }
            ]
          }
        ]
      },
      {
        text: 'Logs',
        collapsed: true,
        items: [
          { text: 'Visão geral', link: '/doc/logs/logs' },
          { text: 'Logs de Usuários', link: '/doc/logs/logs#logs-de-usuarios' },
          { text: 'Logs de Assinatura Digital', link: '/doc/logs/logs#logs-de-assinatura-digital' },
          { text: 'Logs de Acesso ao Sistema', link: '/doc/logs/logs#logs-de-acesso-ao-sistema' },
          {
            text: 'Comunicação',
            collapsed: true,
            items: [
              { text: 'Logs de WhatsApp', link: '/doc/logs/logs#logs-de-whatsapp' },
              { text: 'Logs de Email', link: '/doc/logs/logs#logs-de-email' }
            ]
          },
          {
            text: 'Equipamentos',
            collapsed: true,
            items: [
              { text: 'Logs Equipamentos', link: '/doc/logs/logs#logs-equipamentos' },
              { text: 'Logs Agentes', link: '/doc/logs/logs#logs-agentes' }
            ]
          },
          {
            text: 'Integrações',
            collapsed: true,
            items: [
              { text: 'Logs IXC — Ordens de Serviço', link: '/doc/logs/logs#logs-ixc-ordens-de-servico' }
            ]
          },
          {
            text: 'RPKI',
            collapsed: true,
            items: [
              { text: 'Logs de sincronização', link: '/doc/logs/logs#logs-de-sincronizacao' },
              { text: 'Logs CA-pai', link: '/doc/logs/logs#logs-ca-pai' },
              { text: 'Logs repositórios', link: '/doc/logs/logs#logs-repositorios' }
            ]
          }
        ]
      },
      {
        text: 'Parâmetros',
        collapsed: true,
        items: [
          {
            text: 'Dados da Empresa',
            collapsed: true,
            items: [
              { text: 'Cadastro', link: '/doc/parametros/dados-da-empresa' },
              { text: 'Aba Empresa', link: '/doc/parametros/dados-da-empresa#empresa' },
              { text: 'Aba Endereço', link: '/doc/parametros/dados-da-empresa#endereco' },
              { text: 'Aba Contato', link: '/doc/parametros/dados-da-empresa#contato' },
              { text: 'Aba Responsável', link: '/doc/parametros/dados-da-empresa#responsavel' },
              { text: 'Abas Faturas abertas/pagas', link: '/doc/parametros/dados-da-empresa#faturas' }
            ]
          },
          { text: 'Usuários', link: '/doc/parametros/usuarios' },
          { text: 'Logs de Auditoria', link: '/doc/parametros/logs-auditoria' },
          { text: 'Recursos do Sistema', link: '/doc/parametros/recursos-do-sistema' },
          {
            text: 'Servidor de E-Mail',
            collapsed: true,
            items: [
              { text: 'Visão geral', link: '/doc/parametros/servidor-email' },
              { text: 'Aba Servidor', link: '/doc/parametros/servidor-email#aba-servidor' },
              { text: 'Aba Mensagens', link: '/doc/parametros/servidor-email#aba-mensagens' }
            ]
          },
          {
            text: 'Servidor de WhatsApp',
            collapsed: true,
            items: [
              { text: 'Visão geral', link: '/doc/parametros/servidor-whatsapp' },
              { text: 'Aba Servidor', link: '/doc/parametros/servidor-whatsapp#aba-servidor' },
              { text: 'Aba Mensagens', link: '/doc/parametros/servidor-whatsapp#aba-mensagens' },
              { text: 'Aba Templates Meta', link: '/doc/parametros/servidor-whatsapp#aba-templates-meta' },
              { text: 'Aba Templates', link: '/doc/parametros/servidor-whatsapp#aba-templates' }
            ]
          },
          { text: 'NFS-e', link: '/doc/parametros/nfse' },
          {
            text: 'Documentos do Sistema',
            collapsed: true,
            items: [
              { text: 'Visão geral', link: '/doc/parametros/documentos-do-sistema' },
              { text: 'Aba Contratos', link: '/doc/parametros/documentos-do-sistema#aba-contratos' },
              { text: 'Aba Termos', link: '/doc/parametros/documentos-do-sistema#aba-termos' }
            ]
          },
          { text: 'Assinatura Digital', link: '/doc/parametros/assinatura-digital' },
          { text: 'Dias de Vencimento', link: '/doc/parametros/dias-vencimento' }
        ]
      }
    ]
    }
  },
  
  // Configurações do servidor embutidas para o PM2 rodar liso
  vite: {
    server: {
      host: '0.0.0.0',
      /** 4001 em dev — a 4000 fica reservada ao `vitepress preview` (PM2 `doc`) */
      port: 4001,
      allowedHosts: ['wiki-erp.ispconsultor.com.br']
    },
    preview: {
      host: '0.0.0.0',
      port: 4000,
      allowedHosts: ['wiki-erp.ispconsultor.com.br']
    }
  }
})