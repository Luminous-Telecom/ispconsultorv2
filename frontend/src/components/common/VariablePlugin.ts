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
    const editor = this.editor;
    let currentDropdown: HTMLElement | null = null;

    // Função para buscar variáveis do backend
    const buscarVariaveis = async (): Promise<VariaveisData> => {
      const response = await fetch('/api/modelos-contrato/variaveis');
      if (!response.ok) {
        throw new Error('Erro ao buscar variáveis do backend');
      }
      const result = await response.json();
      return result.data; // O backend retorna { success: true, data: variaveis }
    };

    // Adiciona o botão de variáveis à barra de ferramentas
    editor.ui.componentFactory.add('variables', locale => {
      const buttonView = new ButtonView(locale);

      // Configurar o botão principal
      buttonView.set({
        label: 'Variáveis',
        withText: true,
        tooltip: true,
        isToggleable: true
      });


      // Adicionar setinha após o botão ser renderizado
      buttonView.on('render', () => {
        const buttonElement = buttonView.element;
        if (buttonElement && !buttonElement.querySelector('.ck-button__arrow')) {
          // Adicionar classe de dropdown ao botão
          buttonElement.classList.add('ck-dropdown__button');
          
          // Criar a setinha
          const arrow = document.createElement('span');
          arrow.className = 'ck-button__arrow';
          arrow.style.cssText = 'margin-left: 8px; display: inline-flex; align-items: center;';
          
          // SVG da setinha (igual ao do CKEditor)
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 10 10');
          svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          svg.style.cssText = 'width: 10px; height: 10px;';
          
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M.941 4.523a.75.75 0 1 1 1.06-1.06l3.006 3.005 3.005-3.005a.75.75 0 1 1 1.06 1.06l-3.549 3.55a.75.75 0 0 1-1.168-.136L.941 4.523z');
          
          svg.appendChild(path);
          arrow.appendChild(svg);
          buttonElement.appendChild(arrow);
        }
      });

      // Ação ao clicar no botão - criar dropdown que se parece com o "Choose heading"
      buttonView.on('execute', async () => {
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
          variaveisData = await buscarVariaveis();
        } catch (error) {
          console.error('Erro ao buscar variáveis:', error);
          buttonView.isOn = false;
          return;
        }

        // Criar um dropdown que se parece exatamente com o "Choose heading"
        const dropdown = document.createElement('div');
        dropdown.className = 'ck-dropdown ck-dropdown_open';
        dropdown.style.cssText = `
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 1000;
          background: white;
          border: 1px solid #c4c4c4;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          min-width: 200px;
          max-height: 300px;
          overflow-y: auto;
        `;

        // Usar dados do backend diretamente
        const categories = variaveisData;

        Object.entries(categories).forEach(([categoryKey, categoryData]: [string, CategoriaVariaveis]) => {
          if (categoryData.variaveis && categoryData.variaveis.length > 0) {
            // Adicionar categoria
            const categoryDiv = document.createElement('div');
            categoryDiv.style.cssText = `
              padding: 8px 12px 4px 12px;
              font-size: 11px;
              font-weight: 600;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            `;
            categoryDiv.textContent = categoryData.titulo;
            dropdown.appendChild(categoryDiv);

            // Adicionar variáveis da categoria
            categoryData.variaveis.forEach((variable: Variavel) => {
              const item = document.createElement('div');
              item.className = 'ck-dropdown__item';
              item.style.cssText = `
                padding: 6px 12px;
                cursor: pointer;
                font-size: 13px;
                color: #333;
                border-bottom: 1px solid #f0f0f0;
                transition: background-color 0.2s;
                font-family: 'Courier New', monospace;
              `;
              item.textContent = variable.variavel;

              // Hover effect
              item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#f0f0f0';
              });
              item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
              });

              // Click event
              item.addEventListener('click', () => {
                editor.model.change(writer => {
                  const insertPosition = editor.model.document.selection.getFirstPosition();
                  if (insertPosition) {
                    writer.insertText(variable.variavel, insertPosition);
                  }
                });
                dropdown.remove();
                currentDropdown = null;
                buttonView.isOn = false;
              });

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
          setTimeout(() => {
            document.addEventListener('click', removeDropdown);
          }, 100);
        }
      });

      return buttonView;
    });
  }
}
