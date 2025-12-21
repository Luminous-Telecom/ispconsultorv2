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

# Configurar segurança (habilitar)
if grep -q "^xpack.security.enabled: false" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    sed -i 's/^xpack.security.enabled: false/xpack.security.enabled: true/' "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ Segurança habilitada${NC}"
elif ! grep -q "xpack.security.enabled" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    echo "xpack.security.enabled: true" >> "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ Segurança habilitada (adicionado)${NC}"
elif ! grep -q "^xpack.security.enabled: true" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    # Se existe mas não está como true, atualizar
    sed -i 's/^xpack.security.enabled:.*/xpack.security.enabled: true/' "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ Segurança atualizada para habilitada${NC}"
fi

# Configurar Machine Learning (desabilitar)
if grep -q "^xpack.ml.enabled: true" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    sed -i 's/^xpack.ml.enabled: true/xpack.ml.enabled: false/' "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ Machine Learning desabilitado${NC}"
elif ! grep -q "xpack.ml.enabled" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    echo "xpack.ml.enabled: false" >> "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ Machine Learning desabilitado (adicionado)${NC}"
fi

# Configurar network.host (apenas localhost para segurança)
if grep -q "^network.host:" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    # Se já existe, verificar se está correto (127.0.0.1 ou localhost)
    if ! grep -qE "^network.host: (127.0.0.1|localhost)" "${ELASTICSEARCH_YML}" 2>/dev/null; then
        sed -i 's/^network.host:.*/network.host: 127.0.0.1/' "${ELASTICSEARCH_YML}"
        echo -e "${GREEN}✓ network.host atualizado para 127.0.0.1 (apenas localhost)${NC}"
    fi
elif grep -q "^#network.host:" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    sed -i 's/^#network.host:.*/network.host: 127.0.0.1/' "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ network.host configurado para 127.0.0.1 (apenas localhost)${NC}"
else
    echo "network.host: 127.0.0.1" >> "${ELASTICSEARCH_YML}"
    echo -e "${GREEN}✓ network.host adicionado: 127.0.0.1 (apenas localhost)${NC}"
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

# Verificar configuração aplicada
echo "Verificando configuração aplicada..."
if grep -qE "^network.host: (127.0.0.1|localhost)" "${ELASTICSEARCH_YML}" 2>/dev/null; then
    echo -e "${GREEN}✓ network.host configurado corretamente para localhost (apenas interno)${NC}"
    echo -e "${GREEN}✓ Elasticsearch só aceitará conexões de localhost (127.0.0.1)${NC}"
else
    echo -e "${RED}✗ ERRO: network.host não está configurado corretamente!${NC}"
    echo "Configuração atual:"
    grep "^network.host:" "${ELASTICSEARCH_YML}" 2>/dev/null || echo "network.host não encontrado"
fi

# SEMPRE reiniciar Elasticsearch para aplicar configurações
# Isso garante que as mudanças no elasticsearch.yml sejam aplicadas
# Com network.host: 127.0.0.1, o Elasticsearch só escutará em localhost
# e não aceitará conexões externas, sem precisar de firewall
if systemctl is-active --quiet elasticsearch 2>/dev/null; then
    echo -e "${YELLOW}Elasticsearch está rodando. Reiniciando para aplicar configurações...${NC}"
    systemctl restart elasticsearch
    # Aguardar alguns segundos após reiniciar
    sleep 3
else
    echo -e "${YELLOW}Iniciando Elasticsearch...${NC}"
    systemctl start elasticsearch
    # Aguardar alguns segundos após iniciar
    sleep 3
fi

# Garantir que inicia automaticamente no boot
systemctl enable elasticsearch 2>/dev/null || true

# Configurar senha do usuário elastic e salvar no .env
echo "Configurando autenticação do Elasticsearch..."

# Detectar caminho do backend dinamicamente
# Tentar vários caminhos comuns
BACKEND_ENV=""
POSSIBLE_PATHS=(
    "/opt/backnet.prod/backend/.env"
    "$(pwd)/backend/.env"
    "$(dirname "$(dirname "$0")")/backend/.env"
    "/var/www/backnet/backend/.env"
)

for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        BACKEND_ENV="$path"
        echo -e "${GREEN}✓ Arquivo .env encontrado em: $BACKEND_ENV${NC}"
        break
    fi
done

# Se não encontrou, tentar encontrar pelo diretório atual
if [ -z "$BACKEND_ENV" ]; then
    CURRENT_DIR=$(pwd)
    if [ -f "$CURRENT_DIR/backend/.env" ]; then
        BACKEND_ENV="$CURRENT_DIR/backend/.env"
        echo -e "${GREEN}✓ Arquivo .env encontrado em: $BACKEND_ENV${NC}"
    elif [ -f "$CURRENT_DIR/.env" ]; then
        BACKEND_ENV="$CURRENT_DIR/.env"
        echo -e "${GREEN}✓ Arquivo .env encontrado em: $BACKEND_ENV${NC}"
    fi
fi

# Gerar senha aleatória (32 caracteres alfanuméricos)
ELASTICSEARCH_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)

# Verificar se já existe senha no .env
if [ ! -z "$BACKEND_ENV" ] && [ -f "$BACKEND_ENV" ]; then
    EXISTING_PASSWORD=$(grep "^ELASTICSEARCH_PASSWORD=" "$BACKEND_ENV" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
    if [ ! -z "$EXISTING_PASSWORD" ] && [ "$EXISTING_PASSWORD" != "" ]; then
        ELASTICSEARCH_PASSWORD="$EXISTING_PASSWORD"
        echo -e "${GREEN}✓ Usando senha existente do .env${NC}"
    fi
fi

# Aguardar Elasticsearch estar totalmente pronto (pode levar até 60 segundos)
echo -e "${YELLOW}Aguardando Elasticsearch inicializar completamente antes de configurar senha...${NC}"
MAX_WAIT=60
WAITED=0
ELASTICSEARCH_READY=false

while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:9200 > /dev/null 2>&1; then
        ELASTICSEARCH_READY=true
        break
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo -n "."
done
echo ""

# Tentar configurar senha no Elasticsearch se estiver pronto
if [ "$ELASTICSEARCH_READY" = "true" ]; then
    if command_exists elasticsearch-reset-password; then
        echo -e "${YELLOW}Configurando senha do usuário 'elastic' no Elasticsearch...${NC}"
        
        # Verificar se já existe senha configurada (tentando autenticar sem senha)
        if curl -s -u elastic: http://localhost:9200 > /dev/null 2>&1; then
            # Sem senha, precisa configurar
            echo "$ELASTICSEARCH_PASSWORD" | elasticsearch-reset-password -u elastic -i -b 2>/dev/null && {
                echo -e "${GREEN}✓ Senha configurada no Elasticsearch${NC}"
            } || {
                echo -e "${YELLOW}⚠ Não foi possível configurar senha via elasticsearch-reset-password${NC}"
                echo -e "${YELLOW}⚠ A senha será salva no .env, mas você precisará configurá-la manualmente no Elasticsearch${NC}"
            }
        else
            echo -e "${GREEN}✓ Senha já configurada no Elasticsearch${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ elasticsearch-reset-password não encontrado${NC}"
        echo -e "${YELLOW}⚠ A senha será salva no .env, mas você precisará configurá-la manualmente no Elasticsearch${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Elasticsearch não está respondendo após $MAX_WAIT segundos${NC}"
    echo -e "${YELLOW}⚠ A senha será salva no .env, mas você precisará configurá-la manualmente no Elasticsearch quando estiver pronto${NC}"
fi

# SEMPRE salvar senha no .env do backend (mesmo se Elasticsearch não estiver pronto)
if [ ! -z "$BACKEND_ENV" ] && [ -f "$BACKEND_ENV" ]; then
    echo -e "${YELLOW}Configurando variáveis no .env do backend...${NC}"
    
    # Remover configurações antigas se existirem
    sed -i '/^ELASTICSEARCH_USERNAME=/d' "$BACKEND_ENV" 2>/dev/null || true
    sed -i '/^ELASTICSEARCH_PASSWORD=/d' "$BACKEND_ENV" 2>/dev/null || true
    sed -i '/^ELASTICSEARCH_NODE=/d' "$BACKEND_ENV" 2>/dev/null || true
    sed -i '/^ELASTICSEARCH_INDEX_NAME=/d' "$BACKEND_ENV" 2>/dev/null || true
    sed -i '/^# Configurações do Elasticsearch/d' "$BACKEND_ENV" 2>/dev/null || true
    
    # Adicionar novas configurações
    echo "" >> "$BACKEND_ENV"
    echo "# Configurações do Elasticsearch (Auditoria)" >> "$BACKEND_ENV"
    echo "ELASTICSEARCH_NODE=http://localhost:9200" >> "$BACKEND_ENV"
    echo "ELASTICSEARCH_INDEX_NAME=backnet-auditoria" >> "$BACKEND_ENV"
    echo "ELASTICSEARCH_USERNAME=elastic" >> "$BACKEND_ENV"
    echo "ELASTICSEARCH_PASSWORD=$ELASTICSEARCH_PASSWORD" >> "$BACKEND_ENV"
    
    echo -e "${GREEN}✓ Variáveis do Elasticsearch configuradas no .env${NC}"
    echo -e "${GREEN}✓ Arquivo: $BACKEND_ENV${NC}"
    echo -e "${GREEN}✓ Usuário: elastic${NC}"
    echo -e "${GREEN}✓ Senha: ${ELASTICSEARCH_PASSWORD}${NC}"
    echo -e "${YELLOW}⚠ IMPORTANTE: Anote esta senha! Ela está salva em $BACKEND_ENV${NC}"
    
    # Verificar se foi salvo corretamente
    if grep -q "^ELASTICSEARCH_PASSWORD=$ELASTICSEARCH_PASSWORD" "$BACKEND_ENV" 2>/dev/null; then
        echo -e "${GREEN}✓ Senha verificada no .env${NC}"
    else
        echo -e "${RED}✗ ERRO: Senha não foi salva corretamente no .env!${NC}"
    fi
else
    echo -e "${RED}✗ ERRO: Arquivo .env do backend não encontrado!${NC}"
    echo -e "${YELLOW}⚠ Caminhos testados:${NC}"
    for path in "${POSSIBLE_PATHS[@]}"; do
        echo "  - $path"
    done
    echo ""
    echo -e "${YELLOW}⚠ Adicione manualmente ao .env do backend:${NC}"
    echo "ELASTICSEARCH_NODE=http://localhost:9200"
    echo "ELASTICSEARCH_INDEX_NAME=backnet-auditoria"
    echo "ELASTICSEARCH_USERNAME=elastic"
    echo "ELASTICSEARCH_PASSWORD=$ELASTICSEARCH_PASSWORD"
fi

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

