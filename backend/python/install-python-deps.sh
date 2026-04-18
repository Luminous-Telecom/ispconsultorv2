#!/bin/bash
# Instala dependências Python necessárias para extração de PDF (extrair-dominios.py)
# Executar no servidor após deploy/atualização: ./install-python-deps.sh
# Requer: Python 3 e pip3 instalados

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIREMENTS="${SCRIPT_DIR}/requirements.txt"

if [ ! -f "$REQUIREMENTS" ]; then
  echo "Arquivo requirements.txt não encontrado em: $REQUIREMENTS"
  exit 1
fi

echo "Instalando dependências Python para extração de PDF..."
if command -v pip3 &> /dev/null; then
  pip3 install -r "$REQUIREMENTS" --break-system-packages 2>/dev/null || pip3 install -r "$REQUIREMENTS"
  echo "Dependências Python instaladas com sucesso."
elif command -v pip &> /dev/null; then
  pip install -r "$REQUIREMENTS"
  echo "Dependências Python instaladas com sucesso."
else
  echo "Erro: pip ou pip3 não encontrado. Instale Python 3 com pip."
  exit 1
fi
