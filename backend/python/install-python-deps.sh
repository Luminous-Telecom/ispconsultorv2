#!/bin/bash
# Instala pymupdf para extrair-dominios.py e extrair-sei-anatel.py.
# O build do backend (npm run build) executa este script em produção.
# Preferência: venv em backend/.venv. Sem python3-venv, baixa o wheel do PyPI
# para backend/.python-packages (só a biblioteca padrão do Python).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIREMENTS="${SCRIPT_DIR}/requirements.txt"

if [ ! -f "$REQUIREMENTS" ]; then
  echo "Arquivo requirements.txt não encontrado em: $REQUIREMENTS" >&2
  exit 1
fi

# backend/python (fonte) ou backend/dist/python (cópia do build).
if [ "$(basename "$(dirname "$SCRIPT_DIR")")" = "dist" ]; then
  BACKEND_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
else
  BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

VENV="${BACKEND_DIR}/.venv"
PACKAGES="${BACKEND_DIR}/.python-packages"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 não encontrado." >&2
  exit 1
fi

try_venv() {
  python3 -c 'import venv, ensurepip' >/dev/null 2>&1 || return 1
  if [ ! -x "${VENV}/bin/python" ]; then
    python3 -m venv "$VENV" || return 1
  fi
  if ! "${VENV}/bin/python" -m pip install -r "$REQUIREMENTS"; then
    rm -rf "$VENV"
    return 1
  fi
  "${VENV}/bin/python" -c 'import pymupdf' >/dev/null 2>&1
}

try_wheel() {
  python3 - "$PACKAGES" << 'PY'
import io
import json
import os
import platform
import re
import shutil
import sys
import urllib.request
import zipfile

dest = sys.argv[1]
arch = {"x86_64": "x86_64", "aarch64": "aarch64", "arm64": "aarch64"}.get(platform.machine())
if not arch:
    sys.stderr.write(f"Arquitetura não suportada: {platform.machine()}\n")
    sys.exit(1)

with urllib.request.urlopen("https://pypi.org/simple/pymupdf/", timeout=60) as resp:
    simple = resp.read().decode("utf-8", "replace")
ones = []
for major, minor, patch in re.findall(r"pymupdf-(\d+)\.(\d+)\.(\d+)", simple):
    if major == "1":
        ones.append((int(minor), int(patch)))
if not ones:
    sys.stderr.write("Nenhuma versão 1.x do pymupdf no PyPI.\n")
    sys.exit(1)
minor, patch = max(ones)
version = f"1.{minor}.{patch}"

with urllib.request.urlopen(f"https://pypi.org/pypi/pymupdf/{version}/json", timeout=60) as resp:
    meta = json.load(resp)

tag = f"cp{sys.version_info.major}{sys.version_info.minor}"
current = int(tag[2:])

def score(name: str) -> int:
    if not name.endswith(".whl") or arch not in name or "manylinux" not in name:
        return -1
    if f"{tag}-{tag}" in name:
        return 3
    abi = re.search(r"-cp(\d+)-abi3-", name)
    if abi and int(abi.group(1)) <= current:
        return 2
    return -1

urls = [item for item in meta["urls"] if score(item["filename"]) > 0]
if not urls:
    sys.stderr.write(f"Nenhum wheel do pymupdf {version} compatível com este Python.\n")
    sys.exit(1)
urls.sort(key=lambda item: score(item["filename"]), reverse=True)
chosen = urls[0]
sys.stderr.write(f"Baixando {chosen['filename']}\n")
with urllib.request.urlopen(chosen["url"], timeout=120) as resp:
    blob = resp.read()

os.makedirs(dest, exist_ok=True)
pkg = os.path.join(dest, "pymupdf")
if os.path.isdir(pkg):
    shutil.rmtree(pkg)
with zipfile.ZipFile(io.BytesIO(blob)) as archive:
    archive.extractall(dest)
if not os.path.isfile(os.path.join(pkg, "__init__.py")):
    sys.exit(1)
PY
}

echo "Instalando pymupdf para extração de PDF..."
if try_venv; then
  echo "pymupdf instalado em ${VENV}"
  exit 0
fi

echo "python3-venv indisponível; baixando o wheel do pymupdf..." >&2
if try_wheel; then
  echo "pymupdf instalado em ${PACKAGES}"
  exit 0
fi

echo "Não foi possível instalar pymupdf." >&2
echo "No servidor, como root: apt install -y python3-venv python3-pip && bash python/install-python-deps.sh" >&2
exit 1
