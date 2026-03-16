/* eslint-disable no-template-curly-in-string */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'pt-BR' | 'en-US' | 'es-ES';

export interface TranslationKeys {
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
  'actions.pay': string;
  'actions.duplicate': string;
  'actions.insert': string;
  'actions.new': string;
  'actions.filter': string;
  'actions.export': string;
  'actions.import': string;
  'actions.receive': string;
  'actions.reverse': string;
  'actions.nfse': string;
  'actions.print': string;
  'actions.send': string;

  // Buttons
  'buttons.selected': string;
  'buttons.open': string;
  'buttons.receipt': string;
  'buttons.printNF': string;
  'buttons.viaWhatsApp': string;
  'buttons.viaEmail': string;
  'buttons.generateNFSeAvulsa': string;
  'buttons.new': string;

  // Contracts
  'contracts.title': string;
  'contracts.confirmDelete': string;
  'contracts.confirmDeleteMessage': string;
  'contracts.termAdesao': string;
  'contracts.permanencia': string;
  'contracts.messages.deleteSuccess': string;
  'contracts.messages.deleteError': string;

  // Mensagens
  'messages.confirmDelete': string;
  'messages.loading': string;
  'messages.noData': string;
  'messages.error': string;
  'messages.cnpjDataAutoFilled': string;
  'messages.cnpjNotFound': string;
  'messages.errorConsultingCnpj': string;
  'messages.nameRequired': string;
  'messages.contentRequired': string;
  'messages.cpfCnpjRequired': string;
  'messages.invalidCpf': string;
  'messages.invalidCnpj': string;
  'messages.clientRequired': string;
  'messages.justificationRequired': string;
  'messages.justificationMinLength': string;
  'messages.justificationMaxLength': string;
  'messages.invoiceCanceled': string;
  'messages.errorCancelingInvoice': string;
  'messages.actionCannotBeUndone': string;
  'messages.notInformed': string;
  'messages.selectAtLeastOneInvoice': string;
  'messages.invoiceGenerated': string;
  'messages.errorGeneratingInvoice': string;
  'messages.issRateRange': string;
  'messages.invoicePdfGenerated': string;
  'messages.errorGeneratingInvoicePdf': string;
  'messages.selectInvoiceToCancel': string;
  'messages.selectOnlyOneInvoiceToCancel': string;
  'messages.invoiceAlreadyCanceled': string;
  'messages.onlyAuthorizedCanBeCanceled': string;
  'messages.success': string;
  'messages.warning': string;
  'messages.successPrintSelected': string;
  'messages.errorPrintSelected': string;
  'messages.clientNotFound': string;
  'messages.successPrintOpen': string;
  'messages.errorPrintOpen': string;
  'messages.confirmCancelTitle': string;
  'messages.confirmCancelTitles': string;
  'messages.successCancelTitle': string;
  'messages.successCancelTitles': string;
  'messages.errorCancelTitle': string;
  'messages.errorCancelTitles': string;
  'messages.errorCancelTitlesGeneral': string;
  'messages.successSendMessage': string;
  'messages.successSendMessages': string;
  'messages.errorSendMessage': string;
  'messages.errorSendMessages': string;
  'messages.errorSendMessagesGeneral': string;
  'messages.successSendEmail': string;
  'messages.successSendEmails': string;
  'messages.errorSendEmail': string;
  'messages.errorSendEmails': string;
  'messages.errorSendEmailsGeneral': string;
  'messages.successReverseTitle': string;
  'messages.errorReverseTitle': string;
  'messages.successDeleteTerm': string;
  'messages.successDeleteTerms': string;
  'messages.errorDeleteTerm': string;
  'messages.errorDeleteTerms': string;
  'messages.confirmDeleteAdditionalService': string;
  'messages.confirmDeleteAdditionalServices': string;
  'messages.successDeleteAdditionalService': string;
  'messages.successDeleteAdditionalServices': string;
  'messages.errorDeleteAdditionalService': string;
  'messages.errorDeleteAdditionalServices': string;
  'messages.errorDeleteAdditionalServicesGeneral': string;
  'messages.loadingAccountData': string;
  'messages.supplierRequired': string;
  'messages.emailRequired': string;
  'messages.passwordRequired': string;
  'messages.passwordMinLength': string;
  'messages.info': string;
  'messages.confirmAction': string;
  'messages.dueDateRequired': string;
  'messages.startDateRequired': string;
  'messages.endDateRequired': string;
  'messages.endDateAfterStartDate': string;
  'messages.valueRequired': string;
  'messages.valueGreaterThanZero': string;
  'messages.confirmDeleteAccountPayable': string;
  'messages.successDeleteAccountPayable': string;
  'messages.errorDeleteAccountPayable': string;

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
  'layout.language': string;
  'layout.parameters': string;
  'layout.search': string;
  'layout.searchPlaceholder': string;
  'layout.openMenu': string;
  'layout.closeMenu': string;
  'layout.folderCadastros': string;
  'layout.folderFinanceiro': string;
  'layout.folderLogs': string;

  // Logs
  'logs.usuarios': string;
  'logs.agendaTarefas': string;
  'logs.webhook': string;
  'logs.email': string;
  'logs.whatsapp': string;
  'logs.assinaturaDigital': string;
  'logs.acessoSistema': string;
  'logs.comingSoon': string;

  // Menu Items
  'menu.clients': string;
  'menu.plans': string;
  'menu.banks': string;
  'menu.billingType': string;
  'menu.contracts': string;
  'menu.financial': string;
  'menu.accountsReceivable': string;
  'menu.suppliers': string;
  'menu.accountsPayable': string;
  'menu.invoices': string;
  'menu.companyData': string;
  'menu.whatsappHistory': string;
  'menu.emailHistory': string;

  // Modal Titles
  'modal.clients': string;
  'modal.clientsTenants': string;
  'modal.plans': string;
  'modal.banks': string;
  'modal.billingType': string;
  'modal.contracts': string;
  'modal.accountsReceivable': string;
  'modal.suppliers': string;
  'modal.accountsPayable': string;
  'modal.invoices': string;
  'modal.companyData': string;
  'modal.users': string;
  'modal.systemResources': string;
  'modal.emailServer': string;
  'modal.whatsappServer': string;
  'modal.nfse': string;
  'modal.dueDays': string;
  'modal.updates': string;
  'modal.taskScheduler': string;
  'modal.backups': string;
  'modal.digitalSignature': string;
  'modal.auditLogs': string;
  'modal.domains': string;
  'modal.ipv4': string;
  'modal.ipv6': string;
  'modal.systemDocuments': string;
  'modal.whatsappHistory': string;
  'modal.emailHistory': string;
  'modal.importList': string;

  // Blockdomi
  'blockdomi.menuTitle': string;
  'blockdomi.titleImport': string;
  'blockdomi.domain': string;
  'blockdomi.domains': string;
  'blockdomi.versao': string;
  'blockdomi.gerarVersao': string;
  'blockdomi.tipoLista': string;
  'blockdomi.versaoGerada': string;
  'blockdomi.selectDomain': string;
  'blockdomi.nomeOficio': string;
  'blockdomi.nomeOficioOptional': string;
  'blockdomi.dataInicioBloqueio': string;
  'blockdomi.dataFimBloqueio': string;
  'blockdomi.dataFimBloqueioOptional': string;
  'blockdomi.oficioAnatel': string;
  'blockdomi.oficioJustica': string;
  'blockdomi.linkOficioAnatel': string;
  'blockdomi.linkOficioJustica': string;
  'blockdomi.linkPlanilhaDominios': string;
  'blockdomi.linkPlanilhaDominiosOptional': string;
  'blockdomi.planilhaDominios': string;
  'blockdomi.linkOficioAnatelOptional': string;
  'blockdomi.linkOficioJusticaOptional': string;
  'blockdomi.anatel': string;
  'blockdomi.justica': string;
  'blockdomi.bulkEditDomains': string;
  'blockdomi.bulkEditIntro': string;
  'blockdomi.bulkEditSuccess': string;
  'blockdomi.createDomain': string;
  'blockdomi.editDomain': string;
  'blockdomi.deleteDomain': string;
  'blockdomi.createIPv4': string;
  'blockdomi.editIPv4': string;
  'blockdomi.deleteIPv4': string;
  'blockdomi.selectIPv4': string;
  'blockdomi.createIPv6': string;
  'blockdomi.editIPv6': string;
  'blockdomi.deleteIPv6': string;
  'blockdomi.selectIPv6': string;
  'blockdomi.importIntro': string;
  'blockdomi.placeholderDomain': string;
  'blockdomi.helpDomain': string;
  'blockdomi.placeholderOficio': string;
  'blockdomi.analyze': string;
  'blockdomi.register': string;
  'blockdomi.classifying': string;
  'blockdomi.paste': string;
  'blockdomi.domainsDetected': string;
  'blockdomi.previewExtracted': string;
  'blockdomi.inputListLabel': string;
  'blockdomi.separateLinksHelp': string;
  'blockdomi.orUploadPdf': string;
  'blockdomi.chooseFile': string;
  'blockdomi.pasteListHint': string;
  'blockdomi.importFromPdf': string;
  'blockdomi.importFromPdfIntro': string;
  'blockdomi.pdfFile': string;
  'blockdomi.pdfUrl': string;
  'blockdomi.extractDomainsFromPdf': string;
  'blockdomi.extractingPdf': string;
  'blockdomi.extractFromPlanilhaUrl': string;
  'blockdomi.extractFromPlanilhaPdf': string;
  'blockdomi.extractFromPlanilhaUrlHelp': string;
  'blockdomi.pdfUrlOrLinkRequired': string;
  'blockdomi.pdfUrlPlaceholder': string;
  'blockdomi.pdfExtractSuccess': string;
  'blockdomi.pdfExtractError': string;
  'blockdomi.titleVisualizacaoExtrados': string;
  'blockdomi.raw': string;
  'blockdomi.filtered': string;
  'blockdomi.valid': string;
  'blockdomi.copiedToClipboard': string;
  'blockdomi.copyFailed': string;
  'blockdomi.duplicates': string;
  'blockdomi.invalid': string;
  'blockdomi.alreadyRegistered': string;
  'blockdomi.alreadyRegisteredIgnored': string;
  'blockdomi.none': string;
  'blockdomi.verListasTxt': string;
  'blockdomi.domainRequired': string;
  'blockdomi.domainInvalidFormat': string;
  'blockdomi.ipRequired': string;
  'blockdomi.ipv4InvalidFormat': string;
  'blockdomi.ipv6InvalidFormat': string;
  'blockdomi.ipsPermitidos': string;
  'blockdomi.ipsPermitidosNew': string;
  'blockdomi.createIpsPermitidos': string;
  'blockdomi.editIpsPermitidos': string;
  'blockdomi.deleteIpsPermitidos': string;
  'blockdomi.faixaIps': string;
  'blockdomi.faixaIpsHelp': string;
  'blockdomi.ipsPermitidosRequired': string;
  'blockdomi.clienteRequired': string;
  'blockdomi.selectCliente': string;
  'blockdomi.noIpsPermitidos': string;
  'blockdomi.cliente': string;
  'blockdomi.logsAcesso': string;
  'blockdomi.logsIp': string;
  'blockdomi.logsRota': string;
  'blockdomi.logsMetodo': string;
  'blockdomi.logsStatus': string;
  'blockdomi.logsSucesso': string;
  'blockdomi.logsSucessoOk': string;
  'blockdomi.logsSucessoErro': string;
  'blockdomi.logsMensagemErro': string;
  'blockdomi.logsSearchPlaceholder': string;
  'blockdomi.logsEmpty': string;
  'blockdomi.logsReal': string;
  'blockdomi.whois': string;
  'blockdomi.whoisOrganizacao': string;
  'blockdomi.whoisBloco': string;
  'blockdomi.whoisCidr': string;
  'blockdomi.whoisNetname': string;
  'blockdomi.whoisPais': string;
  'blockdomi.whoisAsn': string;
  'blockdomi.whoisNenhumDado': string;
  'blockdomi.whoisInfo': string;
  'blockdomi.whoisBlocos': string;
  'blockdomi.whoisContato': string;

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
  'params.manageBackups': string;

  // Backup
  'backup.title': string;
  'backup.executeManual': string;
  'backup.manualDatabase': string;
  'backup.manualFiles': string;
  'backup.manualLogs': string;
  'backup.manualFull': string;
  'backup.confirmDelete': string;
  'backup.confirmRestoreCritical': string;
  'backup.deleted': string;
  'backup.downloadStarted': string;
  'backup.restoreRequested': string;
  'backup.manualQueued': string;
  'backup.loadingList': string;
  'backup.empty': string;
  'backup.columnName': string;
  'backup.columnSize': string;
  'backup.columnDate': string;
  'backup.columnType': string;
  'backup.restore': string;
  'backup.import': string;
  'backup.imported': string;
  'params.validations': string;
  'params.validateCpfCnpj': string;
  'params.validateCpfCnpjHelp': string;
  'params.validateCep': string;
  'params.validateCepHelp': string;
  'params.titleGeneration': string;
  'params.titlesDueSaturday': string;
  'params.titlesDueSaturdayHelp': string;
  'params.titlesDueSunday': string;
  'params.titlesDueSundayHelp': string;
  'params.subscriberCenter': string;
  'params.loginMethod': string;
  'params.loginMethodHelp': string;
  'params.successUpdate': string;
  'params.errorUpdate': string;

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
  'ui.actionsMenu': string;
  'ui.firstPage': string;
  'ui.previousPage': string;
  'ui.nextPage': string;
  'ui.lastPage': string;
  'ui.page': string;
  'ui.refresh': string;
  'ui.auditSelected': string;
  'ui.selectOneToAudit': string;
  'ui.selectAllPages': string;
  'ui.loadingApplication': string;
  'ui.loadingDashboard': string;
  'ui.loadingLogin': string;
  'ui.loadingPayment': string;
  'ui.loadingPage': string;
  'ui.loadingSubscriberCenter': string;
  'ui.appError': string;
  'ui.criticalError': string;
  'ui.reloadPage': string;
  'ui.serverUnavailable': string;
  'ui.loading': string;

  // Company Labels
  'company.title': string;
  'company.razaoSocial': string;
  'company.nomeFantasia': string;
  'company.cnpj': string;
  'company.inscricaoEstadual': string;
  'company.inscricaoMunicipal': string;
  'company.logo': string;
  'company.noLogo': string;
  'company.acceptedFormats': string;

  // NFSe Labels
  'nfse.title': string;
  'nfse.municipalServiceCode': string;
  'nfse.municipalServiceCodeHelp': string;
  'nfse.issRate': string;
  'nfse.issRateHelp': string;
  'nfse.serviceDescription': string;
  'nfse.serviceDescriptionHelp': string;
  'nfse.nfSerie': string;
  'nfse.nfSerieHelp': string;
  'nfse.dpsNumber': string;
  'nfse.dpsNumberHelp': string;
  'nfse.provider': string;
  'nfse.providerHelp': string;
  'nfse.asaasApiKey': string;
  'nfse.asaasApiKeyHelp': string;
  'nfse.useSandbox': string;
  'nfse.useSandboxHelp': string;
  'nfse.username': string;
  'nfse.password': string;
  'nfse.baseUrl': string;
  'nfse.environment': string;
  'nfse.homologation': string;
  'nfse.production': string;
  'nfse.messages.loadingError': string;
  'nfse.messages.saveSuccess': string;
  'nfse.messages.saveError': string;
  'nfse.messages.testSuccessAsaas': string;
  'nfse.messages.testSuccessPortal': string;
  'nfse.messages.testError': string;
  'nfse.messages.apiKeyRequired': string;
  'nfse.messages.credentialsRequired': string;
  'nfse.messages.providerRequired': string;

  // Title Labels
  'titulo.title': string;
  'titulo.send': string;
  'titulo.sendViaWhatsApp': string;
  'titulo.sendViaEmail': string;
  'titulo.createTitle': string;
  'titulo.validationErrors': string;
  'titulo.clientNotFound': string;
  'titulo.clientCannotBeChanged': string;
  'titulo.planoCannotBeChanged': string;
  'titulo.valorCannotBeChanged': string;
  'titulo.dataVencimentoCannotBeChanged': string;
  'titulo.discountPercent': string;
  'titulo.discountValue': string;
  'titulo.additionPercent': string;
  'titulo.additionValue': string;
  'titulo.observationsPlaceholder': string;
  'titulo.descriptionPlaceholder': string;
  'titulo.selectClient': string;
  'titulo.selectPlano': string;
  'titulo.messages.sendSuccess': string;
  'titulo.messages.sendError': string;
  'titulo.messages.whatsappError': string;

  // Financial
  'financial.title': string;
  'financial.accountsPayable': string;
  'financial.receivables': string;
  'financial.cancelTitles': string;
  'financial.reverseTitle': string;
  'financial.reverse': string;
  'financial.confirmReverse': string;
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
  'financial.confirmDeleteTitle': string;
  'financial.confirmDeleteTitles': string;
  'financial.successDeleteTitle': string;
  'financial.successDeleteTitles': string;
  'financial.errorDeleteTitle': string;
  'financial.errorDeleteTitles': string;
  'financial.errorDeleteTitlesGeneral': string;
  'financial.receive': string;
  'financial.pay': string;
  'financial.toReceive': string;
  'financial.toPayLabel': string;
  'financial.value': string;
  'financial.generateTitles': string;

  // Buttons
  'buttons.confirmPayment': string;
  'buttons.confirmCancellation': string;
  'buttons.canceling': string;
  'buttons.save': string;
  'buttons.cancel': string;
  'buttons.close': string;
  'buttons.create': string;
  'buttons.edit': string;
  'buttons.delete': string;
  'buttons.print': string;
  'buttons.generate': string;
  'buttons.view': string;
  'buttons.download': string;
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
  'buttons.testConnection': string;
  'buttons.generateToken': string;
  'buttons.copy': string;
  'buttons.select': string;
  'buttons.add': string;
  'buttons.remove': string;

  // Form Labels
  'form.name': string;
  'form.role': string;
  'form.clientId': string;
  'form.clientIdProd': string;
  'form.clientSecret': string;
  'form.clientSecretProd': string;
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
  'form.cell': string;
  'form.site': string;
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
  'form.bankNameHelp': string;
  'form.bankTypeHelp': string;
  'form.optionalUpdate': string;
  'form.webhookUrl': string;
  'form.webhookUrlHelp': string;
  'form.sandboxHelp': string;
  'form.apiKey': string;
  'form.apiKeyAsaasHelp': string;
  'form.webhookSecret': string;
  'form.webhookSecretAsaasHelp': string;
  'form.generateWebhookSecretHelp': string;
  'form.finePercent': string;
  'form.interestPercent': string;
  'form.includeFee': string;
  'form.accountIdentifier': string;
  'form.accountIdentifierEfiHelp': string;
  'form.paymentLocation': string;
  'form.operationNature': string;
  'form.model': string;
  'form.type': string;
  'form.code': string;
  'form.issueDate': string;
  'form.totalValue': string;
  'form.servicesValue': string;
  'form.productsValue': string;
  'form.discountValueInvoice': string;
  'form.issRateShort': string;
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
  'form.creationType': string;
  'form.creationTypeUnique': string;
  'form.creationTypeBatch': string;
  'form.dueDateInitial': string;
  'form.dueDateFinal': string;
  'form.pixKeyType': string;
  'form.pixKey': string;
  'form.qrCodeCopiaECola': string;
  'form.barcodeLine': string;
  'form.discountPercentShort': string;
  'form.discountValueShort': string;
  'form.increasePercentShort': string;
  'form.increaseValueShort': string;
  'form.baixadoValue': string;
  'form.totalToPay': string;
  'form.justification': string;
  'form.justificationCancel': string;
  'form.title': string;
  'form.password': string;
  'form.planNamePlaceholder': string;
  'form.planDescriptionPlaceholder': string;
  'form.monthlyValuePlaceholder': string;
  'form.usersQuantity': string;
  'form.autoRenewal': string;
  'form.planObservationsPlaceholder': string;
  'form.serviceTypeInfrastructure': string;
  'form.serviceTypeConsulting': string;
  'form.serviceTypeBlockdomi': string;
  'form.periodicityMonthly': string;
  'form.periodicityQuarterly': string;
  'form.periodicitySemiannual': string;
  'form.periodicityAnnual': string;
  'form.periodicityBimonthly': string;
  'form.periodicityBiweekly': string;
  'form.periodicityWeekly': string;
  'form.quantityTitles': string;
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
  'form.invoiceNumber': string;
  'form.paymentType': string;
  'form.paymentTypeCash': string;
  'form.paymentTypeBoleto': string;
  'form.paymentTypeCard': string;
  'form.paymentTypeDeposit': string;
  'form.paymentTypeDebit': string;
  'form.paymentTypeTransfer': string;
  'form.paymentTypePix': string;
  'form.balanceDue': string;
  'form.dueDateStart': string;
  'form.dueDateEnd': string;
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
  'table.personTypeShort': string;
  'table.personTypeLegalShort': string;
  'table.personTypePhysicalShort': string;
  'table.nameCompanyNameShort': string;
  'table.tradeNameShort': string;
  'table.zipCodeShort': string;
  'table.streetShort': string;
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
  'table.balanceDue': string;
  'table.createdAt': string;
  'table.updatedAt': string;
  'table.documentNumber': string;
  'table.supplier': string;
  'table.paymentType': string;
  'table.client': string;
  'table.clientName': string;
  'table.cpfCnpj': string;
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
  'table.country': string;
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
  'table.issueDate': string;
  'table.totalValue': string;
  'table.accessKey': string;
  'table.protocol': string;
  'table.authorizationDate': string;
  'table.chargeId': string;
  'table.ourNumber': string;
  'table.paidValueDownloaded': string;
  'table.openValueOpen': string;
  'table.nf': string;
  'table.nfStatus': string;
  'table.termName': string;
  'table.accepted': string;
  'table.acceptedDate': string;
  'table.acceptedBy': string;
  'table.observations': string;
  'table.action': string;
  'table.name': string;
  'table.bank': string;
  
  // Filter Labels
  'filter.startDate': string;
  'filter.endDate': string;

  // Document Labels
  'document.title': string;
  'document.viewDocument': string;
  'document.print': string;
  'document.modelContrato': string;
  'document.termAdesao': string;
  'document.permanencia': string;
  'document.receipts': string;
  'document.cartaCobranca': string;
  'document.name': string;
  'document.description': string;
  'document.testClient': string;
  'document.testClientHelp': string;
  'document.idPlaceholder': string;
  'document.content': string;
  'document.contractContent': string;
  'document.successCreate': string;
  'document.successUpdate': string;
  'document.errorCreate': string;
  'document.errorUpdate': string;
  'document.errorGeneratePdf': string;
  'document.labels.recibo': string;
  'document.labels.carta_cobranca': string;
  'document.labels.termo': string;
  'document.labels.documento': string;

  // Modal Titles
  'modal.viewInvoice': string;
  'modal.payAccountManually': string;
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
  'modal.selectContractModel': string;
  'modal.sendSignature': string;
  'modal.additionalService': string;
  'modal.list': string;
  'modal.defaultDocument': string;
  'modal.deleteFiles': string;
  'modal.deleteAdditionalServices': string;
  'modal.scheduledRoutine': string;

  // Tabs
  'tabs.basicData': string;
  'tabs.contact': string;
  'tabs.address': string;
  'tabs.contracts': string;
  'tabs.financial': string;
  'tabs.faturasAbertas': string;
  'tabs.faturasPagas': string;
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
  'status.processing': string;
  'status.authorized': string;
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
  'status.blocked': string;
  'status.inArrears': string;
  'status.suspended': string;
  'status.exempt': string;
  'status.overdue': string;
  'status.paidLate': string;

  'saas.manualUnblock': string;
  'saas.confirmManualUnblock': string;
  'saas.dataNaoBloquearAte': string;

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
  'placeholder.bankName': string;
  'placeholder.bankDescription': string;
  'placeholder.fillClientSecret': string;
  'placeholder.webhookUrl': string;
  'placeholder.apiKeyAsaas': string;
  'placeholder.webhookSecretHelp': string;
  'placeholder.accountIdentifierHelp': string;
  'placeholder.paymentLocationDefault': string;
  'placeholder.contractCreationHelp': string;
  'placeholder.financialTitlesCreationHelp': string;
  'placeholder.financialMiscCreationHelp': string;
  'placeholder.additionalServicesCreationHelp': string;
  'placeholder.enterJustification': string;
  'placeholder.enterSupplierId': string;
  'placeholder.enterPixKey': string;
  'placeholder.enterCpfCnpj': string;
  'placeholder.enterCellPhone': string;
  'placeholder.enterEmail': string;
  'placeholder.enterName': string;
  'placeholder.enterRandomKey': string;
  'placeholder.pasteQrCode': string;
  'placeholder.selectProvider': string;
  'placeholder.startDate': string;
  'placeholder.endDate': string;
  'placeholder.selectType': string;
  'placeholder.searchServices': string;

  // Other
  'other.selectExactlyOne': string;
  'other.auditSelectedRecord': string;
  'other.resizeColumn': string;
  'other.reloadData': string;
  'other.confirmAction': string;
  'other.selectAtLeastOne': string;
  'other.characters': string;
  'other.invoiceDetails': string;
  'other.selected': string;
  'other.open': string;
  'other.all': string;
  'other.receipt': string;
  'other.printNF': string;
  'other.generateNFSeStandalone': string;
  'other.termRegistered': string;
  'other.viaWhatsApp': string;
  'other.viaEmail': string;
  'other.newMiscTitle': string;
  'other.deleteTerms': string;
  'other.day': string;

  // Financial Summary Labels
  'summary.value': string;
  'summary.paidValue': string;
  'summary.openValue': string;
  'summary.canceledValue': string;
  'summary.totalPaidValue': string;
  'summary.monthlyTotalValue': string;
  'summary.totalDiscountsValue': string;
  'summary.contractSummary': string;
  'summary.totalContracts': string;
  'summary.activeContracts': string;

  // Audit
  'audit.title': string;
  'audit.detailsTitle': string;
  'audit.generalInfo': string;
  'audit.data': string;
  'audit.entityId': string;
  'audit.user': string;
  'audit.ip': string;
  'audit.tenant': string;
  'audit.route': string;
  'audit.userAgent': string;
  'audit.viewDetails': string;
  'audit.method': string;
  'audit.entity': string;
  'audit.timestamp': string;
  'audit.entities.all': string;
  'audit.actions.all': string;
  'audit.actions.create': string;
  'audit.actions.update': string;
  'audit.actions.delete': string;
  'audit.actions.login': string;
  'audit.actions.logout': string;
  'audit.actions.export': string;
  'audit.actions.import': string;
  'audit.actions.executar': string;

  // Variables
  'variables.title': string;
  'variables.searchPlaceholder': string;
  'variables.insert': string;
  'variables.errorLoading': string;
  'variables.tip': string;
  'variables.clickToInsert': string;
  'variables.clickToCopy': string;

  // User Form
  'user.title': string;
  'user.profile': string;
  'user.admin': string;
  'user.user': string;
  'user.newPassword': string;
  'user.passwordPlaceholder': string;
  'user.newPasswordPlaceholder': string;
  'user.webhookHelp': string;
  'user.generateWebhookHelp': string;
  'user.webhookSecret': string;
  'user.generateToken': string;
  'user.copy': string;
  'user.variables': string;
  'user.successCreate': string;
  'user.successUpdate': string;
  'user.successGenerateSecret': string;
  'user.successCopySecret': string;
  'user.errorCreate': string;
  'user.errorUpdate': string;

  // Email Server
  'emailServer.title': string;
  'emailServer.serverSettings': string;
  'emailServer.configureServer': string;
  'emailServer.smtpHost': string;
  'emailServer.port': string;
  'emailServer.userEmail': string;
  'emailServer.senderName': string;
  'emailServer.senderEmail': string;
  'emailServer.useSsl': string;
  'emailServer.useTls': string;
  'emailServer.timeout': string;
  'emailServer.sendTestEmail': string;
  'emailServer.testEmailPlaceholder': string;
  'emailServer.testEmailButton': string;
  'emailServer.testEmailHelp': string;
  'emailServer.passwordHelp': string;
  'emailServer.passwordPlaceholder': string;

  // WhatsApp Server
  'whatsappServer.title': string;
  'whatsappServer.evolutionApi': string;
  'whatsappServer.cloudApi': string;
  'whatsappServer.successSave': string;
  'whatsappServer.errorSave': string;
  'whatsappServer.successMessageSave': string;
  'whatsappServer.errorMessageSave': string;
  'whatsappServer.successRemove': string;
  'whatsappServer.errorRemove': string;
  'whatsappServer.testPhoneRequired': string;
  'whatsappServer.testMessageRequired': string;
  'whatsappServer.configureFirst': string;
  'whatsappServer.errorSendTest': string;
  'whatsappServer.selectMessageType': string;
  'whatsappServer.messageRequired': string;
  'whatsappServer.removeServer': string;
  'whatsappServer.variableCopied': string;
  'whatsappServer.server': string;
  'whatsappServer.messages': string;
  'whatsappServer.templatesMeta': string;
  'whatsappServer.templates': string;

  // Scheduler
  'scheduler.title': string;
  'scheduler.frequency': string;
  'scheduler.schedule': string;
  'scheduler.nextRun': string;
  'scheduler.lastRun': string;
  'scheduler.executions': string;
  'scheduler.errors': string;
  'scheduler.confirmExecute': string;
  'scheduler.executeRoutine': string;
  'scheduler.execute': string;
  'scheduler.routineStarted': string;
  'scheduler.confirmDelete': string;
  'scheduler.deleteRoutine': string;
  'scheduler.successDelete': string;
  'scheduler.deactivate': string;
  'scheduler.type': string;
  'scheduler.routine': string;

  // Updates
  'updates.title': string;
  'updates.currentVersion': string;
  'updates.searching': string;
  'updates.errorSearch': string;
  'updates.noUpdates': string;
  'updates.systemUpdated': string;
  'updates.updating': string;
  'updates.success': string;
  'updates.error': string;
  'updates.confirmUpdate': string;
  'updates.updateSystem': string;
  'updates.badges.new': string;
  'updates.badges.bugfix': string;
  'updates.badges.security': string;
  'updates.badges.improvement': string;
  'updates.badges.other': string;
  'updates.concluded': string;
  'updates.waitingServer': string;
  'updates.restartInSeconds': string;
  'updates.reloadingPage': string;

  // Login
  'login.title': string;
  'login.emailPlaceholder': string;
  'login.passwordPlaceholder': string;
  'login.entering': string;
  'login.enter': string;
  'login.success': string;
  'login.errorCredentials': string;
  'login.errorToken': string;
  'login.errorGeneral': string;
  'login.infoRequired': string;
  'login.allRightsReserved': string;
  'login.copyIp': string;
  'login.ipCopied': string;

  // Layout
  'layout.logoutSuccess': string;
  'layout.closeSearch': string;

  'empty.noContracts': string;
  'empty.noTitles': string;
  'empty.noFiles': string;
  'empty.noTermsRegistered': string;
  'empty.noAdditionalServices': string;
  'filter.showInactive': string;
  'filter.showCanceled': string;
  'confirm.deleteFiles': string;
  'confirm.deleteFilesTitle': string;
  'messages.saveClientFirst': string;
  'messages.saveBankBeforeTest': string;
  'messages.testingConnection': string;
  'messages.connectionSuccess': string;
  'messages.connectionFailed': string;
  'messages.credentialsNotConfiguredAsaas': string;
  'messages.credentialsNotConfiguredEfi': string;
  'messages.saveBankBeforeWebhook': string;
  'messages.webhookTokenGenerated': string;
  'messages.webhookTokenNotReturned': string;
  'messages.noTokenToCopy': string;
  'messages.webhookTokenCopied': string;
  'messages.copyManual': string;
  'messages.loadingClientData': string;
  'messages.loadingPlanData': string;
  'messages.noTitleSelected': string;
  'messages.noPaidTitleSelected': string;
  'messages.noTitlesFound': string;
  'messages.noOpenTitlesFound': string;
  'messages.noPaidTitlesFound': string;
  'messages.noNFSeTitlesSelected': string;
  'messages.receiptsGenerated': string;
  'messages.errorGeneratingReceipts': string;
  'messages.errorGeneratingNFSe': string;
  'messages.nfseGenerated': string;
  'fileType.document': string;
  'fileType.photo': string;
  'fileType.signature': string;
  'fileType.manual': string;
  'fileType.digitalSignature': string;
  'fileType.system': string;
  'placeholder.street': string;
  'placeholder.number': string;
  'placeholder.complement': string;
  'placeholder.neighborhood': string;
  'placeholder.city': string;
  'placeholder.state': string;
  'placeholder.email': string;
  'form.whatsapp': string;

  // New Placeholders
  'placeholder.contractContent': string;
  'placeholder.receiptContent': string;
  'placeholder.letterContent': string;
  'placeholder.description': string;
  'placeholder.manualSend': string;
  'placeholder.defaultEmail': string;
  'placeholder.defaultMessage': string;
  'placeholder.firstInteraction': string;
  'placeholder.secondInteraction': string;
  'placeholder.thirdInteraction': string;
  'placeholder.clientIdProd': string;
  'placeholder.serviceCode': string;
  'placeholder.serviceDescription': string;
  'placeholder.apiToken': string;
  'placeholder.apiKey': string;
  'placeholder.workspaceId': string;
  'placeholder.responsibleName': string;
  'placeholder.responsibleRole': string;
  'placeholder.paymentObservations': string;
  'placeholder.testMessage': string;
  'placeholder.termContent': string;

  // Message Types
  'messages.types.10daysBefore': string;
  'messages.types.05daysBefore': string;
  'messages.types.sameDay': string;
  'messages.types.05daysAfter': string;
  'messages.types.10daysAfter': string;
  'messages.types.15daysAfter': string;
  'messages.types.clientCut': string;
  'messages.types.manualSend': string;
  'messages.types.paymentReceipt': string;

  // Send Types
  'messages.sendTypes.disabled': string;
  'messages.sendTypes.pdf': string;

  // Settings Server
  'settings.server.config': string;
  'settings.server.configure': string;
  'settings.test.title': string;
  'settings.test.phone': string;
  'settings.test.message': string;
  'settings.test.send': string;
  'settings.test.helper': string;
  'settings.messages.type': string;
  'settings.messages.sendType': string;
  'settings.messages.manualLabel': string;
  'settings.messages.manualHelper': string;
  'settings.messages.emailLabel': string;
  'settings.messages.templateConfig': string;
  'settings.messages.viewTemplates': string;
  'settings.messages.activeTemplatesWhatsApp': string;
  'settings.messages.templateHelper': string;
  'settings.messages.templateFormat': string;
  'settings.messages.defaultMessage': string;
  'settings.messages.interaction1': string;
  'settings.messages.interaction2': string;
  'settings.messages.interaction3': string;
  'settings.messages.interaction1Helper': string;
  'settings.messages.interaction2Helper': string;
  'settings.messages.interaction3Helper': string;
  'settings.messages.variablesTitle': string;
  'settings.messages.variablesHelper': string;
  'settings.messages.copyVariable': string;

  // Message History
  'history.whatsappTitle': string;
  'history.emailTitle': string;
  'history.type': string;
  'history.client': string;
  'history.phone': string;
  'history.recipient': string;
  'history.subject': string;
  'history.message': string;
  'history.status': string;
  'history.error': string;
  'history.entity': string;
  'history.user': string;
  'history.dateTime': string;
  'history.whatsapp': string;
  'history.email': string;
  'history.sent': string;
  'history.errorStatus': string;
  'history.system': string;
  'history.view': string;
  'history.searchPhone': string;
  'history.searchEmail': string;
  'history.noMessages': string;

  // File Modal
  'messages.selectFile': string;
  'messages.enterFileName': string;
  'messages.fileAddedSuccess': string;
  'messages.fileAddedError': string;

  // Financial
  'financial.parcelInfo': string;
  'financial.originalValue': string;
  'financial.paymentDate': string;
  'financial.amountPaid': string;
  'financial.characters': string;

  // Company
  'company.responsibleSignature': string;
  'company.noSignature': string;
  'company.pngOnly': string;

  // Digital Signature
  'digitalSignature.generalSettings': string;
  'digitalSignature.enable': string;
  'digitalSignature.enableHelp': string;
  'digitalSignature.provider': string;
  'digitalSignature.providerHelp': string;
  'digitalSignature.expirationDays': string;
  'digitalSignature.expirationDaysHelp': string;
  'digitalSignature.apiSettings': string;
  'digitalSignature.apiKey': string;
  'digitalSignature.assinafyHelp': string;
  'digitalSignature.zapsignHelp': string;
  'digitalSignature.workspaceId': string;
  'digitalSignature.workspaceIdHelp': string;
  'digitalSignature.assinafyInfo': string;
  'digitalSignature.successUpdate': string;
  'digitalSignature.errorUpdate': string;
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
    'actions.delete': 'Deletar',
    'actions.create': 'Novo',
    'actions.pay': 'Pagar',
    'actions.duplicate': 'Duplicar',
    'actions.insert': 'Inserir',
    'actions.new': 'Novo',
    'actions.filter': 'Filtrar',
    'actions.export': 'Exportar',
    'actions.import': 'Importar',
    'actions.receive': 'Receber',
    'actions.reverse': 'Estornar',
    'actions.nfse': 'NFS-e',
    'actions.print': 'Imprimir',
    'actions.send': 'Enviar',

    // Buttons
    'buttons.selected': 'Selecionados',
    'buttons.open': 'Abertos',
    'buttons.receipt': 'Recibo',
    'buttons.printNF': 'Imprimir NF',
    'buttons.viaWhatsApp': 'Via WhatsApp',
    'buttons.viaEmail': 'Via Email',
    'buttons.generateNFSeAvulsa': 'Gerar NFS-e Avulsa',
    'buttons.new': 'Novo',

    // Contracts
    'contracts.title': 'Contrato',
    'contracts.confirmDelete': 'Deletar contratos',
    'contracts.confirmDeleteMessage': 'Tem certeza que deseja deletar os contratos selecionados?',
    'contracts.termAdesao': 'Termo de Adesão',
    'contracts.permanencia': 'Contrato Permanência',
    'contracts.messages.deleteSuccess': 'Contrato deletado com sucesso!',
    'contracts.messages.deleteError': 'Erro ao deletar contrato',

    // Mensagens
    'messages.confirmDelete': 'Tem certeza que deseja excluir?',
    'messages.loading': 'Carregando...',
    'messages.noData': 'Nenhum dado encontrado',
    'messages.cnpjDataAutoFilled': 'Dados do CNPJ preenchidos automaticamente!',
    'messages.cnpjNotFound': 'CNPJ não encontrado na base da Receita Federal. Você pode preencher os dados manualmente.',
    'messages.errorConsultingCnpj': 'Erro ao consultar CNPJ. Tente novamente ou preencha os dados manualmente.',
    'messages.nameRequired': 'Nome/Razão Social é obrigatório',
    'messages.contentRequired': 'Conteúdo é obrigatório',
    'messages.cpfCnpjRequired': 'CPF/CNPJ é obrigatório',
    'messages.invalidCpf': 'CPF inválido',
    'messages.invalidCnpj': 'CNPJ inválido',
    'messages.clientRequired': 'Cliente é obrigatório',
    'messages.error': 'Ocorreu um erro',
    'messages.success': 'Operação realizada com sucesso',
    'messages.justificationRequired': 'Justificativa é obrigatória',
    'messages.justificationMinLength': 'Justificativa deve ter pelo menos 15 caracteres',
    'messages.justificationMaxLength': 'Justificativa deve ter no máximo 500 caracteres',
    'messages.invoiceCanceled': 'Nota fiscal cancelada com sucesso!',
    'messages.errorCancelingInvoice': 'Erro ao cancelar nota fiscal',
    'messages.actionCannotBeUndone': 'Esta ação não pode ser desfeita.',
    'messages.notInformed': 'Não informado',
    'messages.selectAtLeastOneInvoice': 'Selecione pelo menos uma nota fiscal',
    'messages.invoiceGenerated': 'Nota Fiscal de Serviços Eletrônica gerada com sucesso!',
    'messages.errorGeneratingInvoice': 'Erro ao gerar Nota Fiscal de Serviços Eletrônica',
    'messages.issRateRange': 'Alíquota de ISS deve estar entre 0 e 100',
    'messages.invoicePdfGenerated': 'PDF da nota fiscal gerado com sucesso!',
    'messages.errorGeneratingInvoicePdf': 'Erro ao gerar PDF da nota fiscal',
    'messages.selectInvoiceToCancel': 'Selecione uma nota fiscal para cancelar',
    'messages.selectOnlyOneInvoiceToCancel': 'Selecione apenas uma nota fiscal para cancelar',
    'messages.invoiceAlreadyCanceled': 'Esta nota fiscal já foi cancelada',
    'messages.onlyAuthorizedCanBeCanceled': 'Apenas notas fiscais autorizadas podem ser canceladas',
    'messages.warning': 'Atenção',
    'messages.successPrintSelected': 'Boletos selecionados gerados com sucesso!',
    'messages.errorPrintSelected': 'Erro ao gerar boletos selecionados',
    'messages.clientNotFound': 'Cliente não encontrado',
    'messages.successPrintOpen': 'Boletos em aberto gerados com sucesso!',
    'messages.errorPrintOpen': 'Erro ao gerar boletos em aberto',
    'messages.confirmCancelTitle': 'Tem certeza que deseja cancelar este título?',
    'messages.confirmCancelTitles': 'Tem certeza que deseja cancelar ${count} títulos?',
    'messages.successCancelTitle': 'Título cancelado com sucesso!',
    'messages.successCancelTitles': '${count} títulos cancelados com sucesso!',
    'messages.errorCancelTitle': '1 título não pôde ser cancelado',
    'messages.errorCancelTitles': '${count} títulos não puderam ser cancelados',
    'messages.errorCancelTitlesGeneral': 'Erro ao cancelar títulos',
    'messages.successSendMessage': 'Mensagem enviada com sucesso!',
    'messages.successSendMessages': '${count} mensagens enviadas com sucesso!',
    'messages.errorSendMessage': 'A mensagem não pôde ser enviada',
    'messages.errorSendMessages': '${count} mensagens não puderam ser enviadas',
    'messages.errorSendMessagesGeneral': 'Erro ao enviar mensagens',
    'messages.successSendEmail': 'Email enviado com sucesso!',
    'messages.successSendEmails': '${count} emails enviados com sucesso!',
    'messages.errorSendEmail': '1 email não pôde ser enviado',
    'messages.errorSendEmails': '${count} emails não puderam ser enviados',
    'messages.errorSendEmailsGeneral': 'Erro ao enviar emails',
    'messages.successReverseTitle': 'Título estornado com sucesso!',
    'messages.errorReverseTitle': 'Erro ao estornar título.',
    'messages.successDeleteTerm': 'Termo deletado com sucesso!',
    'messages.successDeleteTerms': 'Termo(s) deletado(s) com sucesso!',
    'messages.errorDeleteTerm': 'Erro ao deletar termo',
    'messages.errorDeleteTerms': 'Erro ao deletar termo(s)',
    'messages.confirmDeleteAdditionalService': 'Tem certeza que deseja deletar este serviço adicional?',
    'messages.confirmDeleteAdditionalServices': 'Tem certeza que deseja deletar ${count} serviços adicionais?',
    'messages.successDeleteAdditionalService': 'Serviço adicional deletado com sucesso!',
    'messages.successDeleteAdditionalServices': '${count} serviços adicionais deletados com sucesso!',
    'messages.errorDeleteAdditionalService': 'O serviço adicional não pôde ser deletado',
    'messages.errorDeleteAdditionalServices': '${count} serviço(s) adicional(is) não puderam ser deletados',
    'messages.errorDeleteAdditionalServicesGeneral': 'Erro ao deletar serviços adicionais',
    'messages.confirmDeleteAccountPayable': 'Tem certeza que deseja excluir esta conta a pagar?',
    'messages.successDeleteAccountPayable': 'Conta a pagar excluída com sucesso!',
    'messages.errorDeleteAccountPayable': 'Erro ao excluir conta a pagar.',
    'messages.loadingAccountData': 'Carregando dados da conta...',
    'messages.supplierRequired': 'Fornecedor é obrigatório',
    'messages.emailRequired': 'Email é obrigatório',
    'messages.passwordRequired': 'Senha é obrigatória',
    'messages.passwordMinLength': 'Senha deve ter no mínimo 6 caracteres',
    'messages.info': 'Informação',
    'messages.confirmAction': 'Confirmar ação',
    'messages.dueDateRequired': 'Data de vencimento é obrigatória',
    'messages.startDateRequired': 'Data inicial é obrigatória',
    'messages.endDateRequired': 'Data final é obrigatória',
    'messages.endDateAfterStartDate': 'Data final deve ser posterior à data inicial',
    'messages.valueRequired': 'Valor é obrigatório',
    'messages.valueGreaterThanZero': 'Valor deve ser maior que zero',

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
    'dashboard.paymentStatus': 'Status dos Pagamentos (Mês Atual)',
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
    'layout.language': 'Idioma',
    'layout.parameters': 'Parâmetros',
    'layout.search': 'Buscar',
    'layout.searchPlaceholder': 'Buscar...',
    'layout.openMenu': 'Abrir menu lateral',
    'layout.closeMenu': 'Recolher menu',
    'layout.folderCadastros': 'Cadastros',
    'layout.folderFinanceiro': 'Financeiro',
    'layout.folderLogs': 'Logs',

    // Logs
    'logs.usuarios': 'Logs de Usuários',
    'logs.agendaTarefas': 'Logs de Agenda de Tarefas',
    'logs.webhook': 'Logs de Webhook',
    'logs.email': 'Logs de Email',
    'logs.whatsapp': 'Logs de WhatsApp',
    'logs.assinaturaDigital': 'Logs de Assinatura Digital',
    'logs.acessoSistema': 'Logs de Acesso ao Sistema',
    'logs.comingSoon': 'Funcionalidade em desenvolvimento.',

    // Menu Items
    'menu.clients': 'Clientes',
    'menu.plans': 'Planos',
    'menu.banks': 'Bancos',
    'menu.billingType': 'Tipo de Cobrança',
    'menu.contracts': 'Contratos',
    'menu.financial': 'Financeiro',
    'menu.accountsReceivable': 'Contas A Receber',
    'menu.suppliers': 'Fornecedores',
    'menu.accountsPayable': 'Contas a Pagar',
    'menu.invoices': 'Notas Fiscais',
    'menu.companyData': 'Dados da Empresa',
    'menu.whatsappHistory': 'Histórico WhatsApp',
    'menu.emailHistory': 'Histórico Email',

    // Modal Titles
    'modal.clients': 'Clientes',
    'modal.clientsTenants': 'Clientes Tenants',
    'modal.plans': 'Planos',
    'modal.banks': 'Bancos',
    'modal.billingType': 'Tipo de Cobrança',
    'modal.contracts': 'Contratos',
    'modal.accountsReceivable': 'Contas A Receber',
    'modal.suppliers': 'Fornecedores',
    'modal.accountsPayable': 'Contas a Pagar',
    'modal.invoices': 'Notas Fiscais',
    'modal.companyData': 'Dados da Empresa',
    'modal.users': 'Usuários',
    'modal.systemResources': 'Recursos do Sistema',
    'modal.emailServer': 'Servidor de E-Mail',
    'modal.whatsappServer': 'Servidor de WhatsApp',
    'modal.nfse': 'NFS-e',
    'modal.dueDays': 'Dias de Vencimento',
    'modal.updates': 'Atualizações',
    'modal.taskScheduler': 'Agendador de Tarefas',
    'modal.backups': 'Backup/Restauração',
    'modal.digitalSignature': 'Assinatura Digital',
    'modal.auditLogs': 'Logs de Auditoria',
    'modal.systemDocuments': 'Modelos de Documentos',
    'modal.whatsappHistory': 'Histórico de Mensagens WhatsApp',
    'modal.domains': 'Domínios',
    'modal.ipv4': 'IPv4',
    'modal.ipv6': 'IPv6',
    'modal.emailHistory': 'Histórico de Mensagens Email',
    'modal.importList': 'Importar lista',

    // Blockdomi
    'blockdomi.menuTitle': 'Blockdomi',
    'blockdomi.titleImport': 'Importar lista - Blockdomi',
    'blockdomi.domain': 'Domínio',
    'blockdomi.domains': 'Domínios',
    'blockdomi.versao': 'Versão',
    'blockdomi.gerarVersao': 'Gerar versão',
    'blockdomi.tipoLista': 'Lista',
    'blockdomi.versaoGerada': 'gerada com sucesso',
    'blockdomi.selectDomain': 'Selecionar Domínio',
    'blockdomi.nomeOficio': 'Nome do ofício',
    'blockdomi.nomeOficioOptional': 'Nome do ofício (opcional)',
    'blockdomi.dataInicioBloqueio': 'Data início bloqueio',
    'blockdomi.dataFimBloqueio': 'Data fim bloqueio',
    'blockdomi.dataFimBloqueioOptional': 'Data fim bloqueio (opcional)',
    'blockdomi.oficioAnatel': 'Ofício Anatel',
    'blockdomi.oficioJustica': 'Decisão judicial',
    'blockdomi.linkOficioAnatel': 'Link ofício Anatel',
    'blockdomi.linkOficioJustica': 'Link decisão judicial',
    'blockdomi.linkPlanilhaDominios': 'Link planilha domínios',
    'blockdomi.linkPlanilhaDominiosOptional': 'Link planilha domínios (opcional)',
    'blockdomi.planilhaDominios': 'Planilha domínios',
    'blockdomi.linkOficioAnatelOptional': 'Link ofício Anatel (opcional)',
    'blockdomi.linkOficioJusticaOptional': 'Link decisão judicial (opcional)',
    'blockdomi.anatel': 'Anatel',
    'blockdomi.justica': 'Decisão judicial',
    'blockdomi.bulkEditDomains': 'Editar {count} domínio(s)',
    'blockdomi.bulkEditIntro': 'Os valores abaixo serão aplicados aos {count} domínio(s) selecionado(s).',
    'blockdomi.bulkEditSuccess': '{count} domínio(s) atualizado(s) com sucesso.',
    'blockdomi.createDomain': 'Criar Domínio',
    'blockdomi.editDomain': 'Editar Domínio',
    'blockdomi.deleteDomain': 'Excluir Domínio',
    'blockdomi.createIPv4': 'Criar IPv4',
    'blockdomi.editIPv4': 'Editar IPv4',
    'blockdomi.deleteIPv4': 'Excluir IPv4',
    'blockdomi.selectIPv4': 'Selecionar IPv4',
    'blockdomi.createIPv6': 'Criar IPv6',
    'blockdomi.editIPv6': 'Editar IPv6',
    'blockdomi.deleteIPv6': 'Excluir IPv6',
    'blockdomi.selectIPv6': 'Selecionar IPv6',
    'blockdomi.importIntro': 'Cole uma lista (um item por linha). Serão classificados em: domínios, IPv4, IPv6, já cadastrados no sistema e inválidos. Ao cadastrar, itens já existentes no sistema serão ignorados.',
    'blockdomi.placeholderDomain': 'meusite.com ou encurtador.com/abc123',
    'blockdomi.helpDomain': 'Domínio sem protocolo (ex: meusite.com ou encurtador.com/abc123). Sem https://, http:// ou www. no início.',
    'blockdomi.placeholderOficio': 'ex: Ofício nº 01/2026/ORG/SETOR/SIGLA',
    'blockdomi.analyze': 'Analisar',
    'blockdomi.register': 'Cadastrar',
    'blockdomi.classifying': 'Classificando...',
    'blockdomi.paste': 'Colar',
    'blockdomi.domainsDetected': 'itens detectados',
    'blockdomi.previewExtracted': 'Pré-visualização extraída',
    'blockdomi.inputListLabel': 'Lista de entrada',
    'blockdomi.separateLinksHelp': 'Separe múltiplos links com vírgula',
    'blockdomi.orUploadPdf': 'ou enviar arquivo PDF',
    'blockdomi.chooseFile': 'Escolher arquivo',
    'blockdomi.pasteListHint': 'Cole domínios ou IPs (um por linha)',
    'blockdomi.importFromPdf': 'Importar do PDF',
    'blockdomi.importFromPdfIntro': 'Envie um PDF (ofício com tabela anexo) ou informe a URL do PDF. Serão extraídos apenas os domínios e IPs da tabela.',
    'blockdomi.pdfFile': 'Arquivo PDF',
    'blockdomi.pdfUrl': 'Ou URL do PDF',
    'blockdomi.extractDomainsFromPdf': 'Extrair domínios',
    'blockdomi.extractingPdf': 'Extraindo texto do PDF...',
    'blockdomi.extractFromPlanilhaUrl': 'Extrair da URL da planilha',
    'blockdomi.extractFromPlanilhaPdf': 'Extrair domínios do PDF da planilha',
    'blockdomi.extractFromPlanilhaUrlHelp': 'Use o link da planilha acima para extrair domínios sem fazer upload.',
    'blockdomi.pdfUrlOrLinkRequired': 'Informe o link da planilha ou selecione um arquivo PDF.',
    'blockdomi.pdfUrlPlaceholder': 'https://...',
    'blockdomi.pdfExtractSuccess': 'Domínios extraídos do PDF. Clique em Analisar.',
    'blockdomi.pdfExtractError': 'Nenhum domínio ou IP encontrado no PDF.',
    'blockdomi.titleVisualizacaoExtrados': 'Domínios extraídos - Visualização',
    'blockdomi.raw': 'Bruto',
    'blockdomi.filtered': 'Filtrados',
    'blockdomi.valid': 'Válidos',
    'blockdomi.copiedToClipboard': 'Copiado.',
    'blockdomi.copyFailed': 'Não foi possível copiar.',
    'blockdomi.duplicates': 'Duplicados',
    'blockdomi.invalid': 'Inválidos',
    'blockdomi.alreadyRegistered': 'Já cadastrados',
    'blockdomi.alreadyRegisteredIgnored': 'Já cadastrados (ignorados)',
    'blockdomi.none': 'Nenhum',
    'blockdomi.verListasTxt': 'Visualizar listas em TXT',
    'blockdomi.domainRequired': 'Domínio é obrigatório',
    'blockdomi.domainInvalidFormat': 'Use o domínio sem protocolo (ex: meusite.com ou encurtador.com/abc123). Não use https://, http:// ou www. no início.',
    'blockdomi.ipRequired': 'IP é obrigatório',
    'blockdomi.ipv4InvalidFormat': 'Informe um IPv4 válido com 4 octetos (ex: 192.168.1.1). Não use pontos no final.',
    'blockdomi.ipv6InvalidFormat': 'Informe um IPv6 válido (8 grupos hex separados por :). Ex: 2001:db8::1. Pode usar :: uma vez para comprimir zeros.',
    'blockdomi.ipsPermitidos': 'IPs permitidos',
    'blockdomi.ipsPermitidosNew': 'Novo',
    'blockdomi.createIpsPermitidos': 'Cadastrar IPs permitidos',
    'blockdomi.editIpsPermitidos': 'Editar IPs permitidos',
    'blockdomi.deleteIpsPermitidos': 'Excluir IPs permitidos',
    'blockdomi.faixaIps': 'Faixa de IPs',
    'blockdomi.faixaIpsHelp': 'Separe múltiplos IPs ou faixas por ; (ex: 192.168.1.1; 10.0.0.0/24)',
    'blockdomi.ipsPermitidosRequired': 'Informe pelo menos um IP ou faixa',
    'blockdomi.clienteRequired': 'Selecione o cliente',
    'blockdomi.selectCliente': 'Selecionar cliente',
    'blockdomi.noIpsPermitidos': 'Nenhum registro encontrado',
    'blockdomi.cliente': 'Cliente',
    'blockdomi.logsAcesso': 'Logs de acesso API',
    'blockdomi.logsIp': 'IP',
    'blockdomi.logsRota': 'Rota',
    'blockdomi.logsMetodo': 'Método',
    'blockdomi.logsStatus': 'Status',
    'blockdomi.logsSucesso': 'Sucesso',
    'blockdomi.logsSucessoOk': 'Sim',
    'blockdomi.logsSucessoErro': 'Erro',
    'blockdomi.logsMensagemErro': 'Mensagem erro',
    'blockdomi.logsSearchPlaceholder': 'Buscar por IP, rota...',
    'blockdomi.logsEmpty': 'Nenhum log encontrado',
    'blockdomi.logsReal': 'Logs real',
    'blockdomi.whois': 'Whois',
    'blockdomi.whoisOrganizacao': 'Organização',
    'blockdomi.whoisBloco': 'Bloco de IP',
    'blockdomi.whoisCidr': 'CIDR',
    'blockdomi.whoisNetname': 'Netname',
    'blockdomi.whoisPais': 'País',
    'blockdomi.whoisAsn': 'ASN',
    'blockdomi.whoisNenhumDado': 'Nenhum dado encontrado para este IP.',
    'blockdomi.whoisInfo': 'Informações',
    'blockdomi.whoisBlocos': 'Blocos',
    'blockdomi.whoisContato': 'Contato',

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
    'params.manageBackups': 'Gerenciar Backups',
    'params.validations': 'Validações',
    'backup.title': 'Backup/Restauração',
    'backup.executeManual': 'Backup Manual',
    'backup.manualDatabase': 'Banco de Dados',
    'backup.manualFiles': 'Arquivos',
    'backup.manualLogs': 'Logs',
    'backup.manualFull': 'Completo (BD + Arquivos + Logs)',
    'backup.confirmDelete': 'Tem certeza que deseja remover o backup "{{nome}}" do servidor?',
    'backup.confirmRestoreCritical': 'Confirmação crítica: Restaurar este backup pode sobrescrever dados atuais. Deseja continuar?',
    'backup.deleted': 'Backup removido.',
    'backup.downloadStarted': 'Download iniciado.',
    'backup.restoreRequested': 'Restauração solicitada.',
    'backup.manualQueued': 'Backup manual em fila.',
    'backup.loadingList': 'Carregando lista de backups...',
    'backup.empty': 'Nenhum backup encontrado.',
    'backup.columnName': 'Nome do Arquivo',
    'backup.columnSize': 'Tamanho',
    'backup.columnDate': 'Data',
    'backup.columnType': 'Tipo',
    'backup.restore': 'Restaurar',
    'backup.import': 'Importar',
    'backup.imported': 'Backup importado com sucesso.',
    'params.validateCpfCnpj': 'Validar CNPJ',
    'params.validateCpfCnpjHelp': 'Quando ativado, valida se CNPJ é válido ao cadastrar/editar clientes',
    'params.validateCep': 'Validar CEP',
    'params.validateCepHelp': 'Quando ativado, busca automaticamente os dados do endereço ao digitar um CEP válido',
    'params.titleGeneration': 'Geração de Títulos',
    'params.titlesDueSaturday': 'Títulos que Vencem aos Sábados',
    'params.titlesDueSaturdayHelp': 'Se data de vencimento cair em sábado, mantém no sábado. Se desativado, move para próximo dia útil',
    'params.titlesDueSunday': 'Títulos que Vencem aos Domingos',
    'params.titlesDueSundayHelp': 'Se data de vencimento cair em domingo, mantém no domingo. Se desativado, move para próximo dia útil',
    'params.subscriberCenter': 'Central do Assinante',
    'params.loginMethod': 'Método de Login',
    'params.loginMethodHelp': 'Define se o login na central do assinante será feito por CNPJ ou Email',
    'params.successUpdate': 'Parâmetros atualizados com sucesso!',
    'params.errorUpdate': 'Erro ao atualizar parâmetros',

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
    'ui.actionsMenu': 'Menu de ações',
    'ui.firstPage': 'Primeira página',
    'ui.previousPage': 'Página anterior',
    'ui.nextPage': 'Próxima página',
    'ui.lastPage': 'Última página',
    'ui.page': 'Página',
    'ui.refresh': 'Atualizar',
    'ui.auditSelected': 'Auditar registro selecionado',
    'ui.selectOneToAudit': 'Selecione exatamente 1 registro para auditar',
    'ui.selectAllPages': 'Selecionar todos (todas as páginas)',
    'ui.loadingApplication': 'Carregando aplicação...',
    'ui.loadingDashboard': 'Carregando dashboard...',
    'ui.loadingLogin': 'Carregando login...',
    'ui.loadingPayment': 'Carregando página de pagamento...',
    'ui.loadingPage': 'Carregando página inicial...',
    'ui.loadingSubscriberCenter': 'Carregando central do assinante...',
    'ui.appError': 'Erro na aplicação',
    'ui.criticalError': 'Ocorreu um erro crítico. Recarregue a página.',
    'ui.reloadPage': 'Recarregar página',
    'ui.serverUnavailable': 'Servidor indisponível no momento. Por favor, recarregue. Caso persista, entre em contato com o suporte.',
    'ui.loading': 'Carregando...',

    // Company Labels
    'company.title': 'Empresa',
    'company.razaoSocial': 'Razão Social',
    'company.nomeFantasia': 'Nome Fantasia',
    'company.cnpj': 'CNPJ',
    'company.inscricaoEstadual': 'Inscrição Estadual',
    'company.inscricaoMunicipal': 'Inscrição Municipal',
    'company.logo': 'Logo da Empresa',
    'company.noLogo': 'Sem logo',
    'company.acceptedFormats': 'Formatos aceitos: JPG, PNG, GIF (máx. 2MB)',

    // NFSe Labels
    'nfse.title': 'NFS-e',
    'nfse.municipalServiceCode': 'Código de Serviço Municipal',
    'nfse.municipalServiceCodeHelp': 'Código da lista de serviços do município (ex: 1401 para serviços de TI)',
    'nfse.issRate': 'Alíquota de ISS (%)',
    'nfse.issRateHelp': 'Alíquota padrão de ISS para as notas fiscais (0 a 100)',
    'nfse.serviceDescription': 'Descrição do Serviço',
    'nfse.serviceDescriptionHelp': 'Descrição padrão do serviço prestado nas notas fiscais',
    'nfse.nfSerie': 'Série da NF',
    'nfse.nfSerieHelp': 'Série da NF (permitida: 80000 a 89999)',
    'nfse.dpsNumber': 'Número do DPS',
    'nfse.dpsNumberHelp': 'Número do DPS (Documento de Prestação de Serviços)',
    'nfse.provider': 'Provedor de NFS-e',
    'nfse.providerHelp': 'Selecione o provedor que será usado para emitir as notas fiscais',
    'nfse.asaasApiKey': 'API Key do Asaas',
    'nfse.asaasApiKeyHelp': 'Token da API do Asaas disponível no painel administrativo (Configurações > Integrações > API Key)',
    'nfse.useSandbox': 'Usar ambiente Sandbox',
    'nfse.useSandboxHelp': 'Marque para usar o ambiente de testes do Asaas',
    'nfse.username': 'Usuário',
    'nfse.password': 'Senha',
    'nfse.baseUrl': 'URL Base da API',
    'nfse.environment': 'Ambiente',
    'nfse.homologation': 'Homologação',
    'nfse.production': 'Produção',
    'nfse.messages.loadingError': 'Erro ao carregar configuração',
    'nfse.messages.saveSuccess': 'Configurações de NFS-e salvas com sucesso!',
    'nfse.messages.saveError': 'Erro ao salvar configuração',
    'nfse.messages.testSuccessAsaas': 'Conexão com Asaas testada com sucesso! A API Key está válida.',
    'nfse.messages.testSuccessPortal': 'Autenticação testada com sucesso! As credenciais estão corretas.',
    'nfse.messages.testError': 'Erro ao testar conexão',
    'nfse.messages.apiKeyRequired': 'API Key do Asaas é obrigatória para testar conexão',
    'nfse.messages.credentialsRequired': 'Usuário e senha são obrigatórios para testar autenticação',
    'nfse.messages.providerRequired': 'Selecione um provedor para testar a conexão',

    // Title Labels
    'titulo.title': 'Título',
    'titulo.send': 'Enviar',
    'titulo.sendViaWhatsApp': 'Via WhatsApp',
    'titulo.sendViaEmail': 'Via Email',
    'titulo.createTitle': 'Novo Título',
    'titulo.validationErrors': 'Erros de validação:',
    'titulo.clientNotFound': 'Cliente não encontrado',
    'titulo.clientCannotBeChanged': 'Cliente não pode ser alterado',
    'titulo.planoCannotBeChanged': 'Plano não pode ser alterado',
    'titulo.valorCannotBeChanged': 'Valor não pode ser alterado após registro no banco emissor',
    'titulo.dataVencimentoCannotBeChanged': 'Data de vencimento não pode ser alterada após registro no banco emissor',
    'titulo.discountPercent': 'Desconto (%)',
    'titulo.discountValue': 'Desconto (R$)',
    'titulo.additionPercent': 'Acréscimo (%)',
    'titulo.additionValue': 'Acréscimo (R$)',
    'titulo.observationsPlaceholder': 'Observações sobre a parcela...',
    'titulo.descriptionPlaceholder': 'Descrição do título...',
    'titulo.selectClient': 'Selecionar Cliente',
    'titulo.selectPlano': 'Selecionar Plano',
    'titulo.messages.sendSuccess': 'Mensagem enviada com sucesso!',
    'titulo.messages.sendError': 'Erro ao enviar mensagem',
    'titulo.messages.whatsappError': 'Erro ao enviar mensagem via WhatsApp',

    // Financial
    'financial.title': 'Financeiro - Títulos',
    'financial.accountsPayable': 'Contas a Pagar',
    'financial.receivables': 'Contas a Receber',
    'financial.cancelTitles': 'Cancelar títulos',
    'financial.reverseTitle': 'Estornar título',
    'financial.reverse': 'Estornar',
    'financial.confirmReverse': 'Tem certeza que deseja estornar o pagamento do título ${number}?',
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
    'financial.confirmDeleteTitle': 'Tem certeza que deseja excluir este título? Apenas títulos pendentes e não registrados no banco podem ser excluídos.',
    'financial.confirmDeleteTitles': 'Tem certeza que deseja excluir ${count} título(s)? Apenas títulos pendentes e não registrados no banco podem ser excluídos.',
    'financial.successDeleteTitle': 'Título excluído com sucesso.',
    'financial.successDeleteTitles': '${count} título(s) excluído(s) com sucesso.',
    'financial.errorDeleteTitle': 'Não foi possível excluir 1 título.',
    'financial.errorDeleteTitles': '${count} título(s) não puderam ser excluídos.',
    'financial.errorDeleteTitlesGeneral': 'Erro ao excluir títulos.',
    'financial.receive': 'Receber',
    'financial.pay': 'Pagar',
    'financial.toReceive': 'A Receber',
    'financial.toPayLabel': 'A Pagar',
    'financial.value': 'Valor',
    'financial.generateTitles': 'Gerar Financeiro',

    // Buttons
    'buttons.confirmPayment': 'Confirmar Pagamento',
    'buttons.confirmCancellation': 'Confirmar Cancelamento',
    'buttons.canceling': 'Cancelando...',
    'buttons.save': 'Salvar',
    'buttons.cancel': 'Cancelar',
    'buttons.close': 'Fechar',
    'buttons.create': 'Novo',
    'buttons.edit': 'Editar',
    'buttons.delete': 'Deletar',
    'buttons.print': 'Imprimir',
    'buttons.generate': 'Gerar',
    'buttons.view': 'Visualizar',
    'buttons.download': 'Baixar',
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
    'buttons.testConnection': 'Testar Conexão',
    'buttons.generateToken': 'Gerar token',
    'buttons.copy': 'Copiar',
    'buttons.select': 'Selecionar',
    'buttons.add': 'Adicionar',
    'buttons.remove': 'Remover',

    // Form Labels
    'form.name': 'Nome',
    'form.role': 'Cargo',
    'form.clientId': 'Client ID',
    'form.clientIdProd': 'Client ID Produção',
    'form.clientSecret': 'Client Secret',
    'form.clientSecretProd': 'Client Secret Produção',
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
    'form.cell': 'Celular',
    'form.site': 'Site',
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
    'form.bankNameHelp': 'Nome para identificar esta conta do banco',
    'form.bankTypeHelp': 'Código do banco é definido automaticamente',
    'form.optionalUpdate': 'Campo opcional. Preencha apenas se desejar atualizar.',
    'form.webhookUrl': 'URL de Retorno (Webhook)',
    'form.webhookUrlHelp': 'URL para receber notificações de pagamento',
    'form.sandboxHelp': 'Ative para usar ambiente de testes. Desative para produção.',
    'form.apiKey': 'API Key',
    'form.apiKeyAsaasHelp': 'Disponível no painel administrativo da Asaas.',
    'form.webhookSecret': 'Webhook Secret',
    'form.webhookSecretAsaasHelp': 'Utilize este token ao configurar o webhook Asaas.',
    'form.generateWebhookSecretHelp': 'Clique em "Gerar token" após salvar o banco para obter o segredo de webhook.',
    'form.finePercent': 'Percentual de Multa (%)',
    'form.interestPercent': 'Percentual de Juros (% ao dia)',
    'form.includeFee': 'Incluir Taxa no Boleto',
    'form.accountIdentifier': 'Identificador da Conta',
    'form.accountIdentifierEfiHelp': 'Disponível nas configurações da API Efi',
    'form.paymentLocation': 'Local de Pagamento',
    'form.operationNature': 'Natureza da Operação',
    'form.model': 'Modelo',
    'form.type': 'Tipo',
    'form.code': 'Código',
    'form.issueDate': 'Data de Emissão',
    'form.totalValue': 'Valor Total',
    'form.servicesValue': 'Valor dos Serviços',
    'form.productsValue': 'Valor dos Produtos',
    'form.discountValueInvoice': 'Valor do Desconto',
    'form.issRateShort': 'Alíquota de ISS (%)',
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
    'form.invoiceNumber': 'Nota Fiscal',
    'form.paymentType': 'Tipo de Pagamento',
    'form.paymentTypeCash': 'Dinheiro',
    'form.paymentTypeBoleto': 'Boleto',
    'form.paymentTypeCard': 'Cartão',
    'form.paymentTypeDeposit': 'Depósito',
    'form.paymentTypeDebit': 'Débito em Conta',
    'form.paymentTypeTransfer': 'Transferência',
    'form.paymentTypePix': 'PIX',
    'form.balanceDue': 'Saldo Devedor',
    'form.dueDateStart': 'Vencimento Inicial',
    'form.dueDateEnd': 'Vencimento Final',
    'form.testClient': 'Cliente para Teste',
    'form.enterClientId': 'Digite o ID do cliente',
    'form.enterPlanId': 'Digite o ID do plano',
    'form.enterBankId': 'Digite o ID do banco',
    'form.enterContractModelId': 'Digite o ID do modelo de contrato',
    'form.selectContractModelHelp': 'Selecione um modelo de contrato',
    'form.dueDay': 'Dia de Vencimento',
    'form.exemptFromMonthlyFee': 'Isento',
    'form.selectClientForTest': 'Selecione um cliente para visualizar o documento com dados reais',
    'form.validationErrors': 'Erros de validação:',
    'form.briefDescription': 'Breve descrição',
    'form.fileDescription': 'Descrição do arquivo (opcional)',
    'form.optional': 'Opcional',
    'form.creationType': 'Tipo de Criação',
    'form.creationTypeUnique': 'Única',
    'form.creationTypeBatch': 'Lote',
    'form.dueDateInitial': 'Data Inicial de Vencimento',
    'form.dueDateFinal': 'Data Final de Vencimento',
    'form.pixKeyType': 'Tipo de Chave PIX',
    'form.pixKey': 'Chave PIX',
    'form.qrCodeCopiaECola': 'Código Copia e Cola',
    'form.barcodeLine': 'Linha Digitável do Boleto',
    'form.discountPercentShort': 'Desconto (%)',
    'form.discountValueShort': 'Desconto (Valor)',
    'form.increasePercentShort': 'Acréscimo (%)',
    'form.increaseValueShort': 'Acréscimo (Valor)',
    'form.baixadoValue': 'Valor Baixado',
    'form.totalToPay': 'Valor Total a Ser Pago',
    'form.justification': 'Justificativa',
    'form.justificationCancel': 'Justificativa para cancelamento',
    'form.title': 'Título',
    'form.password': 'Senha',
    'form.planNamePlaceholder': 'Nome do plano',
    'form.planDescriptionPlaceholder': 'Descrição do plano',
    'form.monthlyValuePlaceholder': 'Valor mensal',
    'form.usersQuantity': 'Quantidade de Usuários',
    'form.autoRenewal': 'Renovação Automática',
    'form.planObservationsPlaceholder': 'Observações do plano',
    'form.serviceTypeInfrastructure': 'Infraestrutura',
    'form.serviceTypeConsulting': 'Consultoria',
    'form.serviceTypeBlockdomi': 'Blockdomi',
    'form.periodicityMonthly': 'Mensal',
    'form.periodicityQuarterly': 'Trimestral',
    'form.periodicitySemiannual': 'Semestral',
    'form.periodicityAnnual': 'Anual',
    'form.periodicityBimonthly': 'Bimestral',
    'form.periodicityBiweekly': 'Quinzenal',
    'form.periodicityWeekly': 'Semanal',
    'form.quantityTitles': 'Quantidade de títulos',
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
    'table.personTypeShort': 'Tipo',
    'table.personTypeLegalShort': 'Jurídica',
    'table.personTypePhysicalShort': 'Física',
    'table.nameCompanyNameShort': 'Nome/Razão Social',
    'table.tradeNameShort': 'Nome Fantasia',
    'table.zipCodeShort': 'CEP',
    'table.streetShort': 'Logradouro',
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
    'table.balanceDue': 'Saldo Devedor',
    'table.createdAt': 'Criado em',
    'table.updatedAt': 'Atualizado em',
    'table.documentNumber': 'Número do Documento',
    'table.supplier': 'Fornecedor',
    'table.paymentType': 'Tipo de Pagamento',
    'table.client': 'Cliente',
    'table.clientName': 'Cliente',
    'table.cpfCnpj': 'CPF/CNPJ',
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
    'table.country': 'País',
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
    'table.issueDate': 'Data de Emissão',
    'table.totalValue': 'Valor Total',
    'table.accessKey': 'Chave de Acesso',
    'table.protocol': 'Protocolo',
    'table.authorizationDate': 'Data de Autorização',
    'table.chargeId': 'ID da Cobrança',
    'table.ourNumber': 'Nosso Número',
    'table.paidValueDownloaded': 'Valor baixado',
    'table.openValueOpen': 'Valor aberto',
    'table.nf': 'NF',
    'table.nfStatus': 'Status NF',
    'table.termName': 'Nome do Termo',
    'table.accepted': 'Assinado',
    'table.acceptedDate': 'Data Aceite',
    'table.acceptedBy': 'Aceito Por',
    'table.observations': 'Observações',
    'table.action': 'Ação',
    'table.name': 'Nome',
    'table.bank': 'Banco',
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
    'modal.payAccountManually': 'Pagar Conta Manualmente',
    'modal.viewInvoice': 'Visualizar Nota Fiscal',
    'modal.createClient': 'Cliente',
    'modal.editClient': 'Cliente',
    'modal.createPlan': 'Plano',
    'modal.editPlan': 'Plano',
    'modal.createBank': 'Banco',
    'modal.editBank': 'Banco',
    'modal.createContract': 'Contrato',
    'modal.editContract': 'Contrato',
    'modal.createSupplier': 'Fornecedor',
    'modal.editSupplier': 'Fornecedor',
    'modal.createAccountPayable': 'Conta a Pagar',
    'modal.editAccountPayable': 'Conta a Pagar',
    'modal.createTitle': 'Título',
    'modal.editTitle': 'Título',
    'modal.generateNFe': 'Gerar Nota Fiscal de Serviços Eletrônica (NFS-e)',
    'modal.cancelInvoice': 'Cancelar Nota Fiscal',
    'modal.deleteClient': 'Deletar cliente',
    'modal.deletePlan': 'Deletar plano',
    'modal.deleteBank': 'Deletar banco',
    'modal.deleteContract': 'Deletar contratos',
    'modal.deleteSupplier': 'Deletar fornecedor',
    'modal.deleteAccountPayable': 'Deletar conta a pagar',
    'modal.viewDocument': 'Visualizar Documento',
    'modal.addFile': 'Adicionar Arquivo',
    'modal.editTerm': 'Termo',
    'modal.selectTerm': 'Selecionar Termo',
    'modal.selectContractModel': 'Selecionar Modelo de Contrato',
    'modal.sendSignature': 'Enviar Assinatura',
    'modal.additionalService': 'Serviço Adicional',
    'modal.list': 'Lista',
    'modal.defaultDocument': 'Documento Padrão',
    'modal.deleteFiles': 'Deletar arquivos',
    'modal.deleteAdditionalServices': 'Deletar serviços adicionais',
    'modal.scheduledRoutine': 'Rotina Agendada',

    // Tabs
    'tabs.basicData': 'Dados Básicos',
    'tabs.contact': 'Contato',
    'tabs.address': 'Endereço',
    'tabs.contracts': 'Contratos',
    'tabs.financial': 'Financeiro',
    'tabs.faturasAbertas': 'Faturas abertas',
    'tabs.faturasPagas': 'Faturas pagas',
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
    'status.processing': 'Processando',
    'status.authorized': 'Autorizada',
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
    'status.blocked': 'Bloqueado',
    'status.inArrears': 'Em atraso',
    'status.suspended': 'Suspenso',
    'status.exempt': 'Isentos',
    'status.overdue': 'Vencido',
    'status.paidLate': 'Pago em Atraso',

    'saas.manualUnblock': 'Desbloquear manualmente',
    'saas.confirmManualUnblock': 'Desbloquear empresa manualmente? Ela terá o prazo configurado para regularizar os títulos.',
    'saas.dataNaoBloquearAte': 'Data de não bloquear até',

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
    'placeholder.bankName': 'Nome do banco',
    'placeholder.bankDescription': 'Descrição do banco...',
    'placeholder.fillClientSecret': 'Preencha apenas para atualizar o segredo do cliente',
    'placeholder.webhookUrl': 'URL para retorno do webhook',
    'placeholder.apiKeyAsaas': 'Sua chave de API do Asaas',
    'placeholder.webhookSecretHelp': 'Clique em Gerar token para criar um segredo',
    'placeholder.accountIdentifierHelp': 'Disponível no menu de configurações da API',
    'placeholder.paymentLocationDefault': 'Pagável em qualquer banco até o vencimento',
    'placeholder.contractCreationHelp': 'Crie o contrato primeiro para gerenciar termos.',
    'placeholder.financialTitlesCreationHelp': 'Crie o contrato primeiro para gerenciar títulos financeiros.',
    'placeholder.financialMiscCreationHelp': 'Crie o contrato primeiro para gerenciar títulos avulsos.',
    'placeholder.additionalServicesCreationHelp': 'Crie o contrato primeiro para gerenciar serviços adicionais.',
    'placeholder.selectProvider': 'Selecione o fornecedor',
    'placeholder.startDate': 'Data inicial',
    'placeholder.endDate': 'Data final',
    'placeholder.selectType': 'Selecione o tipo',
    'placeholder.searchServices': 'Buscar serviços...',
    'placeholder.enterJustification': 'Digite a justificativa para o cancelamento da nota fiscal (mínimo 15 caracteres)...',
    'placeholder.enterSupplierId': 'Digite o ID do fornecedor',
    'placeholder.enterPixKey': 'Digite a chave PIX',
    'placeholder.enterCpfCnpj': 'Digite o CPF ou CNPJ',
    'placeholder.enterCellPhone': 'Digite o celular (ex: 11999999999)',
    'placeholder.enterEmail': 'Digite o e-mail',
    'placeholder.enterName': 'Digite o nome',
    'placeholder.enterRandomKey': 'Digite a chave aleatória (UUID)',
    'placeholder.pasteQrCode': 'Cole o código copia e cola do PIX',

    // Filter Labels
    'filter.startDate': 'Data Inicial:',
    'filter.endDate': 'Data Final:',

    // Document Labels
    'document.title': 'Título:',
    'document.viewDocument': 'Visualizar Documento',
    'document.print': 'Imprimir',
    'document.modelContrato': 'Modelo Contrato',
    'document.termAdesao': 'Termo Adesão',
    'document.permanencia': 'Contrato Permanência',
    'document.receipts': 'Recibos',
    'document.cartaCobranca': 'Carta de Cobrança',
    'document.name': 'Nome',
    'document.description': 'Descrição',
    'document.testClient': 'Cliente para Teste',
    'document.testClientHelp': 'Selecione um cliente para visualizar o documento com dados reais',
    'document.idPlaceholder': 'Digite o ID do cliente',
    'document.content': 'Conteúdo',
    'document.contractContent': 'Conteúdo do Contrato',
    'document.successCreate': 'Documento criado com sucesso',
    'document.successUpdate': 'Documento salvo com sucesso',
    'document.errorCreate': 'Erro ao criar documento',
    'document.errorUpdate': 'Erro ao salvar documento',
    'document.errorGeneratePdf': 'Erro ao gerar PDF',
    'document.labels.recibo': 'Recibo',
    'document.labels.carta_cobranca': 'Carta de Cobrança',
    'document.labels.termo': 'Termo',
    'document.labels.documento': 'Documento',

    // Other
    'other.selectExactlyOne': 'Selecione exatamente 1 registro para auditar',
    'other.auditSelectedRecord': 'Auditar registro selecionado',
    'other.resizeColumn': 'Redimensionar coluna',
    'other.reloadData': 'Recarregar dados',
    'other.confirmAction': 'Confirmar ação',
    'other.selectAtLeastOne': 'Selecione pelo menos um título',
    'other.characters': 'caracteres',
    'other.invoiceDetails': 'Detalhes da Nota Fiscal:',
    'other.selected': 'Selecionados',
    'other.open': 'Abertos',
    'other.all': 'Todos',
    'other.receipt': 'Recibo',
    'other.printNF': 'Imprimir NF',
    'other.generateNFSeStandalone': 'Gerar NFS-e Avulsa',
    'other.termRegistered': 'Termo Cadastrado',
    'other.viaWhatsApp': 'Via WhatsApp',
    'other.viaEmail': 'Via Email',
    'other.newMiscTitle': 'Novo Título Avulso',
    'other.deleteTerms': 'Deletar termos',
    'other.day': 'Dia',

    // Financial Summary Labels
    'summary.value': 'Valor:',
    'summary.paidValue': 'Valor baixado:',
    'summary.openValue': 'Valor aberto:',
    'summary.canceledValue': 'Valor cancelado:',
    'summary.totalPaidValue': 'Valor total pago:',
    'summary.monthlyTotalValue': 'Valor Total Mensal:',
    'summary.totalDiscountsValue': 'Valor Total Descontos:',
    'summary.contractSummary': 'Resumo de contratos',
    'summary.totalContracts': 'Total de contratos:',
    'summary.activeContracts': 'Contratos ativos:',

    // Audit
    'audit.title': 'Logs de Auditoria',
    'audit.detailsTitle': 'Detalhes do Log de Auditoria',
    'audit.generalInfo': 'Informações Gerais',
    'audit.data': 'Dados',
    'audit.entityId': 'ID da Entidade',
    'audit.user': 'Usuário',
    'audit.ip': 'IP',
    'audit.tenant': 'Tenant',
    'audit.route': 'Rota',
    'audit.userAgent': 'User-Agent',
    'audit.viewDetails': 'Ver Detalhes',
    'audit.method': 'Método',
    'audit.entity': 'Entidade',
    'audit.timestamp': 'Data/Hora',
    'audit.entities.all': 'Todas',
    'audit.actions.all': 'Todas',
    'audit.actions.create': 'Novo',
    'audit.actions.update': 'Atualizar',
    'audit.actions.delete': 'Deletar',
    'audit.actions.login': 'Login',
    'audit.actions.logout': 'Logout',
    'audit.actions.export': 'Exportar',
    'audit.actions.import': 'Importar',
    'audit.actions.executar': 'Executar',

    // Variables
    'variables.title': 'Variáveis Disponíveis',
    'variables.searchPlaceholder': 'Buscar variável...',
    'variables.insert': 'Inserir Variáveis',
    'variables.errorLoading': 'Erro ao carregar variáveis',
    'variables.tip': 'Dica: As variáveis serão substituídas pelos valores reais ao gerar o documento.',
    'variables.clickToInsert': 'Clique em uma variável para inserir',
    'variables.clickToCopy': 'Clique em uma variável para copiar',

    // User Form
    'user.title': 'Usuário',
    'user.profile': 'Perfil',
    'user.admin': 'Administrador',
    'user.user': 'Usuário',
    'user.newPassword': 'Nova Senha (deixe em branco para manter)',
    'user.passwordPlaceholder': 'Mínimo 6 caracteres',
    'user.newPasswordPlaceholder': 'Deixe em branco para manter a senha atual',
    'user.webhookHelp': 'Use como Bearer na API (clientes, contratos, títulos, dados-empresa).',
    'user.generateWebhookHelp': 'Clique em "Gerar token" para obter o token de API.',
    'user.webhookSecret': 'Token de API',
    'user.generateToken': 'Gerar Token',
    'user.copy': 'Copiar',
    'user.variables': 'Variáveis',
    'user.successCreate': 'Usuário criado com sucesso!',
    'user.successUpdate': 'Usuário atualizado com sucesso!',
    'user.successGenerateSecret': 'Webhook secret gerado com sucesso!',
    'user.successCopySecret': 'Webhook secret copiado!',
    'user.errorCreate': 'Erro ao criar usuário',
    'user.errorUpdate': 'Erro ao atualizar usuário',

    // Email Server
    'emailServer.title': 'Servidor de E-Mail',
    'emailServer.serverSettings': 'Configurações do Servidor',
    'emailServer.configureServer': 'Configurar Servidor de E-Mail',
    'emailServer.smtpHost': 'Host SMTP',
    'emailServer.port': 'Porta',
    'emailServer.userEmail': 'Usuário/E-mail',
    'emailServer.senderName': 'Nome do Remetente',
    'emailServer.senderEmail': 'E-mail do Remetente',
    'emailServer.useSsl': 'Usar SSL',
    'emailServer.useTls': 'Usar TLS',
    'emailServer.timeout': 'Timeout (ms)',
    'emailServer.sendTestEmail': 'Enviar E-mail de Teste',
    'emailServer.testEmailPlaceholder': 'Digite o e-mail para teste',
    'emailServer.testEmailButton': 'Enviar Teste',
    'emailServer.testEmailHelp': 'Digite um e-mail válido para testar o envio através deste servidor',
    'emailServer.passwordHelp': 'Deixe em branco para manter a senha atual',
    'emailServer.passwordPlaceholder': 'Digite a senha do e-mail',

    // WhatsApp Server
    'whatsappServer.title': 'Servidor de WhatsApp',
    'whatsappServer.evolutionApi': 'Evolution API',
    'whatsappServer.cloudApi': 'WhatsApp Cloud API',
    'whatsappServer.successSave': 'Configurações do servidor de WhatsApp salvas com sucesso!',
    'whatsappServer.errorSave': 'Erro ao salvar configurações',
    'whatsappServer.successMessageSave': 'Mensagem salva com sucesso!',
    'whatsappServer.errorMessageSave': 'Erro ao salvar mensagem',
    'whatsappServer.successRemove': 'Servidor removido com sucesso!',
    'whatsappServer.errorRemove': 'Erro ao remover servidor',
    'whatsappServer.testPhoneRequired': 'Por favor, digite um número de telefone para teste',
    'whatsappServer.testMessageRequired': 'Por favor, digite uma mensagem para teste',
    'whatsappServer.configureFirst': 'Configure o servidor primeiro antes de enviar mensagem de teste',
    'whatsappServer.errorSendTest': 'Não foi possível enviar a mensagem de teste. Verifique as configurações do servidor e tente novamente.',
    'whatsappServer.selectMessageType': 'Selecione um tipo de mensagem',
    'whatsappServer.messageRequired': 'Mensagem padrão é obrigatória',
    'whatsappServer.removeServer': 'Deletar Servidor',
    'whatsappServer.variableCopied': 'Variável copiada!',
    'whatsappServer.server': 'Servidor',
    'whatsappServer.messages': 'Mensagens',
    'whatsappServer.templatesMeta': 'Templates Meta',
    'whatsappServer.templates': 'Templates',

    // Scheduler
    'scheduler.title': 'Agendador de Tarefas',
    'scheduler.frequency': 'Frequência',
    'scheduler.schedule': 'Horário',
    'scheduler.nextRun': 'Próxima Execução',
    'scheduler.lastRun': 'Última Execução',
    'scheduler.executions': 'Execuções',
    'scheduler.errors': 'Erros',
    'scheduler.confirmExecute': 'Deseja executar a rotina agora?',
    'scheduler.executeRoutine': 'Executar rotina',
    'scheduler.execute': 'Executar',
    'scheduler.routineStarted': 'Rotina iniciada em background',
    'scheduler.confirmDelete': 'Tem certeza que deseja deletar esta rotina?',
    'scheduler.deleteRoutine': 'Deletar rotina',
    'scheduler.successDelete': 'Rotina deletada com sucesso',
    'scheduler.deactivate': 'Desativar',
    'scheduler.type': 'Tipo',
    'scheduler.routine': 'Rotina',

    // Updates
    'updates.title': 'Atualizações do Sistema',
    'updates.currentVersion': 'Versão Atual',
    'updates.searching': 'Buscando atualizações...',
    'updates.errorSearch': 'Erro ao buscar atualizações',
    'updates.noUpdates': 'Nenhuma atualização disponível',
    'updates.systemUpdated': 'O sistema está atualizado com a versão mais recente.',
    'updates.updating': 'Atualizando sistema...',
    'updates.success': 'Atualização concluída com sucesso! A aplicação será reiniciada em breve.',
    'updates.error': 'Erro ao executar atualização',
    'updates.confirmUpdate': 'Tem certeza que deseja atualizar o sistema? Esta ação irá:\n\n1. Baixar as últimas alterações do repositório\n2. Atualizar dependências\n3. Compilar o código\n4. Executar migrations do banco de dados\n5. Reiniciar a aplicação\n\nO processo pode levar alguns minutos.',
    'updates.updateSystem': 'Atualizar Sistema',
    'updates.badges.new': 'Nova',
    'updates.badges.bugfix': 'Correção',
    'updates.badges.security': 'Segurança',
    'updates.badges.improvement': 'Melhoria',
    'updates.badges.other': 'Outro',
    'updates.concluded': 'Atualização concluída!',
    'updates.waitingServer': 'Aguardando servidor ficar pronto...',
    'updates.restartInSeconds': 'Aguardando reinício do servidor (${n}s)...',
    'updates.reloadingPage': 'Recarregando página...',

    // Login
    'login.title': 'Acesse o painel administrativo',
    'login.emailPlaceholder': 'seu@email.com',
    'login.passwordPlaceholder': 'Sua senha',
    'login.entering': 'Entrando...',
    'login.enter': 'Entrar',
    'login.success': 'Autenticação realizada com sucesso.',
    'login.errorCredentials': 'Não foi possível autenticar. Verifique suas credenciais.',
    'login.errorToken': 'Erro ao salvar token de autenticação. Tente novamente.',
    'login.errorGeneral': 'Falha ao autenticar. Tente novamente.',
    'login.infoRequired': 'Informe email e senha para continuar.',
    'login.allRightsReserved': 'Todos os direitos reservados.',
    'login.copyIp': 'Clique para copiar',
    'login.ipCopied': 'IP copiado!',

    // Layout
    'layout.logoutSuccess': 'Sessão encerrada com sucesso.',
    'layout.closeSearch': 'Fechar busca',
    'empty.noContracts': 'Este cliente ainda não possui contratos cadastrados.',
    'empty.noTitles': 'Este cliente ainda não possui títulos cadastrados.',
    'empty.noFiles': 'Nenhum arquivo encontrado',
    'empty.noTermsRegistered': 'Este contrato ainda não possui termos cadastrados.',
    'empty.noAdditionalServices': 'Este contrato ainda não possui serviços adicionais cadastrados.',
    'filter.showInactive': 'Mostrar inativos',
    'filter.showCanceled': 'Mostrar cancelados',
    'confirm.deleteFiles': 'Tem certeza que deseja deletar ${count} arquivo(s)?',
    'confirm.deleteFilesTitle': 'Deletar arquivos',
    'messages.saveClientFirst': 'Salve o cliente primeiro para adicionar arquivos.',
    'messages.saveBankBeforeTest': 'Salve o banco antes de testar a conexão',
    'messages.testingConnection': 'Testando conexão...',
    'messages.connectionSuccess': 'Conexão testada com sucesso!',
    'messages.connectionFailed': 'Falha no teste de conexão',
    'messages.credentialsNotConfiguredAsaas': 'Credenciais não configuradas. Informe a API Key do Asaas antes de testar.',
    'messages.credentialsNotConfiguredEfi': 'Credenciais não configuradas. Preencha o Client ID e Client Secret antes de testar.',
    'messages.saveBankBeforeWebhook': 'Salve o banco antes de gerar o token do webhook',
    'messages.webhookTokenGenerated': 'Token do webhook gerado com sucesso!',
    'messages.webhookTokenNotReturned': 'Token não retornado pelo servidor. Tente novamente.',
    'messages.noTokenToCopy': 'Nenhum token disponível para copiar.',
    'messages.webhookTokenCopied': 'Token do webhook copiado para a área de transferência!',
    'messages.copyManual': 'Não foi possível copiar automaticamente. Copie manualmente.',
    'messages.loadingClientData': 'Carregando dados do cliente...',
    'messages.loadingPlanData': 'Carregando dados do plano...',
    'messages.noTitleSelected': 'Nenhum título selecionado',
    'messages.noPaidTitleSelected': 'Nenhum título pago selecionado. Apenas títulos pagos podem ter recibo.',
    'messages.noTitlesFound': 'Nenhum título encontrado',
    'messages.noOpenTitlesFound': 'Nenhum título em aberto encontrado',
    'messages.noPaidTitlesFound': 'Nenhuma fatura paga encontrada',
    'messages.noNFSeTitlesSelected': 'Nenhum título selecionado possui NFS-e emitida',
    'messages.receiptsGenerated': '${count} recibo(s) gerado(s) com sucesso!',
    'messages.errorGeneratingReceipts': 'Erro ao gerar recibos',
    'messages.errorGeneratingNFSe': 'Erro ao gerar PDF da NFS-e',
    'messages.nfseGenerated': 'NFS-e gerada com sucesso!',
    'fileType.document': 'Documento',
    'fileType.photo': 'Foto',
    'fileType.signature': 'Assinatura',
    'fileType.manual': 'Manual',
    'fileType.digitalSignature': 'Assinatura Digital',
    'fileType.system': 'Sistema',
    'placeholder.street': 'Rua, Avenida...',
    'placeholder.number': '123',
    'placeholder.complement': 'Apto, Sala...',
    'placeholder.neighborhood': 'Nome do bairro',
    'placeholder.city': 'Nome da cidade',
    'placeholder.state': 'SP',
    'placeholder.email': 'email@empresa.com',
    'form.whatsapp': 'WhatsApp',

    // New Placeholders
    'placeholder.contractContent': 'Digite o conteúdo do modelo de contrato...',
    'placeholder.receiptContent': 'Digite o conteúdo do modelo de recibo...',
    'placeholder.letterContent': 'Digite o conteúdo do modelo de carta de cobrança...',
    'placeholder.description': 'Breve descrição',
    'placeholder.manualSend': 'Digite a mensagem para envio manual...',
    'placeholder.defaultEmail': 'Digite a mensagem padrão do e-mail...',
    'placeholder.defaultMessage': 'Digite a mensagem padrão que será enviada...',
    'placeholder.firstInteraction': 'Digite a primeira mensagem de interação...',
    'placeholder.secondInteraction': 'Digite a segunda mensagem de interação...',
    'placeholder.thirdInteraction': 'Digite a terceira mensagem de interação...',
    'placeholder.clientIdProd': 'Client ID para produção',
    'placeholder.serviceCode': 'Ex: 1401',
    'placeholder.serviceDescription': 'Ex: Prestação de serviços de desenvolvimento de software',
    'placeholder.apiToken': 'Token da API',
    'placeholder.apiKey': 'Cole sua API Key aqui',
    'placeholder.workspaceId': 'ID do workspace (obtido em My Account > Workspaces)',
    'placeholder.responsibleName': 'Nome do responsável',
    'placeholder.responsibleRole': 'Cargo do responsável',
    'placeholder.paymentObservations': 'Observações sobre o pagamento (opcional)',
    'placeholder.testMessage': 'Mensagem de teste do sistema BackNet',
    'placeholder.termContent': 'Digite o conteúdo do termo...',

    // Message Types
    'messages.types.10daysBefore': '10 dias antes do vencimento',
    'messages.types.05daysBefore': '05 dias antes do vencimento',
    'messages.types.sameDay': 'Mesmo dia do vencimento',
    'messages.types.05daysAfter': '05 dias depois do vencimento',
    'messages.types.10daysAfter': '10 dias depois do vencimento',
    'messages.types.15daysAfter': '15 dias depois do vencimento',
    'messages.types.clientCut': 'Corte do cliente',
    'messages.types.manualSend': 'Envio manual de cobrança',
    'messages.types.paymentReceipt': 'Recibo de pagamento',

    // Send Types
    'messages.sendTypes.disabled': 'Desativar',
    'messages.sendTypes.pdf': 'Anexa PDF',

    // Settings Server
    'settings.server.config': 'Configurações do Servidor',
    'settings.server.configure': 'Configurar Servidor',
    'settings.test.title': 'Enviar Mensagem de Teste',
    'settings.test.phone': 'Número do Telefone',
    'settings.test.message': 'Mensagem',
    'settings.test.send': 'Enviar Teste',
    'settings.test.helper': 'Digite o número com código do país (ex: 5511999999999)',
    'settings.messages.type': 'Tipo de Mensagem',
    'settings.messages.sendType': 'Tipo de Envio',
    'settings.messages.manualLabel': 'Mensagem para Envio Manual',
    'settings.messages.manualHelper': 'Mensagem que será usada quando enviar título manualmente',
    'settings.messages.emailLabel': 'Mensagem do E-mail',
    'settings.messages.templateConfig': 'Configuração de Template - WhatsApp Cloud API',
    'settings.messages.viewTemplates': 'Ver Templates Ativos',
    'settings.messages.activeTemplatesWhatsApp': 'Templates Ativos - WhatsApp Cloud API',
    'settings.messages.templateHelper': 'Configure o template e variáveis para WhatsApp Cloud API. Deixe vazio para usar mensagem de texto normal.',
    'settings.messages.templateFormat': 'Formato: JSON com name (nome do template), language (idioma: en, pt_BR, etc) e variables (array com ordem das variáveis).',
    'settings.messages.defaultMessage': 'Mensagem Padrão',
    'settings.messages.interaction1': 'Interação 01',
    'settings.messages.interaction2': 'Interação 02',
    'settings.messages.interaction3': 'Interação 03',
    'settings.messages.interaction1Helper': 'Mensagem opcional para primeira interação',
    'settings.messages.interaction2Helper': 'Mensagem opcional para segunda interação',
    'settings.messages.interaction3Helper': 'Mensagem opcional para terceira interação',
    'settings.messages.variablesTitle': 'Variáveis Disponíveis para Mensagens',
    'settings.messages.variablesHelper': 'Clique nas variáveis para inserir na mensagem',
    'settings.messages.copyVariable': 'Copiar variável',

    // Message History
    'history.whatsappTitle': 'Histórico de Mensagens WhatsApp',
    'history.emailTitle': 'Histórico de Mensagens Email',
    'history.type': 'Tipo',
    'history.client': 'Cliente',
    'history.phone': 'Telefone',
    'history.recipient': 'Destinatário',
    'history.subject': 'Assunto',
    'history.message': 'Mensagem',
    'history.status': 'Status',
    'history.error': 'Erro',
    'history.entity': 'Entidade',
    'history.user': 'Usuário',
    'history.dateTime': 'Data/Hora',
    'history.whatsapp': 'WhatsApp',
    'history.email': 'Email',
    'history.sent': 'Enviada',
    'history.errorStatus': 'Erro',
    'history.system': 'Sistema',
    'history.view': 'Visualizar',
    'history.searchPhone': 'Buscar por telefone...',
    'history.searchEmail': 'Buscar por email...',
    'history.noMessages': 'Nenhuma mensagem encontrada',

    // File Modal
    'messages.selectFile': 'Selecione um arquivo',
    'messages.enterFileName': 'Informe o nome do arquivo',
    'messages.fileAddedSuccess': 'Arquivo adicionado com sucesso',
    'messages.fileAddedError': 'Erro ao adicionar arquivo',

    // Financial
    'financial.parcelInfo': 'Informações da Parcela',
    'financial.originalValue': 'Valor Original',
    'financial.paymentDate': 'Data de Pagamento',
    'financial.amountPaid': 'Valor Pago',
    'financial.characters': 'caracteres',

    // Company
    'company.responsibleSignature': 'Assinatura do Responsável',
    'company.noSignature': 'Sem assinatura',
    'company.pngOnly': 'Apenas arquivos PNG são permitidos (máx. 10MB)',

    // Digital Signature
    'digitalSignature.generalSettings': 'Configurações Gerais',
    'digitalSignature.enable': 'Habilitar Assinatura Digital',
    'digitalSignature.enableHelp': 'Ativa a funcionalidade de assinatura digital eletrônica no sistema',
    'digitalSignature.provider': 'Provedor de API',
    'digitalSignature.providerHelp': 'Selecione o provedor de API para assinatura digital',
    'digitalSignature.expirationDays': 'Dias de Expiração Padrão',
    'digitalSignature.expirationDaysHelp': 'Número de dias padrão para expiração de documentos enviados para assinatura (1 a 365 dias)',
    'digitalSignature.apiSettings': 'Configurações da API',
    'digitalSignature.apiKey': 'API Key',
    'digitalSignature.assinafyHelp': 'Obtenha sua API Key gratuita em assinafy.com.br (100 assinaturas/mês grátis)',
    'digitalSignature.zapsignHelp': 'Obtenha sua API Key no painel do ZapSign',
    'digitalSignature.workspaceId': 'Workspace Account ID',
    'digitalSignature.workspaceIdHelp': 'Workspace Account ID obtido no painel Assinafy: My Account > Workspaces',
    'digitalSignature.assinafyInfo': 'Assinafy: Plano gratuito com 100 assinaturas mensais. Ideal para começar a usar assinatura digital sem custos.',
    'digitalSignature.successUpdate': 'Configurações de assinatura digital atualizadas com sucesso!',
    'digitalSignature.errorUpdate': 'Erro ao atualizar configurações',
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
    'actions.pay': 'Pay',
    'actions.duplicate': 'Duplicate',
    'actions.insert': 'Insert',
    'actions.new': 'New',
    'actions.filter': 'Filter',
    'actions.export': 'Export',
    'actions.import': 'Import',
    'actions.receive': 'Receive',
    'actions.reverse': 'Reverse',
    'actions.nfse': 'NFS-e',
    'actions.print': 'Print',
    'actions.send': 'Send',

    // Buttons
    'buttons.selected': 'Selected',
    'buttons.open': 'Open',
    'buttons.receipt': 'Receipt',
    'buttons.printNF': 'Print NF',
    'buttons.viaWhatsApp': 'Via WhatsApp',
    'buttons.viaEmail': 'Via Email',
    'buttons.generateNFSeAvulsa': 'Generate Standalone NFS-e',
    'buttons.new': 'New',

    // Contracts
    'contracts.title': 'Contract',
    'contracts.confirmDelete': 'Delete contracts',
    'contracts.confirmDeleteMessage': 'Are you sure you want to delete the selected contracts?',
    'contracts.termAdesao': 'Adhesion Term',
    'contracts.permanencia': 'Permanence Contract',
    'contracts.messages.deleteSuccess': 'Contract deleted successfully!',
    'contracts.messages.deleteError': 'Error deleting contract',

    // Messages
    'messages.confirmDelete': 'Are you sure you want to delete?',
    'messages.loading': 'Loading...',
    'messages.noData': 'No data found',
    'messages.error': 'An error occurred',
    'messages.cnpjDataAutoFilled': 'CNPJ data auto-filled successfully!',
    'messages.cnpjNotFound': 'CNPJ not found. You can fill the data manually.',
    'messages.errorConsultingCnpj': 'Error consulting CNPJ. Please try again or fill manually.',
    'messages.nameRequired': 'Name/Company Name is required',
    'messages.contentRequired': 'Content is required',
    'messages.cpfCnpjRequired': 'CPF/CNPJ is required',
    'messages.invalidCpf': 'Invalid CPF',
    'messages.invalidCnpj': 'Invalid CNPJ',
    'messages.clientRequired': 'Client is required',
    'messages.justificationRequired': 'Justification is required',
    'messages.justificationMinLength': 'Justification must be at least 15 characters long',
    'messages.justificationMaxLength': 'Justification must be at most 500 characters long',
    'messages.invoiceCanceled': 'Invoice canceled successfully!',
    'messages.errorCancelingInvoice': 'Error canceling invoice',
    'messages.actionCannotBeUndone': 'This action cannot be undone.',
    'messages.notInformed': 'Not informed',
    'messages.success': 'Operation completed successfully',
    'messages.selectAtLeastOneInvoice': 'Select at least one invoice',
    'messages.invoiceGenerated': 'Electronic Service Invoice generated successfully!',
    'messages.errorGeneratingInvoice': 'Error generating Electronic Service Invoice',
    'messages.issRateRange': 'ISS rate must be between 0 and 100',
    'messages.invoicePdfGenerated': 'Invoice PDF generated successfully!',
    'messages.errorGeneratingInvoicePdf': 'Error generating invoice PDF',
    'messages.selectInvoiceToCancel': 'Select an invoice to cancel',
    'messages.selectOnlyOneInvoiceToCancel': 'Select only one invoice to cancel',
    'messages.invoiceAlreadyCanceled': 'This invoice has already been canceled',
    'messages.onlyAuthorizedCanBeCanceled': 'Only authorized invoices can be canceled',
    'messages.warning': 'Warning',
    'messages.successPrintSelected': 'Selected boletos generated successfully!',
    'messages.errorPrintSelected': 'Error generating selected boletos',
    'messages.clientNotFound': 'Client not found',
    'messages.successPrintOpen': 'Open boletos generated successfully!',
    'messages.errorPrintOpen': 'Error generating open boletos',
    'messages.confirmCancelTitle': 'Are you sure you want to cancel this title?',
    'messages.confirmCancelTitles': 'Are you sure you want to cancel ${count} titles?',
    'messages.successCancelTitle': 'Title canceled successfully!',
    'messages.successCancelTitles': '${count} titles canceled successfully!',
    'messages.errorCancelTitle': '1 title could not be canceled',
    'messages.errorCancelTitles': '${count} titles could not be canceled',
    'messages.errorCancelTitlesGeneral': 'Error canceling titles',
    'messages.successSendMessage': 'Message sent successfully!',
    'messages.successSendMessages': '${count} messages sent successfully!',
    'messages.errorSendMessage': 'The message could not be sent',
    'messages.errorSendMessages': '${count} messages could not be sent',
    'messages.errorSendMessagesGeneral': 'Error sending messages',
    'messages.successSendEmail': 'Email sent successfully!',
    'messages.successSendEmails': '${count} emails sent successfully!',
    'messages.errorSendEmail': '1 email could not be sent',
    'messages.errorSendEmails': '${count} emails could not be sent',
    'messages.errorSendEmailsGeneral': 'Error sending emails',
    'messages.successReverseTitle': 'Title reversed successfully!',
    'messages.errorReverseTitle': 'Error reversing title.',
    'messages.successDeleteTerm': 'Term deleted successfully!',
    'messages.successDeleteTerms': 'Term(s) deleted successfully!',
    'messages.errorDeleteTerm': 'Error deleting term',
    'messages.errorDeleteTerms': 'Error deleting term(s)',
    'messages.confirmDeleteAdditionalService': 'Are you sure you want to delete this additional service?',
    'messages.confirmDeleteAdditionalServices': 'Are you sure you want to delete ${count} additional services?',
    'messages.successDeleteAdditionalService': 'Additional service deleted successfully!',
    'messages.successDeleteAdditionalServices': '${count} additional services deleted successfully!',
    'messages.errorDeleteAdditionalService': 'The additional service could not be deleted',
    'messages.errorDeleteAdditionalServices': '${count} additional service(s) could not be deleted',
    'messages.errorDeleteAdditionalServicesGeneral': 'Error deleting additional services',
    'messages.confirmDeleteAccountPayable': 'Are you sure you want to delete this account payable?',
    'messages.successDeleteAccountPayable': 'Account payable deleted successfully!',
    'messages.errorDeleteAccountPayable': 'Error deleting account payable.',
    'messages.loadingAccountData': 'Loading account data...',
    'messages.supplierRequired': 'Supplier is required',
    'messages.emailRequired': 'Email is required',
    'messages.passwordRequired': 'Password is required',
    'messages.passwordMinLength': 'Password must be at least 6 characters',
    'messages.info': 'Information',
    'messages.confirmAction': 'Confirm action',
    'messages.dueDateRequired': 'Due date is required',
    'messages.startDateRequired': 'Start date is required',
    'messages.endDateRequired': 'Final date is required',
    'messages.endDateAfterStartDate': 'Final date must be after start date',
    'messages.valueRequired': 'Value is required',
    'messages.valueGreaterThanZero': 'Value must be greater than zero',

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
    'dashboard.paymentStatus': 'Payment Status (Current Month)',
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
    'layout.language': 'Language',
    'layout.parameters': 'Parameters',
    'layout.search': 'Search',
    'layout.searchPlaceholder': 'Search...',
    'layout.openMenu': 'Open sidebar menu',
    'layout.closeMenu': 'Close menu',
    'layout.folderCadastros': 'Registers',
    'layout.folderFinanceiro': 'Financial',
    'layout.folderLogs': 'Logs',

    // Logs
    'logs.usuarios': 'User Logs',
    'logs.agendaTarefas': 'Task Scheduler Logs',
    'logs.webhook': 'Webhook Logs',
    'logs.email': 'Email Logs',
    'logs.whatsapp': 'WhatsApp Logs',
    'logs.assinaturaDigital': 'Digital Signature Logs',
    'logs.acessoSistema': 'System Access Logs',
    'logs.comingSoon': 'Feature coming soon.',

    // Menu Items
    'menu.clients': 'Clients',
    'menu.plans': 'Plans',
    'menu.banks': 'Banks',
    'menu.billingType': 'Billing Type',
    'menu.contracts': 'Contracts',
    'menu.financial': 'Financial',
    'menu.accountsReceivable': 'Accounts Receivable',
    'menu.suppliers': 'Suppliers',
    'menu.accountsPayable': 'Accounts Payable',
    'menu.invoices': 'Invoices',
    'menu.companyData': 'Company Data',
    'menu.whatsappHistory': 'WhatsApp History',
    'menu.emailHistory': 'Email History',

    // Modal Titles
    'modal.clients': 'Clients',
    'modal.clientsTenants': 'Client Tenants',
    'modal.plans': 'Plans',
    'modal.banks': 'Banks',
    'modal.billingType': 'Billing Type',
    'modal.contracts': 'Contracts',
    'modal.accountsReceivable': 'Accounts Receivable',
    'modal.suppliers': 'Suppliers',
    'modal.accountsPayable': 'Accounts Payable',
    'modal.invoices': 'Invoices',
    'modal.companyData': 'Company Data',
    'modal.users': 'Users',
    'modal.systemResources': 'System Resources',
    'modal.emailServer': 'Email Server',
    'modal.whatsappServer': 'WhatsApp Server',
    'modal.nfse': 'NFS-e',
    'modal.dueDays': 'Due Days',
    'modal.updates': 'Updates',
    'modal.taskScheduler': 'Task Scheduler',
    'modal.backups': 'Backup/Restore',
    'modal.digitalSignature': 'Digital Signature',
    'modal.auditLogs': 'Audit Logs',
    'modal.systemDocuments': 'Document Templates',
    'modal.whatsappHistory': 'WhatsApp Message History',
    'modal.domains': 'Domains',
    'modal.ipv4': 'IPv4',
    'modal.ipv6': 'IPv6',
    'modal.emailHistory': 'Email Message History',
    'modal.importList': 'Import list',

    // Blockdomi
    'blockdomi.menuTitle': 'Blockdomi',
    'blockdomi.titleImport': 'Import list - Blockdomi',
    'blockdomi.domain': 'Domain',
    'blockdomi.domains': 'Domains',
    'blockdomi.versao': 'Version',
    'blockdomi.gerarVersao': 'Generate version',
    'blockdomi.tipoLista': 'List',
    'blockdomi.versaoGerada': 'generated successfully',
    'blockdomi.selectDomain': 'Select Domain',
    'blockdomi.nomeOficio': 'Warrant name',
    'blockdomi.nomeOficioOptional': 'Warrant name (optional)',
    'blockdomi.dataInicioBloqueio': 'Block start date',
    'blockdomi.dataFimBloqueio': 'Block end date',
    'blockdomi.dataFimBloqueioOptional': 'Block end date (optional)',
    'blockdomi.oficioAnatel': 'Anatel warrant',
    'blockdomi.oficioJustica': 'Judicial decision',
    'blockdomi.linkOficioAnatel': 'Anatel warrant link',
    'blockdomi.linkOficioJustica': 'Judicial decision link',
    'blockdomi.linkPlanilhaDominios': 'Domain spreadsheet link',
    'blockdomi.linkPlanilhaDominiosOptional': 'Domain spreadsheet link (optional)',
    'blockdomi.planilhaDominios': 'Domain spreadsheet',
    'blockdomi.linkOficioAnatelOptional': 'Anatel warrant link (optional)',
    'blockdomi.linkOficioJusticaOptional': 'Judicial decision link (optional)',
    'blockdomi.anatel': 'Anatel',
    'blockdomi.justica': 'Judicial decision',
    'blockdomi.bulkEditDomains': 'Edit {count} domain(s)',
    'blockdomi.bulkEditIntro': 'The values below will be applied to the {count} selected domain(s).',
    'blockdomi.bulkEditSuccess': '{count} domain(s) updated successfully.',
    'blockdomi.createDomain': 'Create Domain',
    'blockdomi.editDomain': 'Edit Domain',
    'blockdomi.deleteDomain': 'Delete Domain',
    'blockdomi.createIPv4': 'Create IPv4',
    'blockdomi.editIPv4': 'Edit IPv4',
    'blockdomi.deleteIPv4': 'Delete IPv4',
    'blockdomi.selectIPv4': 'Select IPv4',
    'blockdomi.createIPv6': 'Create IPv6',
    'blockdomi.editIPv6': 'Edit IPv6',
    'blockdomi.deleteIPv6': 'Delete IPv6',
    'blockdomi.selectIPv6': 'Select IPv6',
    'blockdomi.importIntro': 'Paste a list (one item per line). Items will be classified as: domains, IPv4, IPv6, already registered in system, and invalid. When registering, items already in the system will be ignored.',
    'blockdomi.placeholderDomain': 'example.com or shortener.com/abc123',
    'blockdomi.helpDomain': 'Domain without protocol (e.g. example.com or shortener.com/abc123). No https://, http:// or www. at the start.',
    'blockdomi.placeholderOficio': 'e.g. Warrant no. 01/2026/ORG/SECTOR/CODE',
    'blockdomi.analyze': 'Analyze',
    'blockdomi.register': 'Register',
    'blockdomi.classifying': 'Classifying...',
    'blockdomi.paste': 'Paste',
    'blockdomi.domainsDetected': 'items detected',
    'blockdomi.previewExtracted': 'Extracted preview',
    'blockdomi.inputListLabel': 'Input list',
    'blockdomi.separateLinksHelp': 'Separate multiple links with comma',
    'blockdomi.orUploadPdf': 'or upload PDF file',
    'blockdomi.chooseFile': 'Choose file',
    'blockdomi.pasteListHint': 'Paste domains or IPs (one per line)',
    'blockdomi.importFromPdf': 'Import from PDF',
    'blockdomi.importFromPdfIntro': 'Upload a PDF (warrant with annex table) or enter the PDF URL. Only domains and IPs from the table will be extracted.',
    'blockdomi.pdfFile': 'PDF file',
    'blockdomi.pdfUrl': 'Or PDF URL',
    'blockdomi.extractDomainsFromPdf': 'Extract domains',
    'blockdomi.extractingPdf': 'Extracting text from PDF...',
    'blockdomi.extractFromPlanilhaUrl': 'Extract from spreadsheet URL',
    'blockdomi.extractFromPlanilhaPdf': 'Extract domains from spreadsheet PDF',
    'blockdomi.extractFromPlanilhaUrlHelp': 'Use the spreadsheet link above to extract domains without uploading.',
    'blockdomi.pdfUrlOrLinkRequired': 'Enter the spreadsheet link or select a PDF file.',
    'blockdomi.pdfUrlPlaceholder': 'https://...',
    'blockdomi.pdfExtractSuccess': 'Domains extracted from PDF. Click Analyze.',
    'blockdomi.pdfExtractError': 'No domains or IPs found in PDF.',
    'blockdomi.titleVisualizacaoExtrados': 'Extracted domains - View',
    'blockdomi.raw': 'Raw',
    'blockdomi.filtered': 'Filtered',
    'blockdomi.valid': 'Valid',
    'blockdomi.copiedToClipboard': 'Copied.',
    'blockdomi.copyFailed': 'Could not copy.',
    'blockdomi.duplicates': 'Duplicates',
    'blockdomi.invalid': 'Invalid',
    'blockdomi.alreadyRegistered': 'Already registered',
    'blockdomi.alreadyRegisteredIgnored': 'Already registered (ignored)',
    'blockdomi.none': 'None',
    'blockdomi.verListasTxt': 'View lists as TXT',
    'blockdomi.domainRequired': 'Domain is required',
    'blockdomi.domainInvalidFormat': 'Use domain without protocol (e.g. example.com or shortener.com/abc123). Do not use https://, http:// or www. at the start.',
    'blockdomi.ipRequired': 'IP is required',
    'blockdomi.ipv4InvalidFormat': 'Enter a valid IPv4 with 4 octets (e.g. 192.168.1.1). Do not use trailing dots.',
    'blockdomi.ipv6InvalidFormat': 'Enter a valid IPv6 (8 hex groups separated by :). E.g. 2001:db8::1. You may use :: once to compress zeros.',
    'blockdomi.ipsPermitidos': 'Allowed IPs',
    'blockdomi.ipsPermitidosNew': 'New',
    'blockdomi.createIpsPermitidos': 'Add allowed IPs',
    'blockdomi.editIpsPermitidos': 'Edit allowed IPs',
    'blockdomi.deleteIpsPermitidos': 'Delete allowed IPs',
    'blockdomi.faixaIps': 'IP range',
    'blockdomi.faixaIpsHelp': 'Separate multiple IPs or ranges with ; (e.g. 192.168.1.1; 10.0.0.0/24)',
    'blockdomi.ipsPermitidosRequired': 'Enter at least one IP or range',
    'blockdomi.clienteRequired': 'Select the client',
    'blockdomi.selectCliente': 'Select client',
    'blockdomi.noIpsPermitidos': 'No records found',
    'blockdomi.cliente': 'Client',
    'blockdomi.logsAcesso': 'API access logs',
    'blockdomi.logsIp': 'IP',
    'blockdomi.logsRota': 'Route',
    'blockdomi.logsMetodo': 'Method',
    'blockdomi.logsStatus': 'Status',
    'blockdomi.logsSucesso': 'Success',
    'blockdomi.logsSucessoOk': 'Yes',
    'blockdomi.logsSucessoErro': 'Error',
    'blockdomi.logsMensagemErro': 'Error message',
    'blockdomi.logsSearchPlaceholder': 'Search by IP, route...',
    'blockdomi.logsEmpty': 'No logs found',
    'blockdomi.logsReal': 'Real-time logs',
    'blockdomi.whois': 'Whois',
    'blockdomi.whoisOrganizacao': 'Organization',
    'blockdomi.whoisBloco': 'IP Block',
    'blockdomi.whoisCidr': 'CIDR',
    'blockdomi.whoisNetname': 'Netname',
    'blockdomi.whoisPais': 'Country',
    'blockdomi.whoisAsn': 'ASN',
    'blockdomi.whoisNenhumDado': 'No data found for this IP.',
    'blockdomi.whoisInfo': 'Information',
    'blockdomi.whoisBlocos': 'Blocks',
    'blockdomi.whoisContato': 'Contact',

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
    'params.manageBackups': 'Manage Backups',
    'params.validations': 'Validations',
    'backup.title': 'Backup/Restore',
    'backup.executeManual': 'Manual Backup',
    'backup.manualDatabase': 'Database',
    'backup.manualFiles': 'Files',
    'backup.manualLogs': 'Logs',
    'backup.manualFull': 'Full (DB + Files + Logs)',
    'backup.confirmDelete': 'Are you sure you want to remove the backup "{{nome}}" from the server?',
    'backup.confirmRestoreCritical': 'Critical confirmation: Restoring this backup may overwrite current data. Continue?',
    'backup.deleted': 'Backup removed.',
    'backup.downloadStarted': 'Download started.',
    'backup.restoreRequested': 'Restore requested.',
    'backup.manualQueued': 'Manual backup queued.',
    'backup.loadingList': 'Loading backup list...',
    'backup.empty': 'No backups found.',
    'backup.columnName': 'File Name',
    'backup.columnSize': 'Size',
    'backup.columnDate': 'Date',
    'backup.columnType': 'Type',
    'backup.restore': 'Restore',
    'backup.import': 'Import',
    'backup.imported': 'Backup imported successfully.',
    'params.validateCpfCnpj': 'Validate CNPJ',
    'params.validateCpfCnpjHelp': 'When enabled, validates if CNPJ is valid when creating/editing clients',
    'params.validateCep': 'Validate ZIP Code',
    'params.validateCepHelp': 'When enabled, automatically fetches address data when entering a valid ZIP code',
    'params.titleGeneration': 'Title Generation',
    'params.titlesDueSaturday': 'Titles Due on Saturdays',
    'params.titlesDueSaturdayHelp': 'If due date falls on Saturday, keeps it on Saturday. If disabled, moves to next business day',
    'params.titlesDueSunday': 'Titles Due on Sundays',
    'params.titlesDueSundayHelp': 'If due date falls on Sunday, keeps it on Sunday. If disabled, moves to next business day',
    'params.subscriberCenter': 'Subscriber Center',
    'params.loginMethod': 'Login Method',
    'params.loginMethodHelp': 'Defines whether login in subscriber center will be done by CNPJ or Email',
    'params.successUpdate': 'Parameters updated successfully!',
    'params.errorUpdate': 'Error updating parameters',

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
    'ui.actionsMenu': 'Actions menu',
    'ui.firstPage': 'First page',
    'ui.previousPage': 'Previous page',
    'ui.nextPage': 'Next page',
    'ui.lastPage': 'Last page',
    'ui.page': 'Page',
    'ui.refresh': 'Refresh',
    'ui.auditSelected': 'Audit selected record',
    'ui.selectOneToAudit': 'Select exactly 1 record to audit',
    'ui.selectAllPages': 'Select all (all pages)',
    'ui.loadingApplication': 'Loading application...',
    'ui.loadingDashboard': 'Loading dashboard...',
    'ui.loadingLogin': 'Loading login...',
    'ui.loadingPayment': 'Loading payment page...',
    'ui.loadingPage': 'Loading home page...',
    'ui.loadingSubscriberCenter': 'Loading subscriber center...',
    'ui.appError': 'Application Error',
    'ui.criticalError': 'A critical error occurred. Please reload the page.',
    'ui.reloadPage': 'Reload page',
    'ui.serverUnavailable': 'Server unavailable at the moment. Please reload. If it persists, contact support.',
    'ui.loading': 'Loading...',

    // Company Labels
    'company.title': 'Company',
    'company.razaoSocial': 'Business Name',
    'company.nomeFantasia': 'Trade Name',
    'company.cnpj': 'Tax ID (CNPJ)',
    'company.inscricaoEstadual': 'State Registration',
    'company.inscricaoMunicipal': 'Municipal Registration',
    'company.logo': 'Company Logo',
    'company.noLogo': 'No logo',
    'company.acceptedFormats': 'Accepted formats: JPG, PNG, GIF (max. 2MB)',

    // NFSe Labels
    'nfse.title': 'NFS-e',
    'nfse.municipalServiceCode': 'Municipal Service Code',
    'nfse.municipalServiceCodeHelp': 'Code from the municipality\'s service list (e.g., 1401 for IT services)',
    'nfse.issRate': 'ISS Rate (%)',
    'nfse.issRateHelp': 'Default ISS rate for invoices (0 to 100)',
    'nfse.serviceDescription': 'Service Description',
    'nfse.serviceDescriptionHelp': 'Default description of the service provided in the invoices',
    'nfse.nfSerie': 'NF Series',
    'nfse.nfSerieHelp': 'NF series (allowed: 80000 to 89999)',
    'nfse.dpsNumber': 'DPS Number',
    'nfse.dpsNumberHelp': 'DPS number (Service Provision Document)',
    'nfse.provider': 'NFS-e Provider',
    'nfse.providerHelp': 'Select the provider that will be used to issue the invoices',
    'nfse.asaasApiKey': 'Asaas API Key',
    'nfse.asaasApiKeyHelp': 'Asaas API token available in the admin panel (Settings > Integrations > API Key)',
    'nfse.useSandbox': 'Use Sandbox Environment',
    'nfse.useSandboxHelp': 'Check to use the Asaas testing environment',
    'nfse.username': 'Username',
    'nfse.password': 'Password',
    'nfse.baseUrl': 'API Base URL',
    'nfse.environment': 'Environment',
    'nfse.homologation': 'Homologation',
    'nfse.production': 'Production',
    'nfse.messages.loadingError': 'Error loading configuration',
    'nfse.messages.saveSuccess': 'NFS-e settings saved successfully!',
    'nfse.messages.saveError': 'Error saving configuration',
    'nfse.messages.testSuccessAsaas': 'Connection with Asaas tested successfully! The API Key is valid.',
    'nfse.messages.testSuccessPortal': 'Authentication tested successfully! The credentials are correct.',
    'nfse.messages.testError': 'Error testing connection',
    'nfse.messages.apiKeyRequired': 'Asaas API Key is required to test connection',
    'nfse.messages.credentialsRequired': 'Username and password are required to test authentication',
    'nfse.messages.providerRequired': 'Select a provider to test the connection',

    // Title Labels
    'titulo.title': 'Invoice/Title',
    'titulo.send': 'Send',
    'titulo.sendViaWhatsApp': 'Via WhatsApp',
    'titulo.sendViaEmail': 'Via Email',
    'titulo.createTitle': 'Create Title',
    'titulo.validationErrors': 'Validation errors:',
    'titulo.clientNotFound': 'Client not found',
    'titulo.clientCannotBeChanged': 'Client cannot be changed',
    'titulo.planoCannotBeChanged': 'Plan cannot be changed',
    'titulo.valorCannotBeChanged': 'Value cannot be changed after registration with the issuing bank',
    'titulo.dataVencimentoCannotBeChanged': 'Due date cannot be changed after registration with the issuing bank',
    'titulo.discountPercent': 'Discount (%)',
    'titulo.discountValue': 'Discount (R$)',
    'titulo.additionPercent': 'Addition (%)',
    'titulo.additionValue': 'Addition (R$)',
    'titulo.observationsPlaceholder': 'Observations about the installment...',
    'titulo.descriptionPlaceholder': 'Description of the title...',
    'titulo.selectClient': 'Select Client',
    'titulo.selectPlano': 'Select Plan',
    'titulo.messages.sendSuccess': 'Message sent successfully!',
    'titulo.messages.sendError': 'Error sending message',
    'titulo.messages.whatsappError': 'Error sending message via WhatsApp',

    // Financial
    'financial.title': 'Financial - Titles',
    'financial.accountsPayable': 'Accounts Payable',
    'financial.receivables': 'Receivables',
    'financial.cancelTitles': 'Cancel titles',
    'financial.reverseTitle': 'Reverse title',
    'financial.reverse': 'Reverse',
    'financial.confirmReverse': 'Are you sure you want to reverse the payment for title ${number}?',
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
    'financial.confirmDeleteTitle': 'Are you sure you want to delete this title? Only pending titles not registered with the bank can be deleted.',
    'financial.confirmDeleteTitles': 'Are you sure you want to delete ${count} title(s)? Only pending titles not registered with the bank can be deleted.',
    'financial.successDeleteTitle': 'Title deleted successfully.',
    'financial.successDeleteTitles': '${count} title(s) deleted successfully.',
    'financial.errorDeleteTitle': 'Could not delete 1 title.',
    'financial.errorDeleteTitles': '${count} title(s) could not be deleted.',
    'financial.errorDeleteTitlesGeneral': 'Error deleting titles.',
    'financial.receive': 'Receive',
    'financial.pay': 'Pay',
    'financial.toReceive': 'To Receive',
    'financial.toPayLabel': 'To Pay',
    'financial.value': 'Value',
    'financial.generateTitles': 'Generate Titles',

    // Buttons
    'buttons.confirmPayment': 'Confirm Payment',
    'buttons.confirmCancellation': 'Confirm Cancellation',
    'buttons.canceling': 'Canceling...',
    'buttons.save': 'Save',
    'buttons.cancel': 'Cancel',
    'buttons.close': 'Close',
    'buttons.create': 'Create',
    'buttons.edit': 'Edit',
    'buttons.delete': 'Delete',
    'buttons.print': 'Print',
    'buttons.generate': 'Generate',
    'buttons.view': 'View',
    'buttons.download': 'Download',
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
    'buttons.testConnection': 'Test Connection',
    'buttons.generateToken': 'Generate Token',
    'buttons.copy': 'Copy',
    'buttons.select': 'Select',
    'buttons.add': 'Add',
    'buttons.remove': 'Remove',

    // Form Labels
    'form.name': 'Name',
    'form.role': 'Role',
    'form.clientId': 'Client ID',
    'form.clientIdProd': 'Production Client ID',
    'form.clientSecret': 'Client Secret',
    'form.clientSecretProd': 'Production Client Secret',
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
    'form.cell': 'Cell',
    'form.site': 'Website',
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
    'form.bankNameHelp': 'Name to identify this bank account',
    'form.bankTypeHelp': 'Bank code is automatically defined',
    'form.optionalUpdate': 'Optional field. Fill only if you want to update.',
    'form.webhookUrl': 'Return URL (Webhook)',
    'form.webhookUrlHelp': 'URL to receive payment notifications',
    'form.sandboxHelp': 'Activate to use testing environment. Deactivate for production.',
    'form.apiKey': 'API Key',
    'form.apiKeyAsaasHelp': 'Available in Asaas administrative panel.',
    'form.webhookSecret': 'Webhook Secret',
    'form.webhookSecretAsaasHelp': 'Use this token when configuring the Asaas webhook.',
    'form.generateWebhookSecretHelp': 'Click "Generate token" after saving the bank to get the webhook secret.',
    'form.finePercent': 'Fine Percentage (%)',
    'form.interestPercent': 'Interest Percentage (% per day)',
    'form.includeFee': 'Include Fee in Boleto',
    'form.accountIdentifier': 'Account Identifier',
    'form.accountIdentifierEfiHelp': 'Available in Efi API settings',
    'form.paymentLocation': 'Payment Location',
    'form.operationNature': 'Operation Nature',
    'form.model': 'Model',
    'form.type': 'Type',
    'form.code': 'Code',
    'form.issueDate': 'Issue Date',
    'form.totalValue': 'Total Value',
    'form.servicesValue': 'Services Value',
    'form.productsValue': 'Products Value',
    'form.discountValueInvoice': 'Discount Value',
    'form.issRateShort': 'ISS Rate (%)',
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
    'form.invoiceNumber': 'Invoice Number',
    'form.paymentType': 'Payment Type',
    'form.paymentTypeCash': 'Cash',
    'form.paymentTypeBoleto': 'Boleto',
    'form.paymentTypeCard': 'Card',
    'form.paymentTypeDeposit': 'Deposit',
    'form.paymentTypeDebit': 'Debit',
    'form.paymentTypeTransfer': 'Transfer',
    'form.paymentTypePix': 'PIX',
    'form.balanceDue': 'Balance Due',
    'form.dueDateStart': 'Due Date Start',
    'form.dueDateEnd': 'Due Date End',
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
    'form.creationType': 'Creation Type',
    'form.creationTypeUnique': 'Unique',
    'form.creationTypeBatch': 'Batch',
    'form.dueDateInitial': 'Initial Due Date',
    'form.dueDateFinal': 'Final Due Date',
    'form.pixKeyType': 'PIX Key Type',
    'form.pixKey': 'PIX Key',
    'form.qrCodeCopiaECola': 'Copy and Paste Code',
    'form.barcodeLine': 'Boleto Barcode Line',
    'form.discountPercentShort': 'Discount (%)',
    'form.discountValueShort': 'Discount (Value)',
    'form.increasePercentShort': 'Increase (%)',
    'form.increaseValueShort': 'Increase (Value)',
    'form.baixadoValue': 'Paid Value',
    'form.totalToPay': 'Total Value to Pay',
    'form.justification': 'Justification',
    'form.justificationCancel': 'Cancellation Justification',
    'form.title': 'Title',
    'form.password': 'Password',
    'form.planNamePlaceholder': 'Plan name',
    'form.planDescriptionPlaceholder': 'Plan description',
    'form.monthlyValuePlaceholder': 'Monthly value',
    'form.usersQuantity': 'Users Quantity',
    'form.autoRenewal': 'Auto Renewal',
    'form.planObservationsPlaceholder': 'Plan observations',
    'form.serviceTypeInfrastructure': 'Infrastructure',
    'form.serviceTypeConsulting': 'Consulting',
    'form.serviceTypeBlockdomi': 'Blockdomi',
    'form.periodicityMonthly': 'Monthly',
    'form.periodicityQuarterly': 'Quarterly',
    'form.periodicitySemiannual': 'Semiannual',
    'form.periodicityAnnual': 'Annual',
    'form.periodicityBimonthly': 'Bimonthly',
    'form.periodicityBiweekly': 'Biweekly',
    'form.periodicityWeekly': 'Weekly',
    'form.quantityTitles': 'Quantity of titles',
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
    'table.personTypeShort': 'Type',
    'table.personTypeLegalShort': 'Legal',
    'table.personTypePhysicalShort': 'Physical',
    'table.nameCompanyNameShort': 'Name/Company Name',
    'table.tradeNameShort': 'Trade Name',
    'table.zipCodeShort': 'Zip Code',
    'table.streetShort': 'Street',
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
    'table.balanceDue': 'Balance Due',
    'table.createdAt': 'Created At',
    'table.updatedAt': 'Updated At',
    'table.documentNumber': 'Document Number',
    'table.supplier': 'Supplier',
    'table.paymentType': 'Payment Type',
    'table.client': 'Client',
    'table.clientName': 'Client',
    'table.cpfCnpj': 'CPF/CNPJ',
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
    'table.country': 'Country',
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
    'table.issueDate': 'Issue Date',
    'table.totalValue': 'Total Value',
    'table.accessKey': 'Access Key',
    'table.protocol': 'Protocol',
    'table.authorizationDate': 'Authorization Date',
    'table.chargeId': 'Charge ID',
    'table.ourNumber': 'Our Number',
    'table.paidValueDownloaded': 'Paid value',
    'table.openValueOpen': 'Open value',
    'table.nf': 'NF',
    'table.nfStatus': 'NF Status',
    'table.termName': 'Term Name',
    'table.accepted': 'Signed',
    'table.acceptedDate': 'Accepted Date',
    'table.acceptedBy': 'Accepted By',
    'table.observations': 'Observations',
    'table.action': 'Action',
    'table.name': 'Name',
    'table.bank': 'Bank',
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
    'modal.payAccountManually': 'Pay Account Manually',
    'modal.viewInvoice': 'View Invoice',
    'modal.createClient': 'Client',
    'modal.editClient': 'Client',
    'modal.createPlan': 'Plan',
    'modal.editPlan': 'Plan',
    'modal.createBank': 'Bank',
    'modal.editBank': 'Bank',
    'modal.createContract': 'Contract',
    'modal.editContract': 'Contract',
    'modal.createSupplier': 'Supplier',
    'modal.editSupplier': 'Supplier',
    'modal.createAccountPayable': 'Account Payable',
    'modal.editAccountPayable': 'Account Payable',
    'modal.createTitle': 'Title',
    'modal.editTitle': 'Title',
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
    'modal.editTerm': 'Term',
    'modal.selectTerm': 'Select Term',
    'modal.selectContractModel': 'Select Contract Model',
    'modal.sendSignature': 'Send Signature',
    'modal.additionalService': 'Additional Service',
    'modal.list': 'List',
    'modal.defaultDocument': 'Default Document',
    'modal.deleteFiles': 'Delete files',
    'modal.deleteAdditionalServices': 'Delete additional services',
    'modal.scheduledRoutine': 'Scheduled Routine',

    // Tabs
    'tabs.basicData': 'Basic Data',
    'tabs.contact': 'Contact',
    'tabs.address': 'Address',
    'tabs.contracts': 'Contracts',
    'tabs.financial': 'Financial',
    'tabs.faturasAbertas': 'Open invoices',
    'tabs.faturasPagas': 'Paid invoices',
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
    'status.processing': 'Processing',
    'status.authorized': 'Authorized',
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
    'status.blocked': 'Blocked',
    'status.inArrears': 'Overdue',
    'status.suspended': 'Suspended',
    'status.exempt': 'Exempt',
    'status.overdue': 'Overdue',
    'status.paidLate': 'Paid Late',

    'saas.manualUnblock': 'Manual unblock',
    'saas.confirmManualUnblock': 'Manually unblock company? It will have the configured period to regularize titles.',
    'saas.dataNaoBloquearAte': 'Do not block until',

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
    'placeholder.bankName': 'Bank name',
    'placeholder.bankDescription': 'Bank description...',
    'placeholder.fillClientSecret': 'Fill only to update client secret',
    'placeholder.webhookUrl': 'URL for webhook return',
    'placeholder.apiKeyAsaas': 'Your Asaas API key',
    'placeholder.webhookSecretHelp': 'Click on Generate token to create a secret',
    'placeholder.accountIdentifierHelp': 'Provided in the API configuration menu',
    'placeholder.paymentLocationDefault': 'Payable at any bank until the due date',
    'placeholder.contractCreationHelp': 'Create the contract first to manage terms.',
    'placeholder.financialTitlesCreationHelp': 'Create the contract first to manage financial titles.',
    'placeholder.financialMiscCreationHelp': 'Create the contract first to manage miscellaneous titles.',
    'placeholder.additionalServicesCreationHelp': 'Create the contract first to manage additional services.',
    'placeholder.selectProvider': 'Select provider',
    'placeholder.startDate': 'Start date',
    'placeholder.endDate': 'End date',
    'placeholder.selectType': 'Select type',
    'placeholder.searchServices': 'Search services...',
    'placeholder.enterJustification': 'Enter the justification for canceling the invoice (minimum 15 characters)...',
    'placeholder.enterSupplierId': 'Enter supplier ID',
    'placeholder.enterPixKey': 'Enter PIX key',
    'placeholder.enterCpfCnpj': 'Enter CPF or CNPJ',
    'placeholder.enterCellPhone': 'Enter cell phone',
    'placeholder.enterEmail': 'Enter e-mail',
    'placeholder.enterName': 'Enter name',
    'placeholder.enterRandomKey': 'Enter random key (UUID)',
    'placeholder.pasteQrCode': 'Paste PIX copy and paste code',

    // Filter Labels
    'filter.startDate': 'Start Date:',
    'filter.endDate': 'End Date:',

    // Document Labels
    'document.title': 'Title:',
    'document.viewDocument': 'View Document',
    'document.print': 'Print',
    'document.modelContrato': 'Contract Model',
    'document.termAdesao': 'Adhesion Term',
    'document.permanencia': 'Permanence Contract',
    'document.receipts': 'Receipts',
    'document.cartaCobranca': 'Collection Letter',
    'document.name': 'Name',
    'document.description': 'Description',
    'document.testClient': 'Test Client',
    'document.testClientHelp': 'Select a client to view the document with real data',
    'document.idPlaceholder': 'Enter Client ID',
    'document.content': 'Content',
    'document.contractContent': 'Contract Content',
    'document.successCreate': 'Document created successfully',
    'document.successUpdate': 'Document saved successfully',
    'document.errorCreate': 'Error creating document',
    'document.errorUpdate': 'Error saving document',
    'document.errorGeneratePdf': 'Error generating PDF',
    'document.labels.recibo': 'Receipt',
    'document.labels.carta_cobranca': 'Collection Letter',
    'document.labels.termo': 'Term',
    'document.labels.documento': 'Document',

    // Other
    'other.selectExactlyOne': 'Select exactly 1 record to audit',
    'other.auditSelectedRecord': 'Audit selected record',
    'other.resizeColumn': 'Resize column',
    'other.reloadData': 'Reload data',
    'other.confirmAction': 'Confirm action',
    'other.selectAtLeastOne': 'Select at least one title',
    'other.characters': 'characters',
    'other.invoiceDetails': 'Invoice Details:',
    'other.selected': 'Selected',
    'other.open': 'Open',
    'other.all': 'All',
    'other.receipt': 'Receipt',
    'other.printNF': 'Print Invoice',
    'other.generateNFSeStandalone': 'Generate Standalone NFS-e',
    'other.termRegistered': 'Registered Term',
    'other.viaWhatsApp': 'Via WhatsApp',
    'other.viaEmail': 'Via Email',
    'other.newMiscTitle': 'New Misc Title',
    'other.deleteTerms': 'Delete terms',
    'other.day': 'Day',

    // Financial Summary Labels
    'summary.value': 'Value:',
    'summary.paidValue': 'Paid Value:',
    'summary.openValue': 'Open Value:',
    'summary.canceledValue': 'Canceled Value:',
    'summary.totalPaidValue': 'Total Paid Value:',
    'summary.monthlyTotalValue': 'Monthly Total Value:',
    'summary.totalDiscountsValue': 'Total Discounts Value:',
    'summary.contractSummary': 'Contract summary',
    'summary.totalContracts': 'Total contracts:',
    'summary.activeContracts': 'Active contracts:',

    // Audit
    'audit.title': 'Audit Logs',
    'audit.detailsTitle': 'Audit Log Details',
    'audit.generalInfo': 'General Information',
    'audit.data': 'Data',
    'audit.entityId': 'Entity ID',
    'audit.user': 'User',
    'audit.ip': 'IP',
    'audit.tenant': 'Tenant',
    'audit.route': 'Route',
    'audit.userAgent': 'User-Agent',
    'audit.viewDetails': 'View Details',
    'audit.method': 'Method',
    'audit.entity': 'Entity',
    'audit.timestamp': 'Date/Time',
    'audit.entities.all': 'All',
    'audit.actions.all': 'All',
    'audit.actions.create': 'Create',
    'audit.actions.update': 'Update',
    'audit.actions.delete': 'Delete',
    'audit.actions.login': 'Login',
    'audit.actions.logout': 'Logout',
    'audit.actions.export': 'Export',
    'audit.actions.import': 'Import',
    'audit.actions.executar': 'Execute',

    // Variables
    'variables.title': 'Available Variables',
    'variables.searchPlaceholder': 'Search variable...',
    'variables.insert': 'Insert Variables',
    'variables.errorLoading': 'Error loading variables',
    'variables.tip': 'Tip: Variables will be replaced by actual values when generating the document.',
    'variables.clickToInsert': 'Click on a variable to insert',
    'variables.clickToCopy': 'Click on a variable to copy',

    // User Form
    'user.title': 'User',
    'user.profile': 'Profile',
    'user.admin': 'Administrator',
    'user.user': 'User',
    'user.newPassword': 'New Password (leave blank to keep)',
    'user.passwordPlaceholder': 'Minimum 6 characters',
    'user.newPasswordPlaceholder': 'Leave blank to keep current password',
    'user.webhookHelp': 'Use as Bearer in API (clients, contracts, titles, company data).',
    'user.generateWebhookHelp': 'Click "Generate token" to get the API token.',
    'user.webhookSecret': 'API Token',
    'user.generateToken': 'Generate Token',
    'user.copy': 'Copy',
    'user.variables': 'Variables',
    'user.successCreate': 'User created successfully!',
    'user.successUpdate': 'User updated successfully!',
    'user.successGenerateSecret': 'Webhook secret generated successfully!',
    'user.successCopySecret': 'Webhook secret copied!',
    'user.errorCreate': 'Error creating user',
    'user.errorUpdate': 'Error updating user',

    // Email Server
    'emailServer.title': 'Email Server',
    'emailServer.serverSettings': 'Server Settings',
    'emailServer.configureServer': 'Configure Email Server',
    'emailServer.smtpHost': 'SMTP Host',
    'emailServer.port': 'Port',
    'emailServer.userEmail': 'User/Email',
    'emailServer.senderName': 'Sender Name',
    'emailServer.senderEmail': 'Sender Email',
    'emailServer.useSsl': 'Use SSL',
    'emailServer.useTls': 'Use TLS',
    'emailServer.timeout': 'Timeout (ms)',
    'emailServer.sendTestEmail': 'Send Test Email',
    'emailServer.testEmailPlaceholder': 'Enter email for test',
    'emailServer.testEmailButton': 'Send Test',
    'emailServer.testEmailHelp': 'Enter a valid email to test sending through this server',
    'emailServer.passwordHelp': 'Leave blank to keep current password',
    'emailServer.passwordPlaceholder': 'Enter email password',

    // WhatsApp Server
    'whatsappServer.title': 'WhatsApp Server',
    'whatsappServer.evolutionApi': 'Evolution API',
    'whatsappServer.cloudApi': 'WhatsApp Cloud API',
    'whatsappServer.successSave': 'WhatsApp server settings saved successfully!',
    'whatsappServer.errorSave': 'Error saving settings',
    'whatsappServer.successMessageSave': 'Message saved successfully!',
    'whatsappServer.errorMessageSave': 'Error saving message',
    'whatsappServer.successRemove': 'Server removed successfully!',
    'whatsappServer.errorRemove': 'Error removing server',
    'whatsappServer.testPhoneRequired': 'Please enter a phone number for test',
    'whatsappServer.testMessageRequired': 'Please enter a message for test',
    'whatsappServer.configureFirst': 'Configure the server first before sending a test message',
    'whatsappServer.errorSendTest': 'Could not send test message. Check server settings and try again.',
    'whatsappServer.selectMessageType': 'Select a message type',
    'whatsappServer.messageRequired': 'Default message is required',
    'whatsappServer.removeServer': 'Delete Server',
    'whatsappServer.variableCopied': 'Variable copied!',
    'whatsappServer.server': 'Server',
    'whatsappServer.messages': 'Messages',
    'whatsappServer.templatesMeta': 'Meta Templates',
    'whatsappServer.templates': 'Templates',

    // Scheduler
    'scheduler.title': 'Task Scheduler',
    'scheduler.frequency': 'Frequency',
    'scheduler.schedule': 'Schedule',
    'scheduler.nextRun': 'Next Run',
    'scheduler.lastRun': 'Last Run',
    'scheduler.executions': 'Executions',
    'scheduler.errors': 'Errors',
    'scheduler.confirmExecute': 'Do you want to execute the routine now?',
    'scheduler.executeRoutine': 'Execute routine',
    'scheduler.execute': 'Execute',
    'scheduler.routineStarted': 'Routine started in background',
    'scheduler.confirmDelete': 'Are you sure you want to delete this routine?',
    'scheduler.deleteRoutine': 'Delete routine',
    'scheduler.successDelete': 'Routine deleted successfully',
    'scheduler.deactivate': 'Deactivate',
    'scheduler.type': 'Type',
    'scheduler.routine': 'Routine',

    // Updates
    'updates.title': 'System Updates',
    'updates.currentVersion': 'Current Version',
    'updates.searching': 'Searching for updates...',
    'updates.errorSearch': 'Error searching for updates',
    'updates.noUpdates': 'No updates available',
    'updates.systemUpdated': 'The system is up to date with the latest version.',
    'updates.updating': 'Updating system...',
    'updates.success': 'Update completed successfully! The application will restart soon.',
    'updates.error': 'Error executing update',
    'updates.confirmUpdate': 'Are you sure you want to update the system? This action will:\n\n1. Download the latest changes from the repository\n2. Update dependencies\n3. Compile the code\n4. Execute database migrations\n5. Restart the application\n\nThe process may take a few minutes.',
    'updates.updateSystem': 'Update System',
    'updates.badges.new': 'New',
    'updates.badges.bugfix': 'Bugfix',
    'updates.badges.security': 'Security',
    'updates.badges.improvement': 'Improvement',
    'updates.badges.other': 'Other',
    'updates.concluded': 'Update concluded!',
    'updates.waitingServer': 'Waiting for server to be ready...',
    'updates.restartInSeconds': 'Waiting for server restart (${n}s)...',
    'updates.reloadingPage': 'Reloading page...',

    // Login
    'login.title': 'Access the administrative panel',
    'login.emailPlaceholder': 'your@email.com',
    'login.passwordPlaceholder': 'Your password',
    'login.entering': 'Signing in...',
    'login.enter': 'Sign In',
    'login.success': 'Authentication successful.',
    'login.errorCredentials': 'Could not authenticate. Check your credentials.',
    'login.errorToken': 'Error saving authentication token. Try again.',
    'login.errorGeneral': 'Failed to authenticate. Try again.',
    'login.infoRequired': 'Please enter email and password to continue.',
    'login.allRightsReserved': 'All rights reserved.',
    'login.copyIp': 'Click to copy',
    'login.ipCopied': 'IP copied!',

    // Layout
    'layout.logoutSuccess': 'Logged out successfully.',
    'layout.closeSearch': 'Close search',
    'empty.noContracts': 'This client does not have any contracts registered yet.',
    'empty.noTitles': 'This client does not have any titles registered yet.',
    'empty.noFiles': 'No files found',
    'empty.noTermsRegistered': 'This contract does not have any terms registered yet.',
    'empty.noAdditionalServices': 'This contract does not have any additional services registered yet.',
    'filter.showInactive': 'Show inactive',
    'filter.showCanceled': 'Show canceled',
    'confirm.deleteFiles': 'Are you sure you want to delete ${count} file(s)?',
    'confirm.deleteFilesTitle': 'Delete files',
    'messages.saveClientFirst': 'Save the client first to add files.',
    'messages.saveBankBeforeTest': 'Save the bank before testing the connection',
    'messages.testingConnection': 'Testing connection...',
    'messages.connectionSuccess': 'Connection tested successfully!',
    'messages.connectionFailed': 'Connection test failed',
    'messages.credentialsNotConfiguredAsaas': 'Credentials not configured. Enter the Asaas API Key before testing.',
    'messages.credentialsNotConfiguredEfi': 'Credentials not configured. Fill in Client ID and Client Secret before testing.',
    'messages.saveBankBeforeWebhook': 'Save the bank before generating the webhook token',
    'messages.webhookTokenGenerated': 'Webhook token generated successfully!',
    'messages.webhookTokenNotReturned': 'Token not returned by the server. Try again.',
    'messages.noTokenToCopy': 'No token available to copy.',
    'messages.webhookTokenCopied': 'Webhook token copied to clipboard!',
    'messages.copyManual': 'Could not copy automatically. Copy manually.',
    'messages.loadingClientData': 'Loading client data...',
    'messages.loadingPlanData': 'Loading plan data...',
    'messages.noTitleSelected': 'No titles selected',
    'messages.noPaidTitleSelected': 'No paid titles selected. Only paid titles can have a receipt.',
    'messages.noTitlesFound': 'No titles found',
    'messages.noOpenTitlesFound': 'No open titles found',
    'messages.noPaidTitlesFound': 'No paid invoices found',
    'messages.noNFSeTitlesSelected': 'None of the selected titles have an issued NFS-e',
    'messages.receiptsGenerated': '${count} receipt(s) generated successfully!',
    'messages.errorGeneratingReceipts': 'Error generating receipts',
    'messages.errorGeneratingNFSe': 'Error generating NFS-e PDF',
    'messages.nfseGenerated': 'NFS-e generated successfully!',
    'fileType.document': 'Document',
    'fileType.photo': 'Photo',
    'fileType.signature': 'Signature',
    'fileType.manual': 'Manual',
    'fileType.digitalSignature': 'Digital Signature',
    'fileType.system': 'System',
    'placeholder.street': 'Street, Avenue...',
    'placeholder.number': '123',
    'placeholder.complement': 'Apt, Room...',
    'placeholder.neighborhood': 'Neighborhood name',
    'placeholder.city': 'City name',
    'placeholder.state': 'NY',
    'placeholder.email': 'email@company.com',
    'form.whatsapp': 'WhatsApp',

    // New Placeholders
    'placeholder.contractContent': 'Enter contract model content...',
    'placeholder.receiptContent': 'Enter receipt model content...',
    'placeholder.letterContent': 'Enter collection letter model content...',
    'placeholder.description': 'Brief description',
    'placeholder.manualSend': 'Enter message for manual sending...',
    'placeholder.defaultEmail': 'Enter default email message...',
    'placeholder.defaultMessage': 'Enter default message to be sent...',
    'placeholder.firstInteraction': 'Enter first interaction message...',
    'placeholder.secondInteraction': 'Enter second interaction message...',
    'placeholder.thirdInteraction': 'Enter third interaction message...',
    'placeholder.clientIdProd': 'Production Client ID',
    'placeholder.serviceCode': 'Ex: 1401',
    'placeholder.serviceDescription': 'Ex: Software development services provision',
    'placeholder.apiToken': 'API Token',
    'placeholder.apiKey': 'Paste your API Key here',
    'placeholder.workspaceId': 'Workspace ID (from My Account > Workspaces)',
    'placeholder.responsibleName': 'Responsible name',
    'placeholder.responsibleRole': 'Responsible role',
    'placeholder.paymentObservations': 'Payment observations (optional)',
    'placeholder.testMessage': 'BackNet system test message',
    'placeholder.termContent': 'Enter term content...',

    // Message Types
    'messages.types.10daysBefore': '10 days before due date',
    'messages.types.05daysBefore': '05 days before due date',
    'messages.types.sameDay': 'Due date',
    'messages.types.05daysAfter': '05 days after due date',
    'messages.types.10daysAfter': '10 days after due date',
    'messages.types.15daysAfter': '15 days after due date',
    'messages.types.clientCut': 'Client suspension',
    'messages.types.manualSend': 'Manual collection send',
    'messages.types.paymentReceipt': 'Payment receipt',

    // Send Types
    'messages.sendTypes.disabled': 'Disable',
    'messages.sendTypes.pdf': 'Attach PDF',

    // Settings Server
    'settings.server.config': 'Server Settings',
    'settings.server.configure': 'Configure Server',
    'settings.test.title': 'Send Test Message',
    'settings.test.phone': 'Phone Number',
    'settings.test.message': 'Message',
    'settings.test.send': 'Send Test',
    'settings.test.helper': 'Enter number with country code (ex: 5511999999999)',
    'settings.messages.type': 'Message Type',
    'settings.messages.sendType': 'Send Type',
    'settings.messages.manualLabel': 'Manual Send Message',
    'settings.messages.manualHelper': 'Message used when sending title manually',
    'settings.messages.emailLabel': 'Email Message',
    'settings.messages.templateConfig': 'Template Configuration - WhatsApp Cloud API',
    'settings.messages.viewTemplates': 'View Active Templates',
    'settings.messages.activeTemplatesWhatsApp': 'Active Templates - WhatsApp Cloud API',
    'settings.messages.templateHelper': 'Configure template and variables for WhatsApp Cloud API. Leave empty to use normal text message.',
    'settings.messages.templateFormat': 'Format: JSON with name (template name), language (en, pt_BR, etc) and variables (array with variable order).',
    'settings.messages.defaultMessage': 'Default Message',
    'settings.messages.interaction1': 'Interaction 01',
    'settings.messages.interaction2': 'Interaction 02',
    'settings.messages.interaction3': 'Interaction 03',
    'settings.messages.interaction1Helper': 'Optional message for first interaction',
    'settings.messages.interaction2Helper': 'Optional message for second interaction',
    'settings.messages.interaction3Helper': 'Optional message for third interaction',
    'settings.messages.variablesTitle': 'Available Variables for Messages',
    'settings.messages.variablesHelper': 'Click on variables to insert into message',
    'settings.messages.copyVariable': 'Copy variable',

    // Message History
    'history.whatsappTitle': 'WhatsApp Message History',
    'history.emailTitle': 'Email Message History',
    'history.type': 'Type',
    'history.client': 'Client',
    'history.phone': 'Phone',
    'history.recipient': 'Recipient',
    'history.subject': 'Subject',
    'history.message': 'Message',
    'history.status': 'Status',
    'history.error': 'Error',
    'history.entity': 'Entity',
    'history.user': 'User',
    'history.dateTime': 'Date/Time',
    'history.whatsapp': 'WhatsApp',
    'history.email': 'Email',
    'history.sent': 'Sent',
    'history.errorStatus': 'Error',
    'history.system': 'System',
    'history.view': 'View',
    'history.searchPhone': 'Search by phone...',
    'history.searchEmail': 'Search by email...',
    'history.noMessages': 'No messages found',

    // File Modal
    'messages.selectFile': 'Select a file',
    'messages.enterFileName': 'Enter file name',
    'messages.fileAddedSuccess': 'File added successfully',
    'messages.fileAddedError': 'Error adding file',

    // Financial
    'financial.parcelInfo': 'Installment Information',
    'financial.originalValue': 'Original Value',
    'financial.paymentDate': 'Payment Date',
    'financial.amountPaid': 'Amount Paid',
    'financial.characters': 'characters',

    // Company
    'company.responsibleSignature': 'Responsible Signature',
    'company.noSignature': 'No signature',
    'company.pngOnly': 'Only PNG files allowed (max 10MB)',

    // Digital Signature
    'digitalSignature.generalSettings': 'General Settings',
    'digitalSignature.enable': 'Enable Digital Signature',
    'digitalSignature.enableHelp': 'Enables electronic digital signature functionality in the system',
    'digitalSignature.provider': 'API Provider',
    'digitalSignature.providerHelp': 'Select API provider for digital signature',
    'digitalSignature.expirationDays': 'Default Expiration Days',
    'digitalSignature.expirationDaysHelp': 'Default number of days for document expiration (1 to 365 days)',
    'digitalSignature.apiSettings': 'API Settings',
    'digitalSignature.apiKey': 'API Key',
    'digitalSignature.assinafyHelp': 'Get your free API Key at assinafy.com.br (100 free signatures/month)',
    'digitalSignature.zapsignHelp': 'Get your API Key at ZapSign dashboard',
    'digitalSignature.workspaceId': 'Workspace Account ID',
    'digitalSignature.workspaceIdHelp': 'Workspace Account ID from Assinafy dashboard: My Account > Workspaces',
    'digitalSignature.assinafyInfo': 'Assinafy: Free plan with 100 monthly signatures. Ideal for starting with digital signatures at no cost.',
    'digitalSignature.successUpdate': 'Digital signature settings updated successfully!',
    'digitalSignature.errorUpdate': 'Error updating settings',
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
    'actions.pay': 'Pagar',
    'actions.duplicate': 'Duplicar',
    'actions.insert': 'Insertar',
    'actions.new': 'Nuevo',
    'actions.filter': 'Filtrar',
    'actions.export': 'Exportar',
    'actions.import': 'Importar',
    'actions.receive': 'Recibir',
    'actions.reverse': 'Revertir',
    'actions.nfse': 'NFS-e',
    'actions.print': 'Imprimir',
    'actions.send': 'Enviar',

    // Buttons
    'buttons.selected': 'Seleccionados',
    'buttons.open': 'Abiertos',
    'buttons.receipt': 'Recibo',
    'buttons.printNF': 'Imprimir NF',
    'buttons.viaWhatsApp': 'Vía WhatsApp',
    'buttons.viaEmail': 'Vía Email',
    'buttons.generateNFSeAvulsa': 'Generar NFS-e Independiente',
    'buttons.new': 'Nuevo',

    // Contracts
    'contracts.title': 'Contrato',
    'contracts.confirmDelete': 'Eliminar contratos',
    'contracts.confirmDeleteMessage': '¿Está seguro de que desea eliminar los contratos seleccionados?',
    'contracts.termAdesao': 'Término de Adhesión',
    'contracts.permanencia': 'Contrato de Permanencia',
    'contracts.messages.deleteSuccess': '¡Contrato eliminado con éxito!',
    'contracts.messages.deleteError': 'Error al eliminar el contrato',

    // Mensajes
    'messages.confirmDelete': '¿Estás seguro de que quieres eliminar?',
    'messages.loading': 'Cargando...',
    'messages.noData': 'No se encontraron datos',
    'messages.error': 'Ocurrió un error',
    'messages.cnpjDataAutoFilled': '¡Datos del CNPJ completados automáticamente!',
    'messages.cnpjNotFound': 'CNPJ no encontrado. Puede completar los datos manualmente.',
    'messages.errorConsultingCnpj': 'Error al consultar CNPJ. Intente nuevamente o complete los datos manualmente.',
    'messages.nameRequired': 'El nombre/razón social es obligatorio',
    'messages.contentRequired': 'El contenido es obligatorio',
    'messages.cpfCnpjRequired': 'CPF/CNPJ es obligatorio',
    'messages.invalidCpf': 'CPF inválido',
    'messages.invalidCnpj': 'CNPJ inválido',
    'messages.success': 'Operación completada con éxito',
    'messages.justificationRequired': 'La justificación es obligatoria',
    'messages.justificationMinLength': 'La justificación debe tener al menos 15 caracteres',
    'messages.justificationMaxLength': 'La justificación debe tener como máximo 500 caracteres',
    'messages.invoiceCanceled': '¡Nota fiscal cancelada con éxito!',
    'messages.errorCancelingInvoice': 'Error al cancelar la nota fiscal',
    'messages.clientRequired': 'El cliente es obligatorio',
    'messages.actionCannotBeUndone': 'Esta acción no se puede deshacer.',
    'messages.invoiceGenerated': '¡Nota Fiscal de Servicios Electrónica generada con éxito!',
    'messages.errorGeneratingInvoice': 'Error al generar la Nota Fiscal de Servicios Electrónica',
    'messages.issRateRange': 'La alícuota de ISS debe estar entre 0 y 100',
    'messages.selectAtLeastOneInvoice': 'Seleccione al menos una factura',
    'messages.invoicePdfGenerated': '¡PDF de la factura generado con éxito!',
    'messages.errorGeneratingInvoicePdf': 'Error al generar el PDF de la factura',
    'messages.selectInvoiceToCancel': 'Seleccione una factura para cancelar',
    'messages.selectOnlyOneInvoiceToCancel': 'Seleccione solo una factura para cancelar',
    'messages.invoiceAlreadyCanceled': 'Esta factura ya ha sido cancelada',
    'messages.onlyAuthorizedCanBeCanceled': 'Solo las facturas autorizadas pueden ser canceladas',
    'messages.notInformed': 'No informado',
    'messages.warning': 'Advertencia',
    'messages.successPrintSelected': '¡Boletos seleccionados generados con éxito!',
    'messages.errorPrintSelected': 'Error al generar boletos seleccionados',
    'messages.clientNotFound': 'Cliente no encontrado',
    'messages.successPrintOpen': '¡Boletos pendientes generados con éxito!',
    'messages.errorPrintOpen': 'Error al generar boletos pendientes',
    'messages.confirmCancelTitle': '¿Estás seguro de que deseas cancelar este título?',
    'messages.confirmCancelTitles': '¿Estás seguro de que deseas cancelar ${count} títulos?',
    'messages.successCancelTitle': '¡Título cancelado con éxito!',
    'messages.successCancelTitles': '¡${count} títulos cancelados con éxito!',
    'messages.errorCancelTitle': '1 título no pudo ser cancelado',
    'messages.errorCancelTitles': '${count} títulos no pudieron ser cancelados',
    'messages.errorCancelTitlesGeneral': 'Error al cancelar títulos',
    'messages.successSendMessage': '¡Mensaje enviado con éxito!',
    'messages.successSendMessages': '¡${count} mensajes enviados con éxito!',
    'messages.errorSendMessage': 'El mensaje no pudo ser enviado',
    'messages.errorSendMessages': '${count} mensajes no pudieron ser enviados',
    'messages.errorSendMessagesGeneral': 'Error al enviar mensajes',
    'messages.successSendEmail': '¡Email enviado con éxito!',
    'messages.successSendEmails': '¡${count} emails enviados con éxito!',
    'messages.errorSendEmail': '1 email no pudo ser enviado',
    'messages.errorSendEmails': '${count} emails no pudieron ser enviados',
    'messages.errorSendEmailsGeneral': 'Error al enviar emails',
    'messages.successReverseTitle': '¡Título revertido con éxito!',
    'messages.errorReverseTitle': 'Error al revertir título.',
    'messages.successDeleteTerm': '¡Término eliminado con éxito!',
    'messages.successDeleteTerms': '¡Término(s) eliminado(s) con éxito!',
    'messages.errorDeleteTerm': 'Error al eliminar término',
    'messages.errorDeleteTerms': 'Error al eliminar término(s)',
    'messages.confirmDeleteAdditionalService': '¿Estás seguro de que deseas eliminar este servicio adicional?',
    'messages.confirmDeleteAdditionalServices': '¿Estás seguro de que deseas eliminar ${count} servicios adicionales?',
    'messages.successDeleteAdditionalService': '¡Servicio adicional eliminado con éxito!',
    'messages.successDeleteAdditionalServices': '¡${count} servicios adicionales eliminados con éxito!',
    'messages.errorDeleteAdditionalService': 'El servicio adicional no pudo ser eliminado',
    'messages.errorDeleteAdditionalServices': '${count} servicio(s) adicional(es) no pudieron ser eliminados',
    'messages.errorDeleteAdditionalServicesGeneral': 'Error al eliminar servicios adicionales',
    'messages.confirmDeleteAccountPayable': '¿Está seguro de que desea eliminar esta cuenta por pagar?',
    'messages.successDeleteAccountPayable': '¡Cuenta por pagar eliminada con éxito!',
    'messages.errorDeleteAccountPayable': 'Error al eliminar la cuenta por pagar.',
    'messages.loadingAccountData': 'Cargando datos de la cuenta...',
    'messages.supplierRequired': 'El proveedor es obligatorio',
    'messages.emailRequired': 'El correo electrónico é obligatorio',
    'messages.passwordRequired': 'La contraseña es obligatoria',
    'messages.passwordMinLength': 'La contraseña debe tener al menos 6 caracteres',
    'messages.info': 'Información',
    'messages.confirmAction': 'Confirmar acción',
    'messages.dueDateRequired': 'La fecha de vencimiento es obligatoria',
    'messages.startDateRequired': 'La fecha inicial es obligatoria',
    'messages.endDateRequired': 'La fecha final es obligatoria',
    'messages.endDateAfterStartDate': 'La fecha final debe ser posterior a la fecha inicial',
    'messages.valueRequired': 'El valor es obligatorio',
    'messages.valueGreaterThanZero': 'El valor debe ser mayor que cero',

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
    'dashboard.paymentStatus': 'Estado de los Pagos (Mes Actual)',
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
    'layout.language': 'Idioma',
    'layout.parameters': 'Parámetros',
    'layout.search': 'Buscar',
    'layout.searchPlaceholder': 'Buscar...',
    'layout.openMenu': 'Abrir menú lateral',
    'layout.closeMenu': 'Cerrar menú',
    'layout.folderCadastros': 'Registros',
    'layout.folderFinanceiro': 'Financiero',
    'layout.folderLogs': 'Logs',
    'layout.logoutSuccess': 'Cerrado de sesión exitoso',

    // Logs
    'logs.usuarios': 'Registros de Usuarios',
    'logs.agendaTarefas': 'Registros de Agenda de Tareas',
    'logs.webhook': 'Registros de Webhook',
    'logs.email': 'Registros de Email',
    'logs.whatsapp': 'Registros de WhatsApp',
    'logs.assinaturaDigital': 'Registros de Firma Digital',
    'logs.acessoSistema': 'Registros de Acceso al Sistema',
    'logs.comingSoon': 'Funcionalidad en desarrollo.',
    'layout.closeSearch': 'Cerrar búsqueda',

    // Menu Items
    'menu.clients': 'Clientes',
    'menu.plans': 'Planes',
    'menu.banks': 'Bancos',
    'menu.billingType': 'Tipo de Cobro',
    'menu.contracts': 'Contratos',
    'menu.financial': 'Financiero',
    'menu.accountsReceivable': 'Cuentas por Cobrar',
    'menu.suppliers': 'Proveedores',
    'menu.accountsPayable': 'Cuentas por Pagar',
    'menu.invoices': 'Facturas',
    'menu.companyData': 'Datos de la Empresa',
    'menu.whatsappHistory': 'Historial WhatsApp',
    'menu.emailHistory': 'Historial Email',

    // Modal Titles
    'modal.clients': 'Clientes',
    'modal.clientsTenants': 'Clientes Tenants',
    'modal.plans': 'Planes',
    'modal.banks': 'Bancos',
    'modal.billingType': 'Tipo de Cobro',
    'modal.contracts': 'Contratos',
    'modal.accountsReceivable': 'Cuentas por Cobrar',
    'modal.suppliers': 'Proveedores',
    'modal.accountsPayable': 'Cuentas por Pagar',
    'modal.invoices': 'Facturas',
    'modal.companyData': 'Datos de la Empresa',
    'modal.users': 'Usuarios',
    'modal.systemResources': 'Recursos del Sistema',
    'modal.emailServer': 'Servidor de Correo',
    'modal.whatsappServer': 'Servidor de WhatsApp',
    'modal.nfse': 'NFS-e',
    'modal.dueDays': 'Días de Vencimiento',
    'modal.updates': 'Actualizaciones',
    'modal.taskScheduler': 'Programador de Tareas',
    'modal.backups': 'Copia de Seguridad/Restaurar',
    'modal.digitalSignature': 'Firma Digital',
    'modal.auditLogs': 'Registros de Auditoría',
    'modal.systemDocuments': 'Plantillas de Documentos',
    'modal.whatsappHistory': 'Historial de Mensajes WhatsApp',
    'modal.domains': 'Dominios',
    'modal.ipv4': 'IPv4',
    'modal.ipv6': 'IPv6',
    'modal.emailHistory': 'Historial de Mensajes Email',
    'modal.importList': 'Importar lista',

    // Blockdomi
    'blockdomi.menuTitle': 'Blockdomi',
    'blockdomi.titleImport': 'Importar lista - Blockdomi',
    'blockdomi.domain': 'Dominio',
    'blockdomi.domains': 'Dominios',
    'blockdomi.versao': 'Versión',
    'blockdomi.gerarVersao': 'Generar versión',
    'blockdomi.tipoLista': 'Lista',
    'blockdomi.versaoGerada': 'generada con éxito',
    'blockdomi.selectDomain': 'Seleccionar Dominio',
    'blockdomi.nomeOficio': 'Nombre del oficio',
    'blockdomi.nomeOficioOptional': 'Nombre del oficio (opcional)',
    'blockdomi.dataInicioBloqueio': 'Fecha inicio bloqueo',
    'blockdomi.dataFimBloqueio': 'Fecha fin bloqueo',
    'blockdomi.dataFimBloqueioOptional': 'Fecha fin bloqueo (opcional)',
    'blockdomi.oficioAnatel': 'Oficio Anatel',
    'blockdomi.oficioJustica': 'Decisión judicial',
    'blockdomi.linkOficioAnatel': 'Enlace oficio Anatel',
    'blockdomi.linkOficioJustica': 'Enlace decisión judicial',
    'blockdomi.linkPlanilhaDominios': 'Enlace planilla dominios',
    'blockdomi.linkPlanilhaDominiosOptional': 'Enlace planilla dominios (opcional)',
    'blockdomi.planilhaDominios': 'Planilla dominios',
    'blockdomi.linkOficioAnatelOptional': 'Enlace oficio Anatel (opcional)',
    'blockdomi.linkOficioJusticaOptional': 'Enlace decisión judicial (opcional)',
    'blockdomi.anatel': 'Anatel',
    'blockdomi.justica': 'Decisión judicial',
    'blockdomi.bulkEditDomains': 'Editar {count} dominio(s)',
    'blockdomi.bulkEditIntro': 'Los valores siguientes se aplicarán a los {count} dominio(s) seleccionado(s).',
    'blockdomi.bulkEditSuccess': '{count} dominio(s) actualizado(s) correctamente.',
    'blockdomi.createDomain': 'Crear Dominio',
    'blockdomi.editDomain': 'Editar Dominio',
    'blockdomi.deleteDomain': 'Eliminar Dominio',
    'blockdomi.createIPv4': 'Crear IPv4',
    'blockdomi.editIPv4': 'Editar IPv4',
    'blockdomi.deleteIPv4': 'Eliminar IPv4',
    'blockdomi.selectIPv4': 'Seleccionar IPv4',
    'blockdomi.createIPv6': 'Crear IPv6',
    'blockdomi.editIPv6': 'Editar IPv6',
    'blockdomi.deleteIPv6': 'Eliminar IPv6',
    'blockdomi.selectIPv6': 'Seleccionar IPv6',
    'blockdomi.importIntro': 'Pegue una lista (un elemento por línea). Se clasificarán en: dominios, IPv4, IPv6, ya registrados en el sistema e inválidos. Al registrar, los elementos ya existentes en el sistema serán ignorados.',
    'blockdomi.placeholderDomain': 'ejemplo.com o acortador.com/abc123',
    'blockdomi.helpDomain': 'Dominio sin protocolo (ej: ejemplo.com o acortador.com/abc123). Sin https://, http:// o www. al inicio.',
    'blockdomi.placeholderOficio': 'ej: Oficio nº 01/2026/ORG/SECTOR/SIGLA',
    'blockdomi.analyze': 'Analizar',
    'blockdomi.register': 'Registrar',
    'blockdomi.classifying': 'Clasificando...',
    'blockdomi.paste': 'Pegar',
    'blockdomi.domainsDetected': 'elementos detectados',
    'blockdomi.previewExtracted': 'Vista previa extraída',
    'blockdomi.inputListLabel': 'Lista de entrada',
    'blockdomi.separateLinksHelp': 'Separe múltiplos enlaces con coma',
    'blockdomi.orUploadPdf': 'o subir archivo PDF',
    'blockdomi.chooseFile': 'Elegir archivo',
    'blockdomi.pasteListHint': 'Pegar dominios o IPs (uno por línea)',
    'blockdomi.importFromPdf': 'Importar desde PDF',
    'blockdomi.importFromPdfIntro': 'Sube un PDF (oficio con tabla anexa) o ingresa la URL del PDF. Solo se extraerán los dominios e IPs de la tabla.',
    'blockdomi.pdfFile': 'Archivo PDF',
    'blockdomi.pdfUrl': 'O URL del PDF',
    'blockdomi.extractDomainsFromPdf': 'Extraer dominios',
    'blockdomi.extractingPdf': 'Extrayendo texto del PDF...',
    'blockdomi.extractFromPlanilhaUrl': 'Extraer de URL de planilla',
    'blockdomi.extractFromPlanilhaPdf': 'Extraer dominios del PDF de la planilla',
    'blockdomi.extractFromPlanilhaUrlHelp': 'Use el enlace de la planilla para extraer dominios sin subir archivo.',
    'blockdomi.pdfUrlOrLinkRequired': 'Ingrese el enlace de la planilla o seleccione un archivo PDF.',
    'blockdomi.pdfUrlPlaceholder': 'https://...',
    'blockdomi.pdfExtractSuccess': 'Dominios extraídos del PDF. Haga clic en Analizar.',
    'blockdomi.pdfExtractError': 'No se encontraron dominios ni IPs en el PDF.',
    'blockdomi.titleVisualizacaoExtrados': 'Dominios extraídos - Visualización',
    'blockdomi.raw': 'Bruto',
    'blockdomi.filtered': 'Filtrados',
    'blockdomi.valid': 'Válidos',
    'blockdomi.copiedToClipboard': 'Copiado.',
    'blockdomi.copyFailed': 'No se pudo copiar.',
    'blockdomi.duplicates': 'Duplicados',
    'blockdomi.invalid': 'Inválidos',
    'blockdomi.alreadyRegistered': 'Ya registrados',
    'blockdomi.alreadyRegisteredIgnored': 'Ya registrados (ignorados)',
    'blockdomi.none': 'Ninguno',
    'blockdomi.verListasTxt': 'Ver listas en TXT',
    'blockdomi.domainRequired': 'El dominio es obligatorio',
    'blockdomi.domainInvalidFormat': 'Use el dominio sin protocolo (ej: ejemplo.com o acortador.com/abc123). No use https://, http:// o www. al inicio.',
    'blockdomi.ipRequired': 'La IP es obligatoria',
    'blockdomi.ipv4InvalidFormat': 'Introduzca un IPv4 válido con 4 octetos (ej: 192.168.1.1). No use puntos al final.',
    'blockdomi.ipv6InvalidFormat': 'Introduzca un IPv6 válido (8 grupos hex separados por :). Ej: 2001:db8::1. Puede usar :: una vez para comprimir ceros.',
    'blockdomi.ipsPermitidos': 'IPs permitidos',
    'blockdomi.ipsPermitidosNew': 'Nuevo',
    'blockdomi.createIpsPermitidos': 'Registrar IPs permitidos',
    'blockdomi.editIpsPermitidos': 'Editar IPs permitidos',
    'blockdomi.deleteIpsPermitidos': 'Eliminar IPs permitidos',
    'blockdomi.faixaIps': 'Rango de IPs',
    'blockdomi.faixaIpsHelp': 'Separe múltiples IPs o rangos con ; (ej: 192.168.1.1; 10.0.0.0/24)',
    'blockdomi.ipsPermitidosRequired': 'Ingrese al menos una IP o rango',
    'blockdomi.clienteRequired': 'Seleccione el cliente',
    'blockdomi.selectCliente': 'Seleccionar cliente',
    'blockdomi.noIpsPermitidos': 'Ningún registro encontrado',
    'blockdomi.cliente': 'Cliente',
    'blockdomi.logsAcesso': 'Logs de acceso API',
    'blockdomi.logsIp': 'IP',
    'blockdomi.logsRota': 'Ruta',
    'blockdomi.logsMetodo': 'Método',
    'blockdomi.logsStatus': 'Estado',
    'blockdomi.logsSucesso': 'Éxito',
    'blockdomi.logsSucessoOk': 'Sí',
    'blockdomi.logsSucessoErro': 'Error',
    'blockdomi.logsMensagemErro': 'Mensaje de error',
    'blockdomi.logsSearchPlaceholder': 'Buscar por IP, ruta...',
    'blockdomi.logsEmpty': 'Ningún log encontrado',
    'blockdomi.logsReal': 'Logs en tiempo real',
    'blockdomi.whois': 'Whois',
    'blockdomi.whoisOrganizacao': 'Organización',
    'blockdomi.whoisBloco': 'Bloque de IP',
    'blockdomi.whoisCidr': 'CIDR',
    'blockdomi.whoisNetname': 'Netname',
    'blockdomi.whoisPais': 'País',
    'blockdomi.whoisAsn': 'ASN',
    'blockdomi.whoisNenhumDado': 'No se encontraron datos para esta IP.',
    'blockdomi.whoisInfo': 'Información',
    'blockdomi.whoisBlocos': 'Bloques',
    'blockdomi.whoisContato': 'Contacto',

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
    'params.manageBackups': 'Gestionar Copias de Seguridad',
    'params.validations': 'Validaciones',
    'backup.title': 'Copia de Seguridad/Restaurar',
    'backup.executeManual': 'Copia Manual',
    'backup.manualDatabase': 'Base de Datos',
    'backup.manualFiles': 'Archivos',
    'backup.manualLogs': 'Logs',
    'backup.manualFull': 'Completo (BD + Archivos + Logs)',
    'backup.confirmDelete': '¿Está seguro de que desea eliminar la copia "{{nome}}" del servidor?',
    'backup.confirmRestoreCritical': 'Confirmación crítica: Restaurar esta copia puede sobrescribir datos actuales. ¿Continuar?',
    'backup.deleted': 'Copia eliminada.',
    'backup.downloadStarted': 'Descarga iniciada.',
    'backup.restoreRequested': 'Restauración solicitada.',
    'backup.manualQueued': 'Copia manual en cola.',
    'backup.loadingList': 'Cargando lista de copias...',
    'backup.empty': 'Ninguna copia encontrada.',
    'backup.columnName': 'Nombre del Archivo',
    'backup.columnSize': 'Tamaño',
    'backup.columnDate': 'Fecha',
    'backup.columnType': 'Tipo',
    'backup.restore': 'Restaurar',
    'backup.import': 'Importar',
    'backup.imported': 'Copia de seguridad importada con éxito.',
    'params.validateCpfCnpj': 'Validar CNPJ',
    'params.validateCpfCnpjHelp': 'Cuando está activado, valida si CNPJ es válido al crear/editar clientes',
    'params.validateCep': 'Validar CEP',
    'params.validateCepHelp': 'Cuando está activado, busca automáticamente los datos de la dirección al escribir un CEP válido',
    'params.titleGeneration': 'Generación de Títulos',
    'params.titlesDueSaturday': 'Títulos que Vencen los Sábados',
    'params.titlesDueSaturdayHelp': 'Si la fecha de vencimiento cae en sábado, mantiene en sábado. Si está desactivado, mueve al próximo día hábil',
    'params.titlesDueSunday': 'Títulos que Vencen los Domingos',
    'params.titlesDueSundayHelp': 'Si la fecha de vencimiento cae en domingo, mantiene en domingo. Si está desactivado, mueve al próximo día hábil',
    'params.subscriberCenter': 'Central del Suscriptor',
    'params.loginMethod': 'Método de Inicio de Sesión',
    'params.loginMethodHelp': 'Define si el inicio de sesión en la central del suscriptor se hará por CNPJ o Email',
    'params.successUpdate': '¡Parámetros actualizados con éxito!',
    'params.errorUpdate': 'Error al actualizar parámetros',

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
    'ui.actionsMenu': 'Menú de acciones',
    'ui.firstPage': 'Primera página',
    'ui.previousPage': 'Página anterior',
    'ui.nextPage': 'Próxima página',
    'ui.lastPage': 'Última página',
    'ui.page': 'Página',
    'ui.refresh': 'Actualizar',
    'ui.auditSelected': 'Auditar registro seleccionado',
    'ui.selectOneToAudit': 'Seleccione exactamente 1 registro para auditar',
    'ui.selectAllPages': 'Seleccionar todos (todas las páginas)',
    'ui.loadingApplication': 'Cargando aplicación...',
    'ui.loadingDashboard': 'Cargando panel...',
    'ui.loadingLogin': 'Cargando inicio de sesión...',
    'ui.loadingPayment': 'Cargando página de pago...',
    'ui.loadingPage': 'Cargando página de inicio...',
    'ui.loadingSubscriberCenter': 'Cargando central del suscriptor...',
    'ui.appError': 'Error en la aplicación',
    'ui.criticalError': 'Ocurrió un error crítico. Por favor, recargue la página.',
    'ui.reloadPage': 'Recargar página',
    'ui.serverUnavailable': 'Servidor no disponible en este momento. Por favor, recargue. Si persiste, contacte con soporte.',
    'ui.loading': 'Cargando...',

    // Company Labels
    'company.title': 'Empresa',
    'company.razaoSocial': 'Razón Social',
    'company.nomeFantasia': 'Nombre Fantasía',
    'company.cnpj': 'ID Fiscal (CNPJ)',
    'company.inscricaoEstadual': 'Inscripción Estatal',
    'company.inscricaoMunicipal': 'Inscripción Municipal',
    'company.logo': 'Logo de la Empresa',
    'company.noLogo': 'Sin logo',
    'company.acceptedFormats': 'Formatos aceptados: JPG, PNG, GIF (máx. 2MB)',

    // NFSe Labels
    'nfse.title': 'NFS-e',
    'nfse.municipalServiceCode': 'Código de Servicio Municipal',
    'nfse.municipalServiceCodeHelp': 'Código de la lista de servicios del municipio (ej: 1401 para servicios de TI)',
    'nfse.issRate': 'Alícuota de ISS (%)',
    'nfse.issRateHelp': 'Alícuota estándar de ISS para las facturas (0 a 100)',
    'nfse.serviceDescription': 'Descripción del Servicio',
    'nfse.serviceDescriptionHelp': 'Descripción estándar del servicio prestado en las facturas',
    'nfse.nfSerie': 'Serie de la NF',
    'nfse.nfSerieHelp': 'Serie de la NF (permitida: 80000 a 89999)',
    'nfse.dpsNumber': 'Número de DPS',
    'nfse.dpsNumberHelp': 'Número de DPS (Documento de Prestación de Servicios)',
    'nfse.provider': 'Proveedor de NFS-e',
    'nfse.providerHelp': 'Seleccione el proveedor que se utilizará para emitir las facturas',
    'nfse.asaasApiKey': 'API Key de Asaas',
    'nfse.asaasApiKeyHelp': 'Token de la API de Asaas disponible en el panel administrativo (Configuración > Integraciones > API Key)',
    'nfse.useSandbox': 'Usar ambiente Sandbox',
    'nfse.useSandboxHelp': 'Marque para usar el ambiente de pruebas de Asaas',
    'nfse.username': 'Usuario',
    'nfse.password': 'Contraseña',
    'nfse.baseUrl': 'URL Base de la API',
    'nfse.environment': 'Ambiente',
    'nfse.homologation': 'Homologación',
    'nfse.production': 'Producción',
    'nfse.messages.loadingError': 'Error al cargar la configuración',
    'nfse.messages.saveSuccess': '¡Configuraciones de NFS-e guardadas con éxito!',
    'nfse.messages.saveError': 'Error al guardar la configuración',
    'nfse.messages.testSuccessAsaas': '¡Conexión con Asaas probada con éxito! La API Key es válida.',
    'nfse.messages.testSuccessPortal': '¡Autenticación probada con éxito! Las credenciales son correctas.',
    'nfse.messages.testError': 'Error al probar la conexión',
    'nfse.messages.apiKeyRequired': 'La API Key de Asaas é obligatoria para probar la conexión',
    'nfse.messages.credentialsRequired': 'El usuario y la contraseña son obligatorios para probar la autenticación',
    'nfse.messages.providerRequired': 'Seleccione un proveedor para probar la conexión',

    // Title Labels
    'titulo.title': 'Título/Factura',
    'titulo.send': 'Enviar',
    'titulo.sendViaWhatsApp': 'Vía WhatsApp',
    'titulo.sendViaEmail': 'Vía Email',
    'titulo.createTitle': 'Crear Título',
    'titulo.validationErrors': 'Errores de validación:',
    'titulo.clientNotFound': 'Cliente no encontrado',
    'titulo.clientCannotBeChanged': 'El cliente no se puede cambiar',
    'titulo.planoCannotBeChanged': 'El plan no se puede cambiar',
    'titulo.valorCannotBeChanged': 'El valor no se puede cambiar después del registro en el banco emisor',
    'titulo.dataVencimentoCannotBeChanged': 'La fecha de vencimiento no se puede cambiar después del registro en el banco emisor',
    'titulo.discountPercent': 'Descuento (%)',
    'titulo.discountValue': 'Descuento (R$)',
    'titulo.additionPercent': 'Acrecentamiento (%)',
    'titulo.additionValue': 'Acrecentamiento (R$)',
    'titulo.observationsPlaceholder': 'Observaciones sobre la cuota...',
    'titulo.descriptionPlaceholder': 'Descripción del título...',
    'titulo.selectClient': 'Seleccionar Cliente',
    'titulo.selectPlano': 'Seleccionar Plan',
    'titulo.messages.sendSuccess': '¡Mensaje enviado con éxito!',
    'titulo.messages.sendError': 'Error al enviar el mensaje',
    'titulo.messages.whatsappError': 'Error al enviar mensaje vía WhatsApp',

    // Financial
    'financial.title': 'Financiero - Títulos',
    'financial.accountsPayable': 'Cuentas por Pagar',
    'financial.receivables': 'Cuentas por Cobrar',
    'financial.cancelTitles': 'Cancelar títulos',
    'financial.reverseTitle': 'Revertir título',
    'financial.reverse': 'Revertir',
    'financial.confirmReverse': '¿Está seguro de que desea revertir el pago del título ${number}?',
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
    'financial.confirmDeleteTitle': '¿Está seguro de que desea eliminar este título? Solo se pueden eliminar títulos pendientes no registrados en el banco.',
    'financial.confirmDeleteTitles': '¿Está seguro de que desea eliminar ${count} título(s)? Solo se pueden eliminar títulos pendientes no registrados en el banco.',
    'financial.successDeleteTitle': 'Título eliminado correctamente.',
    'financial.successDeleteTitles': '${count} título(s) eliminado(s) correctamente.',
    'financial.errorDeleteTitle': 'No se pudo eliminar 1 título.',
    'financial.errorDeleteTitles': '${count} título(s) no pudieron ser eliminados.',
    'financial.errorDeleteTitlesGeneral': 'Error al eliminar títulos.',
    'financial.receive': 'Recibir',
    'financial.pay': 'Pagar',
    'financial.toReceive': 'A Recibir',
    'financial.toPayLabel': 'A Pagar',
    'financial.value': 'Valor',
    'financial.generateTitles': 'Gerar Financeiro',

    // Buttons
    'buttons.confirmPayment': 'Confirmar Pago',
    'buttons.confirmCancellation': 'Confirmar Cancelación',
    'buttons.canceling': 'Cancelando...',
    'buttons.save': 'Guardar',
    'buttons.cancel': 'Cancelar',
    'buttons.close': 'Cerrar',
    'buttons.create': 'Crear',
    'buttons.edit': 'Editar',
    'buttons.delete': 'Eliminar',
    'buttons.print': 'Imprimir',
    'buttons.generate': 'Generar',
    'buttons.view': 'Ver',
    'buttons.download': 'Descargar',
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
    'buttons.testConnection': 'Probar Conexión',
    'buttons.generateToken': 'Generar Token',
    'buttons.copy': 'Copiar',
    'buttons.select': 'Seleccionar',
    'buttons.add': 'Agregar',
    'buttons.remove': 'Remover',

    // Form Labels
    'form.name': 'Nombre',
    'form.role': 'Cargo',
    'form.clientId': 'ID de Cliente',
    'form.clientIdProd': 'ID de Cliente Producción',
    'form.clientSecret': 'Secreto de Cliente',
    'form.clientSecretProd': 'Secreto de Cliente Producción',
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
    'form.cell': 'Celular',
    'form.site': 'Sitio',
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
    'form.bankNameHelp': 'Nombre para identificar esta cuenta bancaria',
    'form.bankTypeHelp': 'El código del banco se define automáticamente',
    'form.optionalUpdate': 'Campo opcional. Complete solo si desea actualizar.',
    'form.webhookUrl': 'URL de Retorno (Webhook)',
    'form.webhookUrlHelp': 'URL para recibir notificaciones de pago',
    'form.sandboxHelp': 'Activar para usar el entorno de prueba. Desactivar para producción.',
    'form.apiKey': 'API Key',
    'form.apiKeyAsaasHelp': 'Disponible en el panel administrativo de Asaas.',
    'form.webhookSecret': 'Webhook Secret',
    'form.webhookSecretAsaasHelp': 'Utilice este token al configurar el webhook de Asaas.',
    'form.generateWebhookSecretHelp': 'Haga clic en "Generar token" después de guardar el banco para obtener el secreto del webhook.',
    'form.finePercent': 'Porcentaje de Multa (%)',
    'form.interestPercent': 'Porcentaje de Interés (% por día)',
    'form.includeFee': 'Incluir Tasa en el Boleto',
    'form.accountIdentifier': 'Identificador de la Cuenta',
    'form.accountIdentifierEfiHelp': 'Disponible en la configuración de la API de Efi',
    'form.paymentLocation': 'Lugar de Pago',
    'form.operationNature': 'Naturaleza de la Operación',
    'form.model': 'Modelo',
    'form.type': 'Tipo',
    'form.code': 'Código',
    'form.issueDate': 'Fecha de Emisión',
    'form.totalValue': 'Valor Total',
    'form.servicesValue': 'Valor de los Servicios',
    'form.productsValue': 'Valor de los Productos',
    'form.discountValueInvoice': 'Valor del Descuento',
    'form.issRateShort': 'Alícuota de ISS (%)',
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
    'form.invoiceNumber': 'Número de Factura',
    'form.paymentType': 'Tipo de Pago',
    'form.paymentTypeCash': 'Efectivo',
    'form.paymentTypeBoleto': 'Boleto',
    'form.paymentTypeCard': 'Tarjeta',
    'form.paymentTypeDeposit': 'Depósito',
    'form.paymentTypeDebit': 'Débito',
    'form.paymentTypeTransfer': 'Transferencia',
    'form.paymentTypePix': 'PIX',
    'form.balanceDue': 'Saldo Deudor',
    'form.dueDateStart': 'Vencimiento Inicial',
    'form.dueDateEnd': 'Vencimiento Final',
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
    'form.creationType': 'Tipo de Creación',
    'form.creationTypeUnique': 'Única',
    'form.creationTypeBatch': 'Lote',
    'form.dueDateInitial': 'Fecha de Vencimiento Inicial',
    'form.dueDateFinal': 'Fecha de Vencimiento Final',
    'form.pixKeyType': 'Tipo de Clave PIX',
    'form.pixKey': 'Clave PIX',
    'form.qrCodeCopiaECola': 'Código Copia y Pega',
    'form.barcodeLine': 'Línea Digitável del Boleto',
    'form.discountPercentShort': 'Descuento (%)',
    'form.discountValueShort': 'Descuento (Valor)',
    'form.increasePercentShort': 'Recargo (%)',
    'form.increaseValueShort': 'Recargo (Valor)',
    'form.baixadoValue': 'Valor Pagado',
    'form.totalToPay': 'Valor Total a Pagar',
    'form.justification': 'Justificación',
    'form.justificationCancel': 'Justificación de Cancelación',
    'form.title': 'Título',
    'form.password': 'Contraseña',
    'form.planNamePlaceholder': 'Nombre del plan',
    'form.planDescriptionPlaceholder': 'Descripción del plan',
    'form.monthlyValuePlaceholder': 'Valor mensual',
    'form.usersQuantity': 'Cantidad de Usuarios',
    'form.autoRenewal': 'Renovación Automática',
    'form.planObservationsPlaceholder': 'Observaciones del plan',
    'form.serviceTypeInfrastructure': 'Infraestructura',
    'form.serviceTypeConsulting': 'Consultoría',
    'form.serviceTypeBlockdomi': 'Blockdomi',
    'form.periodicityMonthly': 'Mensual',
    'form.periodicityQuarterly': 'Trimestral',
    'form.periodicitySemiannual': 'Semestral',
    'form.periodicityAnnual': 'Anual',
    'form.periodicityBimonthly': 'Bimestral',
    'form.periodicityBiweekly': 'Quincenal',
    'form.periodicityWeekly': 'Semanal',
    'form.quantityTitles': 'Cantidad de títulos',
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
    'table.personTypeShort': 'Tipo',
    'table.personTypeLegalShort': 'Jurídica',
    'table.personTypePhysicalShort': 'Física',
    'table.nameCompanyNameShort': 'Nombre/Razón Social',
    'table.tradeNameShort': 'Nombre Fantasía',
    'table.zipCodeShort': 'Código Postal',
    'table.streetShort': 'Calle',
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
    'table.balanceDue': 'Saldo Deudor',
    'table.createdAt': 'Creado en',
    'table.updatedAt': 'Actualizado en',
    'table.documentNumber': 'Número de Documento',
    'table.supplier': 'Proveedor',
    'table.paymentType': 'Tipo de Pago',
    'table.client': 'Cliente',
    'table.clientName': 'Cliente',
    'table.cpfCnpj': 'CPF/CNPJ',
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
    'table.country': 'País',
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
    'table.issueDate': 'Fecha de Emisión',
    'table.totalValue': 'Valor Total',
    'table.accessKey': 'Clave de Acceso',
    'table.protocol': 'Protocolo',
    'table.authorizationDate': 'Fecha de Autorización',
    'table.chargeId': 'ID de la Cobranza',
    'table.ourNumber': 'Nuestro Número',
    'table.paidValueDownloaded': 'Valor pagado',
    'table.openValueOpen': 'Valor abierto',
    'table.nf': 'NF',
    'table.nfStatus': 'Estado NF',
    'table.termName': 'Nombre del Término',
    'table.accepted': 'Firmado',
    'table.acceptedDate': 'Fecha Aceptación',
    'table.acceptedBy': 'Aceptado Por',
    'table.observations': 'Observaciones',
    'table.action': 'Acción',
    'table.name': 'Nombre',
    'table.bank': 'Banco',
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
    'modal.payAccountManually': 'Pagar Cuenta Manualmente',
    'modal.viewInvoice': 'Visualizar Nota Fiscal',
    'modal.createClient': 'Cliente',
    'modal.editClient': 'Cliente',
    'modal.createPlan': 'Plan',
    'modal.editPlan': 'Plan',
    'modal.createBank': 'Banco',
    'modal.editBank': 'Banco',
    'modal.createContract': 'Contrato',
    'modal.editContract': 'Contrato',
    'modal.createSupplier': 'Proveedor',
    'modal.editSupplier': 'Proveedor',
    'modal.createAccountPayable': 'Cuenta por Pagar',
    'modal.editAccountPayable': 'Cuenta por Pagar',
    'modal.createTitle': 'Título',
    'modal.editTitle': 'Título',
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
    'modal.editTerm': 'Término',
    'modal.selectTerm': 'Seleccionar Término',
    'modal.selectContractModel': 'Seleccionar Modelo de Contrato',
    'modal.sendSignature': 'Enviar Firma',
    'modal.additionalService': 'Servicio Adicional',
    'modal.list': 'Lista',
    'modal.defaultDocument': 'Documento Predeterminado',
    'modal.deleteFiles': 'Eliminar archivos',
    'modal.deleteAdditionalServices': 'Eliminar servicios adicionales',
    'modal.scheduledRoutine': 'Rutina Programada',

    // Tabs
    'tabs.basicData': 'Datos Básicos',
    'tabs.contact': 'Contacto',
    'tabs.address': 'Dirección',
    'tabs.contracts': 'Contratos',
    'tabs.financial': 'Financiero',
    'tabs.faturasAbertas': 'Facturas abiertas',
    'tabs.faturasPagas': 'Facturas pagadas',
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
    'status.processing': 'Procesando',
    'status.authorized': 'Autorizada',
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
    'status.blocked': 'Bloqueado',
    'status.inArrears': 'En mora',
    'status.suspended': 'Suspendido',
    'status.exempt': 'Exentos',
    'status.overdue': 'Vencido',
    'status.paidLate': 'Pagado con Retraso',

    'saas.manualUnblock': 'Desbloquear manualmente',
    'saas.confirmManualUnblock': '¿Desbloquear empresa manualmente? Tendrá el plazo configurado para regularizar los títulos.',
    'saas.dataNaoBloquearAte': 'Fecha de no bloquear hasta',

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
    'placeholder.bankName': 'Nombre del banco',
    'placeholder.bankDescription': 'Descripción del banco...',
    'placeholder.fillClientSecret': 'Complete solo para actualizar el secreto del cliente',
    'placeholder.webhookUrl': 'URL para el retorno del webhook',
    'placeholder.apiKeyAsaas': 'Su clave API de Asaas',
    'placeholder.webhookSecretHelp': 'Haga clic en Generar token para crear un secreto',
    'placeholder.accountIdentifierHelp': 'Disponible en el menú de configuración de la API',
    'placeholder.paymentLocationDefault': 'Pagadero en cualquier banco hasta la fecha de vencimiento',
    'placeholder.contractCreationHelp': 'Cree el contrato primero para gestionar los términos.',
    'placeholder.financialTitlesCreationHelp': 'Cree el contrato primero para gestionar los títulos financieros.',
    'placeholder.financialMiscCreationHelp': 'Cree el contrato primero para gestionar los títulos diversos.',
    'placeholder.additionalServicesCreationHelp': 'Cree el contrato primero para gestionar los servicios adicionales.',
    'placeholder.selectProvider': 'Seleccionar proveedor',
    'placeholder.startDate': 'Fecha inicial',
    'placeholder.endDate': 'Fecha final',
    'placeholder.selectType': 'Seleccionar tipo',
    'placeholder.searchServices': 'Buscar servicios...',
    'placeholder.enterJustification': 'Ingrese la justificación para cancelar la nota fiscal (mínimo 15 caracteres)...',
    'placeholder.enterSupplierId': 'Ingrese el ID del proveedor',
    'placeholder.enterPixKey': 'Ingrese la clave PIX',
    'placeholder.enterCpfCnpj': 'Ingrese el CPF o CNPJ',
    'placeholder.enterCellPhone': 'Ingrese el celular',
    'placeholder.enterEmail': 'Ingrese el e-mail',
    'placeholder.enterName': 'Ingrese el nombre',
    'placeholder.enterRandomKey': 'Ingrese la clave aleatoria (UUID)',
    'placeholder.pasteQrCode': 'Pegue el código copia y pega de PIX',

    // Filter Labels
    'filter.startDate': 'Fecha Inicial:',
    'filter.endDate': 'Fecha Final:',

    // Document Labels
    'document.title': 'Título:',
    'document.viewDocument': 'Ver Documento',
    'document.print': 'Imprimir',
    'document.modelContrato': 'Modelo Contrato',
    'document.termAdesao': 'Término de Adhesión',
    'document.permanencia': 'Contrato de Permanencia',
    'document.receipts': 'Recibos',
    'document.cartaCobranca': 'Carta de Cobro',
    'document.name': 'Nombre',
    'document.description': 'Descripción',
    'document.testClient': 'Cliente para Prueba',
    'document.testClientHelp': 'Seleccione un cliente para ver el documento con datos reales',
    'document.idPlaceholder': 'Ingrese el ID del cliente',
    'document.content': 'Contenido',
    'document.contractContent': 'Contenido del Contrato',
    'document.successCreate': 'Documento creado con éxito',
    'document.successUpdate': 'Documento guardado con éxito',
    'document.errorCreate': 'Error al crear documento',
    'document.errorUpdate': 'Error al guardar documento',
    'document.errorGeneratePdf': 'Error al generar PDF',
    'document.labels.recibo': 'Recibo',
    'document.labels.carta_cobranca': 'Carta de Cobro',
    'document.labels.termo': 'Término',
    'document.labels.documento': 'Documento',

    // Other
    'other.selectExactlyOne': 'Seleccione exactamente 1 registro para auditar',
    'other.auditSelectedRecord': 'Auditar registro seleccionado',
    'other.resizeColumn': 'Redimensionar columna',
    'other.reloadData': 'Recargar datos',
    'other.confirmAction': 'Confirmar acción',
    'other.selectAtLeastOne': 'Seleccione al menos un título',
    'other.characters': 'caracteres',
    'other.invoiceDetails': 'Detalles de la Nota Fiscal:',
    'other.selected': 'Seleccionados',
    'other.open': 'Abiertos',
    'other.all': 'Todos',
    'other.receipt': 'Recibo',
    'other.printNF': 'Imprimir Factura',
    'other.generateNFSeStandalone': 'Generar NFS-e Independiente',
    'other.termRegistered': 'Término Registrado',
    'other.viaWhatsApp': 'Vía WhatsApp',
    'other.viaEmail': 'Vía Email',
    'other.newMiscTitle': 'Nuevo Título Varios',
    'other.deleteTerms': 'Eliminar términos',
    'other.day': 'Día',

    // Financial Summary Labels
    'summary.value': 'Valor:',
    'summary.paidValue': 'Valor pagado:',
    'summary.openValue': 'Valor abierto:',
    'summary.canceledValue': 'Valor cancelado:',
    'summary.totalPaidValue': 'Valor total pagado:',
    'summary.monthlyTotalValue': 'Valor Total Mensual:',
    'summary.totalDiscountsValue': 'Valor Total Descuentos:',
    'summary.contractSummary': 'Resumen de contratos',
    'summary.totalContracts': 'Total de contratos:',
    'summary.activeContracts': 'Contratos activos:',

    // Audit
    'audit.title': 'Logs de Auditoría',
    'audit.detailsTitle': 'Detalles del Log de Auditoría',
    'audit.generalInfo': 'Información General',
    'audit.data': 'Datos',
    'audit.entityId': 'ID de la Entidad',
    'audit.user': 'Usuario',
    'audit.ip': 'IP',
    'audit.tenant': 'Tenant',
    'audit.route': 'Ruta',
    'audit.userAgent': 'User-Agent',
    'audit.viewDetails': 'Ver Detalles',
    'audit.method': 'Método',
    'audit.entity': 'Entidad',
    'audit.timestamp': 'Fecha/Hora',
    'audit.entities.all': 'Todas',
    'audit.actions.all': 'Todas',
    'audit.actions.create': 'Crear',
    'audit.actions.update': 'Actualizar',
    'audit.actions.delete': 'Eliminar',
    'audit.actions.login': 'Login',
    'audit.actions.logout': 'Logout',
    'audit.actions.export': 'Exportar',
    'audit.actions.import': 'Importar',
    'audit.actions.executar': 'Ejecutar',

    // Variables
    'variables.title': 'Variables Disponibles',
    'variables.searchPlaceholder': 'Buscar variable...',
    'variables.insert': 'Insertar Variables',
    'variables.errorLoading': 'Error al cargar variables',
    'variables.tip': 'Sugerencia: Las variables se reemplazarán por valores reales al generar el documento.',
    'variables.clickToInsert': 'Haga clic en una variable para insertar',
    'variables.clickToCopy': 'Haga clic en una variable para copiar',

    // User Form
    'user.title': 'Usuario',
    'user.profile': 'Perfil',
    'user.admin': 'Administrador',
    'user.user': 'Usuario',
    'user.newPassword': 'Nueva Contraseña (dejar en blanco para mantener)',
    'user.passwordPlaceholder': 'Mínimo 6 caracteres',
    'user.newPasswordPlaceholder': 'Dejar en blanco para mantener la contraseña actual',
    'user.webhookHelp': 'Use como Bearer en la API (clientes, contratos, títulos, datos empresa).',
    'user.generateWebhookHelp': 'Haga clic en "Generar token" para obtener el token de API.',
    'user.webhookSecret': 'Token de API',
    'user.generateToken': 'Generar Token',
    'user.copy': 'Copiar',
    'user.variables': 'Variables',
    'user.successCreate': '¡Usuario creado con éxito!',
    'user.successUpdate': '¡Usuario actualizado con éxito!',
    'user.successGenerateSecret': '¡Secreto de webhook generado con éxito!',
    'user.successCopySecret': '¡Secreto de webhook copiado!',
    'user.errorCreate': 'Error al crear usuario',
    'user.errorUpdate': 'Error al actualizar usuario',

    // Email Server
    'emailServer.title': 'Servidor de Correo Electrónico',
    'emailServer.serverSettings': 'Configuración del Servidor',
    'emailServer.configureServer': 'Configurar Servidor de Correo Electrónico',
    'emailServer.smtpHost': 'Host SMTP',
    'emailServer.port': 'Puerto',
    'emailServer.userEmail': 'Usuario/Correo Electrónico',
    'emailServer.senderName': 'Nombre del Remitente',
    'emailServer.senderEmail': 'Correo Electrónico del Remitente',
    'emailServer.useSsl': 'Usar SSL',
    'emailServer.useTls': 'Usar TLS',
    'emailServer.timeout': 'Timeout (ms)',
    'emailServer.sendTestEmail': 'Enviar Correo Electrónico de Prueba',
    'emailServer.testEmailPlaceholder': 'Ingrese el correo para la prueba',
    'emailServer.testEmailButton': 'Enviar Prueba',
    'emailServer.testEmailHelp': 'Ingrese um correo válido para probar el envío a través de este servidor',
    'emailServer.passwordHelp': 'Dejar en blanco para mantener la contraseña actual',
    'emailServer.passwordPlaceholder': 'Ingrese la contraseña del correo',

    // WhatsApp Server
    'whatsappServer.title': 'Servidor de WhatsApp',
    'whatsappServer.evolutionApi': 'Evolution API',
    'whatsappServer.cloudApi': 'WhatsApp Cloud API',
    'whatsappServer.successSave': '¡Configuraciones del servidor de WhatsApp guardadas con éxito!',
    'whatsappServer.errorSave': 'Error al guardar las configuraciones',
    'whatsappServer.successMessageSave': '¡Mensaje guardado con éxito!',
    'whatsappServer.errorMessageSave': 'Error al guardar el mensaje',
    'whatsappServer.successRemove': '¡Servidor eliminado con éxito!',
    'whatsappServer.errorRemove': 'Error al eliminar el servidor',
    'whatsappServer.testPhoneRequired': 'Por favor, ingrese un número de teléfono para la prueba',
    'whatsappServer.testMessageRequired': 'Por favor, ingrese un mensaje para la prueba',
    'whatsappServer.configureFirst': 'Configure el servidor primero antes de enviar el mensaje de prueba',
    'whatsappServer.errorSendTest': 'No se pudo enviar el mensaje de prueba. Verifique la configuración del servidor e intente nuevamente.',
    'whatsappServer.selectMessageType': 'Seleccione un tipo de mensaje',
    'whatsappServer.messageRequired': 'El mensaje predeterminado es obligatorio',
    'whatsappServer.removeServer': 'Eliminar Servidor',
    'whatsappServer.variableCopied': '¡Variable copiada!',
    'whatsappServer.server': 'Servidor',
    'whatsappServer.messages': 'Mensajes',
    'whatsappServer.templatesMeta': 'Plantillas Meta',
    'whatsappServer.templates': 'Plantillas',

    // Scheduler
    'scheduler.title': 'Programador de Tareas',
    'scheduler.frequency': 'Frecuencia',
    'scheduler.schedule': 'Horario',
    'scheduler.nextRun': 'Próxima Ejecución',
    'scheduler.lastRun': 'Última Ejecución',
    'scheduler.executions': 'Ejecuciones',
    'scheduler.errors': 'Errores',
    'scheduler.confirmExecute': '¿Desea ejecutar la rutina ahora?',
    'scheduler.executeRoutine': 'Ejecutar rutina',
    'scheduler.execute': 'Ejecutar',
    'scheduler.routineStarted': 'Rutina iniciada en segundo plano',
    'scheduler.confirmDelete': '¿Está seguro de que deseja eliminar esta rutina?',
    'scheduler.deleteRoutine': 'Eliminar rutina',
    'scheduler.successDelete': 'Rutina eliminada con éxito',
    'scheduler.deactivate': 'Desactivar',
    'scheduler.type': 'Tipo',
    'scheduler.routine': 'Rutina',

    // Updates
    'updates.title': 'Actualizaciones del Sistema',
    'updates.currentVersion': 'Versión Actual',
    'updates.searching': 'Buscando actualizaciones...',
    'updates.errorSearch': 'Error al buscar actualizaciones',
    'updates.noUpdates': 'Ninguna actualización disponible',
    'updates.systemUpdated': 'El sistema está actualizado con la versión más reciente.',
    'updates.updating': 'Actualizando sistema...',
    'updates.success': '¡Actualización completada con éxito! La aplicación se reiniciará pronto.',
    'updates.error': 'Error al ejecutar la actualización',
    'updates.confirmUpdate': '¿Está seguro de que deseja actualizar el sistema? Esta acción:\n\n1. Descargará los últimos cambios del repositorio\n2. Actualizará las dependencias\n3. Compilará el código\n4. Ejecutará las migraciones de la base de datos\n5. Reiniciará la aplicación\n\nEl proceso puede tardar unos minutos.',
    'updates.updateSystem': 'Actualizar Sistema',
    'updates.badges.new': 'Nueva',
    'updates.badges.bugfix': 'Corrección',
    'updates.badges.security': 'Seguridad',
    'updates.badges.improvement': 'Mejora',
    'updates.badges.other': 'Otro',
    'updates.concluded': '¡Actualización concluida!',
    'updates.waitingServer': 'Esperando a que el servidor esté listo...',
    'updates.restartInSeconds': 'Esperando reinicio del servidor (${n}s)...',
    'updates.reloadingPage': 'Recargando página...',

    // Login
    'login.title': 'Acceda al panel administrativo',
    'login.emailPlaceholder': 'su@correo.com',
    'login.passwordPlaceholder': 'Su contraseña',
    'login.entering': 'Entrando...',
    'login.enter': 'Entrar',
    'login.success': 'Autenticación realizada con éxito.',
    'login.errorCredentials': 'No se pudo autenticar. Verifique sus credenciales.',
    'login.errorToken': 'Error al guardar el token de autenticación. Inténtelo de nuevo.',
    'login.errorGeneral': 'Error al autenticar. Inténtelo de nuevo.',
    'login.infoRequired': 'Ingrese el correo y la contraseña para continuar.',
    'login.allRightsReserved': 'Todos los derechos reservados.',
    'login.copyIp': 'Haga clic para copiar',
    'login.ipCopied': '¡IP copiado!',
    'empty.noContracts': 'Este cliente aún no tiene contratos registrados.',
    'empty.noTitles': 'Este cliente aún no tiene títulos registrados.',
    'empty.noFiles': 'No se encontraron archivos',
    'empty.noTermsRegistered': 'Este contrato aún no tiene términos registrados.',
    'empty.noAdditionalServices': 'Este contrato aún no tiene servicios adicionales registrados.',
    'filter.showInactive': 'Mostrar inactivos',
    'filter.showCanceled': 'Mostrar cancelados',
    'confirm.deleteFiles': '¿Estás seguro de que deseas eliminar ${count} archivo(s)?',
    'confirm.deleteFilesTitle': 'Eliminar archivos',
    'messages.saveClientFirst': 'Guarde al cliente primero para agregar archivos.',
    'messages.saveBankBeforeTest': 'Guarde el banco antes de probar la conexión',
    'messages.testingConnection': 'Probando conexión...',
    'messages.connectionSuccess': '¡Conexión probada con éxito!',
    'messages.connectionFailed': 'Falló la prueba de conexión',
    'messages.credentialsNotConfiguredAsaas': 'Credenciales no configuradas. Ingrese la API Key de Asaas antes de probar.',
    'messages.credentialsNotConfiguredEfi': 'Credenciales no configuradas. Complete el Client ID y Client Secret antes de probar.',
    'messages.saveBankBeforeWebhook': 'Guarde el banco antes de generar el token del webhook',
    'messages.webhookTokenGenerated': '¡Token del webhook generado con éxito!',
    'messages.webhookTokenNotReturned': 'El servidor no devolvió el token. Inténtalo de nuevo.',
    'messages.noTokenToCopy': 'No hay ningún token disponible para copiar.',
    'messages.webhookTokenCopied': '¡Token del webhook copiado al portapapeles!',
    'messages.copyManual': 'No se pudo copiar automáticamente. Copie manualmente.',
    'messages.loadingClientData': 'Cargando datos del cliente...',
    'messages.loadingPlanData': 'Cargando datos del plan...',
    'messages.noTitleSelected': 'No se seleccionaron títulos',
    'messages.noPaidTitleSelected': 'No se seleccionaron títulos pagados. Solo los títulos pagados pueden tener recibo.',
    'messages.noTitlesFound': 'No se encontraron títulos',
    'messages.noOpenTitlesFound': 'No se encontraron títulos abiertos',
    'messages.noPaidTitlesFound': 'No se encontraron facturas pagadas',
    'messages.noNFSeTitlesSelected': 'Ninguno de los títulos seleccionados tiene una NFS-e emitida',
    'messages.receiptsGenerated': '¡${count} recibo(s) generado(s) con éxito!',
    'messages.errorGeneratingReceipts': 'Error al generar recibos',
    'messages.errorGeneratingNFSe': 'Error al generar PDF de la NFS-e',
    'messages.nfseGenerated': '¡NFS-e generada con éxito!',
    'fileType.document': 'Documento',
    'fileType.photo': 'Foto',
    'fileType.signature': 'Firma',
    'fileType.manual': 'Manual',
    'fileType.digitalSignature': 'Firma Digital',
    'fileType.system': 'Sistema',
    'placeholder.street': 'Calle, Avenida...',
    'placeholder.number': '123',
    'placeholder.complement': 'Apto, Sala...',
    'placeholder.neighborhood': 'Nombre del barrio',
    'placeholder.city': 'Nombre de la ciudad',
    'placeholder.state': 'SP',
    'placeholder.email': 'email@empresa.com',
    'form.whatsapp': 'WhatsApp',

    // New Placeholders
    'placeholder.contractContent': 'Ingrese el contenido del modelo de contrato...',
    'placeholder.receiptContent': 'Ingrese el contenido del modelo de recibo...',
    'placeholder.letterContent': 'Ingrese el contenido del modelo de carta de cobro...',
    'placeholder.description': 'Breve descripción',
    'placeholder.manualSend': 'Ingrese el mensaje para envío manual...',
    'placeholder.defaultEmail': 'Ingrese el mensaje predeterminado del correo...',
    'placeholder.defaultMessage': 'Ingrese el mensaje predeterminado que se enviará...',
    'placeholder.firstInteraction': 'Ingrese el primer mensaje de interacción...',
    'placeholder.secondInteraction': 'Ingrese el segundo mensaje de interacción...',
    'placeholder.thirdInteraction': 'Ingrese el tercer mensaje de interacción...',
    'placeholder.clientIdProd': 'Client ID para producción',
    'placeholder.serviceCode': 'Ej: 1401',
    'placeholder.serviceDescription': 'Ej: Prestación de servicios de desarrollo de software',
    'placeholder.apiToken': 'Token de la API',
    'placeholder.apiKey': 'Pegue su API Key aquí',
    'placeholder.workspaceId': 'ID del workspace (obtenido en My Account > Workspaces)',
    'placeholder.responsibleName': 'Nombre del responsable',
    'placeholder.responsibleRole': 'Cargo del responsable',
    'placeholder.paymentObservations': 'Observaciones sobre el pago (opcional)',
    'placeholder.testMessage': 'Mensaje de prueba del sistema BackNet',
    'placeholder.termContent': 'Ingrese el contenido del término...',

    // Message Types
    'messages.types.10daysBefore': '10 días antes del vencimiento',
    'messages.types.05daysBefore': '05 días antes del vencimiento',
    'messages.types.sameDay': 'Día del vencimiento',
    'messages.types.05daysAfter': '05 días después del vencimiento',
    'messages.types.10daysAfter': '10 días después del vencimiento',
    'messages.types.15daysAfter': '15 días después del vencimiento',
    'messages.types.clientCut': 'Suspensión del cliente',
    'messages.types.manualSend': 'Envío manual de cobro',
    'messages.types.paymentReceipt': 'Recibo de pago',

    // Send Types
    'messages.sendTypes.disabled': 'Desactivar',
    'messages.sendTypes.pdf': 'Adjuntar PDF',

    // Settings Server
    'settings.server.config': 'Configuraciones del Servidor',
    'settings.server.configure': 'Configurar Servidor',
    'settings.test.title': 'Enviar Mensaje de Prueba',
    'settings.test.phone': 'Número de Teléfono',
    'settings.test.message': 'Mensaje',
    'settings.test.send': 'Enviar Prueba',
    'settings.test.helper': 'Ingrese el número con código de país (ej: 5511999999999)',
    'settings.messages.type': 'Tipo de Mensaje',
    'settings.messages.sendType': 'Tipo de Envío',
    'settings.messages.manualLabel': 'Mensaje para Envío Manual',
    'settings.messages.manualHelper': 'Mensaje usado al enviar título manualmente',
    'settings.messages.emailLabel': 'Mensaje del Correo',
    'settings.messages.templateConfig': 'Configuración de Plantilla - WhatsApp Cloud API',
    'settings.messages.viewTemplates': 'Ver Plantillas Activas',
    'settings.messages.activeTemplatesWhatsApp': 'Plantillas Activas - WhatsApp Cloud API',
    'settings.messages.templateHelper': 'Configure la plantilla y variables para WhatsApp Cloud API. Deje vacío para usar mensaje de texto normal.',
    'settings.messages.templateFormat': 'Formato: JSON con name (nombre de plantilla), language (idioma: en, pt_BR, etc) y variables (array con orden de variables).',
    'settings.messages.defaultMessage': 'Mensaje Predeterminado',
    'settings.messages.interaction1': 'Interacción 01',
    'settings.messages.interaction2': 'Interacción 02',
    'settings.messages.interaction3': 'Interacción 03',
    'settings.messages.interaction1Helper': 'Mensaje opcional para primera interacción',
    'settings.messages.interaction2Helper': 'Mensaje opcional para segunda interacción',
    'settings.messages.interaction3Helper': 'Mensaje opcional para tercera interacción',
    'settings.messages.variablesTitle': 'Variables Disponibles para Mensajes',
    'settings.messages.variablesHelper': 'Haga clic en las variables para insertar en el mensaje',
    'settings.messages.copyVariable': 'Copiar variable',

    // Message History
    'history.whatsappTitle': 'Historial de Mensajes WhatsApp',
    'history.emailTitle': 'Historial de Mensajes Email',
    'history.type': 'Tipo',
    'history.client': 'Cliente',
    'history.phone': 'Teléfono',
    'history.recipient': 'Destinatario',
    'history.subject': 'Asunto',
    'history.message': 'Mensaje',
    'history.status': 'Estado',
    'history.error': 'Error',
    'history.entity': 'Entidad',
    'history.user': 'Usuario',
    'history.dateTime': 'Fecha/Hora',
    'history.whatsapp': 'WhatsApp',
    'history.email': 'Email',
    'history.sent': 'Enviada',
    'history.errorStatus': 'Error',
    'history.system': 'Sistema',
    'history.view': 'Visualizar',
    'history.searchPhone': 'Buscar por teléfono...',
    'history.searchEmail': 'Buscar por email...',
    'history.noMessages': 'No se encontraron mensajes',

    // File Modal
    'messages.selectFile': 'Seleccione un archivo',
    'messages.enterFileName': 'Ingrese el nombre del archivo',
    'messages.fileAddedSuccess': 'Archivo agregado con éxito',
    'messages.fileAddedError': 'Error al agregar archivo',

    // Financial
    'financial.parcelInfo': 'Información de la Cuota',
    'financial.originalValue': 'Valor Original',
    'financial.paymentDate': 'Fecha de Pago',
    'financial.amountPaid': 'Valor Pagado',
    'financial.characters': 'caracteres',

    // Company
    'company.responsibleSignature': 'Firma del Responsable',
    'company.noSignature': 'Sin firma',
    'company.pngOnly': 'Solo archivos PNG permitidos (máx. 10MB)',

    // Digital Signature
    'digitalSignature.generalSettings': 'Configuración General',
    'digitalSignature.enable': 'Habilitar Firma Digital',
    'digitalSignature.enableHelp': 'Habilita la funcionalidad de firma digital electrónica en el sistema',
    'digitalSignature.provider': 'Proveedor de API',
    'digitalSignature.providerHelp': 'Seleccione el proveedor de API para firma digital',
    'digitalSignature.expirationDays': 'Días de Expiración Predeterminado',
    'digitalSignature.expirationDaysHelp': 'Número de días predeterminado para expiración de documentos (1 a 365 días)',
    'digitalSignature.apiSettings': 'Configuración de la API',
    'digitalSignature.apiKey': 'API Key',
    'digitalSignature.assinafyHelp': 'Obtenga su API Key gratuita en assinafy.com.br (100 firmas/mes gratis)',
    'digitalSignature.zapsignHelp': 'Obtenga su API Key en el panel de ZapSign',
    'digitalSignature.workspaceId': 'Workspace Account ID',
    'digitalSignature.workspaceIdHelp': 'Workspace Account ID obtenido en el panel de Assinafy: My Account > Workspaces',
    'digitalSignature.assinafyInfo': 'Assinafy: Plan gratuito con 100 firmas mensuales. Ideal para comenzar a usar firma digital sin costos.',
    'digitalSignature.successUpdate': '¡Configuración de firma digital actualizada con éxito!',
    'digitalSignature.errorUpdate': 'Error al actualizar configuración',
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