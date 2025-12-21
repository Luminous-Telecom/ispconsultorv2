#!/bin/bash

# Script simplificado de instalação do Elasticsearch
# Para ser executado diretamente em produção quando o script principal não estiver disponível

set -e

echo "=========================================="
echo "Instalação do Elasticsearch"
echo "=========================================="

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "Por favor, execute como root (sudo)"
    exit 1
fi

# Verificar se já está instalado
if dpkg -l | grep -q "^ii.*elasticsearch" 2>/dev/null || command -v elasticsearch >/dev/null 2>&1; then
    echo "Elasticsearch já está instalado"
    systemctl status elasticsearch 2>/dev/null || echo "Serviço não está rodando"
    exit 0
fi

echo "Iniciando instalação..."

# Atualizar pacotes
apt-get update -qq

# Instalar dependências
apt-get install -y -qq wget apt-transport-https ca-certificates gnupg lsb-release

# Adicionar repositório
rm -f /usr/share/keyrings/elasticsearch-keyring.gpg
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-8.x.list > /dev/null

# Atualizar e instalar
apt-get update -qq
apt-get install -y -qq elasticsearch

# Configurar
systemctl daemon-reload
systemctl enable elasticsearch

# Configurar JVM
mkdir -p /etc/elasticsearch/jvm.options.d
cat > /etc/elasticsearch/jvm.options.d/heap.options << 'EOF'
-Xms512m
-Xmx512m
EOF

# Iniciar
systemctl start elasticsearch

# Aguardar
sleep 10

# Verificar
if systemctl is-active --quiet elasticsearch; then
    echo "✓ Elasticsearch instalado e rodando!"
    curl -s http://localhost:9200 | head -3
else
    echo "✗ Erro ao iniciar Elasticsearch"
    journalctl -u elasticsearch -n 20 --no-pager
    exit 1
fi

echo "Instalação concluída!"

