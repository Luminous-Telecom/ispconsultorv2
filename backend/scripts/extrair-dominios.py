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


# Cabeçalhos de coluna para início e término da operação (PT/EN)
RE_COL_INICIO = re.compile(
    r'operation\s*begins|in[ií]cio\s*da\s*opera[cç][aã]o',
    re.I
)
RE_COL_TERMINO = re.compile(
    r'operation\s*ends\s*(?:\(unblocking\))?|unblocking|'
    r't[eé]rmino\s*da\s*opera[cç][aã]o\s*(?:\(desbloqueio\))?|desbloqueio',
    re.I
)


def _extrair_data_de_texto(texto):
    """Retorna primeira data DD/MM/YYYY encontrada no texto, ou None."""
    m = RE_DATA_BR.search(texto)
    return normalizar_data(m, 'br') if m else None


def extrair_datas_das_tabelas(page):
    """
    Extrai data_inicio e data_fim das colunas da tabela:
    - Operation Begins / Início da Operação -> data_inicio
    - Operation Ends (Unblocking) / Término da Operação (Desbloqueio) -> data_fim
    Retorna (data_inicio, data_fim).
    """
    data_inicio = None
    data_fim = None
    try:
        if not hasattr(page, 'find_tables'):
            return (None, None)
        for table in page.find_tables():
            if not hasattr(table, 'extract'):
                continue
            table_data = table.extract()
            if not table_data:
                continue
            # Busca cabeçalho nas primeiras linhas (pode haver linha de título antes)
            idx_inicio = None
            idx_termino = None
            header_row_idx = 0
            for row_idx, row in enumerate(table_data[:4]):
                if not row:
                    continue
                row_inicio = None
                row_termino = None
                for i, cell in enumerate(row):
                    if cell and isinstance(cell, str):
                        txt = re.sub(r'\s+', ' ', cell.lower())
                        if RE_COL_INICIO.search(txt):
                            row_inicio = i
                        if RE_COL_TERMINO.search(txt):
                            row_termino = i
                if row_inicio is not None or row_termino is not None:
                    idx_inicio = row_inicio
                    idx_termino = row_termino
                    header_row_idx = row_idx
                    break
            if idx_inicio is None and idx_termino is None:
                continue
            # Extrai datas das linhas de dados (após o cabeçalho)
            for row in table_data[header_row_idx + 1:]:
                if row:
                    if idx_inicio is not None and idx_inicio < len(row) and row[idx_inicio]:
                        d = _extrair_data_de_texto(str(row[idx_inicio]))
                        if d and (data_inicio is None or d < data_inicio):
                            data_inicio = d
                    if idx_termino is not None and idx_termino < len(row) and row[idx_termino]:
                        d = _extrair_data_de_texto(str(row[idx_termino]))
                        if d and (data_fim is None or d > data_fim):
                            data_fim = d
            if data_inicio or data_fim:
                break
    except Exception:
        pass
    return (data_inicio, data_fim)


def extrair_datas_operacao(texto):
    """
    Extrai data de início e término da operação.
    Apenas padrão explícito "de DD/MM/YYYY a DD/MM/YYYY" (sem fallback de menor/maior).
    Retorna (data_inicio, data_fim).
    """
    data_inicio = None
    data_fim = None
    texto_limpo = re.sub(r'\s+', ' ', texto.lower())

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

    return (data_inicio, data_fim)


def _validar_ipv4(s):
    """Valida IPv4 (4 octetos 0-255)."""
    m = re.match(r'^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$', s)
    if not m:
        return False
    for g in m.groups():
        n = int(g, 10)
        if n < 0 or n > 255:
            return False
    return True


def _validar_ipv6(s):
    """Valida IPv6 usando ipaddress."""
    try:
        import ipaddress
        ipaddress.IPv6Address(s)
        return True
    except Exception:
        return False


# Regex para IPv6 (candidatos: hex e :, pelo menos 2 grupos)
RE_IPV6_CANDIDATE = re.compile(
    r'(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|'
    r'(?:[0-9a-fA-F]{1,4}:){1,7}:|'
    r'(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|'
    r'(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|'
    r'(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|'
    r'(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|'
    r'(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|'
    r'[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|'
    r':(?::[0-9a-fA-F]{1,4}){1,7}|::'
)
RE_IPV4 = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')


def extrair_dominios_de_tabelas(page, regex_dominio):
    """
    Extrai domínios, IPv4 e IPv6 usando detecção nativa de tabelas do PyMuPDF.
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
                        if not row:
                            continue

                        # Alguns PDFs quebram IPv6 em múltiplas células da mesma linha.
                        # Ex.: "2606:4700:3030::" e "6815:3379" em células separadas.
                        # Por isso, processamos também a linha inteira concatenada.
                        row_cells = []
                        for cell in row:
                            if cell and isinstance(cell, str):
                                row_cells.append(cell.replace(' ', '').replace('\t', '').replace('\n', ''))

                        row_text = ''.join(row_cells)
                        if row_text:
                            # Domínios (exclui IPs para evitar duplicata)
                            for d in re.findall(regex_dominio, row_text):
                                if not _validar_ipv4(d) and not _validar_ipv6(d):
                                    dominios.append(d)
                            # IPv4 (valida octetos 0-255)
                            for m in RE_IPV4.finditer(row_text):
                                ip = m.group(0)
                                if _validar_ipv4(ip):
                                    dominios.append(ip)
                            # IPv6
                            for m in RE_IPV6_CANDIDATE.finditer(row_text):
                                ip = m.group(0)
                                if _validar_ipv6(ip):
                                    dominios.append(ip)
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
    data_inicio = None
    data_fim = None

    doc = fitz.open(caminho_pdf)
    try:
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Prioridade: datas das colunas da tabela (Operation Begins / Operation Ends)
            di, df = extrair_datas_das_tabelas(page)
            if di: data_inicio = di if data_inicio is None else min(data_inicio, di)
            if df: data_fim = df if data_fim is None else max(data_fim, df)

            # Área central para fallback "de X a Y" (exclui rodapé/cabeçalho)
            r = page.rect
            margem_sup = r.height * 0.10
            margem_inf = r.height * 0.15
            clip = fitz.Rect(r.x0, r.y0 + margem_sup, r.x1, r.y1 - margem_inf)
            text = page.get_text(clip=clip)
            if page_num < 3 and text:
                texto_cabecalho += text + '\n'

            dominios_tabelas = extrair_dominios_de_tabelas(page, regex_dominio)
            for d in dominios_tabelas:
                dominios_bruto.append(d)
                todos_dominios.add(d)

            page = None
    finally:
        doc.close()

    # Fallback: padrão "de DD/MM/YYYY a DD/MM/YYYY" no texto (se não achou nas colunas)
    if (data_inicio is None or data_fim is None) and texto_cabecalho:
        di, df = extrair_datas_operacao(texto_cabecalho)
        if data_inicio is None and di: data_inicio = di
        if data_fim is None and df: data_fim = df

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