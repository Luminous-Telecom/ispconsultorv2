import { Plugin } from 'ckeditor5';
import { ButtonView } from 'ckeditor5';

export default class VariablePlugin extends Plugin {
  static get pluginName() {
    return 'VariablePlugin';
  }

  init() {
    const editor = this.editor;

    // Adiciona o botão de variáveis à barra de ferramentas
    editor.ui.componentFactory.add('variablesDropdown', locale => {
      const buttonView = new ButtonView(locale);

      // Configurar o botão principal
      buttonView.set({
        label: 'Variáveis',
        withText: true,
        tooltip: true,
        isToggleable: false
      });

      // Adicionar classes CSS corretas do CKEditor5 após renderização
      buttonView.on('render', () => {
        const buttonElement = buttonView.element;
        if (buttonElement) {
          // Adicionar classes CSS do CKEditor5 para ficar igual aos outros botões
          buttonElement.classList.add('ck-button', 'ck-dropdown__button');
          
          // Adicionar setinha de dropdown
          const arrow = document.createElement('span');
          arrow.className = 'ck-button__arrow';
          arrow.innerHTML = '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 7l5 5 5-5z" fill="currentColor"/></svg>';
          arrow.style.cssText = `
            margin-left: 4px;
            display: inline-block;
            vertical-align: middle;
            width: 12px;
            height: 12px;
          `;
          
          // Adicionar a setinha ao botão
          buttonElement.appendChild(arrow);
        }
      });

      // Lista de variáveis disponíveis
      const variables = [
        { label: 'Nome do Cliente', value: '{{cliente.nome}}' },
        { label: 'Razão Social', value: '{{cliente.razao_social}}' },
        { label: 'CPF/CNPJ', value: '{{cliente.cpf_cnpj}}' },
        { label: 'Endereço', value: '{{cliente.endereco}}' },
        { label: 'Cidade', value: '{{cliente.cidade}}' },
        { label: 'Estado', value: '{{cliente.estado}}' },
        { label: 'CEP', value: '{{cliente.cep}}' },
        { label: 'Telefone', value: '{{cliente.telefone}}' },
        { label: 'Email', value: '{{cliente.email}}' },
        { label: 'Número do Contrato', value: '{{contrato.numero}}' },
        { label: 'Data de Início', value: '{{contrato.data_inicio}}' },
        { label: 'Data de Fim', value: '{{contrato.data_fim}}' },
        { label: 'Valor do Contrato', value: '{{contrato.valor}}' },
        { label: 'Status do Contrato', value: '{{contrato.status}}' },
        { label: 'Nome do Plano', value: '{{plano.nome}}' },
        { label: 'Descrição do Plano', value: '{{plano.descricao}}' },
        { label: 'Valor do Plano', value: '{{plano.valor}}' },
        { label: 'Data Atual', value: '{{data_atual}}' },
        { label: 'Hora Atual', value: '{{hora_atual}}' },
        { label: 'Nome do Usuário', value: '{{usuario.nome}}' }
      ];

      // Ação ao clicar no botão - criar dropdown que se parece com o "Choose heading"
      buttonView.on('execute', () => {
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

        // Adicionar variáveis organizadas por categoria
        const categories = {
          'Cliente': variables.filter(v => v.value.includes('cliente')),
          'Contrato': variables.filter(v => v.value.includes('contrato')),
          'Plano': variables.filter(v => v.value.includes('plano')),
          'Sistema': variables.filter(v => !v.value.includes('cliente') && !v.value.includes('contrato') && !v.value.includes('plano'))
        };

        Object.entries(categories).forEach(([category, vars]) => {
          if (vars.length > 0) {
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
            categoryDiv.textContent = category;
            dropdown.appendChild(categoryDiv);

            // Adicionar variáveis da categoria
            vars.forEach(variable => {
              const item = document.createElement('div');
              item.className = 'ck-dropdown__item';
              item.style.cssText = `
                padding: 6px 12px;
                cursor: pointer;
                font-size: 13px;
                color: #333;
                border-bottom: 1px solid #f0f0f0;
                transition: background-color 0.2s;
              `;
              item.textContent = variable.label;

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
                    writer.insertText(variable.value, insertPosition);
                  }
                });
                dropdown.remove();
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

          // Remover o dropdown ao clicar fora
          const removeDropdown = (e: MouseEvent) => {
            if (!dropdown.contains(e.target as Node) && !buttonElement.contains(e.target as Node)) {
              dropdown.remove();
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
