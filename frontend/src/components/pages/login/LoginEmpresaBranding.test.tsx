import React from 'react';
import { render, screen } from '@testing-library/react';
import LoginEmpresaBranding from './LoginEmpresaBranding';

describe('LoginEmpresaBranding', () => {
  it('exibe a logo da empresa dentro do container', () => {
    render(
      <LoginEmpresaBranding
        empresaLogo="/arquivos/empresa/1/logo.png"
        empresaLogoAlt="Logo da empresa"
      />
    );

    const logo = screen.getByAltText('Logo da empresa') as HTMLImageElement;
    expect(logo.getAttribute('src')).toBe('/arquivos/empresa/1/logo.png');
    expect(logo.closest('.login-branding__empresa')).toBeTruthy();
  });

  it('usa o texto alternativo padrão quando não informado', () => {
    render(<LoginEmpresaBranding empresaLogo="/arquivos/empresa/1/logo.png" />);

    expect(screen.getByAltText('Logo da empresa')).toBeTruthy();
  });
});
