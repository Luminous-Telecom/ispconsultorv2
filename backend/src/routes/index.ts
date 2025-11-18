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
import modeloContratoRoutes from './modeloContratoRoutes';
import modeloReciboRoutes from './modeloReciboRoutes';
import modeloCartaRoutes from './modeloCartaRoutes';
import diasVencimentoRoutes from './diasVencimentoRoutes';
import termosContratoRoutes from './termosContrato';
import modelosTermoRoutes from './modelosTermo';
import atualizacoesRoutes from './atualizacoesRoutes';
import authRoutes from './authRoutes';

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
    { path: '/api/modelos-contrato', route: modeloContratoRoutes },
    { path: '/api/modelos-recibo', route: modeloReciboRoutes },
    { path: '/api/modelos-carta', route: modeloCartaRoutes },
    { path: '/api/dias-vencimento', route: diasVencimentoRoutes },
    { path: '/api/termos-contrato', route: termosContratoRoutes },
    { path: '/api/modelos-termo', route: modelosTermoRoutes },
    { path: '/api/atualizacoes', route: atualizacoesRoutes },

    // Rotas de webhook
    { path: '/webhook', route: webhookRoutes },
];

routes.forEach(({ path, route }) => {
  router.use(path, route);
});

export default router;
