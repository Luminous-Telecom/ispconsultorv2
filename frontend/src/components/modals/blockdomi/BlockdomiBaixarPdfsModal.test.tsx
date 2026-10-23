import React from 'react';
import { render, screen } from '@testing-library/react';
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
      motivo: null,
    },
    ...parcial,
  };
}

function renderProgresso(atual: StatusBaixarPdfsBlockdomi | null) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <BlockdomiBaixarPdfsProgresso status={atual} />
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
        motivo: null,
      },
    }));
    expect(screen.getAllByText('Lendo os links cadastrados.').length).toBeGreaterThan(0);
  });

  it('mostra o círculo, a barra e o arquivo no painel de log', () => {
    renderProgresso(status({ estado: 'executando' }));
    expect(document.querySelector('.spinner-border')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('2 de 4')).toBeTruthy();
    expect(screen.getByRole('log').textContent).toContain('https://antigo.example/oficio.pdf');
  });

  it('acumula cada arquivo novo no painel sem repetir o atual', () => {
    localStorage.setItem('app-language', 'pt-BR');
    const primeiro = status({ estado: 'executando' });
    const { rerender } = render(
      <I18nProvider>
        <BlockdomiBaixarPdfsProgresso status={primeiro} />
      </I18nProvider>
    );
    rerender(
      <I18nProvider>
        <BlockdomiBaixarPdfsProgresso status={status({ estado: 'executando' })} />
      </I18nProvider>
    );
    rerender(
      <I18nProvider>
        <BlockdomiBaixarPdfsProgresso
          status={status({
            estado: 'executando',
            progresso: {
              ...primeiro.progresso,
              processados: 3,
              atual: 'https://antigo.example/segundo.pdf',
            },
          })}
        />
      </I18nProvider>
    );

    const texto = screen.getByRole('log').textContent ?? '';
    expect(texto).toContain('https://antigo.example/oficio.pdf');
    expect(texto).toContain('https://antigo.example/segundo.pdf');
    expect(texto.match(/oficio\.pdf/g)).toHaveLength(1);
  });

  it('mostra o motivo de cada arquivo e o resumo agrupado', () => {
    renderProgresso(status({
      estado: 'concluido',
      progresso: {
        fase: 'baixando',
        total: 2,
        processados: 2,
        pdfsBaixados: 0,
        pdfsJaLocais: 1,
        registrosAtualizados: 0,
        falhas: 1,
        ignoradosNaoPdf: 0,
        atual: 'https://antigo.example/oficio.pdf',
        motivo: { codigo: 'http', detalhe: '404' },
      },
      resultado: {
        pdfsBaixados: 0,
        pdfsJaLocais: 1,
        registrosAtualizados: 0,
        falhas: 1,
        ignoradosNaoPdf: 0,
        ocorrencias: [
          { codigo: 'http', detalhe: '404', quantidade: 400 },
          { codigo: 'timeout', detalhe: null, quantidade: 109 },
        ],
      },
    }));

    const texto = screen.getByRole('log').textContent ?? '';
    expect(texto).toContain('https://antigo.example/oficio.pdf — o servidor de origem respondeu 404');
    expect(texto).toContain('o servidor de origem respondeu 404: 400');
    expect(texto).toContain('o tempo de download esgotou: 109');
  });

  it('lê o motivo do socket e ignora código desconhecido', () => {
    const lido = lerStatusBaixarPdfs({
      estado: 'concluido',
      resultado: {
        pdfsBaixados: 0,
        pdfsJaLocais: 0,
        registrosAtualizados: 0,
        falhas: 1,
        ignoradosNaoPdf: 0,
        ocorrencias: [{ codigo: 'nao_pdf', detalhe: null, quantidade: 2 }],
      },
      erro: null,
      progresso: {
        fase: 'baixando',
        total: 1,
        processados: 1,
        atual: 'https://antigo.example/a.pdf',
        motivo: { codigo: 'fantasia', detalhe: 'x' },
      },
    });
    expect(lido?.progresso.motivo).toBeNull();
    expect(lido?.resultado?.ocorrencias).toEqual([{ codigo: 'nao_pdf', detalhe: null, quantidade: 2 }]);
  });

  it('mostra o resultado no painel e não renderiza o botão Fechar', () => {
    renderProgresso(status({
      estado: 'concluido',
      resultado: {
        pdfsBaixados: 1,
        pdfsJaLocais: 1,
        registrosAtualizados: 3,
        falhas: 0,
        ignoradosNaoPdf: 0,
        ocorrencias: [],
      },
    }));

    expect(screen.getByRole('log').textContent).toMatch(/1 PDF\(s\) gravado\(s\) neste servidor/);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fechar' })).toBeNull();
  });
});
