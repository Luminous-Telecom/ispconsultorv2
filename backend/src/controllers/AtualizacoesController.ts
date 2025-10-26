import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import axios from 'axios';

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  body: string;
  name: string;
}

export class AtualizacoesController {
  static async get(req: Request, res: Response): Promise<void> {
    try {
      // Buscar releases do GitHub
      const githubRepo = process.env.GITHUB_REPO || 'Luminous-Telecom/ctm-telecom';
      const githubUrl = `https://api.github.com/repos/${githubRepo}/releases`;
      
      let atualizacoes: any[] = [];
      
      try {
        const response = await axios.get<GitHubRelease[]>(githubUrl, {
          headers: {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'CTM-Telecom-ERP'
          }
        });
        
        // Converter releases do GitHub para formato do sistema
        atualizacoes = response.data.map((release, index) => {
          const tagVersion = release.tag_name.replace(/^v/i, ''); // Remove 'v' do início
          const publishedDate = new Date(release.published_at);
          
          // Tentar detectar tipo baseado na descrição ou tag
          let tipo: 'feature' | 'bugfix' | 'security' | 'melhoria' = 'feature';
          
          const descricaoLower = (release.body || release.name || '').toLowerCase();
          if (descricaoLower.includes('fix') || descricaoLower.includes('correção') || descricaoLower.includes('bug')) {
            tipo = 'bugfix';
          } else if (descricaoLower.includes('security') || descricaoLower.includes('segurança')) {
            tipo = 'security';
          } else if (descricaoLower.includes('melhoria') || descricaoLower.includes('update') || descricaoLower.includes('melhor')) {
            tipo = 'melhoria';
          }
          
          // Extrair primeira linha da descrição como resumo
          const descricaoTexto = release.body ? release.body.split('\n')[0].trim() : release.name;
          
          return {
            id: index + 1,
            versao: tagVersion,
            data: publishedDate.toISOString().split('T')[0], // YYYY-MM-DD
            descricao: descricaoTexto || `Versão ${tagVersion}`,
            tipo
          };
        });
        
        logger.info('Atualizações buscadas do GitHub', { 
          total: atualizacoes.length,
          repo: githubRepo 
        });
      } catch (githubError: any) {
        logger.warn('Erro ao buscar atualizações do GitHub, usando dados mockados', { 
          error: githubError.message 
        });
        
        // Fallback para dados mockados se GitHub falhar
        atualizacoes = [
          {
            id: 1,
            versao: '1.1.0',
            data: '2025-01-27',
            descricao: 'Melhorias e correções no sistema',
            tipo: 'melhoria' as const,
          },
          {
            id: 2,
            versao: '1.0.0',
            data: '2025-01-26',
            descricao: 'Versão inicial do sistema',
            tipo: 'feature' as const,
          }
        ];
      }

      res.json({
        success: true,
        data: atualizacoes,
        versao_atual: atualizacoes[0]?.versao || '1.0.0'
      });
    } catch (error) {
      logger.error('Erro ao buscar atualizações', { error });
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar atualizações'
      });
    }
  }
}

