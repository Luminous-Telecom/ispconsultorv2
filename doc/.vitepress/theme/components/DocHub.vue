<script setup>
const sections = [
  {
    title: 'Referência',
    icon: '/icons/layout-dashboard.svg',
    description: 'Dashboard, indicadores e listagens do ERP.',
    links: [
      { text: 'Dashboard', to: '/doc/geral/dashboard' },
      { text: 'Listagens', to: '/doc/geral/listagens' }
    ]
  },
  {
    title: 'Cadastros',
    icon: '/icons/folder.svg',
    description: 'Clientes, planos, contratos, bancos e fornecedores.',
    links: [
      { text: 'Cadastro de clientes', to: '/doc/clientes/cadastro-cliente' },
      { text: 'Planos', to: '/doc/cadastros/planos' },
      { text: 'Contratos', to: '/doc/cadastros/contratos' },
      { text: 'Bancos', to: '/doc/cadastros/bancos' }
    ]
  },
  {
    title: 'Financeiro',
    icon: '/icons/wallet.svg',
    description: 'Contas a receber, a pagar e emissão de NFS-e.',
    links: [
      { text: 'Contas a receber', to: '/doc/financeiro/contas-a-receber' },
      { text: 'Contas a pagar', to: '/doc/financeiro/contas-a-pagar' },
      { text: 'Notas fiscais', to: '/doc/financeiro/notas-fiscais' }
    ]
  },
  {
    title: 'Equipamentos',
    icon: '/icons/server.svg',
    description: 'Túneis, agentes e cadastro de equipamentos.',
    links: [
      { text: 'Túneis (agentes)', to: '/doc/equipamentos/tuneis-agentes' },
      { text: 'Equipamentos', to: '/doc/equipamentos/equipamentos' }
    ]
  },
  {
    title: 'RPKI',
    icon: '/icons/shield-check.svg',
    description: 'Certificados, repositórios e validação de rotas.',
    links: [
      { text: 'Visão geral', to: '/doc/rpki/rpki' },
      { text: 'Validar rota', to: '/doc/rpki/rpki#validar-rota' }
    ]
  },
  {
    title: 'Integrações',
    icon: '/icons/plug.svg',
    description: 'Conexão com sistemas externos.',
    links: [
      { text: 'IXC Provedor', to: '/doc/integracoes/ixc-provedor' }
    ]
  },
  {
    title: 'Suporte',
    icon: '/icons/life-buoy.svg',
    description: 'Ordens de serviço e atendimento.',
    links: [
      { text: 'Ordens de serviço', to: '/doc/suporte/ordens-de-servico' },
      { text: 'Suporte e chamados', to: '/doc/configuracoes/suporte' }
    ]
  },
  {
    title: 'Logs',
    icon: '/icons/scroll-text.svg',
    description: 'Auditoria de comunicação, equipamentos, integrações e RPKI.',
    links: [
      { text: 'Visão geral', to: '/doc/logs/logs' }
    ]
  },
  {
    title: 'Parâmetros',
    icon: '/icons/settings.svg',
    description: 'Empresa, usuários, e-mail, WhatsApp, NFS-e e documentos.',
    links: [
      { text: 'Dados da empresa', to: '/doc/parametros/dados-da-empresa' },
      { text: 'Usuários', to: '/doc/parametros/usuarios' },
      { text: 'Recursos do sistema', to: '/doc/parametros/recursos-do-sistema' }
    ]
  }
]
</script>

<template>
  <div class="doc-hub">
    <header class="doc-hub-hero">
      <p class="doc-hub-eyebrow">Documentação</p>
      <h1>Seja bem-vindo à Central de Ajuda</h1>
      <p class="doc-hub-lead">
        Guias operacionais do ERP ISP Consultor para consultores. A estrutura do menu
        lateral segue a mesma lógica dos menus do sistema.
      </p>
    </header>

    <div class="doc-hub-tip">
      <span class="doc-hub-tip-label">Dica</span>
      <p>
        Use a busca no topo para encontrar telas, campos e procedimentos. Os artigos
        descrevem regras de negócio, passo a passo e boas práticas do dia a dia.
      </p>
    </div>

    <div class="doc-hub-grid">
      <article v-for="section in sections" :key="section.title" class="doc-hub-card">
        <div class="doc-hub-card-head">
          <span class="doc-hub-icon" aria-hidden="true">
            <img :src="section.icon" alt="" width="20" height="20" />
          </span>
          <h2>{{ section.title }}</h2>
        </div>
        <p>{{ section.description }}</p>
        <ul>
          <li v-for="link in section.links" :key="link.to">
            <a :href="link.to">{{ link.text }}</a>
          </li>
        </ul>
      </article>
    </div>

    <footer class="doc-hub-footer">
      <p>
        Precisa de ajuda? Consulte
        <a href="/doc/configuracoes/suporte">Suporte e chamados</a>
        ou comece pelo
        <a href="/doc/geral/dashboard">Dashboard</a>.
      </p>
    </footer>
  </div>
</template>
