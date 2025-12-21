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
        echo -e "${GREEN}Elasticsearch está instalado e rodando. Nada a fazer.${NC}"
        exit 0
    else
        echo -e "${YELLOW}Status: Instalado mas não está rodando${NC}"
        echo -e "${YELLOW}Iniciando serviço Elasticsearch...${NC}"
        
        # Tentar iniciar o serviço
        if systemctl start elasticsearch 2>/dev/null; then
            # Aguardar alguns segundos para o serviço iniciar
            sleep 5
            
            # Verificar se iniciou com sucesso
            if systemctl is-active --quiet elasticsearch 2>/dev/null; then
                echo -e "${GREEN}✓ Elasticsearch iniciado com sucesso!${NC}"
                echo -e "${GREEN}Status: $(systemctl is-active elasticsearch)${NC}"
                
                # Garantir que inicia automaticamente no boot
                systemctl enable elasticsearch 2>/dev/null || true
                
                exit 0
            else
                echo -e "${RED}✗ Falha ao iniciar Elasticsearch${NC}"
                echo "Verifique os logs com: journalctl -u elasticsearch -n 50"
                exit 1
            fi
        else
            echo -e "${RED}✗ Erro ao tentar iniciar Elasticsearch${NC}"
            echo "Verifique os logs com: journalctl -u elasticsearch -n 50"
            exit 1
        fi
    fi
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

# Configurar Elasticsearch (desabilitar segurança e configurar rede)
echo "Configurando Elasticsearch..."
ELASTICSEARCH_YML="/etc/elasticsearch/elasticsearch.yml"

# Backup do arquivo original
if [ ! -f "${ELASTICSEARCH_YML}.backup" ]; then
    cp "${ELASTICSEARCH_YML}" "${ELASTICSEARCH_YML}.backup" 2>/dev/null || true
fi

# Desabilitar segurança (necessário para versões 8.x sem configuração de senha)
if ! grep -q "xpack.security.enabled" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    echo "xpack.security.enabled: false" >> "${ELASTICSEARCH_YML}"
    echo "xpack.security.enrollment.enabled: false" >> "${ELASTICSEARCH_YML}"
fi

# Configurar network.host se não estiver configurado
if ! grep -q "^network.host:" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    if grep -q "^#network.host:" "${ELASTICSEARCH_YML}" 2>/dev/null; then
        sed -i 's/^#network.host:.*/network.host: 0.0.0.0/' "${ELASTICSEARCH_YML}"
    else
        echo "network.host: 0.0.0.0" >> "${ELASTICSEARCH_YML}"
    fi
fi

# Configurar http.port se não estiver configurado
if ! grep -q "^http.port:" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    if grep -q "^#http.port:" "${ELASTICSEARCH_YML}" 2>/dev/null; then
        sed -i 's/^#http.port:.*/http.port: 9200/' "${ELASTICSEARCH_YML}"
    else
        echo "http.port: 9200" >> "${ELASTICSEARCH_YML}"
    fi
fi

# Ajustar permissões
chown elasticsearch:elasticsearch "${ELASTICSEARCH_YML}" 2>/dev/null || true

# Iniciar Elasticsearch
echo "Iniciando Elasticsearch..."
systemctl start elasticsearch

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

