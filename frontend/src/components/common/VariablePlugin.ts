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
        icon: '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2L3 7v11h14V7l-7-5zM10 4.5L15 8H5l5-3.5zM4 9h12v8H4V9z"/></svg>',
        tooltip: true,
        isToggleable: false
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

      // Ação ao clicar no botão - criar dropdown customizado
      buttonView.on('execute', () => {
        // Criar um select HTML customizado que funciona como dropdown
        const select = document.createElement('select');
        select.style.cssText = `
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 1000;
          background: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 8px;
          min-width: 200px;
          max-height: 300px;
          overflow-y: auto;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;

        // Adicionar opção padrão
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Escolher variável...';
        select.appendChild(defaultOption);

        // Adicionar variáveis organizadas por categoria
        const categories = {
          'Cliente': variables.filter(v => v.value.includes('cliente')),
          'Contrato': variables.filter(v => v.value.includes('contrato')),
          'Plano': variables.filter(v => v.value.includes('plano')),
          'Sistema': variables.filter(v => !v.value.includes('cliente') && !v.value.includes('contrato') && !v.value.includes('plano'))
        };

        Object.entries(categories).forEach(([category, vars]) => {
          if (vars.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            vars.forEach(variable => {
              const option = document.createElement('option');
              option.value = variable.value;
              option.textContent = variable.label;
              optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
          }
        });

        // Posicionar o select próximo ao botão
        const buttonElement = buttonView.element;
        if (buttonElement) {
          buttonElement.style.position = 'relative';
          buttonElement.appendChild(select);

          // Focar no select
          select.focus();

          // Evento de mudança
          select.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            if (target.value) {
              editor.model.change(writer => {
                const insertPosition = editor.model.document.selection.getFirstPosition();
                if (insertPosition) {
                  writer.insertText(target.value, insertPosition);
                }
              });
            }
            // Remover o select após uso
            select.remove();
          });

          // Remover o select ao clicar fora
          const removeSelect = (e: MouseEvent) => {
            if (!select.contains(e.target as Node) && !buttonElement.contains(e.target as Node)) {
              select.remove();
              document.removeEventListener('click', removeSelect);
            }
          };
          setTimeout(() => {
            document.addEventListener('click', removeSelect);
          }, 100);
        }
      });

      return buttonView;
    });
  }
}
