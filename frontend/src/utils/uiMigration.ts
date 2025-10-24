// Arquivo de migração para implementar componentes UI da Etapa 1
// Este arquivo será removido após a migração completa

import React from 'react';

// Importar os novos componentes UI unificados
import { Button, Input, Select, Checkbox, FormField } from '../components/ui';
import { ChangeEvent } from '../components/ui/types';

// Função utilitária para migrar botões HTML para componentes Button
export const migrateButton = (element: HTMLElement): React.ReactElement | null => {
  const className = element.className;
  const text = element.textContent || '';
  const disabled = element.hasAttribute('disabled');
  
  // Extrair variante do className
  let variant: string = 'primary';
  if (className.includes('btn-secondary')) variant = 'secondary';
  else if (className.includes('btn-success')) variant = 'success';
  else if (className.includes('btn-danger')) variant = 'danger';
  else if (className.includes('btn-warning')) variant = 'warning';
  else if (className.includes('btn-info')) variant = 'info';
  else if (className.includes('btn-light')) variant = 'light';
  else if (className.includes('btn-dark')) variant = 'dark';
  else if (className.includes('btn-outline-primary')) variant = 'outline-primary';
  else if (className.includes('btn-outline-secondary')) variant = 'outline-secondary';
  else if (className.includes('btn-outline-success')) variant = 'outline-success';
  else if (className.includes('btn-outline-danger')) variant = 'outline-danger';
  else if (className.includes('btn-outline-warning')) variant = 'outline-warning';
  else if (className.includes('btn-outline-info')) variant = 'outline-info';
  else if (className.includes('btn-outline-light')) variant = 'outline-light';
  else if (className.includes('btn-outline-dark')) variant = 'outline-dark';
  
  // Extrair tamanho do className
  let size: string = 'md';
  if (className.includes('btn-sm')) size = 'sm';
  else if (className.includes('btn-lg')) size = 'lg';
  
  // Extrair ícone se existir
  const iconMatch = className.match(/bi-([a-zA-Z0-9-]+)/);
  const icon = iconMatch ? iconMatch[1] : undefined;
  
  return React.createElement(Button, {
    variant: variant as any,
    size: size as any,
    icon,
    disabled,
    onClick: () => {
      // Preservar comportamento original
      const clickEvent = new MouseEvent('click', { bubbles: true });
      element.dispatchEvent(clickEvent);
    },
    children: text
  });
};

// Função utilitária para migrar inputs HTML para componentes Input
export const migrateInput = (element: HTMLInputElement): React.ReactElement | null => {
  const {
    type,
    placeholder,
    value,
    disabled,
    required,
    className
  } = element;
  
  // Extrair tamanho do className
  let size: string = 'md';
  if (className.includes('form-control-sm')) size = 'sm';
  else if (className.includes('form-control-lg')) size = 'lg';
  
  // Extrair estado de validação
  const isInvalid = className.includes('is-invalid');
  const isValid = className.includes('is-valid');
  
  // Extrair ícone se existir
  const iconMatch = className.match(/bi-([a-zA-Z0-9-]+)/);
  const icon = iconMatch ? iconMatch[1] : undefined;
  
  return React.createElement(Input, {
    type: type as any,
    placeholder,
    value,
    disabled,
    required,
    size: size as any,
    isInvalid,
    isValid,
    icon,
    onChange: (event: ChangeEvent<string | string[]>) => {
      // Preservar comportamento original
      const value = Array.isArray(event.value) ? event.value[0] : event.value;
      element.value = value;
      const changeEvent = new Event('change', { bubbles: true });
      element.dispatchEvent(changeEvent);
    }
  });
};

// Função utilitária para migrar selects HTML para componentes Select
export const migrateSelect = (element: HTMLSelectElement): React.ReactElement | null => {
  const {
    disabled,
    required,
    className,
    multiple
  } = element;
  
  // Extrair placeholder do primeiro option vazio
  const placeholder = element.options[0]?.value === '' ? element.options[0].text : '';
  
  // Extrair opções
  const options = Array.from(element.options).map(option => ({
    value: option.value,
    label: option.text,
    disabled: option.disabled
  }));
  
  // Extrair tamanho do className
  let size: string = 'md';
  if (className.includes('form-control-sm')) size = 'sm';
  else if (className.includes('form-control-lg')) size = 'lg';
  
  // Extrair estado de validação
  const isInvalid = className.includes('is-invalid');
  const isValid = className.includes('is-valid');
  
  return React.createElement(Select, {
    options,
    placeholder,
    disabled,
    required,
    multiple,
    size: size as any,
    isInvalid,
    isValid,
    onChange: (event: ChangeEvent<string | string[]>) => {
      // Preservar comportamento original
      if (multiple) {
        Array.from(element.options).forEach(option => {
          option.selected = Array.isArray(event.value) && event.value.includes(option.value);
        });
      } else {
        element.value = Array.isArray(event.value) ? event.value[0] : event.value;
      }
      const changeEvent = new Event('change', { bubbles: true });
      element.dispatchEvent(changeEvent);
    }
  });
};

// Função utilitária para migrar checkboxes HTML para componentes Checkbox
export const migrateCheckbox = (element: HTMLInputElement): React.ReactElement | null => {
  const {
    checked,
    disabled,
    required,
    className
  } = element;
  
  // Extrair label do elemento pai ou próximo elemento
  const label = element.nextElementSibling?.textContent || '';
  
  // Extrair tamanho do className
  let size: string = 'md';
  if (className.includes('form-check-input-sm')) size = 'sm';
  else if (className.includes('form-check-input-lg')) size = 'lg';
  
  // Verificar se é switch
  const isSwitch = className.includes('form-switch');
  
  return React.createElement(Checkbox, {
    checked,
    disabled,
    required,
    label,
    switch: isSwitch,
    onChange: (event: ChangeEvent<boolean>) => {
      // Preservar comportamento original
      element.checked = event.value;
      const changeEvent = new Event('change', { bubbles: true });
      element.dispatchEvent(changeEvent);
    }
  });
};

// Função principal de migração
export const migrateUIComponents = (container: HTMLElement): void => {
  // Migrar botões
  const buttons = container.querySelectorAll('button.btn, a.btn');
  buttons.forEach(button => {
    const migratedButton = migrateButton(button as HTMLElement);
    if (migratedButton) {
      // Substituir elemento original pelo componente React
      const parent = button.parentNode;
      if (parent) {
        parent.replaceChild(migratedButton as any, button);
      }
    }
  });
  
  // Migrar inputs
  const inputs = container.querySelectorAll('input.form-control');
  inputs.forEach(input => {
    const migratedInput = migrateInput(input as HTMLInputElement);
    if (migratedInput) {
      // Substituir elemento original pelo componente React
      const parent = input.parentNode;
      if (parent) {
        parent.replaceChild(migratedInput as any, input);
      }
    }
  });
  
  // Migrar selects
  const selects = container.querySelectorAll('select.form-control');
  selects.forEach(select => {
    const migratedSelect = migrateSelect(select as HTMLSelectElement);
    if (migratedSelect) {
      // Substituir elemento original pelo componente React
      const parent = select.parentNode;
      if (parent) {
        parent.replaceChild(migratedSelect as any, select);
      }
    }
  });
  
  // Migrar checkboxes
  const checkboxes = container.querySelectorAll('input[type="checkbox"].form-check-input');
  checkboxes.forEach(checkbox => {
    const migratedCheckbox = migrateCheckbox(checkbox as HTMLInputElement);
    if (migratedCheckbox) {
      // Substituir elemento original pelo componente React
      const parent = checkbox.parentNode;
      if (parent) {
        parent.replaceChild(migratedCheckbox as any, checkbox);
      }
    }
  });
};

export default {
  migrateButton,
  migrateInput,
  migrateSelect,
  migrateCheckbox,
  migrateUIComponents
};
