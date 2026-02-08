#!/usr/bin/env python3
"""
Extrai domínios e datas (início/término da operação) de PDF usando PyMuPDF.
Uso: python extrair-dominios.py <caminho_pdf>
Retorna: JSON com dominios, data_inicio_bloqueio, data_fim_bloqueio (quando disponíveis)
"""
import re
import sys
import json
import os

# Suprimir todos os outputs antes dos imports
_original_stdout = sys.stdout
_original_stderr = sys.stderr

class DevNull:
    def write(self, _): pass
    def flush(self): pass

sys.stdout = DevNull()
sys.stderr = DevNull()

import warnings
warnings.filterwarnings('ignore')
os.environ['PYTHONWARNINGS'] = 'ignore'
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'

import fitz  # pymupdf

# Restaura stdout/stderr após todos os imports
sys.stdout = _original_stdout
sys.stderr = _original_stderr

RE_DATA_BR = re.compile(r'\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b')


def normalizar_data(match, formato='br'):
    """Converte match para YYYY-MM-DD."""
    if formato == 'br':
        day = int(match.group(1))
        month = int(match.group(2))
        y = match.group(3)
        year = int(y) if len(y) == 4 else (2000 + int(y) if int(y) < 100 else int(y))
    else:
        year = int(match.group(1))
        month = int(match.group(2))
        day = int(match.group(3))
    if 1 <= month <= 12 and 1 <= day <= 31:
        return f"{year:04d}-{month:02d}-{day:02d}"
    return None


def extrair_datas_operacao(texto):
    """Extrai data de início e término da operação. Retorna (data_inicio, data_fim)."""
    data_inicio = None
    data_fim = None
    texto_limpo = re.sub(r'\s+', ' ', texto.lower())

    # Padrão "de DD/MM/YYYY a DD/MM/YYYY"
    rango = re.search(
        r'(?:de|entre|per[ií]odo)?\s*(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\s+(?:a|até|e)\s+(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})',
        texto_limpo, re.I
    )
    if rango:
        d1, m1, y1 = int(rango.group(1)), int(rango.group(2)), int(rango.group(3))
        d2, m2, y2 = int(rango.group(4)), int(rango.group(5)), int(rango.group(6))
        y1 = y1 if y1 >= 100 else 2000 + y1
        y2 = y2 if y2 >= 100 else 2000 + y2
        if 1 <= m1 <= 12 and 1 <= d1 <= 31:
            data_inicio = f"{y1:04d}-{m1:02d}-{d1:02d}"
        if 1 <= m2 <= 12 and 1 <= d2 <= 31:
            data_fim = f"{y2:04d}-{m2:02d}-{d2:02d}"
        if data_inicio or data_fim:
            return (data_inicio, data_fim)

    # Heurística para tabelas: menor data = início, maior = término
    datas_unicas = set()
    for match in RE_DATA_BR.finditer(texto):
        dt = normalizar_data(match, 'br')
        if dt:
            datas_unicas.add(dt)
    if len(datas_unicas) >= 2:
        ordenadas = sorted(datas_unicas)
        data_inicio = ordenadas[0]
        data_fim = ordenadas[-1]

    return (data_inicio, data_fim)


def extrair_dominios_de_tabelas(page, regex_dominio):
    """
    Extrai domínios usando detecção nativa de tabelas do PyMuPDF.
    Remove quebras de linha dentro da mesma célula antes de extrair.
    """
    dominios = []
    
    try:
        if hasattr(page, 'find_tables'):
            tables = page.find_tables()
            
            for table in tables:
                if hasattr(table, 'extract'):
                    table_data = table.extract()
                    
                    for row in table_data:
                        if row:
                            for cell in row:
                                if cell and isinstance(cell, str):
                                    # Remove quebras de linha da mesma célula (conteúdo em 2 linhas vira 1)
                                    texto_limpo = cell.replace(' ', '').replace('\t', '').replace('\n', '')
                                    dominios_encontrados = re.findall(regex_dominio, texto_limpo)
                                    dominios.extend(dominios_encontrados)
    except Exception:
        pass
    
    return dominios





def extrair_dominios_pdf(caminho_pdf):
    """
    Extrai domínios e datas de operação do PDF.
    Usa apenas detecção nativa de tabelas (find_tables).
    
    Retorna:
    - dominios: lista única ordenada
    - dominios_bruto: lista na ordem original com duplicatas
    - data_inicio_bloqueio, data_fim_bloqueio: datas quando disponíveis
    """
    todos_dominios = set()
    dominios_bruto = []
    # Inclui path opcional (ex.: embedcanaistv.com/teste) para o bruto refletir exatamente o que está na tabela
    regex_dominio = r'(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:/[a-zA-Z0-9/_.-]+)?'
    texto_cabecalho = ''

    doc = fitz.open(caminho_pdf)
    try:
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            
            # Pega cabeçalho das primeiras páginas para extração de datas
            if page_num < 3 and text:
                texto_cabecalho += text + '\n'
            
            dominios_tabelas = extrair_dominios_de_tabelas(page, regex_dominio)
            for d in dominios_tabelas:
                dominios_bruto.append(d)
                todos_dominios.add(d)
            
            page = None
    finally:
        doc.close()

    # Extrai datas de operação do cabeçalho
    data_inicio, data_fim = extrair_datas_operacao(texto_cabecalho) if texto_cabecalho else (None, None)

    return {
        'dominios': sorted(todos_dominios),
        'dominios_bruto': dominios_bruto,
        'data_inicio_bloqueio': data_inicio,
        'data_fim_bloqueio': data_fim
    }


def main():
    try:
        if len(sys.argv) < 2:
            sys.stdout.write(json.dumps({"success": False, "error": "Caminho do PDF não fornecido"}) + '\n')
            sys.stdout.flush()
            sys.exit(1)

        resultado = extrair_dominios_pdf(sys.argv[1])
        out = {
            "success": True,
            "dominios": resultado['dominios'],
            "dominios_bruto": resultado['dominios_bruto'],
            "total": len(resultado['dominios']),
            "total_bruto": len(resultado['dominios_bruto'])
        }
        if resultado.get('data_inicio_bloqueio'):
            out["data_inicio_bloqueio"] = resultado["data_inicio_bloqueio"]
        if resultado.get('data_fim_bloqueio'):
            out["data_fim_bloqueio"] = resultado["data_fim_bloqueio"]
        
        sys.stdout.write(json.dumps(out) + '\n')
        sys.stdout.flush()
    except Exception as e:
        sys.stdout.write(json.dumps({"success": False, "error": str(e)}) + '\n')
        sys.stdout.flush()
        sys.exit(1)


if __name__ == "__main__":
    main()