#!/bin/bash

# Script de setup completo do BackNet ERP
# Instala todas as dependências do sistema e configura o ambiente

set -e

echo "=========================================="
echo "BackNet ERP - Setup Completo"
echo "=========================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Por favor, execute como root (sudo)${NC}"
    exit 1
fi

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}Diretório do projeto: $PROJECT_DIR${NC}"
echo ""

# 1. Verificar/Instalar Elasticsearch (apenas se não estiver instalado)
echo -e "${YELLOW}[1/4] Verificando Elasticsearch...${NC}"
if [ -f "scripts/install-elasticsearch.sh" ]; then
    bash scripts/install-elasticsearch.sh
else
    echo -e "${RED}Script de instalação do Elasticsearch não encontrado${NC}"
    exit 1
fi

echo ""

# 2. Instalar dependências NPM
echo -e "${YELLOW}[2/4] Instalando dependências NPM...${NC}"
npm run install-all

echo ""

# 3. Verificar arquivos .env
echo -e "${YELLOW}[3/4] Verificando arquivos .env...${NC}"

# Backend .env
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Arquivo backend/.env não encontrado${NC}"
    if [ -f "backend/.env.example" ]; then
        echo -e "${BLUE}Criando backend/.env a partir de .env.example...${NC}"
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✓ Arquivo backend/.env criado${NC}"
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edite backend/.env e configure as variáveis necessárias${NC}"
    else
        echo -e "${RED}Arquivo backend/.env.example não encontrado${NC}"
    fi
else
    echo -e "${GREEN}✓ Arquivo backend/.env encontrado${NC}"
fi

# Frontend .env
if [ ! -f "frontend/.env" ]; then
    echo -e "${YELLOW}Arquivo frontend/.env não encontrado${NC}"
    if [ -f "frontend/.env.example" ]; then
        echo -e "${BLUE}Criando frontend/.env a partir de .env.example...${NC}"
        cp frontend/.env.example frontend/.env
        echo -e "${GREEN}✓ Arquivo frontend/.env criado${NC}"
    else
        echo -e "${YELLOW}Arquivo frontend/.env.example não encontrado (opcional)${NC}"
    fi
else
    echo -e "${GREEN}✓ Arquivo frontend/.env encontrado${NC}"
fi

echo ""

# 4. Verificar configuração do Elasticsearch no .env
echo -e "${YELLOW}[4/4] Verificando configuração do Elasticsearch...${NC}"

if [ -f "backend/.env" ]; then
    if ! grep -q "ELASTICSEARCH_NODE" backend/.env; then
        echo -e "${BLUE}Adicionando variáveis do Elasticsearch ao backend/.env...${NC}"
        cat >> backend/.env << 'EOF'

# Configurações do Elasticsearch (Auditoria)
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_NAME=backnet-auditoria
EOF
        echo -e "${GREEN}✓ Variáveis do Elasticsearch adicionadas${NC}"
    else
        echo -e "${GREEN}✓ Variáveis do Elasticsearch já configuradas${NC}"
    fi
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Setup concluído com sucesso!"
echo "==========================================${NC}"
echo ""
echo "Próximos passos:"
echo "1. Edite backend/.env e configure as variáveis necessárias"
echo "2. Configure o banco de dados MySQL"
echo "3. Execute as migrations: cd backend && npm run migrate"
echo "4. Inicie o sistema: npm run dev"
echo ""

