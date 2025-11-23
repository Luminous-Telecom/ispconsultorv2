import * as fs from 'fs';
import * as path from 'path';

/**
 * Classe utilitária para carregar templates HTML e CSS
 */
export class TemplateLoader {
  // Determina o diretório base de forma robusta
  private static getBaseDir(): string {
    // Tenta usar __dirname (CommonJS)
    if (typeof __dirname !== 'undefined') {
      return path.resolve(__dirname, '..');
    }
    
    // Fallback: usa process.cwd() e constrói o caminho relativo
    // Assumindo que estamos em backend/src/services/pdf-generation/utils/
    const cwd = process.cwd();
    const possiblePaths = [
      path.join(cwd, 'backend/src/services/pdf-generation'),
      path.join(cwd, 'src/services/pdf-generation'),
      path.join(cwd, 'services/pdf-generation'),
      path.join(cwd, 'pdf-generation')
    ];
    
    for (const possiblePath of possiblePaths) {
      const stylesPath = path.join(possiblePath, 'styles', 'document.css');
      if (fs.existsSync(stylesPath)) {
        return possiblePath;
      }
    }
    
    // Último recurso: usa process.cwd()
    return path.join(process.cwd(), 'backend/src/services/pdf-generation');
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
      throw new Error(`Template não encontrado: ${templateName}`);
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

