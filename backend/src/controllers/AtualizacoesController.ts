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
    // Buscar releases do GitHub
    const githubRepo = process.env.GITHUB_REPO || 'Luminous-Telecom/ctm-telecom';
    
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      const githubUrl = `https://api.github.com/repos/${githubRepo}/releases`;
      
      // Montar headers com token se disponível
      const headers: any = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'CTM-Telecom-ERP'
      };
      
      if (githubToken) {
        headers['Authorization'] = `Bearer ${githubToken}`;
      }
      
      const response = await axios.get<GitHubRelease[]>(githubUrl, { headers });
      
      // Converter releases do GitHub para formato do sistema
      const atualizacoes = response.data.map((release, index) => {
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
        
        // Extrair primeira linha da descrição como resumo, removendo markdown e links
        let descricaoTexto = release.body ? release.body.split('\n')[0].trim() : release.name;
        
        // Remover markdown links, "Full Changelog", e outros links do GitHub
        descricaoTexto = descricaoTexto
          .replace(/\*\*Full Changelog\*\*:.*/g, '')
          .replace(/https?:\/\/[^\s]+/g, '')
          .replace(/\*\*/g, '')
          .trim();
        
        return {
          id: index + 1,
          versao: tagVersion,
          data: publishedDate.toISOString().split('T')[0], // YYYY-MM-DD
          descricao: descricaoTexto || release.name || `Versão ${tagVersion}`,
          tipo
        };
      });
      
      logger.info('Atualizações buscadas do GitHub', { 
        total: atualizacoes.length,
        repo: githubRepo 
      });

      res.json({
        success: true,
        data: atualizacoes,
        versao_atual: atualizacoes[0]?.versao || 'N/A'
      });
    } catch (error) {
      logger.error('Erro ao buscar atualizações do GitHub', { error });
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar atualizações do GitHub'
      });
    }
  }
}

