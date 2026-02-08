#!/usr/bin/env python3
"""
Extrai domínios e datas (início/término da operação) de PDF usando PyMuPDF.
Uso: python extrair-dominios.py <caminho_pdf>
Retorna: JSON com dominios, data_inicio_bloqueio, data_fim_bloqueio (quando disponíveis)
"""
import re
import sys
import json
import fitz  # pymupdf

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


def extrair_dominios_pdf(caminho_pdf):
    """Extrai domínios únicos e datas de operação do PDF."""
    todos_dominios = set()
    # TLD pode ter letras, números e hífen (ex: salto-alto777bet)
    regex_dominio = r'(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?'
    texto_cabecalho = ''

    doc = fitz.open(caminho_pdf)
    try:
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text:
                if page_num < 3:
                    texto_cabecalho += text + '\n'
                # Processa linha a linha: remove espaços na linha (corrige "dom inio.info") mas mantém linhas separadas
                for linha in text.splitlines():
                    linha_limpa = linha.replace(' ', '').replace('\t', '')
                    if linha_limpa:
                        dominios = re.findall(regex_dominio, linha_limpa)
                        todos_dominios.update(dominios)
            page = None
    finally:
        doc.close()

    data_inicio, data_fim = extrair_datas_operacao(texto_cabecalho) if texto_cabecalho else (None, None)

    return {
        'dominios': sorted(todos_dominios),
        'data_inicio_bloqueio': data_inicio,
        'data_fim_bloqueio': data_fim
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Caminho do PDF não fornecido"}))
        sys.exit(1)

    try:
        resultado = extrair_dominios_pdf(sys.argv[1])
        out = {
            "success": True,
            "dominios": resultado['dominios'],
            "total": len(resultado['dominios'])
        }
        if resultado.get('data_inicio_bloqueio'):
            out["data_inicio_bloqueio"] = resultado["data_inicio_bloqueio"]
        if resultado.get('data_fim_bloqueio'):
            out["data_fim_bloqueio"] = resultado["data_fim_bloqueio"]
        print(json.dumps(out))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
