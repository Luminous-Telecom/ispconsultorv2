import { Router } from 'express';
import clienteRoutes from './clienteRoutes';
import planoRoutes from './planoRoutes';
import bancoRoutes from './bancoRoutes';
import usuarioRoutes from './usuarioRoutes';
import tituloRoutes from './titulos';
import boletoRoutes from './boletoRoutes';
import dadosEmpresaRoutes from './dadosEmpresaRoutes';
import dashboardRoutes from './dashboardRoutes';
import webhookRoutes from './webhookRoutes';
import schedulerRoutes from './schedulerRoutes';
import workerRoutes from './workerRoutes';
import parametroRoutes from './parametroRoutes';
import parametrosRoutes from './parametrosRoutes';
import contratoRoutes from './contratos';
import servidorEmailRoutes from './servidorEmailRoutes';
import servidorWhatsAppRoutes from './servidorWhatsAppRoutes';
import mensagemWhatsAppRoutes from './mensagemWhatsAppRoutes';
import mensagemEmailRoutes from './mensagemEmailRoutes';
import modeloDocumentoRoutes from './modeloDocumentoRoutes';
import diasVencimentoRoutes from './diasVencimentoRoutes';
import termosContratoRoutes from './termosContrato';
import modelosTermoRoutes from './modelosTermo';
import atualizacoesRoutes from './atualizacoesRoutes';
import authRoutes from './authRoutes';
import pagamentoPublicoRoutes from './pagamentoPublicoRoutes';
import healthRoutes from './healthRoutes';
import assinaturaDigitalRoutes from './assinaturaDigitalRoutes';
import assinaturaDigitalProviderRoutes from './assinaturaDigitalProviderRoutes';
import clienteArquivoRoutes from './clienteArquivoRoutes';

const router = Router();

const routes = [
    { path: '/api/auth', route: authRoutes },    
    { path: '/api/clientes', route: clienteRoutes },
    { path: '/api/planos', route: planoRoutes },
    { path: '/api/bancos', route: bancoRoutes },
    { path: '/api/usuarios', route: usuarioRoutes },
    { path: '/api/titulos', route: tituloRoutes },
    { path: '/api/contratos', route: contratoRoutes },
    { path: '/api/dados-empresa', route: dadosEmpresaRoutes },
    { path: '/api/dashboard', route: dashboardRoutes },
    { path: '/api/scheduler', route: schedulerRoutes },
    { path: '/api/workers', route: workerRoutes },
    { path: '/api/parametro', route: parametroRoutes },
    { path: '/api/parametros', route: parametrosRoutes },
    { path: '/boleto', route: boletoRoutes },
    
    // Rotas dos servidores e configurações
    { path: '/api/servidores-email', route: servidorEmailRoutes },
    { path: '/api/servidores-whatsapp', route: servidorWhatsAppRoutes },
    { path: '/api/mensagens-whatsapp', route: mensagemWhatsAppRoutes },
    { path: '/api/mensagens-email', route: mensagemEmailRoutes },
    { path: '/api/modelos-documento', route: modeloDocumentoRoutes },
    { path: '/api/dias-vencimento', route: diasVencimentoRoutes },
    { path: '/api/termos-contrato', route: termosContratoRoutes },
    { path: '/api/modelos-termo', route: modelosTermoRoutes },
    { path: '/api/atualizacoes', route: atualizacoesRoutes },
    { path: '/api/assinaturas-digital', route: assinaturaDigitalRoutes },
    { path: '/api/assinatura-digital', route: assinaturaDigitalRoutes }, // Alias sem "s" para compatibilidade
    { path: '/api/assinatura-digital-providers', route: assinaturaDigitalProviderRoutes },
    // IMPORTANTE: cliente-arquivos deve vir ANTES de /api para evitar conflito
    // Registrar manualmente ANTES de /api para garantir ordem
    { path: '/api/cliente-arquivos', route: clienteArquivoRoutes },

    // Rotas de webhook
    { path: '/webhook', route: webhookRoutes },
    
    // Rotas públicas de pagamento (deve vir DEPOIS de rotas específicas)
    // IMPORTANTE: Esta rota genérica /api deve vir POR ÚLTIMO para não capturar rotas específicas
    { path: '/api', route: pagamentoPublicoRoutes },
    
    // Rotas de health check (sem /api para facilitar monitoramento)
    { path: '', route: healthRoutes },
];

routes.forEach(({ path, route }) => {
  router.use(path, route);
});

export default router;
