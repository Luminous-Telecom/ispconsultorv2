import { Router } from 'express';
import clienteRoutes from './clienteRoutes';
import planoRoutes from './planoRoutes';
import bancoRoutes from './bancoRoutes';
import usuarioRoutes from './usuarioRoutes';
import tituloRoutes from './titulos';
import boletoRoutes from './boletoRoutes';
import dadosEmpresaRoutes from './dadosEmpresaRoutes';
import planoModulosRoutes from './planoModulosRoutes';
import dashboardRoutes from './dashboardRoutes';
import webhookRoutes from './webhookRoutes';
import schedulerRoutes from './schedulerRoutes';
import workerRoutes from './workerRoutes';
import parametrosRoutes from './parametrosRoutes';
import contratoRoutes from './contratos';
import servidorEmailRoutes from './servidorEmailRoutes';
import servidorWhatsAppRoutes from './servidorWhatsAppRoutes';
import mensagemWhatsAppRoutes from './mensagemWhatsAppRoutes';
import templateWhatsAppRoutes from './templateWhatsAppRoutes';
import mensagemEmailRoutes from './mensagemEmailRoutes';
import mensagemHistoricoRoutes from './mensagemHistoricoRoutes';
import modeloDocumentoRoutes from './modeloDocumentoRoutes';
import modeloTermoRoutes from './modeloTermoRoutes';
import diasVencimentoRoutes from './diasVencimentoRoutes';
import termosContratoRoutes from './termosContrato';
import authRoutes from './authRoutes';
import pagamentoPublicoRoutes from './pagamentoPublicoRoutes';
import healthRoutes from './healthRoutes';
import assinaturaDigitalRoutes from './assinaturaDigitalRoutes';
import assinaturaDigitalProviderRoutes from './assinaturaDigitalProviderRoutes';
import clienteArquivoRoutes from './clienteArquivoRoutes';
import auditoriaRoutes from './auditoriaRoutes';
import fornecedorRoutes from './fornecedorRoutes';
import contaPagarRoutes from './contaPagarRoutes';
import notaFiscalRoutes from './notaFiscalRoutes';
import nfseConfigRoutes from './nfseConfigRoutes';
import centralAssinanteRoutes from './centralAssinanteRoutes';
import dominioRoutes from './dominioRoutes';
import ipv4Routes from './ipv4Routes';
import ipv6Routes from './ipv6Routes';
import blockdomiRoutes from './blockdomiRoutes';
import blockdomiListasRoutes from './blockdomiListasRoutes';
import blockdomiPublicoRoutes from './blockdomiPublicoRoutes';
import ipsPermitidosRoutes from './ipsPermitidosRoutes';
import pdfExtractRoutes from './pdfExtractRoutes';
import tipoCobrancaContratoRoutes from './tipoCobrancaContratoRoutes';
import empresaRoutes from './empresaRoutes';
import saasAuthRoutes from './saas/saasAuthRoutes';
import saasEmpresasRoutes from './saas/saasEmpresasRoutes';
import saasPlanoRoutes from './saas/saasPlanoRoutes';
import saasUsuariosRoutes from './saas/saasUsuariosRoutes';
import saasConfigRoutes from './saas/saasConfigRoutes';
import saasCrudRoutes from './saas/saasCrudRoutes';
import saasDadosEmpresaCrudRoutes from './saas/saasDadosEmpresaCrudRoutes';
import saasMensagemHistoricoRoutes from './saas/saasMensagemHistoricoRoutes';
import saasParametrosRoutes from './saas/saasParametrosRoutes';
import saasNfseConfigRoutes from './saas/saasNfseConfigRoutes';
import saasSchedulerRoutes from './saas/saasSchedulerRoutes';
import saasAtualizacoesRoutes from './saas/saasAtualizacoesRoutes';
import saasBackupsRoutes from './saas/saasBackupsRoutes';
import tenantRoutes from './tenantRoutes';
import sshManagerRoutes from './sshManagerRoutes';
import agentRoutes from './agentRoutes';
import rpkiRoutes from './rpkiRoutes';
import integracaoIxcProvedorRoutes from './integracaoIxcProvedorRoutes';
import ixcOssChamadoRoutes from './ixcOssChamadoRoutes';
import ixcLookupRoutes from './ixcLookupRoutes';

const router = Router();

const routes = [
    { path: '/api/auth', route: authRoutes },
    { path: '/api/empresas', route: empresaRoutes },
    { path: '/api/clientes', route: clienteRoutes },
    { path: '/api/planos', route: planoRoutes },
    { path: '/api/bancos', route: bancoRoutes },
    { path: '/api/tipos-cobranca-contrato', route: tipoCobrancaContratoRoutes },
    { path: '/api/usuarios', route: usuarioRoutes },
    { path: '/api/titulos', route: tituloRoutes },
    { path: '/api/contratos', route: contratoRoutes },
    { path: '/api/dados-empresa', route: dadosEmpresaRoutes },
    { path: '/api/plano-modulos', route: planoModulosRoutes },
    { path: '/api/dashboard', route: dashboardRoutes },
    { path: '/api/scheduler', route: schedulerRoutes },
    { path: '/api/workers', route: workerRoutes },
    { path: '/api/parametros', route: parametrosRoutes },
    { path: '/boleto', route: boletoRoutes },
    
    // Rotas dos servidores e configurações
    { path: '/api/servidores-email', route: servidorEmailRoutes },
    { path: '/api/servidores-whatsapp', route: servidorWhatsAppRoutes },
    { path: '/api/mensagens-whatsapp', route: mensagemWhatsAppRoutes },
    { path: '/api/templates-whatsapp', route: templateWhatsAppRoutes },
    { path: '/api/mensagens-email', route: mensagemEmailRoutes },
    { path: '/api/mensagens-historico', route: mensagemHistoricoRoutes },
    { path: '/api/modelos-documento', route: modeloDocumentoRoutes },
    { path: '/api/modelos-termo', route: modeloTermoRoutes },
    { path: '/api/dias-vencimento', route: diasVencimentoRoutes },
    { path: '/api/termos-contrato', route: termosContratoRoutes },
    { path: '/api/assinatura-digital', route: assinaturaDigitalRoutes },
    { path: '/api/assinatura-digital-providers', route: assinaturaDigitalProviderRoutes },
    // IMPORTANTE: cliente-arquivos deve vir ANTES de /api para evitar conflito
    // Registrar manualmente ANTES de /api para garantir ordem
    { path: '/api/cliente-arquivos', route: clienteArquivoRoutes },
    { path: '/api/auditoria', route: auditoriaRoutes },
    { path: '/api/fornecedores', route: fornecedorRoutes },
    { path: '/api/contas-pagar', route: contaPagarRoutes },
    { path: '/api/notas-fiscais', route: notaFiscalRoutes },
    { path: '/api/nfse-config', route: nfseConfigRoutes },
    { path: '/api/dominios', route: dominioRoutes },
    { path: '/api/ipv4', route: ipv4Routes },
    { path: '/api/ipv6', route: ipv6Routes },
    { path: '/api/blockdomi', route: blockdomiRoutes },
    { path: '/api/ips-permitidos', route: ipsPermitidosRoutes },
    { path: '/api/pdf-extract', route: pdfExtractRoutes },
    { path: '/api/agents', route: agentRoutes },
    { path: '/api/rpki', route: rpkiRoutes },
    { path: '/api/integracao-ixc-provedor', route: integracaoIxcProvedorRoutes },
    { path: '/api/ixc/ordens-servico', route: ixcOssChamadoRoutes },
    { path: '/api/ixc', route: ixcLookupRoutes },
    { path: '/api', route: centralAssinanteRoutes },

    // Rotas de webhook
    { path: '/webhook', route: webhookRoutes },
    
    // Rotas públicas de pagamento (deve vir DEPOIS de rotas específicas)
    // IMPORTANTE: Esta rota genérica /api deve vir POR ÚLTIMO para não capturar rotas específicas
    { path: '/api', route: pagamentoPublicoRoutes },
    
    // Rotas SaaS (Super Admin) — completamente separadas do ERP
    { path: '/api/saas/auth', route: saasAuthRoutes },
    { path: '/api/saas/empresas', route: saasEmpresasRoutes },
    { path: '/api/saas/planos', route: saasPlanoRoutes },
    { path: '/api/saas/usuarios', route: saasUsuariosRoutes },
    { path: '/api/saas/config', route: saasConfigRoutes },
    { path: '/api/saas/mensagens-historico', route: saasMensagemHistoricoRoutes },
    { path: '/api/saas/parametros', route: saasParametrosRoutes },
    { path: '/api/saas/nfse-config', route: saasNfseConfigRoutes },
    { path: '/api/saas/scheduler', route: saasSchedulerRoutes },
    { path: '/api/saas/saas-dados-empresa', route: saasDadosEmpresaCrudRoutes },
    { path: '/api/saas/atualizacoes', route: saasAtualizacoesRoutes },
    { path: '/api/saas/backups', route: saasBackupsRoutes },
    { path: '/api/saas', route: saasCrudRoutes },
    { path: '/api/tenant', route: tenantRoutes },
    { path: '/api/ssh-manager', route: sshManagerRoutes },

    // API pública Blockdomi (site público) - sem auth, sem IP
    { path: '/api/blockdomi-publico', route: blockdomiPublicoRoutes },

    // Rotas TXT do Blockdomi (raiz, sem /api): /domain/version, /domain/all, /v4/all, /v6/all
    { path: '', route: blockdomiListasRoutes },
    // Rotas de health check (sem /api para facilitar monitoramento)
    { path: '', route: healthRoutes },
];

routes.forEach(({ path, route }) => {
  router.use(path, route);
});

export default router;
