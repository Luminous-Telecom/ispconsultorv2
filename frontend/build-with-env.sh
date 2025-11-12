#!/bin/bash

# Script para fazer build do frontend com variáveis de ambiente do .env

if [ ! -f .env ]; then
  echo "Erro: arquivo .env não encontrado!"
  echo "Copie o env.example para .env e configure as variáveis."
  exit 1
fi

# Carrega variáveis do .env
export $(cat .env | grep -v '^#' | xargs)

# Verifica se REACT_APP_API_URL está definida
if [ -z "$REACT_APP_API_URL" ]; then
  echo "Erro: REACT_APP_API_URL não está definida no .env"
  exit 1
fi

echo "Fazendo build com REACT_APP_API_URL=$REACT_APP_API_URL"
npm run build

