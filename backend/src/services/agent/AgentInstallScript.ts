import { SYSTEM_NAME } from '../../constants/systemBrand';

export const AGENT_COMPOSE_DIR = '/opt/ispconsultor-agent';
export const AGENT_SERVICE_NAME = 'ispconsultor-agent';
export const AGENT_LOCAL_IMAGE_PREFIX = 'ispconsultor-agent';

/** Containers Docker legados (instalações anteriores). */
export const LEGACY_DOCKER_CONTAINERS = [
  'ispconsultor-agent',
  'ispconsultor-agent-dev',
  'backnet-agent',
  'backnet-agent-dev',
];

export interface GenerateInstallScriptOptions {
  agentId: number;
  token: string;
  serverUrl: string;
}

export function isAgentDevServerUrl(serverUrl: string): boolean {
  return (
    serverUrl.includes('dev.luminoustelecom.com.br') ||
    serverUrl.includes('localhost') ||
    serverUrl.includes('127.0.0.1')
  );
}

export function getAgentChannel(serverUrl: string): 'dev' | 'prod' {
  return isAgentDevServerUrl(serverUrl) ? 'dev' : 'prod';
}

export function getLocalAgentImage(serverUrl: string): string {
  return `${AGENT_LOCAL_IMAGE_PREFIX}:${getAgentChannel(serverUrl)}`;
}

export function getAgentContainerName(serverUrl: string): string {
  return isAgentDevServerUrl(serverUrl) ? 'ispconsultor-agent-dev' : 'ispconsultor-agent';
}

/**
 * Script bash executado no servidor remoto (manual ou via SSH automático).
 * Baixa arquivos do ISP Consultor, monta imagem Docker localmente e sobe via Compose.
 */
export function generateInstallScript(opts: GenerateInstallScriptOptions): string {
  const { agentId, token, serverUrl } = opts;
  const base = serverUrl.replace(/\/$/, '');
  const filesBase = `${base}/api/agents/${agentId}/files`;
  const channel = getAgentChannel(serverUrl);
  const imageName = getLocalAgentImage(serverUrl);
  const containerName = getAgentContainerName(serverUrl);

  return `#!/bin/bash
set -e

TOKEN="${token}"
AGENT_ID="${agentId}"
SERVER_URL="${base}"
FILES_BASE="${filesBase}"
IMAGE_NAME="${imageName}"
CONTAINER_NAME="${containerName}"
AGENT_CHANNEL="${channel}"
COMPOSE_DIR="${AGENT_COMPOSE_DIR}"
SERVICE_NAME="${AGENT_SERVICE_NAME}"
AGENT_AUTH_HEADER="X-Agent-Token: \${TOKEN}"

agent_curl() {
  curl -fsSL -H "\$AGENT_AUTH_HEADER" "\$@"
}

RED='\\033[0;31m'; GREEN='\\033[0;32m'; YELLOW='\\033[1;33m'; NC='\\033[0m'
log()   { echo -e "\${GREEN}[${SYSTEM_NAME}]\${NC} \$1"; }
warn()  { echo -e "\${YELLOW}[${SYSTEM_NAME}]\${NC} \$1"; }
error() { echo -e "\${RED}[${SYSTEM_NAME}]\${NC} \$1"; exit 1; }

if [ "$(id -u)" -ne 0 ]; then
  error "Execute como root (ou com sudo)."
fi

log "Iniciando instalação do agente ${SYSTEM_NAME}..."
echo ""

# ── Docker ────────────────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  log "Docker já instalado: \$(docker --version)"
else
  warn "Docker não encontrado. Instalando..."
  if grep -qiE 'debian|ubuntu' /etc/os-release 2>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/\$(. /etc/os-release && echo "\$ID")/gpg" | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/\$(. /etc/os-release && echo "\$ID") \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker && systemctl start docker
  elif grep -qiE 'centos|rhel|almalinux|rocky|fedora' /etc/os-release 2>/dev/null || [ -f /etc/redhat-release ]; then
    if command -v dnf &>/dev/null; then
      dnf install -y -q yum-utils
      dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      dnf install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
    else
      yum install -y -q yum-utils
      yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      yum install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
    fi
    systemctl enable docker && systemctl start docker
  else
    error "Sistema operacional não suportado. Instale o Docker manualmente e execute o script novamente."
  fi
  log "Docker instalado com sucesso!"
fi

compose_cmd() {
  if docker compose version &>/dev/null; then
    echo "docker compose"
  elif command -v docker-compose &>/dev/null; then
    echo "docker-compose"
  else
    error "Docker Compose não encontrado. Instale o plugin docker-compose-plugin."
  fi
}
COMPOSE="\$(compose_cmd)"

# ── Remover instalação systemd legada ─────────────────────────────────────────
if command -v systemctl &>/dev/null && systemctl list-unit-files "\$SERVICE_NAME.service" &>/dev/null; then
  warn "Removendo serviço systemd legado: \$SERVICE_NAME"
  systemctl stop "\$SERVICE_NAME" 2>/dev/null || true
  systemctl disable "\$SERVICE_NAME" 2>/dev/null || true
  rm -f "/etc/systemd/system/\$SERVICE_NAME.service"
  systemctl daemon-reload 2>/dev/null || true
fi
rm -f /etc/ispconsultor-agent.env 2>/dev/null || true

# ── Remover containers Docker legados ─────────────────────────────────────────
for legacy in ${LEGACY_DOCKER_CONTAINERS.join(' ')}; do
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$legacy"; then
    warn "Removendo container Docker legado: $legacy"
    docker rm -f "$legacy" 2>/dev/null || true
  fi
done

# ── Baixar arquivos do ISP Consultor ──────────────────────────────────────────
log "Baixando arquivos do agente de \$SERVER_URL..."
mkdir -p "\$COMPOSE_DIR"
agent_curl "\$FILES_BASE/index.js" -o "\$COMPOSE_DIR/index.js"
agent_curl "\$FILES_BASE/package.json" -o "\$COMPOSE_DIR/package.json"
agent_curl "\$FILES_BASE/Dockerfile" -o "\$COMPOSE_DIR/Dockerfile"
log "Arquivos baixados com sucesso."

# ── Docker Compose (build local — sem Docker Hub) ─────────────────────────────
log "Configurando Docker Compose em \$COMPOSE_DIR..."
cat > "\$COMPOSE_DIR/docker-compose.yml" << EOF
services:
  agent:
    image: \$IMAGE_NAME
    build:
      context: .
      dockerfile: Dockerfile
      args:
        ISPCONSULTOR_AGENT_CHANNEL: \$AGENT_CHANNEL
    container_name: \$CONTAINER_NAME
    restart: unless-stopped
    command:
      - --token
      - \$TOKEN
EOF

log "Montando imagem local do agente (\$IMAGE_NAME)..."
cd "\$COMPOSE_DIR"
\$COMPOSE build --pull

log "Subindo agente com Docker Compose..."
\$COMPOSE up -d --force-recreate

log "Aguardando inicialização do agente (5s)..."
sleep 5

STATUS=\$(docker inspect --format='{{.State.Status}}' "\$CONTAINER_NAME" 2>/dev/null || echo "not_found")
if [ "\$STATUS" = "running" ]; then
  echo ""
  log "✅ Instalação concluída! O agente deve aparecer online em instantes."
  log "   Diretório: \$COMPOSE_DIR"
  log "   Status: cd \$COMPOSE_DIR && \$COMPOSE ps"
else
  LOGS=\$(docker logs --tail 20 "\$CONTAINER_NAME" 2>&1 || echo "")
  error "Container não está rodando (status: \$STATUS).\\nLogs:\\n\$LOGS"
fi
`;
}
