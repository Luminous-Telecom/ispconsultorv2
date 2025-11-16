import { Request, Response } from 'express';
import { DadosEmpresa } from '../models/DadosEmpresa';

export class DadosEmpresaController {
  // Dados padrão para criação de empresa
  private static getDefaultData() {
    return {
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      inscricao_estadual: '',
      inscricao_municipal: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      telefone: '',
      celular: '',
      email: '',
      site: '',
      responsavel_nome: '',
      responsavel_cpf: '',
      responsavel_cargo: '',
      logo: null as string | null
    };
  }

  // Construir URL completa para logo
  private static buildLogoUrl(req: Request, logoPath: string | null): string | null {
    if (!logoPath) return null;
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) return logoPath;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}${logoPath}`;
  }

  // Converter URL completa para caminho relativo
  private static normalizeLogoPath(logo: string | null | undefined): string | null {
    if (!logo || typeof logo !== 'string') return null;
    if (!logo.startsWith('http://') && !logo.startsWith('https://')) return logo;
    try {
      const url = new URL(logo);
      return url.pathname;
    } catch {
      return logo;
    }
  }
  static async get(req: Request, res: Response): Promise<void> {
    try {
      let dadosEmpresa = await DadosEmpresa.findOne();

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresa.create(DadosEmpresaController.getDefaultData());
      }

      const dadosEmpresaJson = dadosEmpresa.toJSON();
      dadosEmpresaJson.logo = DadosEmpresaController.buildLogoUrl(req, dadosEmpresaJson.logo);

      res.json(dadosEmpresaJson);
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const dadosAtualizados = { ...req.body };
      dadosAtualizados.logo = DadosEmpresaController.normalizeLogoPath(dadosAtualizados.logo);

      let dadosEmpresa = await DadosEmpresa.findOne();

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresa.create(dadosAtualizados);
      } else {
        await dadosEmpresa.update(dadosAtualizados);
        await dadosEmpresa.reload();
      }

      const dadosEmpresaJson = dadosEmpresa.toJSON();
      dadosEmpresaJson.logo = DadosEmpresaController.buildLogoUrl(req, dadosEmpresaJson.logo);

      res.json(dadosEmpresaJson);
    } catch (error) {
      console.error('Erro ao atualizar dados da empresa:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async uploadLogo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Arquivo não enviado' });
        return;
      }

      const filePath = `/uploads/empresa/${req.file.filename}`;
      let dadosEmpresa = await DadosEmpresa.findOne();

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresa.create({ ...DadosEmpresaController.getDefaultData(), logo: filePath });
      } else {
        await dadosEmpresa.update({ logo: filePath });
      }

      const logoUrl = DadosEmpresaController.buildLogoUrl(req, filePath);
      res.json({ success: true, logo: logoUrl });
    } catch (error) {
      console.error('Erro ao fazer upload da logo:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getLogo(req: Request, res: Response): Promise<void> {
    try {
      const dadosEmpresa = await DadosEmpresa.findOne();
      
      if (!dadosEmpresa || !dadosEmpresa.logo) {
        res.status(404).json({ error: 'Logo não encontrada' });
        return;
      }

      // Redirecionar para o arquivo de upload
      res.redirect(dadosEmpresa.logo);
    } catch (error) {
      console.error('Erro ao buscar logo:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}