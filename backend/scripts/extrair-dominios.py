#!/usr/bin/env python3
"""
Extrai domínios de PDF usando PyMuPDF (memória baixa, processa página a página).
Uso: python extrair-dominios.py <caminho_pdf>
Retorna: JSON com lista de domínios
"""
import re
import sys
import json
import fitz  # pymupdf

def extrair_dominios_pdf(caminho_pdf):
    """
    Extrai domínios únicos do texto do PDF, página a página (baixo uso de memória).
    """
    todos_dominios = set()
    regex_dominio = r'(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}'

    doc = fitz.open(caminho_pdf)
    try:
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            page = None  # libera referência
            if text:
                text_limpo = text.replace('\n', '').replace('\r', '').replace(' ', '')
                dominios = re.findall(regex_dominio, text_limpo)
                todos_dominios.update(dominios)
    finally:
        doc.close()

    return sorted(todos_dominios)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Caminho do PDF não fornecido"}))
        sys.exit(1)

    caminho_pdf = sys.argv[1]

    try:
        dominios = extrair_dominios_pdf(caminho_pdf)
        print(json.dumps({
            "success": True,
            "dominios": dominios,
            "total": len(dominios)
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
