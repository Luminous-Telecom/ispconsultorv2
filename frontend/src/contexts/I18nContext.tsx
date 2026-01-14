import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'pt-BR' | 'en-US' | 'es-ES';

interface TranslationKeys {
  // Navegação
  'nav.dashboard': string;
  'nav.clients': string;
  'nav.plans': string;
  'nav.banks': string;
  'nav.contracts': string;
  'nav.logout': string;

  // Ações comuns
  'actions.save': string;
  'actions.cancel': string;
  'actions.edit': string;
  'actions.delete': string;
  'actions.create': string;
  'actions.filter': string;
  'actions.export': string;
  'actions.import': string;

  // Mensagens
  'messages.confirmDelete': string;
  'messages.loading': string;
  'messages.noData': string;
  'messages.error': string;
  'messages.success': string;
  'messages.warning': string;

  // Formulários
  'form.required': string;
  'form.invalidEmail': string;
  'form.invalidCPF': string;
  'form.invalidCNPJ': string;
  'form.invalidPhone': string;
  'form.invalidWhatsApp': string;
  'form.invalidZipCode': string;
  'form.invalidAddress': string;
  'form.invalidCity': string;
  'form.invalidState': string;

  // Status
  'status.approved': string;

  // Dashboard
  'dashboard.title': string;
  'dashboard.overview': string;
  'dashboard.totalClients': string;
  'dashboard.totalPlans': string;
  'dashboard.totalContracts': string;
  'dashboard.monthlyRevenue': string;
  'dashboard.startDate': string;
  'dashboard.endDate': string;
  'dashboard.revenue': string;
  'dashboard.expected': string;
  'dashboard.pending': string;
  'dashboard.clients': string;
  'dashboard.inPeriod': string;
  'dashboard.received': string;
  'dashboard.toReceive': string;
  'dashboard.clientStatus': string;
  'dashboard.planStatus': string;
  'dashboard.paymentStatus': string;
  'dashboard.planDistribution': string;
  'dashboard.paymentRate': string;
  'dashboard.contractStatus': string;
  'dashboard.averageTicket': string;
  'dashboard.monthlyRevenueTitle': string;
  'dashboard.months12': string;
  'dashboard.newClients': string;
  'dashboard.receivablesVsPayables': string;
  'dashboard.clientsByPlan': string;

  // Pagination
  'pagination.to': string;
  'pagination.of': string;
  'pagination.perPage': string;

  // Layout
  'layout.user': string;
  'layout.darkMode': string;
  'layout.lightMode': string;
  'layout.parameters': string;
  'layout.search': string;
  'layout.searchPlaceholder': string;
  'layout.openMenu': string;
  'layout.closeMenu': string;

  // Menu Items
  'menu.clients': string;
  'menu.plans': string;
  'menu.banks': string;
  'menu.contracts': string;
  'menu.financial': string;
  'menu.suppliers': string;
  'menu.accountsPayable': string;
  'menu.invoices': string;
  'menu.companyData': string;

  // Parameters Menu
  'params.users': string;
  'params.auditLogs': string;
  'params.systemResources': string;
  'params.taskScheduler': string;
  'params.emailServer': string;
  'params.whatsappServer': string;
  'params.nfse': string;
  'params.systemDocuments': string;
  'params.digitalSignature': string;
  'params.dueDays': string;
  'params.updates': string;

  // Common UI
  'ui.confirm': string;
  'ui.confirmAction': string;
  'ui.select': string;
  'ui.clear': string;
  'ui.show': string;
  'ui.hide': string;
  'ui.noRecords': string;
  'ui.selectOption': string;
  'ui.noOptionsAvailable': string;
  'ui.showFilters': string;
  'ui.hideFilters': string;
  'ui.back': string;
  'ui.close': string;
  'ui.selectClient': string;
  'ui.selectPlan': string;
  'ui.selectBank': string;
  'ui.yes': string;
  'ui.no': string;

  // Financial
  'financial.title': string;
  'financial.accountsPayable': string;
  'financial.receivables': string;
  'financial.cancelTitles': string;
  'financial.reverseTitle': string;
  'financial.reverse': string;
  'financial.toPay': string;
  'financial.paid': string;
  'financial.pending': string;
  'financial.viewDocument': string;
  'financial.executionLogs': string;
  'financial.receiveTitle': string;
  'financial.titleCanceled': string;
  'financial.titlesCanceled': string;
  'financial.titleNotCanceled': string;
  'financial.titlesNotCanceled': string;
  'financial.errorCanceling': string;
  'financial.canOnlyReversePaid': string;
  'financial.titleReversed': string;
  'financial.errorReversing': string;
  'financial.titleWillReturnPending': string;
  'financial.receive': string;
  'financial.pay': string;
  'financial.toReceive': string;
  'financial.toPayLabel': string;
  'financial.value': string;

  // Buttons
  'buttons.save': string;
  'buttons.cancel': string;
  'buttons.close': string;
  'buttons.create': string;
  'buttons.edit': string;
  'buttons.delete': string;
  'buttons.print': string;
  'buttons.generate': string;
  'buttons.view': string;
  'buttons.export': string;
  'buttons.import': string;
  'buttons.search': string;
  'buttons.filter': string;
  'buttons.clear': string;
  'buttons.confirm': string;
  'buttons.back': string;
  'buttons.next': string;
  'buttons.previous': string;
  'buttons.finish': string;
  'buttons.send': string;
  'buttons.receive': string;
  'buttons.reverse': string;
  'buttons.audit': string;
  'buttons.reload': string;
  'buttons.select': string;
  'buttons.add': string;
  'buttons.remove': string;

  // Form Labels
  'form.name': string;
  'form.description': string;
  'form.cnpj': string;
  'form.companyName': string;
  'form.tradeName': string;
  'form.active': string;
  'form.status': string;
  'form.plan': string;
  'form.startDate': string;
  'form.endDate': string;
  'form.discountPercent': string;
  'form.discountValue': string;
  'form.discountValidity': string;
  'form.contractModel': string;
  'form.observations': string;
  'form.address': string;
  'form.number': string;
  'form.complement': string;
  'form.neighborhood': string;
  'form.city': string;
  'form.state': string;
  'form.zipCode': string;
  'form.email': string;
  'form.phone': string;
  'form.receivesEmail': string;
  'form.receivesWhatsApp': string;
  'form.file': string;
  'form.fileName': string;
  'form.fileType': string;
  'form.client': string;
  'form.supplier': string;
  'form.bank': string;
  'form.value': string;
  'form.dueDate': string;
  'form.paymentDate': string;
  'form.paidValue': string;
  'form.openValue': string;
  'form.originalValue': string;
  'form.discount': string;
  'form.useClientAddress': string;
  'form.operationNature': string;
  'form.model': string;
  'form.issueDate': string;
  'form.totalValue': string;
  'form.servicesValue': string;
  'form.productsValue': string;
  'form.discountValueInvoice': string;
  'form.issRate': string;
  'form.fileSelected': string;
  'form.fileTypeDocument': string;
  'form.fileTypePhoto': string;
  'form.fileTypeSignature': string;
  'form.fileTypeOther': string;
  'form.personType': string;
  'form.personTypePhysical': string;
  'form.personTypeLegal': string;
  'form.cpf': string;
  'form.country': string;
  'form.street': string;
  'form.planNamePlaceholder': string;
  'form.planDescriptionPlaceholder': string;
  'form.monthlyValuePlaceholder': string;
  'form.usersQuantity': string;
  'form.autoRenewal': string;
  'form.planObservationsPlaceholder': string;
  'form.serviceTypeInfrastructure': string;
  'form.serviceTypeConsulting': string;
  'form.periodicityMonthly': string;
  'form.periodicityQuarterly': string;
  'form.periodicitySemiannual': string;
  'form.periodicityAnnual': string;
  'form.periodicityBimonthly': string;
  'form.periodicityBiweekly': string;
  'form.periodicityWeekly': string;
  'form.messageType': string;
  'form.message10DaysBefore': string;
  'form.message5DaysBefore': string;
  'form.messageSameDay': string;
  'form.message5DaysAfter': string;
  'form.message10DaysAfter': string;
  'form.message15DaysAfter': string;
  'form.messageClientCut': string;
  'form.messageManualSend': string;
  'form.messageConfiguration': string;
  'table.planValue': string;
  'table.discountPercent': string;
  'table.discountValue': string;
  'table.finalValue': string;
  'table.exempt': string;
  'table.dueDay': string;
  'table.fileName': string;
  'table.fileType': string;
  'table.fileOrigin': string;
  'table.fileSize': string;
  'table.fileDate': string;
  'table.titleNumber': string;
  'form.invoice': string;
  'form.invoiceStatus': string;
  'form.testClient': string;
  'form.enterClientId': string;
  'form.enterPlanId': string;
  'form.enterBankId': string;
  'form.enterContractModelId': string;
  'form.selectContractModelHelp': string;
  'form.dueDay': string;
  'form.exemptFromMonthlyFee': string;
  'form.selectClientForTest': string;
  'form.validationErrors': string;
  'form.briefDescription': string;
  'form.fileDescription': string;
  'form.optional': string;

  // Table Columns
  'table.id': string;
  'table.contract': string;
  'table.status': string;
  'table.plan': string;
  'table.dueDate': string;
  'table.value': string;
  'table.paidValue': string;
  'table.openValue': string;
  'table.invoice': string;
  'table.invoiceStatus': string;
  'table.actions': string;
  'table.createdAt': string;
  'table.updatedAt': string;
  'table.documentNumber': string;
  'table.supplier': string;
  'table.paymentType': string;
  'table.clientName': string;
  'table.contractNumber': string;
  'table.contractStartDate': string;
  'table.contractEndDate': string;
  'table.email': string;
  'table.whatsapp': string;
  'table.number': string;
  'table.complement': string;
  'table.neighborhood': string;
  'table.city': string;
  'table.state': string;
  'table.planName': string;
  'table.description': string;
  'table.serviceType': string;
  'table.monthlyValue': string;
  'table.users': string;
  'table.clients': string;
  'table.periodicity': string;
  'table.bankName': string;
  'table.bankType': string;
  'table.sandbox': string;
  'table.paymentDate': string;
  'table.chargeId': string;
  'table.ourNumber': string;

  // Modal Titles
  'modal.createClient': string;
  'modal.editClient': string;
  'modal.createPlan': string;
  'modal.editPlan': string;
  'modal.createBank': string;
  'modal.editBank': string;
  'modal.createContract': string;
  'modal.editContract': string;
  'modal.createSupplier': string;
  'modal.editSupplier': string;
  'modal.createAccountPayable': string;
  'modal.editAccountPayable': string;
  'modal.createTitle': string;
  'modal.editTitle': string;
  'modal.generateNFe': string;
  'modal.cancelInvoice': string;
  'modal.deleteClient': string;
  'modal.deletePlan': string;
  'modal.deleteBank': string;
  'modal.deleteContract': string;
  'modal.deleteSupplier': string;
  'modal.deleteAccountPayable': string;
  'modal.viewDocument': string;
  'modal.addFile': string;
  'modal.editTerm': string;
  'modal.selectTerm': string;
  'modal.sendSignature': string;
  'modal.additionalService': string;
  'modal.list': string;
  'modal.defaultDocument': string;
  'modal.deleteFiles': string;

  // Tabs
  'tabs.basicData': string;
  'tabs.contact': string;
  'tabs.address': string;
  'tabs.contracts': string;
  'tabs.financial': string;
  'tabs.observations': string;
  'tabs.files': string;
  'tabs.salePlan': string;
  'tabs.servicesObservations': string;
  'tabs.contractData': string;
  'tabs.additionalServices': string;
  'tabs.terms': string;
  'tabs.collectionLetter': string;
  'tabs.receipts': string;
  'tabs.financialMisc': string;
  'tabs.content': string;
  'tabs.contract': string;
  'tabs.receipt': string;
  'tabs.letter': string;
  'tabs.adhesion': string;
  'tabs.persistence': string;
  'tabs.basicInfo': string;
  'tabs.apiConfig': string;
  'tabs.discountsConfig': string;
  'tabs.server': string;
  'tabs.messages': string;
  'tabs.responsible': string;
  'tabs.communicationPreferences': string;

  // Status Labels
  'status.scheduled': string;
  'status.issued': string;
  'status.cancelled': string;
  'status.rejected': string;
  'status.error': string;
  'status.partial': string;
  'status.paid': string;
  'status.pending': string;
  'status.toPay': string;
  'status.active': string;
  'status.inactive': string;
  'status.suspended': string;

  // Placeholders
  'placeholder.cnpj': string;
  'placeholder.companyName': string;
  'placeholder.tradeName': string;
  'placeholder.observations': string;
  'placeholder.discountPercent': string;
  'placeholder.discountValue': string;
  'placeholder.fileName': string;
  'placeholder.fileDescription': string;
  'placeholder.cpfCnpj': string;
  'placeholder.briefDescription': string;
  'placeholder.selectStatus': string;
  'placeholder.selectPlan': string;
  'placeholder.selectBank': string;
  'placeholder.selectContractModel': string;
  'placeholder.selectClient': string;
  'placeholder.selectSupplier': string;
  'placeholder.enterClientId': string;

  // Other
  'other.selectExactlyOne': string;
  'other.auditSelectedRecord': string;
  'other.resizeColumn': string;
  'other.reloadData': string;
  'other.confirmAction': string;
  'other.selectAtLeastOne': string;
  'other.selected': string;
  'other.open': string;
  'other.receipt': string;
  'other.printNF': string;
  'other.generateNFSeStandalone': string;
  'other.termRegistered': string;
  'other.viaWhatsApp': string;
  'other.viaEmail': string;
  'other.newMiscTitle': string;
  'other.deleteTerms': string;
  'other.day': string;
}

type Translations = Record<Language, TranslationKeys>;

const translations: Translations = {
  'pt-BR': {
    // Navegação
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'Clientes',
    'nav.plans': 'Planos',
    'nav.banks': 'Bancos',
    'nav.contracts': 'Contratos',
    'nav.logout': 'Sair',

    // Ações comuns
    'actions.save': 'Salvar',
    'actions.cancel': 'Cancelar',
    'actions.edit': 'Editar',
    'actions.delete': 'Excluir',
    'actions.create': 'Criar',
    'actions.filter': 'Filtrar',
    'actions.export': 'Exportar',
    'actions.import': 'Importar',

    // Mensagens
    'messages.confirmDelete': 'Tem certeza que deseja excluir?',
    'messages.loading': 'Carregando...',
    'messages.noData': 'Nenhum dado encontrado',
    'messages.error': 'Ocorreu um erro',
    'messages.success': 'Operação realizada com sucesso',
    'messages.warning': 'Atenção',

    // Formulários
    'form.required': 'Campo obrigatório',
    'form.invalidEmail': 'E-mail inválido',
    'form.invalidCPF': 'CPF inválido',
    'form.invalidCNPJ': 'CNPJ inválido',
    'form.invalidPhone': 'Telefone inválido',
    'form.invalidWhatsApp': 'WhatsApp inválido',
    'form.invalidZipCode': 'CEP inválido',
    'form.invalidAddress': 'Endereço inválido',
    'form.invalidCity': 'Cidade inválida',
    'form.invalidState': 'Estado inválido',

    // Status
    'status.approved': 'Aprovado',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.overview': 'Visão Geral',
    'dashboard.totalClients': 'Total de Clientes',
    'dashboard.totalPlans': 'Total de Planos',
    'dashboard.totalContracts': 'Total de Contratos',
    'dashboard.monthlyRevenue': 'Receita Mensal',
    'dashboard.startDate': 'Data Inicial',
    'dashboard.endDate': 'Data Final',
    'dashboard.revenue': 'Faturamento',
    'dashboard.expected': 'Previsto',
    'dashboard.pending': 'Pendente',
    'dashboard.clients': 'Clientes',
    'dashboard.inPeriod': 'no período',
    'dashboard.received': 'Recebidos',
    'dashboard.toReceive': 'A Receber',
    'dashboard.clientStatus': 'Status dos Clientes',
    'dashboard.planStatus': 'Status dos Planos',
    'dashboard.paymentStatus': 'Status dos Pagamentos',
    'dashboard.planDistribution': 'Distribuição por Tipo de Plano',
    'dashboard.paymentRate': 'Taxa de Pagamento',
    'dashboard.contractStatus': 'Status dos Contratos',
    'dashboard.averageTicket': 'Ticket Médio',
    'dashboard.months12': '12 meses',
    'dashboard.newClients': 'Novos Clientes',
    'dashboard.receivablesVsPayables': 'Contas a Receber vs Contas a Pagar',
    'dashboard.clientsByPlan': 'Clientes por Plano',
    'dashboard.monthlyRevenueTitle': 'Faturamento Mensal',

    // Pagination
    'pagination.to': 'a',
    'pagination.of': 'de',
    'pagination.perPage': 'por página',

    // Layout
    'layout.user': 'Usuário',
    'layout.darkMode': 'Modo Escuro',
    'layout.lightMode': 'Modo Claro',
    'layout.parameters': 'Parâmetros',
    'layout.search': 'Buscar',
    'layout.searchPlaceholder': 'Buscar...',
    'layout.openMenu': 'Abrir menu lateral',
    'layout.closeMenu': 'Recolher menu',

    // Menu Items
    'menu.clients': 'Clientes',
    'menu.plans': 'Planos',
    'menu.banks': 'Bancos',
    'menu.contracts': 'Contratos',
    'menu.financial': 'Financeiro',
    'menu.suppliers': 'Fornecedores',
    'menu.accountsPayable': 'Contas a Pagar',
    'menu.invoices': 'Notas Fiscais',
    'menu.companyData': 'Dados da Empresa',

    // Parameters Menu
    'params.users': 'Usuários',
    'params.auditLogs': 'Logs de Auditoria',
    'params.systemResources': 'Recursos do Sistema',
    'params.taskScheduler': 'Agendador de Tarefas',
    'params.emailServer': 'Servidor de E-Mail',
    'params.whatsappServer': 'Servidor de WhatsApp',
    'params.nfse': 'NFS-e',
    'params.systemDocuments': 'Documentos do Sistema',
    'params.digitalSignature': 'Assinatura Digital',
    'params.dueDays': 'Dias de Vencimento',
    'params.updates': 'Atualizações',

    // Common UI
    'ui.confirm': 'Confirmar',
    'ui.confirmAction': 'Confirmar ação',
    'ui.select': 'Selecionar',
    'ui.clear': 'Limpar',
    'ui.show': 'Mostrar',
    'ui.hide': 'Ocultar',
    'ui.noRecords': 'Nenhum registro encontrado',
    'ui.selectOption': 'Selecione uma opção',
    'ui.noOptionsAvailable': 'Nenhuma opção disponível',
    'ui.showFilters': 'Mostrar filtros',
    'ui.hideFilters': 'Ocultar filtros',
    'ui.back': 'Voltar',
    'ui.close': 'Fechar',
    'ui.selectClient': 'Selecionar Cliente',
    'ui.selectPlan': 'Selecionar Plano',
    'ui.selectBank': 'Selecionar Banco',
    'ui.yes': 'Sim',
    'ui.no': 'Não',

    // Financial
    'financial.title': 'Financeiro - Títulos',
    'financial.accountsPayable': 'Contas a Pagar',
    'financial.receivables': 'Contas a Receber',
    'financial.cancelTitles': 'Cancelar títulos',
    'financial.reverseTitle': 'Estornar título',
    'financial.reverse': 'Estornar',
    'financial.toPay': 'A Pagar',
    'financial.paid': 'Pago',
    'financial.pending': 'Pendente',
    'financial.viewDocument': 'Visualizar Documento',
    'financial.executionLogs': 'Relatórios de logs',
    'financial.receiveTitle': 'Receber - Título',
    'financial.titleCanceled': 'Título cancelado com sucesso!',
    'financial.titlesCanceled': 'títulos cancelados com sucesso!',
    'financial.titleNotCanceled': '1 título não pôde ser cancelado',
    'financial.titlesNotCanceled': 'títulos não puderam ser cancelados',
    'financial.errorCanceling': 'Erro ao cancelar títulos',
    'financial.canOnlyReversePaid': 'Só é possível estornar títulos que estão pagos',
    'financial.titleReversed': 'Título estornado com sucesso!',
    'financial.errorReversing': 'Erro ao estornar título.',
    'financial.titleWillReturnPending': 'O título voltará para status PENDENTE.',
    'financial.receive': 'Receber',
    'financial.pay': 'Pagar',
    'financial.toReceive': 'A Receber',
    'financial.toPayLabel': 'A Pagar',
    'financial.value': 'Valor',

    // Buttons
    'buttons.save': 'Salvar',
    'buttons.cancel': 'Cancelar',
    'buttons.close': 'Fechar',
    'buttons.create': 'Criar',
    'buttons.edit': 'Editar',
    'buttons.delete': 'Excluir',
    'buttons.print': 'Imprimir',
    'buttons.generate': 'Gerar',
    'buttons.view': 'Visualizar',
    'buttons.export': 'Exportar',
    'buttons.import': 'Importar',
    'buttons.search': 'Buscar',
    'buttons.filter': 'Filtrar',
    'buttons.clear': 'Limpar',
    'buttons.confirm': 'Confirmar',
    'buttons.back': 'Voltar',
    'buttons.next': 'Próximo',
    'buttons.previous': 'Anterior',
    'buttons.finish': 'Finalizar',
    'buttons.send': 'Enviar',
    'buttons.receive': 'Receber',
    'buttons.reverse': 'Estornar',
    'buttons.audit': 'Auditar',
    'buttons.reload': 'Recarregar',
    'buttons.select': 'Selecionar',
    'buttons.add': 'Adicionar',
    'buttons.remove': 'Remover',

    // Form Labels
    'form.name': 'Nome',
    'form.description': 'Descrição',
    'form.cnpj': 'CNPJ',
    'form.companyName': 'Razão Social',
    'form.tradeName': 'Nome Fantasia',
    'form.active': 'Cliente Ativo',
    'form.status': 'Status',
    'form.plan': 'Plano',
    'form.startDate': 'Data de Início',
    'form.endDate': 'Data de Fim',
    'form.discountPercent': 'Desconto Percentual (%)',
    'form.discountValue': 'Desconto Valor (R$)',
    'form.discountValidity': 'Data Validade Desconto',
    'form.contractModel': 'Modelo de Contrato',
    'form.observations': 'Observações',
    'form.address': 'Endereço',
    'form.number': 'Número',
    'form.complement': 'Complemento',
    'form.neighborhood': 'Bairro',
    'form.city': 'Cidade',
    'form.state': 'UF',
    'form.zipCode': 'CEP',
    'form.email': 'Email',
    'form.phone': 'Telefone',
    'form.receivesEmail': 'Recebe Email',
    'form.receivesWhatsApp': 'Recebe WhatsApp',
    'form.file': 'Arquivo',
    'form.fileName': 'Nome',
    'form.fileType': 'Tipo',
    'form.client': 'Cliente',
    'form.supplier': 'Fornecedor',
    'form.bank': 'Banco para Boleto',
    'form.value': 'Valor',
    'form.dueDate': 'Data de Vencimento',
    'form.paymentDate': 'Data de Pagamento',
    'form.paidValue': 'Valor Pago',
    'form.openValue': 'Valor Aberto',
    'form.originalValue': 'Valor Original',
    'form.discount': 'Desconto',
    'form.useClientAddress': 'Usar endereço do cliente',
    'form.operationNature': 'Natureza da Operação',
    'form.model': 'Modelo',
    'form.issueDate': 'Data de Emissão',
    'form.totalValue': 'Valor Total',
    'form.servicesValue': 'Valor dos Serviços',
    'form.productsValue': 'Valor dos Produtos',
    'form.discountValueInvoice': 'Valor do Desconto',
    'form.issRate': 'Alíquota ISS',
    'form.fileSelected': 'Arquivo Selecionado',
    'form.fileTypeDocument': 'Documento',
    'form.fileTypePhoto': 'Foto',
    'form.fileTypeSignature': 'Assinatura',
    'form.fileTypeOther': 'Outro',
    'form.personType': 'Tipo de Pessoa',
    'form.personTypePhysical': 'Física',
    'form.personTypeLegal': 'Jurídica',
    'form.cpf': 'CPF',
    'form.country': 'País',
    'form.street': 'Rua',
    'form.invoice': 'NF',
    'form.invoiceStatus': 'Status NF',
    'form.testClient': 'Cliente para Teste',
    'form.enterClientId': 'Digite o ID do cliente',
    'form.enterPlanId': 'Digite o ID do plano',
    'form.enterBankId': 'Digite o ID do banco',
    'form.enterContractModelId': 'Digite o ID do modelo de contrato',
    'form.selectContractModelHelp': 'Selecione um modelo de contrato',
    'form.dueDay': 'Dia de Vencimento',
    'form.exemptFromMonthlyFee': 'Isento de Taxa Mensal',
    'form.selectClientForTest': 'Selecione um cliente para visualizar o documento com dados reais',
    'form.validationErrors': 'Erros de validação:',
    'form.briefDescription': 'Breve descrição',
    'form.fileDescription': 'Descrição do arquivo (opcional)',
    'form.optional': 'Opcional',
    'form.planNamePlaceholder': 'Nome do plano',
    'form.planDescriptionPlaceholder': 'Descrição do plano',
    'form.monthlyValuePlaceholder': 'Valor mensal',
    'form.usersQuantity': 'Quantidade de Usuários',
    'form.autoRenewal': 'Renovação Automática',
    'form.planObservationsPlaceholder': 'Observações do plano',
    'form.serviceTypeInfrastructure': 'Infraestrutura',
    'form.serviceTypeConsulting': 'Consultoria',
    'form.periodicityMonthly': 'Mensal',
    'form.periodicityQuarterly': 'Trimestral',
    'form.periodicitySemiannual': 'Semestral',
    'form.periodicityAnnual': 'Anual',
    'form.periodicityBimonthly': 'Bimestral',
    'form.periodicityBiweekly': 'Quinzenal',
    'form.periodicityWeekly': 'Semanal',
    'form.messageType': 'Tipo de Mensagem',
    'form.message10DaysBefore': '10 dias antes',
    'form.message5DaysBefore': '5 dias antes',
    'form.messageSameDay': 'No mesmo dia',
    'form.message5DaysAfter': '5 dias depois',
    'form.message10DaysAfter': '10 dias depois',
    'form.message15DaysAfter': '15 dias depois',
    'form.messageClientCut': 'Corte do cliente',
    'form.messageManualSend': 'Envio manual',
    'form.messageConfiguration': 'Configuração de mensagem',

    // Table Columns
    'table.id': 'ID',
    'table.contract': 'Contrato',
    'table.status': 'Status',
    'table.plan': 'Plano',
    'table.dueDate': 'Vencimento',
    'table.value': 'Valor',
    'table.paidValue': 'Valor baixado',
    'table.openValue': 'Valor aberto',
    'table.invoice': 'NF',
    'table.invoiceStatus': 'Status NF',
    'table.actions': 'Ações',
    'table.createdAt': 'Criado em',
    'table.updatedAt': 'Atualizado em',
    'table.documentNumber': 'Número do Documento',
    'table.supplier': 'Fornecedor',
    'table.paymentType': 'Tipo de Pagamento',
    'table.clientName': 'Cliente',
    'table.contractNumber': 'Número do Contrato',
    'table.contractStartDate': 'Data Início',
    'table.contractEndDate': 'Data Fim',
    'table.email': 'Email',
    'table.whatsapp': 'WhatsApp',
    'table.number': 'Número',
    'table.complement': 'Complemento',
    'table.neighborhood': 'Bairro',
    'table.city': 'Cidade',
    'table.state': 'Estado',
    'table.planName': 'Nome do Plano',
    'table.description': 'Descrição',
    'table.serviceType': 'Tipo de Serviço',
    'table.monthlyValue': 'Valor Mensal',
    'table.users': 'Usuários',
    'table.clients': 'Clientes',
    'table.periodicity': 'Periodicidade',
    'table.bankName': 'Nome do Banco',
    'table.bankType': 'Tipo de Banco',
    'table.sandbox': 'Sandbox',
    'table.paymentDate': 'Data de Pagamento',
    'table.chargeId': 'ID da Cobrança',
    'table.ourNumber': 'Nosso Número',
    'table.planValue': 'Valor do Plano',
    'table.discountPercent': 'Desconto %',
    'table.discountValue': 'Valor do Desconto',
    'table.finalValue': 'Valor Final',
    'table.exempt': 'Isento',
    'table.dueDay': 'Dia de Vencimento',
    'table.fileName': 'Nome do Arquivo',
    'table.fileType': 'Tipo de Arquivo',
    'table.fileOrigin': 'Origem do Arquivo',
    'table.fileSize': 'Tamanho do Arquivo',
    'table.fileDate': 'Data do Arquivo',
    'table.titleNumber': 'Número do Título',

    // Modal Titles
    'modal.createClient': 'Criar Cliente',
    'modal.editClient': 'Editar Cliente',
    'modal.createPlan': 'Criar Plano',
    'modal.editPlan': 'Editar Plano',
    'modal.createBank': 'Criar Banco',
    'modal.editBank': 'Editar Banco',
    'modal.createContract': 'Criar Contrato',
    'modal.editContract': 'Editar Contrato',
    'modal.createSupplier': 'Criar Fornecedor',
    'modal.editSupplier': 'Editar Fornecedor',
    'modal.createAccountPayable': 'Criar Conta a Pagar',
    'modal.editAccountPayable': 'Editar Conta a Pagar',
    'modal.createTitle': 'Criar Título',
    'modal.editTitle': 'Editar Título',
    'modal.generateNFe': 'Gerar Nota Fiscal de Serviços Eletrônica (NFS-e)',
    'modal.cancelInvoice': 'Cancelar Nota Fiscal',
    'modal.deleteClient': 'Excluir cliente',
    'modal.deletePlan': 'Excluir plano',
    'modal.deleteBank': 'Excluir banco',
    'modal.deleteContract': 'Excluir contratos',
    'modal.deleteSupplier': 'Excluir fornecedor',
    'modal.deleteAccountPayable': 'Excluir conta a pagar',
    'modal.viewDocument': 'Visualizar Documento',
    'modal.addFile': 'Adicionar Arquivo',
    'modal.editTerm': 'Editar Termo',
    'modal.selectTerm': 'Selecionar Termo',
    'modal.sendSignature': 'Enviar Assinatura',
    'modal.additionalService': 'Serviço Adicional',
    'modal.list': 'Lista',
    'modal.defaultDocument': 'Documento Padrão',
    'modal.deleteFiles': 'Deletar arquivos',

    // Tabs
    'tabs.basicData': 'Dados Básicos',
    'tabs.contact': 'Contato',
    'tabs.address': 'Endereço',
    'tabs.contracts': 'Contratos',
    'tabs.financial': 'Financeiro',
    'tabs.observations': 'Observações',
    'tabs.files': 'Arquivos',
    'tabs.salePlan': 'Plano de Venda',
    'tabs.servicesObservations': 'Observações',
    'tabs.contractData': 'Dados do Contrato',
    'tabs.additionalServices': 'Serviços Adicionais',
    'tabs.terms': 'Termos',
    'tabs.collectionLetter': 'Carta de Cobrança',
    'tabs.receipts': 'Recibos',
    'tabs.financialMisc': 'Financeiro Avulso',
    'tabs.content': 'Conteúdo',
    'tabs.contract': 'Contrato',
    'tabs.receipt': 'Recibo',
    'tabs.letter': 'Carta',
    'tabs.adhesion': 'Adesão',
    'tabs.persistence': 'Permanência',
    'tabs.basicInfo': 'Informações Básicas',
    'tabs.apiConfig': 'Configurações da API',
    'tabs.discountsConfig': 'Descontos e Configurações',
    'tabs.server': 'Servidor',
    'tabs.messages': 'Mensagens',
    'tabs.responsible': 'Responsável',
    'tabs.communicationPreferences': 'Preferências de Comunicação',

    // Status Labels
    'status.scheduled': 'Agendado',
    'status.issued': 'Emitida',
    'status.cancelled': 'Cancelada',
    'status.rejected': 'Rejeitada',
    'status.error': 'Erro',
    'status.partial': 'Parcial',
    'status.paid': 'Pago',
    'status.pending': 'Pendente',
    'status.toPay': 'A Pagar',
    'status.active': 'Ativo',
    'status.inactive': 'Inativo',
    'status.suspended': 'Suspenso',

    // Placeholders
    'placeholder.cnpj': '00.000.000/0000-00',
    'placeholder.companyName': 'Razão social da empresa',
    'placeholder.tradeName': 'Nome fantasia da empresa',
    'placeholder.observations': 'Observações sobre o cliente...',
    'placeholder.discountPercent': '0.00',
    'placeholder.discountValue': '0.00',
    'placeholder.fileName': 'Nome do arquivo',
    'placeholder.fileDescription': 'Descrição do arquivo (opcional)',
    'placeholder.cpfCnpj': '11 dígitos para CPF ou 14 dígitos para CNPJ',
    'placeholder.briefDescription': 'Breve descrição',
    'placeholder.selectStatus': 'Selecione o status',
    'placeholder.selectPlan': 'Selecione o plano',
    'placeholder.selectBank': 'Selecione o banco',
    'placeholder.selectContractModel': 'Selecione o modelo de contrato',
    'placeholder.selectClient': 'Selecione o cliente',
    'placeholder.selectSupplier': 'Selecione o fornecedor',
    'placeholder.enterClientId': 'Digite o ID do cliente',

    // Other
    'other.selectExactlyOne': 'Selecione exatamente 1 registro para auditar',
    'other.auditSelectedRecord': 'Auditar registro selecionado',
    'other.resizeColumn': 'Redimensionar coluna',
    'other.reloadData': 'Recarregar dados',
    'other.confirmAction': 'Confirmar ação',
    'other.selectAtLeastOne': 'Selecione pelo menos um título',
    'other.selected': 'Selecionados',
    'other.open': 'Abertos',
    'other.receipt': 'Recibo',
    'other.printNF': 'Imprimir NF',
    'other.generateNFSeStandalone': 'Gerar NFS-e Avulsa',
    'other.termRegistered': 'Termo Cadastrado',
    'other.viaWhatsApp': 'Via WhatsApp',
    'other.viaEmail': 'Via Email',
    'other.newMiscTitle': 'Novo Título Avulso',
    'other.deleteTerms': 'Deletar termos',
    'other.day': 'Dia',
  },
  'en-US': {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'Clients',
    'nav.plans': 'Plans',
    'nav.banks': 'Banks',
    'nav.contracts': 'Contracts',
    'nav.logout': 'Logout',

    // Common actions
    'actions.save': 'Save',
    'actions.cancel': 'Cancel',
    'actions.edit': 'Edit',
    'actions.delete': 'Delete',
    'actions.create': 'Create',
    'actions.filter': 'Filter',
    'actions.export': 'Export',
    'actions.import': 'Import',

    // Messages
    'messages.confirmDelete': 'Are you sure you want to delete?',
    'messages.loading': 'Loading...',
    'messages.noData': 'No data found',
    'messages.error': 'An error occurred',
    'messages.success': 'Operation completed successfully',
    'messages.warning': 'Warning',

    // Forms
    'form.required': 'Required field',
    'form.invalidEmail': 'Invalid email',
    'form.invalidCPF': 'Invalid CPF',
    'form.invalidCNPJ': 'Invalid CNPJ',
    'form.invalidPhone': 'Invalid phone',
    'form.invalidWhatsApp': 'Invalid WhatsApp',
    'form.invalidZipCode': 'Invalid zip code',
    'form.invalidAddress': 'Invalid address',
    'form.invalidCity': 'Invalid city',
    'form.invalidState': 'Invalid state',

    // Status
    'status.approved': 'Approved',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.overview': 'Overview',
    'dashboard.totalClients': 'Total Clients',
    'dashboard.totalPlans': 'Total Plans',
    'dashboard.totalContracts': 'Total Contracts',
    'dashboard.monthlyRevenue': 'Monthly Revenue',
    'dashboard.startDate': 'Start Date',
    'dashboard.endDate': 'End Date',
    'dashboard.revenue': 'Revenue',
    'dashboard.expected': 'Expected',
    'dashboard.pending': 'Pending',
    'dashboard.clients': 'Clients',
    'dashboard.inPeriod': 'in period',
    'dashboard.received': 'Received',
    'dashboard.toReceive': 'To Receive',
    'dashboard.clientStatus': 'Client Status',
    'dashboard.planStatus': 'Plan Status',
    'dashboard.paymentStatus': 'Payment Status',
    'dashboard.planDistribution': 'Plan Type Distribution',
    'dashboard.paymentRate': 'Payment Rate',
    'dashboard.contractStatus': 'Contract Status',
    'dashboard.averageTicket': 'Average Ticket',
    'dashboard.months12': '12 months',
    'dashboard.newClients': 'New Clients',
    'dashboard.receivablesVsPayables': 'Receivables vs Payables',
    'dashboard.clientsByPlan': 'Clients by Plan',
    'dashboard.monthlyRevenueTitle': 'Monthly Revenue',

    // Pagination
    'pagination.to': 'to',
    'pagination.of': 'of',
    'pagination.perPage': 'per page',

    // Layout
    'layout.user': 'User',
    'layout.darkMode': 'Dark Mode',
    'layout.lightMode': 'Light Mode',
    'layout.parameters': 'Parameters',
    'layout.search': 'Search',
    'layout.searchPlaceholder': 'Search...',
    'layout.openMenu': 'Open sidebar menu',
    'layout.closeMenu': 'Close menu',

    // Menu Items
    'menu.clients': 'Clients',
    'menu.plans': 'Plans',
    'menu.banks': 'Banks',
    'menu.contracts': 'Contracts',
    'menu.financial': 'Financial',
    'menu.suppliers': 'Suppliers',
    'menu.accountsPayable': 'Accounts Payable',
    'menu.invoices': 'Invoices',
    'menu.companyData': 'Company Data',

    // Parameters Menu
    'params.users': 'Users',
    'params.auditLogs': 'Audit Logs',
    'params.systemResources': 'System Resources',
    'params.taskScheduler': 'Task Scheduler',
    'params.emailServer': 'Email Server',
    'params.whatsappServer': 'WhatsApp Server',
    'params.nfse': 'NFS-e',
    'params.systemDocuments': 'System Documents',
    'params.digitalSignature': 'Digital Signature',
    'params.dueDays': 'Due Days',
    'params.updates': 'Updates',

    // Common UI
    'ui.confirm': 'Confirm',
    'ui.confirmAction': 'Confirm action',
    'ui.select': 'Select',
    'ui.clear': 'Clear',
    'ui.show': 'Show',
    'ui.hide': 'Hide',
    'ui.noRecords': 'No records found',
    'ui.selectOption': 'Select an option',
    'ui.noOptionsAvailable': 'No options available',
    'ui.showFilters': 'Show filters',
    'ui.hideFilters': 'Hide filters',
    'ui.back': 'Back',
    'ui.close': 'Close',
    'ui.selectClient': 'Select Client',
    'ui.selectPlan': 'Select Plan',
    'ui.selectBank': 'Select Bank',
    'ui.yes': 'Yes',
    'ui.no': 'No',

    // Financial
    'financial.title': 'Financial - Titles',
    'financial.accountsPayable': 'Accounts Payable',
    'financial.receivables': 'Receivables',
    'financial.cancelTitles': 'Cancel titles',
    'financial.reverseTitle': 'Reverse title',
    'financial.reverse': 'Reverse',
    'financial.toPay': 'To Pay',
    'financial.paid': 'Paid',
    'financial.pending': 'Pending',
    'financial.viewDocument': 'View Document',
    'financial.executionLogs': 'Execution Logs',
    'financial.receiveTitle': 'Receive - Title',
    'financial.titleCanceled': 'Title canceled successfully!',
    'financial.titlesCanceled': 'titles canceled successfully!',
    'financial.titleNotCanceled': '1 title could not be canceled',
    'financial.titlesNotCanceled': 'titles could not be canceled',
    'financial.errorCanceling': 'Error canceling titles',
    'financial.canOnlyReversePaid': 'Can only reverse titles that are paid',
    'financial.titleReversed': 'Title reversed successfully!',
    'financial.errorReversing': 'Error reversing title.',
    'financial.titleWillReturnPending': 'The title will return to PENDING status.',
    'financial.receive': 'Receive',
    'financial.pay': 'Pay',
    'financial.toReceive': 'To Receive',
    'financial.toPayLabel': 'To Pay',
    'financial.value': 'Value',

    // Buttons
    'buttons.save': 'Save',
    'buttons.cancel': 'Cancel',
    'buttons.close': 'Close',
    'buttons.create': 'Create',
    'buttons.edit': 'Edit',
    'buttons.delete': 'Delete',
    'buttons.print': 'Print',
    'buttons.generate': 'Generate',
    'buttons.view': 'View',
    'buttons.export': 'Export',
    'buttons.import': 'Import',
    'buttons.search': 'Search',
    'buttons.filter': 'Filter',
    'buttons.clear': 'Clear',
    'buttons.confirm': 'Confirm',
    'buttons.back': 'Back',
    'buttons.next': 'Next',
    'buttons.previous': 'Previous',
    'buttons.finish': 'Finish',
    'buttons.send': 'Send',
    'buttons.receive': 'Receive',
    'buttons.reverse': 'Reverse',
    'buttons.audit': 'Audit',
    'buttons.reload': 'Reload',
    'buttons.select': 'Select',
    'buttons.add': 'Add',
    'buttons.remove': 'Remove',

    // Form Labels
    'form.name': 'Name',
    'form.description': 'Description',
    'form.cnpj': 'CNPJ',
    'form.companyName': 'Company Name',
    'form.tradeName': 'Trade Name',
    'form.active': 'Active Client',
    'form.status': 'Status',
    'form.plan': 'Plan',
    'form.startDate': 'Start Date',
    'form.endDate': 'End Date',
    'form.discountPercent': 'Discount Percent (%)',
    'form.discountValue': 'Discount Value ($)',
    'form.discountValidity': 'Discount Validity Date',
    'form.contractModel': 'Contract Model',
    'form.observations': 'Observations',
    'form.address': 'Address',
    'form.number': 'Number',
    'form.complement': 'Complement',
    'form.neighborhood': 'Neighborhood',
    'form.city': 'City',
    'form.state': 'State',
    'form.zipCode': 'Zip Code',
    'form.email': 'Email',
    'form.phone': 'Phone',
    'form.receivesEmail': 'Receives Email',
    'form.receivesWhatsApp': 'Receives WhatsApp',
    'form.file': 'File',
    'form.fileName': 'Name',
    'form.fileType': 'Type',
    'form.client': 'Client',
    'form.supplier': 'Supplier',
    'form.bank': 'Bank for Boleto',
    'form.value': 'Value',
    'form.dueDate': 'Due Date',
    'form.paymentDate': 'Payment Date',
    'form.paidValue': 'Paid Value',
    'form.openValue': 'Open Value',
    'form.originalValue': 'Original Value',
    'form.discount': 'Discount',
    'form.useClientAddress': 'Use client address',
    'form.operationNature': 'Operation Nature',
    'form.model': 'Model',
    'form.issueDate': 'Issue Date',
    'form.totalValue': 'Total Value',
    'form.servicesValue': 'Services Value',
    'form.productsValue': 'Products Value',
    'form.discountValueInvoice': 'Discount Value',
    'form.issRate': 'ISS Rate',
    'form.fileSelected': 'File Selected',
    'form.fileTypeDocument': 'Document',
    'form.fileTypePhoto': 'Photo',
    'form.fileTypeSignature': 'Signature',
    'form.fileTypeOther': 'Other',
    'form.personType': 'Person Type',
    'form.personTypePhysical': 'Physical',
    'form.personTypeLegal': 'Legal',
    'form.cpf': 'CPF',
    'form.country': 'Country',
    'form.street': 'Street',
    'form.invoice': 'Invoice',
    'form.invoiceStatus': 'Invoice Status',
    'form.testClient': 'Test Client',
    'form.enterClientId': 'Enter client ID',
    'form.enterPlanId': 'Enter plan ID',
    'form.enterBankId': 'Enter bank ID',
    'form.enterContractModelId': 'Enter contract model ID',
    'form.selectContractModelHelp': 'Select a contract model',
    'form.dueDay': 'Due Day',
    'form.exemptFromMonthlyFee': 'Exempt from Monthly Fee',
    'form.selectClientForTest': 'Select a client to view the document with real data',
    'form.validationErrors': 'Validation errors:',
    'form.briefDescription': 'Brief description',
    'form.fileDescription': 'File description (optional)',
    'form.optional': 'Optional',
    'form.planNamePlaceholder': 'Plan name',
    'form.planDescriptionPlaceholder': 'Plan description',
    'form.monthlyValuePlaceholder': 'Monthly value',
    'form.usersQuantity': 'Users Quantity',
    'form.autoRenewal': 'Auto Renewal',
    'form.planObservationsPlaceholder': 'Plan observations',
    'form.serviceTypeInfrastructure': 'Infrastructure',
    'form.serviceTypeConsulting': 'Consulting',
    'form.periodicityMonthly': 'Monthly',
    'form.periodicityQuarterly': 'Quarterly',
    'form.periodicitySemiannual': 'Semiannual',
    'form.periodicityAnnual': 'Annual',
    'form.periodicityBimonthly': 'Bimonthly',
    'form.periodicityBiweekly': 'Biweekly',
    'form.periodicityWeekly': 'Weekly',
    'form.messageType': 'Message Type',
    'form.message10DaysBefore': '10 days before',
    'form.message5DaysBefore': '5 days before',
    'form.messageSameDay': 'Same day',
    'form.message5DaysAfter': '5 days after',
    'form.message10DaysAfter': '10 days after',
    'form.message15DaysAfter': '15 days after',
    'form.messageClientCut': 'Client cut',
    'form.messageManualSend': 'Manual send',
    'form.messageConfiguration': 'Message configuration',

    // Table Columns
    'table.id': 'ID',
    'table.contract': 'Contract',
    'table.status': 'Status',
    'table.plan': 'Plan',
    'table.dueDate': 'Due Date',
    'table.value': 'Value',
    'table.paidValue': 'Paid Value',
    'table.openValue': 'Open Value',
    'table.invoice': 'Invoice',
    'table.invoiceStatus': 'Invoice Status',
    'table.actions': 'Actions',
    'table.createdAt': 'Created At',
    'table.updatedAt': 'Updated At',
    'table.documentNumber': 'Document Number',
    'table.supplier': 'Supplier',
    'table.paymentType': 'Payment Type',
    'table.clientName': 'Client',
    'table.contractNumber': 'Contract Number',
    'table.contractStartDate': 'Start Date',
    'table.contractEndDate': 'End Date',
    'table.email': 'Email',
    'table.whatsapp': 'WhatsApp',
    'table.number': 'Number',
    'table.complement': 'Complement',
    'table.neighborhood': 'Neighborhood',
    'table.city': 'City',
    'table.state': 'State',
    'table.planName': 'Plan Name',
    'table.description': 'Description',
    'table.serviceType': 'Service Type',
    'table.monthlyValue': 'Monthly Value',
    'table.users': 'Users',
    'table.clients': 'Clients',
    'table.periodicity': 'Periodicity',
    'table.bankName': 'Bank Name',
    'table.bankType': 'Bank Type',
    'table.sandbox': 'Sandbox',
    'table.paymentDate': 'Payment Date',
    'table.chargeId': 'Charge ID',
    'table.ourNumber': 'Our Number',
    'table.planValue': 'Plan Value',
    'table.discountPercent': 'Discount %',
    'table.discountValue': 'Discount Value',
    'table.finalValue': 'Final Value',
    'table.exempt': 'Exempt',
    'table.dueDay': 'Due Day',
    'table.fileName': 'File Name',
    'table.fileType': 'File Type',
    'table.fileOrigin': 'File Origin',
    'table.fileSize': 'File Size',
    'table.fileDate': 'File Date',
    'table.titleNumber': 'Title Number',

    // Modal Titles
    'modal.createClient': 'Create Client',
    'modal.editClient': 'Edit Client',
    'modal.createPlan': 'Create Plan',
    'modal.editPlan': 'Edit Plan',
    'modal.createBank': 'Create Bank',
    'modal.editBank': 'Edit Bank',
    'modal.createContract': 'Create Contract',
    'modal.editContract': 'Edit Contract',
    'modal.createSupplier': 'Create Supplier',
    'modal.editSupplier': 'Edit Supplier',
    'modal.createAccountPayable': 'Create Account Payable',
    'modal.editAccountPayable': 'Edit Account Payable',
    'modal.createTitle': 'Create Title',
    'modal.editTitle': 'Edit Title',
    'modal.generateNFe': 'Generate Electronic Service Invoice (NFS-e)',
    'modal.cancelInvoice': 'Cancel Invoice',
    'modal.deleteClient': 'Delete client',
    'modal.deletePlan': 'Delete plan',
    'modal.deleteBank': 'Delete bank',
    'modal.deleteContract': 'Delete contracts',
    'modal.deleteSupplier': 'Delete supplier',
    'modal.deleteAccountPayable': 'Delete account payable',
    'modal.viewDocument': 'View Document',
    'modal.addFile': 'Add File',
    'modal.editTerm': 'Edit Term',
    'modal.selectTerm': 'Select Term',
    'modal.sendSignature': 'Send Signature',
    'modal.additionalService': 'Additional Service',
    'modal.list': 'List',
    'modal.defaultDocument': 'Default Document',
    'modal.deleteFiles': 'Delete files',

    // Tabs
    'tabs.basicData': 'Basic Data',
    'tabs.contact': 'Contact',
    'tabs.address': 'Address',
    'tabs.contracts': 'Contracts',
    'tabs.financial': 'Financial',
    'tabs.observations': 'Observations',
    'tabs.files': 'Files',
    'tabs.salePlan': 'Sale Plan',
    'tabs.servicesObservations': 'Observations',
    'tabs.contractData': 'Contract Data',
    'tabs.additionalServices': 'Additional Services',
    'tabs.terms': 'Terms',
    'tabs.collectionLetter': 'Collection Letter',
    'tabs.receipts': 'Receipts',
    'tabs.financialMisc': 'Miscellaneous Financial',
    'tabs.content': 'Content',
    'tabs.contract': 'Contract',
    'tabs.receipt': 'Receipt',
    'tabs.letter': 'Letter',
    'tabs.adhesion': 'Adhesion',
    'tabs.persistence': 'Persistence',
    'tabs.basicInfo': 'Basic Information',
    'tabs.apiConfig': 'API Configuration',
    'tabs.discountsConfig': 'Discounts and Configuration',
    'tabs.server': 'Server',
    'tabs.messages': 'Messages',
    'tabs.responsible': 'Responsible',
    'tabs.communicationPreferences': 'Communication Preferences',

    // Status Labels
    'status.scheduled': 'Scheduled',
    'status.issued': 'Issued',
    'status.cancelled': 'Cancelled',
    'status.rejected': 'Rejected',
    'status.error': 'Error',
    'status.partial': 'Partial',
    'status.paid': 'Paid',
    'status.pending': 'Pending',
    'status.toPay': 'To Pay',
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.suspended': 'Suspended',

    // Placeholders
    'placeholder.cnpj': '00.000.000/0000-00',
    'placeholder.companyName': 'Company name',
    'placeholder.tradeName': 'Trade name',
    'placeholder.observations': 'Observations about the client...',
    'placeholder.discountPercent': '0.00',
    'placeholder.discountValue': '0.00',
    'placeholder.fileName': 'File name',
    'placeholder.fileDescription': 'File description (optional)',
    'placeholder.cpfCnpj': '11 digits for CPF or 14 digits for CNPJ',
    'placeholder.briefDescription': 'Brief description',
    'placeholder.selectStatus': 'Select status',
    'placeholder.selectPlan': 'Select plan',
    'placeholder.selectBank': 'Select bank',
    'placeholder.selectContractModel': 'Select contract model',
    'placeholder.selectClient': 'Select client',
    'placeholder.selectSupplier': 'Select supplier',
    'placeholder.enterClientId': 'Enter client ID',

    // Other
    'other.selectExactlyOne': 'Select exactly 1 record to audit',
    'other.auditSelectedRecord': 'Audit selected record',
    'other.resizeColumn': 'Resize column',
    'other.reloadData': 'Reload data',
    'other.confirmAction': 'Confirm action',
    'other.selectAtLeastOne': 'Select at least one title',
    'other.selected': 'Selected',
    'other.open': 'Open',
    'other.receipt': 'Receipt',
    'other.printNF': 'Print Invoice',
    'other.generateNFSeStandalone': 'Generate Standalone NFS-e',
    'other.termRegistered': 'Registered Term',
    'other.viaWhatsApp': 'Via WhatsApp',
    'other.viaEmail': 'Via Email',
    'other.newMiscTitle': 'New Misc Title',
    'other.deleteTerms': 'Delete terms',
    'other.day': 'Day',
  },
  'es-ES': {
    // Navegación
    'nav.dashboard': 'Panel',
    'nav.clients': 'Clientes',
    'nav.plans': 'Planes',
    'nav.banks': 'Bancos',
    'nav.contracts': 'Contratos',
    'nav.logout': 'Salir',

    // Acciones comunes
    'actions.save': 'Guardar',
    'actions.cancel': 'Cancelar',
    'actions.edit': 'Editar',
    'actions.delete': 'Eliminar',
    'actions.create': 'Crear',
    'actions.filter': 'Filtrar',
    'actions.export': 'Exportar',
    'actions.import': 'Importar',

    // Mensajes
    'messages.confirmDelete': '¿Estás seguro de que quieres eliminar?',
    'messages.loading': 'Cargando...',
    'messages.noData': 'No se encontraron datos',
    'messages.error': 'Ocurrió un error',
    'messages.success': 'Operación completada con éxito',
    'messages.warning': 'Advertencia',

    // Formularios
    'form.required': 'Campo obligatorio',
    'form.invalidEmail': 'Correo electrónico inválido',
    'form.invalidCPF': 'CPF inválido',
    'form.invalidCNPJ': 'CNPJ inválido',
    'form.invalidPhone': 'Teléfono inválido',
    'form.invalidWhatsApp': 'WhatsApp inválido',
    'form.invalidZipCode': 'Código postal inválido',
    'form.invalidAddress': 'Dirección inválida',
    'form.invalidCity': 'Ciudad inválida',
    'form.invalidState': 'Estado inválido',

    // Estado
    'status.approved': 'Aprobado',

    // Panel
    'dashboard.title': 'Panel',
    'dashboard.overview': 'Resumen',
    'dashboard.totalClients': 'Total de Clientes',
    'dashboard.totalPlans': 'Total de Planes',
    'dashboard.totalContracts': 'Total de Contratos',
    'dashboard.monthlyRevenue': 'Ingresos Mensuales',
    'dashboard.startDate': 'Fecha Inicial',
    'dashboard.endDate': 'Fecha Final',
    'dashboard.revenue': 'Facturación',
    'dashboard.expected': 'Previsto',
    'dashboard.pending': 'Pendiente',
    'dashboard.clients': 'Clientes',
    'dashboard.inPeriod': 'en el período',
    'dashboard.received': 'Recibidos',
    'dashboard.toReceive': 'A Recibir',
    'dashboard.clientStatus': 'Estado de los Clientes',
    'dashboard.planStatus': 'Estado de los Planes',
    'dashboard.paymentStatus': 'Estado de los Pagos',
    'dashboard.planDistribution': 'Distribución por Tipo de Plan',
    'dashboard.paymentRate': 'Tasa de Pago',
    'dashboard.contractStatus': 'Estado de los Contratos',
    'dashboard.averageTicket': 'Ticket Promedio',
    'dashboard.months12': '12 meses',
    'dashboard.newClients': 'Nuevos Clientes',
    'dashboard.receivablesVsPayables': 'Cuentas por Cobrar vs Cuentas por Pagar',
    'dashboard.clientsByPlan': 'Clientes por Plan',
    'dashboard.monthlyRevenueTitle': 'Ingresos Mensuales',

    // Pagination
    'pagination.to': 'a',
    'pagination.of': 'de',
    'pagination.perPage': 'por página',

    // Layout
    'layout.user': 'Usuario',
    'layout.darkMode': 'Modo Oscuro',
    'layout.lightMode': 'Modo Claro',
    'layout.parameters': 'Parámetros',
    'layout.search': 'Buscar',
    'layout.searchPlaceholder': 'Buscar...',
    'layout.openMenu': 'Abrir menú lateral',
    'layout.closeMenu': 'Cerrar menú',

    // Menu Items
    'menu.clients': 'Clientes',
    'menu.plans': 'Planes',
    'menu.banks': 'Bancos',
    'menu.contracts': 'Contratos',
    'menu.financial': 'Financiero',
    'menu.suppliers': 'Proveedores',
    'menu.accountsPayable': 'Cuentas por Pagar',
    'menu.invoices': 'Facturas',
    'menu.companyData': 'Datos de la Empresa',

    // Parameters Menu
    'params.users': 'Usuarios',
    'params.auditLogs': 'Registros de Auditoría',
    'params.systemResources': 'Recursos del Sistema',
    'params.taskScheduler': 'Programador de Tareas',
    'params.emailServer': 'Servidor de Correo',
    'params.whatsappServer': 'Servidor de WhatsApp',
    'params.nfse': 'NFS-e',
    'params.systemDocuments': 'Documentos del Sistema',
    'params.digitalSignature': 'Firma Digital',
    'params.dueDays': 'Días de Vencimiento',
    'params.updates': 'Actualizaciones',

    // Common UI
    'ui.confirm': 'Confirmar',
    'ui.confirmAction': 'Confirmar acción',
    'ui.select': 'Seleccionar',
    'ui.clear': 'Limpiar',
    'ui.show': 'Mostrar',
    'ui.hide': 'Ocultar',
    'ui.noRecords': 'No se encontraron registros',
    'ui.selectOption': 'Seleccione una opción',
    'ui.noOptionsAvailable': 'No hay opciones disponibles',
    'ui.showFilters': 'Mostrar filtros',
    'ui.hideFilters': 'Ocultar filtros',
    'ui.back': 'Volver',
    'ui.close': 'Cerrar',
    'ui.selectClient': 'Seleccionar Cliente',
    'ui.selectPlan': 'Seleccionar Plan',
    'ui.selectBank': 'Seleccionar Banco',
    'ui.yes': 'Sí',
    'ui.no': 'No',

    // Financial
    'financial.title': 'Financiero - Títulos',
    'financial.accountsPayable': 'Cuentas por Pagar',
    'financial.receivables': 'Cuentas por Cobrar',
    'financial.cancelTitles': 'Cancelar títulos',
    'financial.reverseTitle': 'Revertir título',
    'financial.reverse': 'Revertir',
    'financial.toPay': 'A Pagar',
    'financial.paid': 'Pagado',
    'financial.pending': 'Pendiente',
    'financial.viewDocument': 'Ver Documento',
    'financial.executionLogs': 'Registros de Ejecución',
    'financial.receiveTitle': 'Recibir - Título',
    'financial.titleCanceled': '¡Título cancelado con éxito!',
    'financial.titlesCanceled': 'títulos cancelados con éxito!',
    'financial.titleNotCanceled': '1 título no pudo ser cancelado',
    'financial.titlesNotCanceled': 'títulos no pudieron ser cancelados',
    'financial.errorCanceling': 'Error al cancelar títulos',
    'financial.canOnlyReversePaid': 'Solo se pueden revertir títulos que están pagados',
    'financial.titleReversed': '¡Título revertido con éxito!',
    'financial.errorReversing': 'Error al revertir título.',
    'financial.titleWillReturnPending': 'El título volverá al estado PENDIENTE.',
    'financial.receive': 'Recibir',
    'financial.pay': 'Pagar',
    'financial.toReceive': 'A Recibir',
    'financial.toPayLabel': 'A Pagar',
    'financial.value': 'Valor',

    // Buttons
    'buttons.save': 'Guardar',
    'buttons.cancel': 'Cancelar',
    'buttons.close': 'Cerrar',
    'buttons.create': 'Crear',
    'buttons.edit': 'Editar',
    'buttons.delete': 'Eliminar',
    'buttons.print': 'Imprimir',
    'buttons.generate': 'Generar',
    'buttons.view': 'Ver',
    'buttons.export': 'Exportar',
    'buttons.import': 'Importar',
    'buttons.search': 'Buscar',
    'buttons.filter': 'Filtrar',
    'buttons.clear': 'Limpiar',
    'buttons.confirm': 'Confirmar',
    'buttons.back': 'Volver',
    'buttons.next': 'Siguiente',
    'buttons.previous': 'Anterior',
    'buttons.finish': 'Finalizar',
    'buttons.send': 'Enviar',
    'buttons.receive': 'Recibir',
    'buttons.reverse': 'Revertir',
    'buttons.audit': 'Auditar',
    'buttons.reload': 'Recargar',
    'buttons.select': 'Seleccionar',
    'buttons.add': 'Agregar',
    'buttons.remove': 'Remover',

    // Form Labels
    'form.name': 'Nombre',
    'form.description': 'Descripción',
    'form.cnpj': 'CNPJ',
    'form.companyName': 'Razón Social',
    'form.tradeName': 'Nombre Comercial',
    'form.active': 'Cliente Activo',
    'form.status': 'Estado',
    'form.plan': 'Plan',
    'form.startDate': 'Fecha de Inicio',
    'form.endDate': 'Fecha de Fin',
    'form.discountPercent': 'Descuento Porcentual (%)',
    'form.discountValue': 'Descuento Valor ($)',
    'form.discountValidity': 'Fecha Validez Descuento',
    'form.contractModel': 'Modelo de Contrato',
    'form.observations': 'Observaciones',
    'form.address': 'Dirección',
    'form.number': 'Número',
    'form.complement': 'Complemento',
    'form.neighborhood': 'Barrio',
    'form.city': 'Ciudad',
    'form.state': 'Estado',
    'form.zipCode': 'Código Postal',
    'form.email': 'Email',
    'form.phone': 'Teléfono',
    'form.receivesEmail': 'Recibe Email',
    'form.receivesWhatsApp': 'Recibe WhatsApp',
    'form.file': 'Archivo',
    'form.fileName': 'Nombre',
    'form.fileType': 'Tipo',
    'form.client': 'Cliente',
    'form.supplier': 'Proveedor',
    'form.bank': 'Banco para Boleto',
    'form.value': 'Valor',
    'form.dueDate': 'Fecha de Vencimiento',
    'form.paymentDate': 'Fecha de Pago',
    'form.paidValue': 'Valor Pagado',
    'form.openValue': 'Valor Abierto',
    'form.originalValue': 'Valor Original',
    'form.discount': 'Descuento',
    'form.useClientAddress': 'Usar dirección del cliente',
    'form.operationNature': 'Naturaleza de la Operación',
    'form.model': 'Modelo',
    'form.issueDate': 'Fecha de Emisión',
    'form.totalValue': 'Valor Total',
    'form.servicesValue': 'Valor de los Servicios',
    'form.productsValue': 'Valor de los Productos',
    'form.discountValueInvoice': 'Valor del Descuento',
    'form.issRate': 'Tasa ISS',
    'form.fileSelected': 'Archivo Seleccionado',
    'form.fileTypeDocument': 'Documento',
    'form.fileTypePhoto': 'Foto',
    'form.fileTypeSignature': 'Firma',
    'form.fileTypeOther': 'Otro',
    'form.personType': 'Tipo de Persona',
    'form.personTypePhysical': 'Física',
    'form.personTypeLegal': 'Jurídica',
    'form.cpf': 'CPF',
    'form.country': 'País',
    'form.street': 'Calle',
    'form.invoice': 'Factura',
    'form.invoiceStatus': 'Estado Factura',
    'form.testClient': 'Cliente para Prueba',
    'form.enterClientId': 'Ingrese el ID del cliente',
    'form.enterPlanId': 'Ingrese el ID del plan',
    'form.enterBankId': 'Ingrese el ID del banco',
    'form.enterContractModelId': 'Ingrese el ID del modelo de contrato',
    'form.selectContractModelHelp': 'Seleccione un modelo de contrato',
    'form.dueDay': 'Día de Vencimiento',
    'form.exemptFromMonthlyFee': 'Exento de Tarifa Mensual',
    'form.selectClientForTest': 'Seleccione un cliente para ver el documento con datos reales',
    'form.validationErrors': 'Errores de validación:',
    'form.briefDescription': 'Breve descripción',
    'form.fileDescription': 'Descripción del archivo (opcional)',
    'form.optional': 'Opcional',
    'form.planNamePlaceholder': 'Nombre del plan',
    'form.planDescriptionPlaceholder': 'Descripción del plan',
    'form.monthlyValuePlaceholder': 'Valor mensual',
    'form.usersQuantity': 'Cantidad de Usuarios',
    'form.autoRenewal': 'Renovación Automática',
    'form.planObservationsPlaceholder': 'Observaciones del plan',
    'form.serviceTypeInfrastructure': 'Infraestructura',
    'form.serviceTypeConsulting': 'Consultoría',
    'form.periodicityMonthly': 'Mensual',
    'form.periodicityQuarterly': 'Trimestral',
    'form.periodicitySemiannual': 'Semestral',
    'form.periodicityAnnual': 'Anual',
    'form.periodicityBimonthly': 'Bimestral',
    'form.periodicityBiweekly': 'Quincenal',
    'form.periodicityWeekly': 'Semanal',
    'form.messageType': 'Tipo de Mensaje',
    'form.message10DaysBefore': '10 días antes',
    'form.message5DaysBefore': '5 días antes',
    'form.messageSameDay': 'El mismo día',
    'form.message5DaysAfter': '5 días después',
    'form.message10DaysAfter': '10 días después',
    'form.message15DaysAfter': '15 días después',
    'form.messageClientCut': 'Corte del cliente',
    'form.messageManualSend': 'Envío manual',
    'form.messageConfiguration': 'Configuración de mensaje',

    // Table Columns
    'table.id': 'ID',
    'table.contract': 'Contrato',
    'table.status': 'Estado',
    'table.plan': 'Plan',
    'table.dueDate': 'Vencimiento',
    'table.value': 'Valor',
    'table.paidValue': 'Valor pagado',
    'table.openValue': 'Valor abierto',
    'table.invoice': 'Factura',
    'table.invoiceStatus': 'Estado Factura',
    'table.actions': 'Acciones',
    'table.createdAt': 'Creado en',
    'table.updatedAt': 'Actualizado en',
    'table.documentNumber': 'Número de Documento',
    'table.supplier': 'Proveedor',
    'table.paymentType': 'Tipo de Pago',
    'table.clientName': 'Cliente',
    'table.contractNumber': 'Número de Contrato',
    'table.contractStartDate': 'Fecha Inicio',
    'table.contractEndDate': 'Fecha Fin',
    'table.email': 'Email',
    'table.whatsapp': 'WhatsApp',
    'table.number': 'Número',
    'table.complement': 'Complemento',
    'table.neighborhood': 'Barrio',
    'table.city': 'Ciudad',
    'table.state': 'Estado',
    'table.planName': 'Nombre del Plan',
    'table.description': 'Descripción',
    'table.serviceType': 'Tipo de Servicio',
    'table.monthlyValue': 'Valor Mensual',
    'table.users': 'Usuarios',
    'table.clients': 'Clientes',
    'table.periodicity': 'Periodicidad',
    'table.bankName': 'Nombre del Banco',
    'table.bankType': 'Tipo de Banco',
    'table.sandbox': 'Sandbox',
    'table.paymentDate': 'Fecha de Pago',
    'table.chargeId': 'ID de la Cobranza',
    'table.ourNumber': 'Nuestro Número',
    'table.planValue': 'Valor del Plan',
    'table.discountPercent': 'Descuento %',
    'table.discountValue': 'Valor del Descuento',
    'table.finalValue': 'Valor Final',
    'table.exempt': 'Exento',
    'table.dueDay': 'Día de Vencimiento',
    'table.fileName': 'Nombre del Archivo',
    'table.fileType': 'Tipo de Archivo',
    'table.fileOrigin': 'Origen del Archivo',
    'table.fileSize': 'Tamaño del Archivo',
    'table.fileDate': 'Fecha del Archivo',
    'table.titleNumber': 'Número del Título',

    // Modal Titles
    'modal.createClient': 'Crear Cliente',
    'modal.editClient': 'Editar Cliente',
    'modal.createPlan': 'Crear Plan',
    'modal.editPlan': 'Editar Plan',
    'modal.createBank': 'Crear Banco',
    'modal.editBank': 'Editar Banco',
    'modal.createContract': 'Crear Contrato',
    'modal.editContract': 'Editar Contrato',
    'modal.createSupplier': 'Crear Proveedor',
    'modal.editSupplier': 'Editar Proveedor',
    'modal.createAccountPayable': 'Crear Cuenta por Pagar',
    'modal.editAccountPayable': 'Editar Cuenta por Pagar',
    'modal.createTitle': 'Crear Título',
    'modal.editTitle': 'Editar Título',
    'modal.generateNFe': 'Generar Factura de Servicios Electrónica (NFS-e)',
    'modal.cancelInvoice': 'Cancelar Factura',
    'modal.deleteClient': 'Eliminar cliente',
    'modal.deletePlan': 'Eliminar plan',
    'modal.deleteBank': 'Eliminar banco',
    'modal.deleteContract': 'Eliminar contratos',
    'modal.deleteSupplier': 'Eliminar proveedor',
    'modal.deleteAccountPayable': 'Eliminar cuenta por pagar',
    'modal.viewDocument': 'Ver Documento',
    'modal.addFile': 'Agregar Archivo',
    'modal.editTerm': 'Editar Término',
    'modal.selectTerm': 'Seleccionar Término',
    'modal.sendSignature': 'Enviar Firma',
    'modal.additionalService': 'Servicio Adicional',
    'modal.list': 'Lista',
    'modal.defaultDocument': 'Documento Predeterminado',
    'modal.deleteFiles': 'Eliminar archivos',

    // Tabs
    'tabs.basicData': 'Datos Básicos',
    'tabs.contact': 'Contacto',
    'tabs.address': 'Dirección',
    'tabs.contracts': 'Contratos',
    'tabs.financial': 'Financiero',
    'tabs.observations': 'Observaciones',
    'tabs.files': 'Archivos',
    'tabs.salePlan': 'Plan de Venta',
    'tabs.servicesObservations': 'Observaciones',
    'tabs.contractData': 'Datos del Contrato',
    'tabs.additionalServices': 'Servicios Adicionales',
    'tabs.terms': 'Términos',
    'tabs.collectionLetter': 'Carta de Cobranza',
    'tabs.receipts': 'Recibos',
    'tabs.financialMisc': 'Financiero Varios',
    'tabs.content': 'Contenido',
    'tabs.contract': 'Contrato',
    'tabs.receipt': 'Recibo',
    'tabs.letter': 'Carta',
    'tabs.adhesion': 'Adhesión',
    'tabs.persistence': 'Permanencia',
    'tabs.basicInfo': 'Información Básica',
    'tabs.apiConfig': 'Configuración de API',
    'tabs.discountsConfig': 'Descuentos y Configuración',
    'tabs.server': 'Servidor',
    'tabs.messages': 'Mensajes',
    'tabs.responsible': 'Responsable',
    'tabs.communicationPreferences': 'Preferencias de Comunicación',

    // Status Labels
    'status.scheduled': 'Programado',
    'status.issued': 'Emitida',
    'status.cancelled': 'Cancelada',
    'status.rejected': 'Rechazada',
    'status.error': 'Error',
    'status.partial': 'Parcial',
    'status.paid': 'Pagado',
    'status.pending': 'Pendiente',
    'status.toPay': 'A Pagar',
    'status.active': 'Activo',
    'status.inactive': 'Inactivo',
    'status.suspended': 'Suspendido',

    // Placeholders
    'placeholder.cnpj': '00.000.000/0000-00',
    'placeholder.companyName': 'Razón social de la empresa',
    'placeholder.tradeName': 'Nombre comercial de la empresa',
    'placeholder.observations': 'Observaciones sobre el cliente...',
    'placeholder.discountPercent': '0.00',
    'placeholder.discountValue': '0.00',
    'placeholder.fileName': 'Nombre del archivo',
    'placeholder.fileDescription': 'Descripción del archivo (opcional)',
    'placeholder.cpfCnpj': '11 dígitos para CPF o 14 dígitos para CNPJ',
    'placeholder.briefDescription': 'Breve descripción',
    'placeholder.selectStatus': 'Seleccione el estado',
    'placeholder.selectPlan': 'Seleccione el plan',
    'placeholder.selectBank': 'Seleccione el banco',
    'placeholder.selectContractModel': 'Seleccione el modelo de contrato',
    'placeholder.selectClient': 'Seleccione el cliente',
    'placeholder.selectSupplier': 'Seleccione el proveedor',
    'placeholder.enterClientId': 'Ingrese el ID del cliente',

    // Other
    'other.selectExactlyOne': 'Seleccione exactamente 1 registro para auditar',
    'other.auditSelectedRecord': 'Auditar registro seleccionado',
    'other.resizeColumn': 'Redimensionar columna',
    'other.reloadData': 'Recargar datos',
    'other.confirmAction': 'Confirmar acción',
    'other.selectAtLeastOne': 'Seleccione al menos un título',
    'other.selected': 'Seleccionados',
    'other.open': 'Abiertos',
    'other.receipt': 'Recibo',
    'other.printNF': 'Imprimir Factura',
    'other.generateNFSeStandalone': 'Generar NFS-e Independiente',
    'other.termRegistered': 'Término Registrado',
    'other.viaWhatsApp': 'Vía WhatsApp',
    'other.viaEmail': 'Vía Email',
    'other.newMiscTitle': 'Nuevo Título Varios',
    'other.deleteTerms': 'Eliminar términos',
    'other.day': 'Día',
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
  availableLanguages: { code: Language; name: string; flag: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const availableLanguages = [
  { code: 'pt-BR' as Language, name: 'Português', flag: '🇧🇷' },
  { code: 'en-US' as Language, name: 'English', flag: '🇺🇸' },
  { code: 'es-ES' as Language, name: 'Español', flag: '🇪🇸' },
];

// Normalizar código de idioma do navegador
const normalizeLanguage = (lang: string): Language => {
  const langLower = lang.toLowerCase();
  if (langLower.startsWith('pt')) return 'pt-BR';
  if (langLower.startsWith('en')) return 'en-US';
  if (langLower.startsWith('es')) return 'es-ES';
  return 'pt-BR';
};

// Função para obter o idioma inicial
const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'pt-BR';
  
  const savedLang = localStorage.getItem('app-language') as Language | null;
  if (savedLang && availableLanguages.some(lang => lang.code === savedLang)) {
    return savedLang;
  }
  
  const browserLang = navigator.language || navigator.languages?.[0] || 'pt-BR';
  const normalizedLang = normalizeLanguage(browserLang);
  localStorage.setItem('app-language', normalizedLang);
  return normalizedLang;
};

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Usar lazy initialization para getInitialLanguage ser chamado apenas uma vez
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());

  // Sincronizar com localStorage quando mudar externamente (ex: outra aba)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-language' && e.newValue) {
        const newLang = e.newValue as Language;
        if (availableLanguages.some(lang => lang.code === newLang)) {
          setLanguageState(newLang);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: keyof TranslationKeys, params?: Record<string, unknown>): string => {
    let translation = translations[language][key] || translations['pt-BR'][key] || key;

    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`\\$\\{${param}\\}`, 'g'), String(value));
      });
    }

    return translation;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, availableLanguages }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Hook simplificado para traduções comuns
export const useTranslation = () => {
  const { t } = useI18n();
  return { t };
};