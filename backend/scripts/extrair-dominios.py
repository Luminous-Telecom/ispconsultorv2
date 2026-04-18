#!/usr/bin/env python3
"""
Extrai domínios e IPs das colunas-alvo de PDFs.

Uso: python extrair-dominios.py <caminho_pdf>
Retorna: JSON com os dados extraídos
"""
import re
import sys
import json
import os
import ipaddress

# Suprime outputs de bibliotecas durante o import
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
    import pymupdf as fitz  # type: ignore[no-redef]  # pymupdf >= 1.25

sys.stdout, sys.stderr = _orig_out, _orig_err


def _log(msg):
    try:
        sys.stderr.write(f"[extrair-dominios] {msg}\n")
        sys.stderr.flush()
    except Exception:
        pass


def _normalizar(texto):
    import unicodedata
    base = (texto or '').strip().lower()
    sem_acc = ''.join(c for c in unicodedata.normalize('NFD', base) if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', sem_acc)


_RE_DOMINIO = re.compile(
    r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)'
    r'+[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?'
    r'(?:/[a-zA-Z0-9/_.-]+)?$'
)
_RE_TLD_REAL = re.compile(r'^[a-zA-Z]{2,20}$')


def _eh_ip(texto):
    try:
        ipaddress.ip_address(texto)
        return True
    except ValueError:
        return False


def _eh_dominio_ou_ip(texto):
    t = (texto or '').strip()
    return bool(t and (_eh_ip(t) or _RE_DOMINIO.match(t)))


def _dominio_parece_completo(texto):
    if not texto:
        return False
    if _eh_ip(texto):
        return True
    partes = texto.split('/')
    labels = partes[0].split('.')
    if len(labels) < 2:
        return False
    return bool(_RE_TLD_REAL.match(labels[-1]))


def _remontar_dominios_quebrados(tokens):
    resultado = []
    i = 0
    while i < len(tokens):
        token = tokens[i].strip()
        if not token:
            i += 1
            continue

        if _dominio_parece_completo(token) and _eh_dominio_ou_ip(token):
            resultado.append(token)
            i += 1
            continue

        # Fragmento: tenta concatenar com os próximos (até 6)
        acc = token
        j = i + 1
        encontrou = False
        while j < len(tokens) and (j - i) <= 6:
            prox = tokens[j].strip()
            j += 1
            if not prox:
                continue
            acc += prox
            if _dominio_parece_completo(acc) and _eh_dominio_ou_ip(acc):
                resultado.append(acc)
                i = j
                encontrou = True
                break

        if not encontrou:
            i = j if j > i + 1 else i + 1

    return resultado


def _extrair_dados_celula(texto):
    if not texto or not isinstance(texto, str):
        return []
    tokens = [
        tok for linha in texto.replace('\t', ' ').split('\n')
        for tok in re.split(r'[\s,;]+', linha.strip()) if tok.strip()
    ]
    return _remontar_dominios_quebrados(tokens)


def _classificar_cabecalho(texto):
    norm = _normalizar(texto)
    if not norm:
        return None
    if 'dominios ja bloqueados' in norm or 'blocked domains' in norm:
        return 'dominios_bloqueados'
    if ('novos dominios' in norm and 'bloqueio' in norm) or 'new domains for blocking' in norm:
        return 'novos_dominios'
    if ('url' in norm and 'endereco' in norm and 'host' in norm) or \
       ('url' in norm and 'address' in norm and 'host' in norm):
        return 'url_host'
    if ('ip' in norm and 'host' in norm and 'address' in norm) or 'ip host address' in norm:
        return 'ip_host'
    return None


_CHAVES = ('dominios_bloqueados', 'novos_dominios', 'url_host', 'ip_host')


def _buscar_cabecalho(table_data):
    indices = {k: None for k in _CHAVES}
    header_row = None
    for row_idx, row in enumerate(table_data or []):
        for col_idx, cell in enumerate(row or []):
            campo = _classificar_cabecalho(cell)
            if campo and indices[campo] is None:
                indices[campo] = col_idx
                if header_row is None:
                    header_row = row_idx
    return (indices, header_row) if any(v is not None for v in indices.values()) else (None, None)


def _detectar_coluna_por_conteudo(table_data):
    """Detecta a coluna com ≥ 40 % de domínios/IPs válidos."""
    if not table_data:
        return None
    num_cols = max((len(r) for r in table_data if r), default=0)
    scores = {}
    for col in range(num_cols):
        celulas = [str(r[col]) for r in table_data if r and col < len(r) and r[col] and str(r[col]).strip()]
        if celulas:
            scores[col] = sum(1 for c in celulas if _extrair_dados_celula(c)) / len(celulas)
    melhor = max(scores, key=scores.get, default=None)
    if melhor is not None and scores[melhor] >= 0.40:
        return {**{k: None for k in _CHAVES}, 'url_host': melhor}
    return None


def _extrair_por_indices(table_data, indices, start_row=0):
    dados = {k: [] for k in _CHAVES}
    for row in table_data[start_row:]:
        if not row:
            continue
        for chave, col in indices.items():
            if col is not None and col < len(row) and row[col]:
                dados[chave].extend(_extrair_dados_celula(str(row[col])))
    return dados


def _merge(destino, origem):
    for k in _CHAVES:
        destino[k].extend(origem[k])


def extrair_dados_de_tabelas(page, indices_conhecidos=None):
    """
    Extrai dados de todas as tabelas da página.

    Prioridade:
    1. Cabeçalho reconhecido → usa e atualiza os índices ativos.
    2. Índices conhecidos (continuação de tabela multi-página) → reutiliza.
    3. Último recurso: detecção por conteúdo (sem contexto anterior).
    """
    dados = {k: [] for k in _CHAVES}
    novos_indices = None
    try:
        for table in (page.find_tables() if hasattr(page, 'find_tables') else []):
            if not hasattr(table, 'extract'):
                continue
            td = table.extract()
            if not td:
                continue

            indices, hrow = _buscar_cabecalho(td)
            if indices is not None:
                novos_indices = indices
                _merge(dados, _extrair_por_indices(td, indices, (hrow + 1) if hrow is not None else 0))
            elif indices_conhecidos is not None:
                _merge(dados, _extrair_por_indices(td, indices_conhecidos))
            else:
                ic = _detectar_coluna_por_conteudo(td)
                if ic:
                    _merge(dados, _extrair_por_indices(td, ic))
    except Exception as e:
        _log(f"Erro ao extrair dados de tabelas: {e}")
    return dados, novos_indices


def extrair_dados_pdf(caminho_pdf):
    consolidado = {k: [] for k in _CHAVES}
    try:
        doc = fitz.open(caminho_pdf)
        try:
            indices_ativos = None
            num_pages = len(doc)
            for n, page in enumerate(doc):
                _log(f"processando página {n + 1}/{num_pages}")
                dados_pag, novos = extrair_dados_de_tabelas(page, indices_ativos)
                if novos is not None:
                    indices_ativos = novos
                _merge(consolidado, dados_pag)
        finally:
            doc.close()
    except Exception as e:
        _log(f"Erro ao processar PDF: {e}")
        raise

    for k in _CHAVES:
        consolidado[k] = sorted(dict.fromkeys(consolidado[k]))

    totais = {k: len(consolidado[k]) for k in _CHAVES}
    _log(f"totais_por_coluna: {json.dumps(totais, ensure_ascii=False)}")
    return consolidado


def main():
    try:
        if len(sys.argv) < 2:
            sys.stdout.write(json.dumps({"success": False, "error": "Caminho do PDF não fornecido"}) + '\n')
            sys.exit(1)
        r = extrair_dados_pdf(sys.argv[1])
        out = {
            "success": True,
            **r,
            **{f"total_{k}": len(v) for k, v in r.items()},
        }
        sys.stdout.write(json.dumps(out, ensure_ascii=False) + '\n')
        sys.stdout.flush()
    except Exception as e:
        sys.stdout.write(json.dumps({"success": False, "error": str(e)}) + '\n')
        sys.stdout.flush()
        sys.exit(1)


if __name__ == "__main__":
    main()
