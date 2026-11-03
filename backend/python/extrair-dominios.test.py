#!/usr/bin/env python3
"""Tabela com linhas mais próximas que o snap do find_tables (3pt) ainda entrega todos os domínios."""
import importlib.util
import os
import tempfile
import unittest

import pymupdf

_AQUI = os.path.dirname(os.path.abspath(__file__))
_SPEC = importlib.util.spec_from_file_location(
    'extrair_dominios',
    os.path.join(_AQUI, 'extrair-dominios.py'),
)
extrair = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(extrair)


def _pdf_tabela(caminho, dominios, passo):
    doc = pymupdf.open()
    altura = max(842, 50 + len(dominios) * passo + 20)
    page = doc.new_page(width=595, height=altura)
    x0, x1, x2 = 36, 160, 280
    y_topo = 28
    y = 46
    fonte = min(8, max(0.8, passo * 0.55))
    page.insert_text((x0 + 2, y_topo + 10), 'URL / Endereco IP do Host', fontsize=8)
    page.insert_text((x1 + 2, y_topo + 10), 'Data', fontsize=8)
    page.draw_line(pymupdf.Point(x0, y_topo), pymupdf.Point(x2, y_topo), width=0.4)
    page.draw_line(pymupdf.Point(x0, y), pymupdf.Point(x2, y), width=0.4)
    for dominio in dominios:
        baseline = y + passo * 0.72
        page.insert_text((x0 + 2, baseline), dominio, fontsize=fonte)
        page.insert_text((x1 + 2, baseline), '14/10/2026', fontsize=fonte)
        y += passo
        page.draw_line(pymupdf.Point(x0, y), pymupdf.Point(x2, y), width=0.2)
    page.draw_line(pymupdf.Point(x0, y_topo), pymupdf.Point(x0, y), width=0.4)
    page.draw_line(pymupdf.Point(x1, y_topo), pymupdf.Point(x1, y), width=0.4)
    page.draw_line(pymupdf.Point(x2, y_topo), pymupdf.Point(x2, y), width=0.4)
    doc.save(caminho)
    doc.close()


class ExtrairDominiosGradeDensaTest(unittest.TestCase):
    def test_grade_apertada_devolve_todos_os_dominios(self):
        dominios = [f'host{i}.example.com' for i in range(80)]
        with tempfile.TemporaryDirectory() as pasta:
            caminho = os.path.join(pasta, 'denso.pdf')
            _pdf_tabela(caminho, dominios, passo=1.5)
            colunas = extrair.extrair_dados_pdf(caminho)
        obtidos = sorted({item for lista in colunas.values() for item in lista})
        self.assertEqual(obtidos, sorted(dominios))

    def test_tabela_normal_continua_pelo_find_tables(self):
        dominios = ['alpha.example.com', 'beta.example.net', 'gamma.example.org']
        with tempfile.TemporaryDirectory() as pasta:
            caminho = os.path.join(pasta, 'normal.pdf')
            _pdf_tabela(caminho, dominios, passo=18)
            doc = pymupdf.open(caminho)
            self.assertIsNone(extrair._tabela_por_grade_densa(doc[0]))
            doc.close()
            colunas = extrair.extrair_dados_pdf(caminho)
        obtidos = sorted({item for lista in colunas.values() for item in lista})
        self.assertEqual(obtidos, sorted(dominios))


if __name__ == '__main__':
    unittest.main()
