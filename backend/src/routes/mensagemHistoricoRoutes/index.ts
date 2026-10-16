import { Router } from 'express';
import { MensagemHistoricoController } from '../../controllers/comunicacao/MensagemHistoricoController';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

/**
 * @route GET /api/mensagens-historico
 * @desc Listar histórico de mensagens com paginação e filtros
 * @access Private
 * @query {number} page - Página atual (padrão: 1)
 * @query {number} limit - Limite por página (padrão: 20)
 * @query {string} tipo - Filtrar por tipo: 'email' ou 'whatsapp'
 * @query {string} status - Filtrar por status: 'enviada' ou 'erro'
 * @query {string} destinatario - Filtrar por destinatário (busca parcial)
 * @query {string} entidade_tipo - Filtrar por tipo de entidade relacionada
 * @query {number} entidade_id - Filtrar por ID da entidade relacionada
 * @query {number} usuario_id - Filtrar por usuário que enviou
 * @query {string} data_inicio - Data inicial (YYYY-MM-DD)
 * @query {string} data_fim - Data final (YYYY-MM-DD)
 * @query {string} sortColumn - Coluna para ordenação (padrão: created_at)
 * @query {string} sortDirection - Direção da ordenação: 'asc' ou 'desc' (padrão: desc)
 */
router.post('/reenviar-falhas', MensagemHistoricoController.reenviarFalhas);
router.get('/', MensagemHistoricoController.list);

/**
 * @route GET /api/mensagens-historico/:id
 * @desc Buscar mensagem específica por ID
 * @access Private
 */
router.get('/:id', MensagemHistoricoController.show);

/**
 * @route GET /api/mensagens-historico/entidade/:entidade_tipo/:entidade_id
 * @desc Buscar mensagens relacionadas a uma entidade específica
 * @access Private
 * @query {number} page - Página atual (padrão: 1)
 * @query {number} limit - Limite por página (padrão: 10)
 */
router.get('/entidade/:entidade_tipo/:entidade_id', MensagemHistoricoController.getByEntity);

export default router;