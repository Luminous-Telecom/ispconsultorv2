import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import {
  BlockdomiBaixarPdfsProgresso,
  lerStatusBaixarPdfs,
  percentualBaixarPdfs,
} from './BlockdomiBaixarPdfsModal';
import type { StatusBaixarPdfsBlockdomi } from 'services/dominioService';

function status(parcial: Partial<StatusBaixarPdfsBlockdomi> & Pick<StatusBaixarPdfsBlockdomi, 'estado'>): StatusBaixarPdfsBlockdomi {
  return {
    resultado: null,
    erro: null,
    progresso: {
      fase: 'baixando',
      total: 4,
      processados: 2,
      pdfsBaixados: 1,
      pdfsJaLocais: 1,
      registrosAtualizados: 3,
      falhas: 0,
      ignoradosNaoPdf: 0,
      atual: 'https://antigo.example/oficio.pdf',
    },
    ...parcial,
  };
}

function renderProgresso(atual: StatusBaixarPdfsBlockdomi | null, onClose = jest.fn()) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <BlockdomiBaixarPdfsProgresso status={atual} onClose={onClose} />
    </I18nProvider>
  );
}

describe('progresso do download de PDFs do Blockdomi', () => {
  it('calcula a porcentagem e ignora aviso que não é status', () => {
    expect(percentualBaixarPdfs(status({ estado: 'executando' }))).toBe(50);
    expect(percentualBaixarPdfs(status({ estado: 'concluido' }))).toBe(100);
    expect(lerStatusBaixarPdfs(null)).toBeNull();
    expect(lerStatusBaixarPdfs({ estado: 'executando' })).toBeNull();
  });

  it('mostra a leitura dos links antes de saber o total', () => {
    renderProgresso(status({
      estado: 'executando',
      progresso: {
        fase: 'lendo',
        total: 0,
        processados: 0,
        pdfsBaixados: 0,
        pdfsJaLocais: 0,
        registrosAtualizados: 0,
        falhas: 0,
        ignoradosNaoPdf: 0,
        atual: null,
      },
    }));
    expect(screen.getAllByText('Lendo os links cadastrados.').length).toBeGreaterThan(0);
  });

  it('mostra o progresso que o servidor enviou', () => {
    renderProgresso(status({ estado: 'executando' }));
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByText('2 de 4')).toBeTruthy();
    expect(screen.getByText('https://antigo.example/oficio.pdf')).toBeTruthy();
  });

  it('mostra o resultado quando o servidor conclui e o Fechar chama o callback', async () => {
    const onClose = jest.fn();
    renderProgresso(status({
      estado: 'concluido',
      resultado: {
        pdfsBaixados: 1,
        pdfsJaLocais: 1,
        registrosAtualizados: 3,
        falhas: 0,
        ignoradosNaoPdf: 0,
      },
    }), onClose);

    expect(screen.getByText(/1 PDF\(s\) gravado\(s\) neste servidor/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
