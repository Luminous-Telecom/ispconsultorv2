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
  title: "Central de Ajuda",
  description: "Wiki ISP Consultor — central de ajuda para consultores que atendem clientes",
  appearance: 'dark',
  head: [
    ['link', { rel: 'icon', href: '/ispconsultor-icone.png', type: 'image/png' }],
    ['link', { rel: 'apple-touch-icon', href: '/ispconsultor-icone.png' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }]
  ],
  themeConfig: {
    logo: {
      src: '/ispconsultor-icone.png',
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
      { text: 'Suporte', link: '/doc/configuracoes/suporte' }
    ],
    
    // Menu lateral — somente nas páginas de documentação (/doc/)
    sidebar: {
      '/doc/': [
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
          { text: 'Planos', link: '/doc/cadastros/planos' },
          { text: 'Contratos', link: '/doc/cadastros/contratos' },
          { text: 'Bancos', link: '/doc/cadastros/bancos' },
          { text: 'Tipo de Cobrança', link: '/doc/cadastros/tipo-cobranca' },
          { text: 'Fornecedores', link: '/doc/cadastros/fornecedores' }
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
          { text: 'Túneis (Agentes)', link: '/doc/equipamentos/tuneis-agentes' },
          { text: 'Equipamentos', link: '/doc/equipamentos/equipamentos' }
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
          { text: 'IXC Provedor', link: '/doc/integracoes/ixc-provedor' },
          { text: 'Typebot', link: '/doc/integracoes/typebot' }
        ]
      },
      {
        text: 'Suporte',
        collapsed: true,
        items: [
          { text: 'Ordens de Serviço', link: '/doc/suporte/ordens-de-servico' }
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
          { text: 'Dados da Empresa', link: '/doc/parametros/dados-da-empresa' },
          { text: 'Usuários', link: '/doc/parametros/usuarios' },
          { text: 'Logs de Auditoria', link: '/doc/parametros/logs-auditoria' },
          { text: 'Recursos do Sistema', link: '/doc/parametros/recursos-do-sistema' },
          { text: 'Servidor de E-Mail', link: '/doc/parametros/servidor-email' },
          { text: 'Servidor de WhatsApp', link: '/doc/parametros/servidor-whatsapp' },
          { text: 'NFS-e', link: '/doc/parametros/nfse' },
          { text: 'Documentos do Sistema', link: '/doc/parametros/documentos-do-sistema' },
          { text: 'Assinatura Digital', link: '/doc/parametros/assinatura-digital' },
          { text: 'Dias de Vencimento', link: '/doc/parametros/dias-vencimento' }
        ]
      },
      {
        text: 'Configurações Globais',
        collapsed: true,
        items: [
          { text: 'Suporte e Chamados', link: '/doc/configuracoes/suporte' }
        ]
      }
    ]
    }
  },
  
  // Configurações do servidor embutidas para o PM2 rodar liso
  vite: {
    server: {
      host: '0.0.0.0',
      port: 4000,
      allowedHosts: ['wiki-erp.ispconsultor.com.br']
    },
    preview: {
      host: '0.0.0.0',
      port: 4000,
      allowedHosts: ['wiki-erp.ispconsultor.com.br']
    }
  }
})