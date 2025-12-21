#!/bin/bash

# Script de instalação e configuração automática do Elasticsearch
# Para Ubuntu/Debian

set -e

echo "=========================================="
echo "Instalação e Configuração do Elasticsearch"
echo "=========================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se o comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Por favor, execute como root (sudo)${NC}"
    exit 1
fi

# Verificar se o Elasticsearch já está instalado
# Verifica se o pacote está instalado (mesmo que o serviço não esteja rodando)
if dpkg -l | grep -q "^ii.*elasticsearch" 2>/dev/null || command_exists elasticsearch; then
    echo -e "${GREEN}Elasticsearch já está instalado${NC}"
    
    # Tentar obter versão
    ELASTICSEARCH_VERSION=$(elasticsearch --version 2>/dev/null | grep -oP 'version \K[0-9.]+' || echo "")
    if [ ! -z "$ELASTICSEARCH_VERSION" ]; then
        echo -e "${GREEN}Versão instalada: $ELASTICSEARCH_VERSION${NC}"
    fi
    
    # Verificar se o serviço está rodando
    if systemctl is-active --quiet elasticsearch 2>/dev/null; then
        echo -e "${GREEN}Status: Rodando${NC}"
    else
        echo -e "${YELLOW}Status: Instalado mas não está rodando${NC}"
        echo -e "${YELLOW}Para iniciar, execute: sudo systemctl start elasticsearch${NC}"
    fi
    
    echo -e "${GREEN}Nada a fazer. Saindo...${NC}"
    exit 0
fi

echo -e "${YELLOW}Iniciando instalação do Elasticsearch...${NC}"

# Atualizar pacotes
echo "Atualizando lista de pacotes..."
apt-get update -qq

# Instalar dependências
echo "Instalando dependências..."
apt-get install -y -qq wget apt-transport-https ca-certificates gnupg lsb-release

# Adicionar repositório do Elasticsearch
echo "Adicionando repositório do Elasticsearch..."

# Remover chave antiga se existir
rm -f /usr/share/keyrings/elasticsearch-keyring.gpg

# Baixar e instalar chave GPG
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

# Adicionar repositório
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-8.x.list > /dev/null

# Atualizar lista de pacotes novamente
apt-get update -qq

# Instalar Elasticsearch
echo "Instalando Elasticsearch..."
apt-get install -y -qq elasticsearch

# Configurar Elasticsearch para iniciar automaticamente
echo "Configurando Elasticsearch para iniciar automaticamente..."
systemctl daemon-reload
systemctl enable elasticsearch

# Configurar JVM options (heap size)
echo "Configurando opções JVM..."
mkdir -p /etc/elasticsearch/jvm.options.d

# Criar arquivo de configuração de heap
cat > /etc/elasticsearch/jvm.options.d/heap.options << 'EOF'
# Configuração de heap do Elasticsearch
# Ajuste conforme a memória disponível do servidor
-Xms512m
-Xmx512m
EOF

# Configurar cluster name (opcional, já vem configurado)
# Se quiser personalizar, descomente e ajuste:
# sed -i 's/#cluster.name: my-application/cluster.name: backnet/' /etc/elasticsearch/elasticsearch.yml

# Iniciar Elasticsearch
echo "Iniciando Elasticsearch..."
systemctl start elasticsearch

# Aguardar Elasticsearch iniciar
echo "Aguardando Elasticsearch iniciar..."
sleep 10

# Verificar status
if systemctl is-active --quiet elasticsearch; then
    echo -e "${GREEN}✓ Elasticsearch instalado e rodando com sucesso!${NC}"
    
    # Mostrar informações
    ELASTICSEARCH_VERSION=$(elasticsearch --version 2>/dev/null | grep -oP 'version \K[0-9.]+' || echo "desconhecida")
    echo -e "${GREEN}Versão: $ELASTICSEARCH_VERSION${NC}"
    echo -e "${GREEN}Status: $(systemctl is-active elasticsearch)${NC}"
    echo ""
    echo "Para verificar a conexão, execute:"
    echo "  curl http://localhost:9200"
    echo ""
    echo "Para ver os logs, execute:"
    echo "  journalctl -u elasticsearch -f"
else
    echo -e "${RED}✗ Erro ao iniciar Elasticsearch${NC}"
    echo "Verifique os logs com: journalctl -u elasticsearch -n 50"
    exit 1
fi

echo -e "${GREEN}=========================================="
echo "Instalação concluída com sucesso!"
echo "==========================================${NC}"

