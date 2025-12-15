import * as fs from 'fs';
import * as path from 'path';

/**
 * Classe utilitária para carregar templates HTML e CSS
 */
export class TemplateLoader {
  // Determina o diretório base de forma robusta
  private static getBaseDir(): string {
    const cwd = process.cwd();
    
    // Lista de caminhos possíveis (tanto src quanto dist)
    const possiblePaths = [
      // Em produção (dist)
      path.join(cwd, 'backend/dist/services/pdf-generation'),
      path.join(cwd, 'dist/services/pdf-generation'),
      // Em desenvolvimento (src)
      path.join(cwd, 'backend/src/services/pdf-generation'),
      path.join(cwd, 'src/services/pdf-generation'),
      // Fallbacks
      path.join(cwd, 'services/pdf-generation'),
      path.join(cwd, 'pdf-generation')
    ];
    
    // Se __dirname estiver disponível, também tenta usar
    if (typeof __dirname !== 'undefined') {
      // Tenta primeiro o diretório relativo ao __dirname
      const dirnameBase = path.resolve(__dirname, '..');
      possiblePaths.unshift(dirnameBase);
      
      // Se estiver em dist, também tenta src
      if (dirnameBase.includes('dist')) {
        const srcBase = dirnameBase.replace(/dist/g, 'src');
        possiblePaths.unshift(srcBase);
      }
    }
    
    // Procura o primeiro caminho que tenha tanto o arquivo CSS quanto os templates
    for (const possiblePath of possiblePaths) {
      const stylesPath = path.join(possiblePath, 'styles', 'document.css');
      const templatesPath = path.join(possiblePath, 'templates', 'base.html');
      if (fs.existsSync(stylesPath) && fs.existsSync(templatesPath)) {
        return possiblePath;
      }
    }
    
    // Se não encontrou ambos, procura apenas pelo CSS (fallback)
    for (const possiblePath of possiblePaths) {
      const stylesPath = path.join(possiblePath, 'styles', 'document.css');
      if (fs.existsSync(stylesPath)) {
        return possiblePath;
      }
    }
    
    // Se não encontrou, tenta usar __dirname mesmo sem o arquivo existir
    if (typeof __dirname !== 'undefined') {
      return path.resolve(__dirname, '..');
    }
    
    // Último recurso
    return path.join(cwd, 'backend/src/services/pdf-generation');
  }
  
  private static readonly BASE_DIR = TemplateLoader.getBaseDir();
  private static readonly TEMPLATES_DIR = path.join(TemplateLoader.BASE_DIR, 'templates');
  private static readonly STYLES_DIR = path.join(TemplateLoader.BASE_DIR, 'styles');

  /**
   * Cache para templates e estilos carregados
   */
  private static templateCache: Map<string, string> = new Map();
  private static styleCache: Map<string, string> = new Map();

  /**
   * Carrega um template HTML
   */
  static loadTemplate(templateName: string): string {
    const cacheKey = `template:${templateName}`;
    
    const cached = this.templateCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const templatePath = path.join(this.TEMPLATES_DIR, `${templateName}.html`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template não encontrado: ${templateName} (caminho: ${templatePath})`);
    }

    const content = fs.readFileSync(templatePath, 'utf-8');
    this.templateCache.set(cacheKey, content);
    
    return content;
  }

  /**
   * Carrega um arquivo CSS
   */
  static loadStyle(styleName: string): string {
    const cacheKey = `style:${styleName}`;
    
    const cached = this.styleCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const stylePath = path.join(this.STYLES_DIR, `${styleName}.css`);
    
    if (!fs.existsSync(stylePath)) {
      throw new Error(`Estilo não encontrado: ${styleName} (caminho: ${stylePath})`);
    }

    const content = fs.readFileSync(stylePath, 'utf-8');
    this.styleCache.set(cacheKey, content);
    
    return content;
  }

  /**
   * Renderiza um template substituindo placeholders
   */
  static renderTemplate(
    templateName: string,
    variables: Record<string, string>
  ): string {
    let template = this.loadTemplate(templateName);

    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return template;
  }

  /**
   * Limpa o cache (útil para desenvolvimento)
   */
  static clearCache(): void {
    this.templateCache.clear();
    this.styleCache.clear();
  }
}

