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
# Se não for root, tentar executar com sudo (pode falhar se não tiver permissão)
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}Aviso: Não está rodando como root. Tentando com sudo...${NC}"
    # Tentar executar o script novamente com sudo
    if sudo -n true 2>/dev/null; then
        # Sudo sem senha disponível, executar novamente com sudo
        exec sudo bash "$0" "$@"
    else
        echo -e "${RED}Erro: Precisa de permissões de root para instalar Elasticsearch${NC}"
        echo -e "${YELLOW}Execute manualmente: sudo bash $0${NC}"
        exit 1
    fi
fi

# Verificar se o Elasticsearch já está instalado
# Verifica se o pacote está instalado (mesmo que o serviço não esteja rodando)
ELASTICSEARCH_INSTALLED=false
if dpkg -l | grep -q "^ii.*elasticsearch" 2>/dev/null || command_exists elasticsearch; then
    ELASTICSEARCH_INSTALLED=true
    echo -e "${GREEN}Elasticsearch já está instalado${NC}"
    
    # Tentar obter versão
    ELASTICSEARCH_VERSION=$(elasticsearch --version 2>/dev/null | grep -oP 'version \K[0-9.]+' || echo "")
    if [ ! -z "$ELASTICSEARCH_VERSION" ]; then
        echo -e "${GREEN}Versão instalada: $ELASTICSEARCH_VERSION${NC}"
    fi
else
    echo -e "${YELLOW}Elasticsearch não está instalado. Iniciando instalação...${NC}"
fi

# SEMPRE configurar elasticsearch.yml (mesmo se já estiver instalado)
# Isso garante que as configurações estejam corretas
echo "Configurando Elasticsearch..."
ELASTICSEARCH_YML="/etc/elasticsearch/elasticsearch.yml"

# Backup do arquivo original
if [ ! -f "${ELASTICSEARCH_YML}.backup" ]; then
    cp "${ELASTICSEARCH_YML}" "${ELASTICSEARCH_YML}.backup" 2>/dev/null || true
fi

# Desabilitar segurança (necessário para versões 8.x sem configuração de senha)
if grep -q "^xpack.security.enabled: true" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    sed -i 's/^xpack.security.enabled: true/xpack.security.enabled: false/' "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ Segurança desabilitada${NC}"
elif ! grep -q "xpack.security.enabled" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    echo "xpack.security.enabled: false" >> "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ Segurança desabilitada (adicionado)${NC}"
fi

if grep -q "^xpack.security.enrollment.enabled: true" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    sed -i 's/^xpack.security.enrollment.enabled: true/xpack.security.enrollment.enabled: false/' "${ELASTICSEARCH_YML}"
elif ! grep -q "xpack.security.enrollment.enabled" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    echo "xpack.security.enrollment.enabled: false" >> "${ELASTICSEARCH_YML}"
fi

# Configurar network.host
if grep -q "^network.host:" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    # Se já existe, verificar se está correto
    if ! grep -q "^network.host: 0.0.0.0" "${ELASTICSEARCH_YML}" 2>/dev/null; then
        sed -i 's/^network.host:.*/network.host: 0.0.0.0/' "${ELASTICSEARCH_YML}"
        echo -e "${GREEN}✓ network.host atualizado para 0.0.0.0${NC}"
    fi
elif grep -q "^#network.host:" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    sed -i 's/^#network.host:.*/network.host: 0.0.0.0/' "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ network.host configurado para 0.0.0.0${NC}"
else
    echo "network.host: 0.0.0.0" >> "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ network.host adicionado: 0.0.0.0${NC}"
fi

# Configurar http.port
if grep -q "^http.port:" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    # Se já existe, verificar se está correto
    if ! grep -q "^http.port: 9200" "${ELASTICSEARCH_YML}" 2>/dev/null; then
        sed -i 's/^http.port:.*/http.port: 9200/' "${ELASTICSEARCH_YML}"
        echo -e "${GREEN}✓ http.port atualizado para 9200${NC}"
    fi
elif grep -q "^#http.port:" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    sed -i 's/^#http.port:.*/http.port: 9200/' "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ http.port configurado para 9200${NC}"
else
    echo "http.port: 9200" >> "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ http.port adicionado: 9200${NC}"
fi

# Ajustar permissões
chown elasticsearch:elasticsearch "${ELASTICSEARCH_YML}" 2>/dev/null || true
chmod 660 "${ELASTICSEARCH_YML}" 2>/dev/null || true

echo -e "${GREEN}✓ Configuração do Elasticsearch atualizada${NC}"

# SEMPRE reiniciar Elasticsearch para aplicar configurações
# Isso garante que as mudanças no elasticsearch.yml sejam aplicadas
if systemctl is-active --quiet elasticsearch 2>/dev/null; then
    echo -e "${YELLOW}Elasticsearch está rodando. Reiniciando para aplicar configurações...${NC}"
    systemctl restart elasticsearch
else
    echo -e "${YELLOW}Iniciando Elasticsearch...${NC}"
    systemctl start elasticsearch
fi

# Garantir que inicia automaticamente no boot
systemctl enable elasticsearch 2>/dev/null || true

if [ "$ELASTICSEARCH_INSTALLED" = "false" ]; then
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
fi

# Nota: O reinício do Elasticsearch já foi feito acima após aplicar configurações

# Aguardar Elasticsearch iniciar completamente (pode levar até 60 segundos)
echo "Aguardando Elasticsearch inicializar completamente..."
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:9200 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Elasticsearch está respondendo!${NC}"
        break
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo -n "."
done
echo ""

# Verificar status do serviço
if ! systemctl is-active --quiet elasticsearch; then
    echo -e "${RED}✗ Erro ao iniciar Elasticsearch${NC}"
    echo "Verifique os logs com: journalctl -u elasticsearch -n 50"
    exit 1
fi

# Verificar se está respondendo na API
if curl -s http://localhost:9200 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Elasticsearch instalado e rodando com sucesso!${NC}"
    
    # Mostrar informações
    ELASTICSEARCH_VERSION=$(elasticsearch --version 2>/dev/null | grep -oP 'version \K[0-9.]+' || echo "desconhecida")
    echo -e "${GREEN}Versão: $ELASTICSEARCH_VERSION${NC}"
    echo -e "${GREEN}Status: $(systemctl is-active elasticsearch)${NC}"
    
    # Testar API
    echo ""
    echo "Testando API do Elasticsearch:"
    curl -s http://localhost:9200 | head -5 || echo "Erro ao conectar"
    echo ""
else
    echo -e "${YELLOW}⚠ Elasticsearch está rodando mas não está respondendo na API${NC}"
    echo "Isso pode ser normal se ainda estiver inicializando."
    echo "Aguarde alguns minutos e tente novamente:"
    echo "  curl http://localhost:9200"
    echo ""
    echo "Para ver os logs, execute:"
    echo "  journalctl -u elasticsearch -f"
fi

echo -e "${GREEN}=========================================="
echo "Instalação concluída com sucesso!"
echo "==========================================${NC}"

