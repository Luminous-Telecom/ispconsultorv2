import { Request, Response } from 'express';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { TituloController } from './TituloController';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface TituloComRelacoes extends Titulo {
  cliente?: Cliente;
  plano?: Plano;
  banco?: Banco;
}

export class PagamentoPublicoController {
  /**
   * Gerar token de acesso público para um título
   */
  static gerarToken(tituloId: number): string {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const data = `${tituloId}-${Date.now()}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 32);
  }

  /**
   * Validar token e retornar ID do título
   */
  static validarToken(token: string, tituloId: number): boolean {
    // Por enquanto, vamos usar uma validação simples baseada no ID
    // Em produção, você pode implementar um sistema de tokens mais robusto
    // Por segurança, vamos usar um hash do ID + secret
    const secret = process.env.JWT_SECRET || 'default-secret';
    const expectedHash = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
    return token === expectedHash;
  }

  /**
   * Página pública de pagamento
   */
  static async paginaPagamento(req: Request, res: Response): Promise<void> {
    try {
      const { id, token } = req.params;

      if (!id || !token) {
        res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Erro - Página de Pagamento</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Parâmetros inválidos</h1>
            <p>ID do título e token são obrigatórios.</p>
          </body>
          </html>
        `);
        return;
      }

      const tituloId = parseInt(id, 10);
      if (isNaN(tituloId)) {
        res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Erro - Página de Pagamento</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">ID inválido</h1>
            <p>O ID do título deve ser um número válido.</p>
          </body>
          </html>
        `);
        return;
      }

      // Validar token (simplificado - em produção usar sistema mais robusto)
      const secret = process.env.JWT_SECRET || 'default-secret';
      const expectedHash = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
      
      if (token !== expectedHash) {
        res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Erro - Página de Pagamento</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Acesso negado</h1>
            <p>Token inválido ou expirado.</p>
          </body>
          </html>
        `);
        return;
      }

      // Buscar título com relacionamentos
      const titulo = await Titulo.findByPk(tituloId, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { model: Banco, as: 'banco' }
        ]
      }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Erro - Página de Pagamento</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Título não encontrado</h1>
            <p>O título solicitado não foi encontrado.</p>
          </body>
          </html>
        `);
        return;
      }

      // Renderizar página HTML
      const html = this.renderizarPaginaPagamento(titulo, id, token);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      logger.error('Erro ao renderizar página de pagamento:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Erro - Página de Pagamento</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">Erro interno</h1>
          <p>Ocorreu um erro ao carregar a página de pagamento.</p>
        </body>
        </html>
      `);
    }
  }

  /**
   * Renderizar página HTML de pagamento
   */
  private static renderizarPaginaPagamento(titulo: TituloComRelacoes, id: string, token: string): string {
    const cliente = titulo.cliente;
    const plano = titulo.plano;
    const valorFormatado = titulo.valor_final 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(titulo.valor_final)
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(titulo.valor);
    
    const dataVencimento = titulo.data_vencimento
      ? new Date(titulo.data_vencimento).toLocaleDateString('pt-BR')
      : 'N/A';

    const codigoPix = titulo.qrcode || '';
    const linhaDigitavel = titulo.linha_digitavel || '';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pagamento - ${titulo.numero_titulo}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      padding: 40px;
      animation: fadeIn 0.5s ease-in;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #333;
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header p {
      color: #666;
      font-size: 14px;
    }
    
    .info-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .info-label {
      color: #666;
      font-size: 14px;
      font-weight: 500;
    }
    
    .info-value {
      color: #333;
      font-size: 16px;
      font-weight: 600;
    }
    
    .valor-destaque {
      color: #667eea;
      font-size: 24px;
      font-weight: 700;
    }
    
    .action-section {
      margin-top: 30px;
    }
    
    .action-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .btn {
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
      color: white;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }
    
    .btn-secondary {
      background: #6c757d;
    }
    
    .btn-secondary:hover {
      background: #5a6268;
      transform: translateY(-2px);
    }
    
    .btn-success {
      background: #28a745;
    }
    
    .btn-success:hover {
      background: #218838;
      transform: translateY(-2px);
    }
    
    .code-box {
      background: #f8f9fa;
      border: 2px dashed #dee2e6;
      border-radius: 8px;
      padding: 16px;
      margin-top: 12px;
      position: relative;
    }
    
    .code-text {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: #333;
      word-break: break-all;
      margin-bottom: 12px;
      line-height: 1.6;
    }
    
    .copy-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
    }
    
    .copy-btn:hover {
      background: #5568d3;
    }
    
    .copy-btn.copied {
      background: #28a745;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-pendente {
      background: #fff3cd;
      color: #856404;
    }
    
    .status-pago {
      background: #d4edda;
      color: #155724;
    }
    
    .status-vencido {
      background: #f8d7da;
      color: #721c24;
    }
    
    .hidden {
      display: none;
    }
    
    @media (max-width: 600px) {
      .container {
        padding: 24px;
      }
      
      .header h1 {
        font-size: 24px;
      }
      
      .info-row {
        flex-direction: column;
        gap: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 Pagamento</h1>
      <p>Detalhes da sua fatura</p>
    </div>
    
    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Cliente:</span>
        <span class="info-value">${cliente?.razao_social || cliente?.nome_fantasia || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Plano:</span>
        <span class="info-value">${plano?.nome_plano || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Número do Título:</span>
        <span class="info-value">${titulo.numero_titulo}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Vencimento:</span>
        <span class="info-value">${dataVencimento}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value">
          <span class="status-badge status-${titulo.status}">${titulo.status}</span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Valor:</span>
        <span class="info-value valor-destaque">${valorFormatado}</span>
      </div>
    </div>
    
    <div class="action-section">
      <div class="action-title">
        <span>📄</span>
        <span>Baixar Boleto</span>
      </div>
      <div class="action-buttons">
        <a href="/api/pagamento-publico/${id}/${token}/pdf" class="btn btn-primary" download>
          <span>⬇️</span>
          <span>Baixar PDF do Boleto</span>
        </a>
      </div>
    </div>
    
    ${codigoPix ? `
    <div class="action-section">
      <div class="action-title">
        <span>🔷</span>
        <span>Código PIX</span>
      </div>
      <div class="code-box">
        <div class="code-text" id="codigoPix">${codigoPix}</div>
        <button class="copy-btn" onclick="copiarCodigo('codigoPix', this)">
          <span id="btnPixText">📋 Copiar Código PIX</span>
        </button>
      </div>
    </div>
    ` : ''}
    
    ${linhaDigitavel ? `
    <div class="action-section">
      <div class="action-title">
        <span>📊</span>
        <span>Linha Digitável</span>
      </div>
      <div class="code-box">
        <div class="code-text" id="linhaDigitavel">${linhaDigitavel}</div>
        <button class="copy-btn" onclick="copiarCodigo('linhaDigitavel', this)">
          <span id="btnLinhaText">📋 Copiar Linha Digitável</span>
        </button>
      </div>
    </div>
    ` : ''}
  </div>
  
  <script>
    async function copiarCodigo(elementId, button) {
      const element = document.getElementById(elementId);
      const text = element.textContent.trim();
      
      try {
        await navigator.clipboard.writeText(text);
        
        // Feedback visual
        const originalText = button.innerHTML;
        button.classList.add('copied');
        button.innerHTML = '✓ Copiado!';
        
        setTimeout(() => {
          button.classList.remove('copied');
          button.innerHTML = originalText;
        }, 2000);
      } catch (err) {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
          document.execCommand('copy');
          const originalText = button.innerHTML;
          button.classList.add('copied');
          button.innerHTML = '✓ Copiado!';
          
          setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = originalText;
          }, 2000);
        } catch (err) {
          alert('Erro ao copiar. Por favor, selecione o texto manualmente.');
        }
        
        document.body.removeChild(textArea);
      }
    }
  </script>
</body>
</html>
    `;
  }

  /**
   * Gerar e servir PDF do boleto
   */
  static async downloadPdf(req: Request, res: Response): Promise<void> {
    try {
      const { id, token } = req.params;

      if (!id || !token) {
        res.status(400).json({
          success: false,
          message: 'ID e token são obrigatórios'
        });
        return;
      }

      const tituloId = parseInt(id, 10);
      if (isNaN(tituloId)) {
        res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
        return;
      }

      // Validar token
      const secret = process.env.JWT_SECRET || 'default-secret';
      const expectedHash = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
      
      if (token !== expectedHash) {
        res.status(403).json({
          success: false,
          message: 'Token inválido'
        });
        return;
      }

      // Buscar título
      const titulo = await Titulo.findByPk(tituloId, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { 
            model: Banco, 
            as: 'banco',
            attributes: [
              'id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox',
              'url_retorno', 'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 
              'instrucao_linha_3', 'instrucao_linha_4', 'instrucao_linha_5', 'logo'
            ]
          }
        ]
      }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Gerar PDF
      // Cast necessário devido à diferença nos tipos de Banco (logo: string | null vs logo?: string)
      const pdfBase64 = await TituloController.gerarPdfBase64(titulo as any);
      
      if (!pdfBase64) {
        res.status(500).json({
          success: false,
          message: 'Erro ao gerar PDF do boleto'
        });
        return;
      }

      // Converter base64 para Buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Configurar headers para download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="boleto-${titulo.numero_titulo}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      // Enviar PDF
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF para download público:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

