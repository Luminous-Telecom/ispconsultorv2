#!/usr/bin/env python3
"""
Extrai domínios de PDF usando pdfplumber (APENAS de tabelas).
Uso: python extrair-dominios.py <caminho_pdf>
Retorna: JSON com lista de domínios
CÓPIA EXATA DO SCRIPT extrair.py QUE FUNCIONA
"""
import pdfplumber
import re
import sys
import json

def extrair_dominios_pdf(caminho_pdf):
    """
    Extrai domínios únicos de tabelas em PDF, juntando quebras de linha
    CÓPIA EXATA da função do script extrair.py que funciona
    """
    todos_dominios = set()  # Usar set para evitar duplicatas
    
    # Regex para identificar domínios (IGUAL ao script original)
    regex_dominio = r'(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}'
    
    with pdfplumber.open(caminho_pdf) as pdf:
        for num_pagina, pagina in enumerate(pdf.pages, 1):
            # Extrair tabelas da página
            tabelas = pagina.extract_tables()
            
            if tabelas:
                for tabela in tabelas:
                    for linha in tabela:
                        if linha:
                            for celula in linha:
                                if celula:
                                    # Remove quebras de linha e espaços extras
                                    celula_limpa = str(celula).replace('\n', '').replace('\r', '').replace(' ', '')
                                    
                                    # Encontrar todos os domínios na célula
                                    dominios_encontrados = re.findall(regex_dominio, celula_limpa)
                                    todos_dominios.update(dominios_encontrados)
    
    return sorted(todos_dominios)  # Retorna lista ordenada alfabeticamente

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
