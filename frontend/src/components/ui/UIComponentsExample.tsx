import React, { useState } from 'react';
import { Button, Input, Select, Checkbox, FormField } from './index';

// Exemplo de uso dos componentes UI base
const UIComponentsExample: React.FC = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    tipo: '',
    ativo: false,
    descricao: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (value: any, name: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpar erro quando usuário digita
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação simples
    const newErrors: Record<string, string> = {};
    
    if (!formData.nome) {
      newErrors.nome = 'Nome é obrigatório';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!formData.tipo) {
      newErrors.tipo = 'Tipo é obrigatório';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      console.log('Formulário válido:', formData);
      alert('Formulário enviado com sucesso!');
    }
  };

  const options = [
    { value: 'cliente', label: 'Cliente' },
    { value: 'fornecedor', label: 'Fornecedor' },
    { value: 'funcionario', label: 'Funcionário' },
  ];

  return (
    <div className="container mt-4">
      <h2>Exemplo de Componentes UI Base</h2>
      
      <form onSubmit={handleSubmit} className="row g-3">
        <div className="col-md-6">
          <FormField
            type="text"
            label="Nome"
            name="nome"
            value={formData.nome}
            onChange={handleInputChange}
            placeholder="Digite seu nome"
            required
            error={errors.nome}
            tooltip="Nome completo da pessoa"
          />
        </div>
        
        <div className="col-md-6">
          <FormField
            type="email"
            label="Email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Digite seu email"
            required
            error={errors.email}
            tooltip="Email válido para contato"
          />
        </div>
        
        <div className="col-md-6">
          <FormField
            type="select"
            label="Tipo"
            name="tipo"
            value={formData.tipo}
            onChange={handleInputChange}
            options={options}
            placeholder="Selecione o tipo"
            required
            error={errors.tipo}
            clearable
          />
        </div>
        
        <div className="col-md-6">
          <FormField
            type="checkbox"
            label="Ativo"
            name="ativo"
            value={formData.ativo}
            onChange={handleInputChange}
            description="Marque se o registro está ativo"
            switch
          />
        </div>
        
        <div className="col-12">
          <FormField
            type="textarea"
            label="Descrição"
            name="descricao"
            value={formData.descricao}
            onChange={handleInputChange}
            placeholder="Digite uma descrição"
            rows={4}
            helpText="Descrição opcional do registro"
          />
        </div>
        
        <div className="col-12">
          <div className="d-flex gap-2">
            <Button
              type="submit"
              variant="primary"
              icon="check"
              loading={false}
            >
              Salvar
            </Button>
            
            <Button
              type="button"
              variant="secondary"
              icon="arrow-left"
              onClick={() => setFormData({ nome: '', email: '', tipo: '', ativo: false, descricao: '' })}
            >
              Limpar
            </Button>
            
            <Button
              type="button"
              variant="outline-danger"
              icon="trash"
              onClick={() => alert('Excluir?')}
            >
              Excluir
            </Button>
          </div>
        </div>
      </form>
      
      <hr className="my-4" />
      
      <h3>Exemplos de Botões</h3>
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="success">Success</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="warning">Warning</Button>
        <Button variant="info">Info</Button>
        <Button variant="light">Light</Button>
        <Button variant="dark">Dark</Button>
      </div>
      
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button variant="outline-primary">Outline Primary</Button>
        <Button variant="outline-secondary">Outline Secondary</Button>
        <Button variant="outline-success">Outline Success</Button>
        <Button variant="outline-danger">Outline Danger</Button>
      </div>
      
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
      
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button icon="plus">Com Ícone</Button>
        <Button icon="edit" iconPosition="right">Ícone Direita</Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
      </div>
      
      <h3>Exemplos de Inputs</h3>
      <div className="row g-3">
        <div className="col-md-4">
          <FormField
            type="text"
            label="Input Normal"
            name="input1"
            placeholder="Digite algo"
          />
        </div>
        
        <div className="col-md-4">
          <FormField
            type="text"
            label="Input com Ícone"
            name="input2"
            placeholder="Buscar..."
            icon="search"
          />
        </div>
        
        <div className="col-md-4">
          <FormField
            type="text"
            label="Input com Erro"
            name="input3"
            placeholder="Campo com erro"
            error="Este campo é obrigatório"
            isInvalid
          />
        </div>
      </div>
    </div>
  );
};

export default UIComponentsExample;
