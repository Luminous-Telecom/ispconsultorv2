import { Plugin } from '@ckeditor/ckeditor5-core';
import { ButtonView } from '@ckeditor/ckeditor5-ui';

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

      // Ação ao clicar no botão - mostrar lista de variáveis
      buttonView.on('execute', () => {
        // Criar uma lista HTML simples para seleção
        const variableList = variables.map(v => `${v.label}: ${v.value}`).join('\n');
        const selectedVariable = prompt(
          `Variáveis disponíveis:\n\n${variableList}\n\nDigite o nome da variável (ex: cliente.nome):`,
          ''
        );
        
        if (selectedVariable) {
          const variableValue = `{{${selectedVariable}}}`;
          editor.model.change(writer => {
            const insertPosition = editor.model.document.selection.getFirstPosition();
            if (insertPosition) {
              writer.insertText(variableValue, insertPosition);
            }
          });
        }
      });

      return buttonView;
    });
  }
}
