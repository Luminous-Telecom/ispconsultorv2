#!/usr/bin/env python3
"""
Extrai o número SEI do ofício da Anatel a partir do texto do PDF assinado.

Prioridade:
1. "código verificador NNN" (página de autenticidade — identifica o documento)
2. Último "SEI nº NNN" / "SEI n° NNN" nas últimas páginas (rodapé do ofício)

Uso: python extrair-sei-anatel.py <caminho_pdf>
Saída: JSON {"success": true, "sei": "15497675"} ou {"success": false, "message": "..."}
"""
import json
import re
import sys
import os

_orig_out, _orig_err = sys.stdout, sys.stderr

class _Null:
    def write(self, _): pass
    def flush(self): pass

sys.stdout = sys.stderr = _Null()
import warnings
warnings.filterwarnings('ignore')
os.environ.update({'PYTHONWARNINGS': 'ignore', 'PYTHONDONTWRITEBYTECODE': '1'})

try:
    import fitz  # pymupdf < 1.25
except ModuleNotFoundError:
    import pymupdf as fitz  # type: ignore[no-redef]

sys.stdout, sys.stderr = _orig_out, _orig_err

# Código verificador na página de autenticidade (número SEI deste documento)
_RE_VERIFICADOR = re.compile(
    r'(?:c[oó]digo\s+)?verificador\s+(\d{6,12})',
    re.IGNORECASE,
)
# Rodapé / referência: SEI nº 12345678
_RE_SEI_NO = re.compile(
    r'SEI\s+n[º°oO\.]?\s*(\d{6,12})',
    re.IGNORECASE,
)


def _texto_final_doc(doc, ultimas_paginas: int = 4) -> str:
    n = len(doc)
    if n == 0:
        return ''
    start = max(0, n - ultimas_paginas)
    partes = []
    for i in range(start, n):
        try:
            partes.append(doc.load_page(i).get_text() or '')
        except Exception:
            continue
    return '\n'.join(partes)


def extrair_sei(pdf_path: str) -> dict:
    if not pdf_path or not os.path.isfile(pdf_path):
        return {'success': False, 'message': 'Arquivo PDF não encontrado'}
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        return {'success': False, 'message': f'Não foi possível abrir o PDF: {e}'}

    try:
        texto_final = _texto_final_doc(doc, 5)
        texto_completo = '\n'.join(
            (doc.load_page(i).get_text() or '') for i in range(len(doc))
        )
    finally:
        doc.close()

    if not (texto_final or texto_completo).strip():
        return {'success': False, 'message': 'Nenhum texto extraído do PDF'}

    # 1) Autenticidade Anatel
    for rx in (_RE_VERIFICADOR,):
        m = rx.search(texto_final)
        if m:
            return {'success': True, 'sei': m.group(1)}

    # 2) Último SEI nº no trecho final (ofício Anatel costuma repetir o mesmo no rodapé)
    tail = texto_final if len(texto_final) >= 500 else texto_completo[-8000:]
    matches = list(_RE_SEI_NO.finditer(tail))
    if matches:
        return {'success': True, 'sei': matches[-1].group(1)}

    return {'success': False, 'message': 'Não foi encontrado número SEI no texto do PDF'}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'message': 'Uso: extrair-sei-anatel.py <caminho_pdf>'}))
        sys.exit(1)
    out = extrair_sei(sys.argv[1])
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    main()
