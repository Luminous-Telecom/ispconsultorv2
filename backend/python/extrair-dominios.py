#!/usr/bin/env python3
"""
Extrai domínios e IPs de tabelas em PDFs.

Detecção de cabeçalho 100% dinâmica: qualquer linha onde a maioria das células
não contenha domínios/IPs válidos é tratada como cabeçalho. Os textos das células
daquela linha viram os nomes das colunas retornadas.

Uso: python extrair-dominios.py <caminho_pdf>
Retorna: JSON { success, colunas: {header: [items]}, dominios_bruto: [...], total_bruto: N }
"""
import re
import sys
import json
import os
import ipaddress

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


def _eh_celula_cabecalho(texto):
    """True se o texto não contém nenhum domínio ou IP válido — típico de célula de cabeçalho."""
    t = (texto or '').strip()
    if not t:
        return False
    return len(_extrair_dados_celula(t)) == 0


def _detectar_linha_cabecalho(table_data):
    """
    Retorna o índice da linha de cabeçalho.
    Verifica as primeiras 5 linhas e retorna a primeira onde
    a maioria das células não contém domínios/IPs (ou seja, parece texto de título).
    Retorna None se nenhuma linha qualificar.
    """
    for row_idx, row in enumerate((table_data or [])[:5]):
        if not row:
            continue
        celulas = [str(c).strip() for c in row if c and str(c).strip()]
        if not celulas:
            continue
        n_cabecalho = sum(1 for c in celulas if _eh_celula_cabecalho(c))
        if n_cabecalho / len(celulas) > 0.5:
            return row_idx
    return None


def _detectar_colunas_por_conteudo(table_data):
    """
    Fallback quando não há linha de cabeçalho detectável.
    Retorna {col_idx: 'Coluna N'} para cada coluna com ≥ 40% de células válidas.
    """
    if not table_data:
        return {}
    num_cols = max((len(r) for r in table_data if r), default=0)
    resultado = {}
    n = 1
    for col in range(num_cols):
        celulas = [str(r[col]) for r in table_data if r and col < len(r) and r[col] and str(r[col]).strip()]
        if celulas:
            score = sum(1 for c in celulas if _extrair_dados_celula(c)) / len(celulas)
            if score >= 0.40:
                resultado[col] = f'Coluna {n}'
                n += 1
    return resultado


def _extrair_por_colunas(table_data, colunas_idx, start_row=0):
    """
    Extrai itens válidos de cada coluna indicada em colunas_idx {col_idx: header_text}.
    Retorna {header_text: [items]}.
    """
    colunas_dados = {}
    for row in table_data[start_row:]:
        if not row:
            continue
        for col_idx, header_text in colunas_idx.items():
            if col_idx < len(row) and row[col_idx]:
                items = _extrair_dados_celula(str(row[col_idx]))
                if items:
                    if header_text not in colunas_dados:
                        colunas_dados[header_text] = []
                    colunas_dados[header_text].extend(items)
    return colunas_dados


def _limpar_texto_cabecalho(texto):
    """Normaliza o texto de uma célula de cabeçalho: remove quebras de linha e espaços extras."""
    if not texto:
        return ''
    return re.sub(r'\s+', ' ', str(texto).replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')).strip()


# find_tables junta réguas mais próximas que este valor (snap_tolerance padrão).
_SNAP_TABELA_PADRAO = 3.0
_GRADE_DENSA_MIN_GAPS = 12


def _agrupar_coords(valores, tol):
    if not valores:
        return []
    ordenados = sorted(valores)
    grupos = [[ordenados[0]]]
    for valor in ordenados[1:]:
        if valor - grupos[-1][-1] <= tol:
            grupos[-1].append(valor)
        else:
            grupos.append([valor])
    return [sum(grupo) / len(grupo) for grupo in grupos]


def _acumular_segmento(horizontais, verticais, x0, y0, x1, y1):
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    if dy <= 0.4 and dx >= 12:
        horizontais.append((y0 + y1) / 2)
    elif dx <= 0.4 and dy >= 3:
        verticais.append((x0 + x1) / 2)


def _tabela_por_grade_densa(page):
    """
    Monta a tabela pelas réguas do PDF quando as linhas são mais próximas
    que o snap padrão do find_tables. Nesse caso o find_tables funde centenas
    de linhas numa célula só e o remonte de texto inventa domínios.
    """
    horizontais = []
    verticais = []
    try:
        desenhos = page.get_drawings()
    except Exception:
        return None
    for desenho in desenhos:
        for item in desenho.get('items') or []:
            tipo = item[0]
            if tipo == 'l':
                p1, p2 = item[1], item[2]
                _acumular_segmento(horizontais, verticais, p1.x, p1.y, p2.x, p2.y)
            elif tipo == 're':
                rect = item[1]
                _acumular_segmento(horizontais, verticais, rect.x0, rect.y0, rect.x1, rect.y0)
                _acumular_segmento(horizontais, verticais, rect.x0, rect.y1, rect.x1, rect.y1)
                _acumular_segmento(horizontais, verticais, rect.x0, rect.y0, rect.x0, rect.y1)
                _acumular_segmento(horizontais, verticais, rect.x1, rect.y0, rect.x1, rect.y1)
    ys = _agrupar_coords(horizontais, 0.45)
    xs = _agrupar_coords(verticais, 0.8)
    if len(ys) < 4 or len(xs) < 2:
        return None
    gaps = [b - a for a, b in zip(ys, ys[1:]) if b - a > 0.35]
    if sum(1 for gap in gaps if gap <= _SNAP_TABELA_PADRAO) < _GRADE_DENSA_MIN_GAPS:
        return None

    palavras = page.get_text('words') or []
    faixas_y = [(y0, y1) for y0, y1 in zip(ys, ys[1:]) if y1 - y0 >= 0.35]
    faixas_x = list(zip(xs, xs[1:]))
    por_linha = [[] for _ in faixas_y]
    for palavra in palavras:
        cy = (palavra[1] + palavra[3]) / 2
        linha = None
        for i, (y0, y1) in enumerate(faixas_y):
            if y0 <= cy < y1:
                linha = i
                break
        if linha is None:
            continue
        por_linha[linha].append(palavra)

    tabela = []
    for da_faixa in por_linha:
        celulas = []
        for x0, x1 in faixas_x:
            partes = [
                palavra[4]
                for palavra in sorted(da_faixa, key=lambda item: (item[0], item[1]))
                if x0 <= (palavra[0] + palavra[2]) / 2 < x1
            ]
            celulas.append(' '.join(partes))
        tabela.append(celulas)
    return tabela or None


def _escolher_cabecalho_largo(table_data):
    """
    Entre as linhas anteriores ao primeiro domínio, fica com a que tem mais
    células preenchidas — o título do ofício ocupa uma linha, o nome real
    da coluna vem numa linha seguinte.
    """
    melhor = None
    melhor_n = -1
    for row_idx, row in enumerate((table_data or [])[:12]):
        if not row:
            continue
        if any(_extrair_dados_celula(str(celula)) for celula in row if celula):
            break
        celulas = [str(celula).strip() for celula in row if celula and str(celula).strip()]
        if celulas and len(celulas) >= melhor_n and all(_eh_celula_cabecalho(c) for c in celulas):
            melhor = row_idx
            melhor_n = len(celulas)
    return melhor


def _agregar_tabela(td, colunas_ativas, grade_densa=False):
    colunas_agregado = {}
    novos_colunas = None
    num_cols = max((len(r) for r in td if r), default=0)
    if num_cols == 0:
        return colunas_agregado, novos_colunas

    if grade_densa:
        hrow = _escolher_cabecalho_largo(td)
        if hrow is not None:
            colunas_idx = _construir_colunas_idx(td, hrow, num_cols)
            novos_colunas = colunas_idx
            start = hrow + 1
        elif colunas_ativas:
            colunas_idx = colunas_ativas
            start = 0
        else:
            colunas_idx = _detectar_colunas_por_conteudo(td)
            start = 0
    elif colunas_ativas is None:
        hrow = _detectar_linha_cabecalho(td)
        if hrow is not None:
            colunas_idx = _construir_colunas_idx(td, hrow, num_cols)
            novos_colunas = colunas_idx
            start = hrow + 1
        else:
            colunas_idx = _detectar_colunas_por_conteudo(td)
            start = 0
    elif num_cols > len(colunas_ativas):
        hrow = _detectar_linha_cabecalho(td)
        if hrow is not None:
            colunas_idx = _construir_colunas_idx(td, hrow, num_cols)
            novos_colunas = colunas_idx
            start = hrow + 1
        else:
            colunas_idx = colunas_ativas
            start = 0
    else:
        colunas_idx = colunas_ativas
        start = 0

    if not colunas_idx:
        return colunas_agregado, novos_colunas

    dados = _extrair_por_colunas(td, colunas_idx, start)
    for header, items in dados.items():
        colunas_agregado.setdefault(header, []).extend(items)
    return colunas_agregado, novos_colunas


def _construir_colunas_idx(td, hrow, num_cols):
    """
    Constrói {col_idx: header_text} para TODAS as colunas da tabela.
    Células vazias ou ausentes no header recebem nome gerado 'Coluna N',
    garantindo que nenhuma coluna com dados seja perdida.
    """
    header_row = (td[hrow] if hrow is not None and hrow < len(td) else None) or []
    colunas_idx = {}
    gen_n = 1
    for col_idx in range(num_cols):
        cell = header_row[col_idx] if col_idx < len(header_row) else None
        text = _limpar_texto_cabecalho(cell) if cell else ''
        if not text:
            text = f'Coluna {gen_n}'
            gen_n += 1
        colunas_idx[col_idx] = text
    return colunas_idx


def extrair_dados_de_tabelas(page, colunas_ativas=None):
    """
    Extrai dados de todas as tabelas da página.

    - Primeira ocorrência (colunas_ativas=None): detecta linha de cabeçalho; se não
      encontrar, usa 'Coluna N' para cada coluna com conteúdo válido (fallback).
    - Páginas de continuação (colunas_ativas definido): reutiliza a estrutura
      conhecida sem tentar re-detectar o cabeçalho, evitando falsos positivos.
      Exceção: se a tabela tiver mais colunas que o conhecido, re-detecta.

    Retorna (colunas_agregado, novos_colunas_idx).
    """
    try:
        grade = _tabela_por_grade_densa(page)
        if grade:
            dados, novos = _agregar_tabela(grade, colunas_ativas, grade_densa=True)
            if any(dados.values()):
                _log(f"grade densa: {len(grade)} linhas")
                return dados, novos
    except Exception as e:
        _log(f"Erro ao ler grade densa: {e}")

    colunas_agregado = {}
    novos_colunas = None
    try:
        for table in (page.find_tables() if hasattr(page, 'find_tables') else []):
            if not hasattr(table, 'extract'):
                continue
            td = table.extract()
            if not td:
                continue
            dados, novos = _agregar_tabela(td, colunas_ativas, grade_densa=False)
            if novos is not None:
                novos_colunas = novos
                colunas_ativas = novos
            for header, items in dados.items():
                colunas_agregado.setdefault(header, []).extend(items)
    except Exception as e:
        _log(f"Erro ao extrair dados de tabelas: {e}")
    return colunas_agregado, novos_colunas


def extrair_dados_pdf(caminho_pdf):
    colunas_consolidado = {}
    try:
        doc = fitz.open(caminho_pdf)
        try:
            colunas_ativas = None
            num_pages = len(doc)
            for n, page in enumerate(doc):
                _log(f"processando página {n + 1}/{num_pages}")
                colunas_pag, novos = extrair_dados_de_tabelas(page, colunas_ativas)
                if novos is not None:
                    colunas_ativas = novos
                for h, items in colunas_pag.items():
                    if h not in colunas_consolidado:
                        colunas_consolidado[h] = []
                    colunas_consolidado[h].extend(items)
        finally:
            doc.close()
    except Exception as e:
        _log(f"Erro ao processar PDF: {e}")
        raise

    # Deduplica, ordena e remove colunas vazias
    colunas_consolidado = {
        h: sorted(dict.fromkeys(v))
        for h, v in colunas_consolidado.items()
        if v
    }

    return colunas_consolidado


def main():
    try:
        if len(sys.argv) < 2:
            sys.stdout.write(json.dumps({"success": False, "error": "Caminho do PDF não fornecido"}) + '\n')
            sys.exit(1)
        colunas = extrair_dados_pdf(sys.argv[1])
        # Lista plana de todos os itens (mantida para compatibilidade com o backend)
        todos = sorted(dict.fromkeys(item for v in colunas.values() for item in v))
        out = {
            "success": True,
            "colunas": colunas,
            "dominios_bruto": todos,
            "total_bruto": len(todos),
        }
        sys.stdout.write(json.dumps(out, ensure_ascii=False) + '\n')
        sys.stdout.flush()
    except Exception as e:
        sys.stdout.write(json.dumps({"success": False, "error": str(e)}) + '\n')
        sys.stdout.flush()
        sys.exit(1)


if __name__ == "__main__":
    main()
