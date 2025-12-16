import { Plugin } from 'ckeditor5';
import { ButtonView } from 'ckeditor5';

interface Variavel {
  variavel: string;
  descricao: string;
}

interface CategoriaVariaveis {
  titulo: string;
  variaveis: Variavel[];
}

interface VariaveisData {
  [key: string]: CategoriaVariaveis;
}

export default class VariablePlugin extends Plugin {
  static get pluginName() {
    return 'VariablePlugin';
  }

  init() {
    // eslint-disable-next-line no-console
    console.log('[VariablePlugin] Inicializando plugin');
    // eslint-disable-next-line no-console
    console.log('[VariablePlugin] Editor locale uiLanguage:', this.editor.locale?.uiLanguage);
    
    const editor = this.editor;
    let currentDropdown: HTMLElement | null = null;

    const buscarVariaveis = async (): Promise<VariaveisData> => {
      const { defaultApiClient } = await import('../../services/core');
      
      try {
        const response = await defaultApiClient.get<VariaveisData>('/modelos-documento/variaveis');
        
        if (response.success && response.data) {
          return response.data;
        }
        
        throw new Error(response.message || 'Não foi possível carregar variáveis');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao buscar variáveis';
        throw new Error(errorMessage);
      }
    };

    // Adiciona o botão de variáveis à barra de ferramentas
    editor.ui.componentFactory.add('variables', locale => {
      // eslint-disable-next-line no-console
      console.log('[VariablePlugin] Criando botão de variáveis');
      
      // Garantir que temos um locale válido
      const validLocale = locale || editor.locale;
      
      const buttonView = new ButtonView(validLocale);

      // Usar ícone SVG em vez de texto para evitar problemas com TemplateToBinding
      // Criar um SVG simples para o botão
      const iconSvg = `
        <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 4h14v2H3V4zm0 4h14v2H3V8zm0 4h14v2H3v-2zm0 4h14v2H3v-2z"/>
        </svg>
      `;
      
      buttonView.set({
        icon: iconSvg,
        tooltip: 'Variáveis',
        isToggleable: true
      });
      
      // Garantir que o tooltip seja uma string válida após renderização
      buttonView.on('render', () => {
        const buttonElement = buttonView.element;
        if (buttonElement) {
          buttonElement.setAttribute('title', 'Variáveis');
          buttonElement.setAttribute('aria-label', 'Inserir variáveis');
        }
      });

      // Ação ao clicar no botão
      buttonView.on('execute', async () => {
        // eslint-disable-next-line no-console
        console.log('[VariablePlugin] Botão clicado');
        
        // Se já existe um dropdown aberto, fechar
        if (currentDropdown) {
          currentDropdown.remove();
          currentDropdown = null;
          buttonView.isOn = false;
          return;
        }

        buttonView.isOn = true;

        // Buscar variáveis do backend
        let variaveisData: VariaveisData;
        try {
          // eslint-disable-next-line no-console
          console.log('[VariablePlugin] Buscando variáveis do backend...');
          variaveisData = await buscarVariaveis();
          // eslint-disable-next-line no-console
          console.log('[VariablePlugin] Variáveis recebidas:', Object.keys(variaveisData || {}));
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[VariablePlugin] Erro ao buscar variáveis:', error);
          buttonView.isOn = false;
          return;
        }

        // Criar dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'ck-dropdown ck-dropdown_open';
        dropdown.style.cssText = 'position: absolute; top: 100%; left: 0; z-index: 1000; background: white; border: 1px solid #c4c4c4; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); min-width: 200px; max-height: 300px; overflow-y: auto;';

        // Usar dados do backend diretamente
        const categories = variaveisData;

        Object.entries(categories).forEach(([_categoryKey, categoryData]: [string, CategoriaVariaveis]) => {
          if (categoryData && categoryData.variaveis && Array.isArray(categoryData.variaveis) && categoryData.variaveis.length > 0) {
            // Adicionar categoria
            const categoryDiv = document.createElement('div');
            categoryDiv.style.cssText = 'padding: 8px 12px 4px 12px; font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase;';
            const titulo = categoryData.titulo || '';
            categoryDiv.textContent = titulo;
            dropdown.appendChild(categoryDiv);

            // Adicionar variáveis da categoria
            categoryData.variaveis.forEach((variable: Variavel) => {
              if (!variable || !variable.variavel) {
                return;
              }
              
              const item = document.createElement('div');
              item.className = 'ck-dropdown__item';
              item.style.cssText = 'padding: 6px 12px; cursor: pointer; font-size: 13px; color: #333; border-bottom: 1px solid #f0f0f0; font-family: monospace;';
              item.textContent = variable.variavel;
              
              item.onmouseenter = () => item.style.backgroundColor = '#f0f0f0';
              item.onmouseleave = () => item.style.backgroundColor = 'transparent';
              item.onclick = () => {
                editor.model.change(writer => {
                  const insertPosition = editor.model.document.selection.getFirstPosition();
                  if (insertPosition) {
                    writer.insertText(variable.variavel, insertPosition);
                  }
                });
                dropdown.remove();
                currentDropdown = null;
                buttonView.isOn = false;
              };
              
              dropdown.appendChild(item);
            });
          }
        });

        // Posicionar o dropdown próximo ao botão
        const buttonElement = buttonView.element;
        if (buttonElement) {
          buttonElement.style.position = 'relative';
          buttonElement.appendChild(dropdown);
          currentDropdown = dropdown;

          // Remover o dropdown ao clicar fora
          const removeDropdown = (e: MouseEvent) => {
            if (!dropdown.contains(e.target as Node) && !buttonElement.contains(e.target as Node)) {
              dropdown.remove();
              currentDropdown = null;
              buttonView.isOn = false;
              document.removeEventListener('click', removeDropdown);
            }
          };
          document.addEventListener('click', removeDropdown);
        }
      });

      return buttonView;
    });
  }
}
