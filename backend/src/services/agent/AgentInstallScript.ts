import { SYSTEM_NAME } from '../../constants/systemBrand';

export const AGENT_INSTALL_DIR = '/opt/ispconsultor-agent';
export const AGENT_ENV_FILE = '/etc/ispconsultor-agent.env';
export const AGENT_SERVICE_NAME = 'ispconsultor-agent';

/** Nomes de containers Docker legados (instalações anteriores). */
export const LEGACY_DOCKER_CONTAINERS = ['ispconsultor-agent', 'ispconsultor-agent-dev'];

export interface GenerateInstallScriptOptions {
  token: string;
  serverUrl: string;
}

/**
 * Script bash executado no servidor remoto (manual ou via SSH automático).
 * Baixa index.js e package.json do próprio ISP Consultor e instala como serviço systemd.
 */
export function generateInstallScript(opts: GenerateInstallScriptOptions): string {
  const { token, serverUrl } = opts;
  const filesBase = `${serverUrl.replace(/\/$/, '')}/api/agents/files`;

  return `#!/bin/bash
set -e

TOKEN="${token}"
SERVER_URL="${serverUrl.replace(/\/$/, '')}"
FILES_BASE="${filesBase}"
AGENT_DIR="${AGENT_INSTALL_DIR}"
ENV_FILE="${AGENT_ENV_FILE}"
SERVICE_NAME="${AGENT_SERVICE_NAME}"

RED='\\033[0;31m'; GREEN='\\033[0;32m'; YELLOW='\\033[1;33m'; NC='\\033[0m'
log()   { echo -e "\${GREEN}[${SYSTEM_NAME}]\${NC} \$1"; }
warn()  { echo -e "\${YELLOW}[${SYSTEM_NAME}]\${NC} \$1"; }
error() { echo -e "\${RED}[${SYSTEM_NAME}]\${NC} \$1"; exit 1; }

if [ "$(id -u)" -ne 0 ]; then
  error "Execute como root (ou com sudo)."
fi

log "Iniciando instalação do agente ${SYSTEM_NAME}..."
echo ""

# ── Node.js 18+ ───────────────────────────────────────────────────────────────
need_node_install() {
  if ! command -v node &>/dev/null; then return 0; fi
  local major
  major="$(node -p 'parseInt(process.versions.node.split(".")[0], 10)' 2>/dev/null || echo 0)"
  [ "$major" -lt 18 ]
}

if need_node_install; then
  warn "Node.js 18+ não encontrado. Instalando..."
  if grep -qiE 'debian|ubuntu' /etc/os-release 2>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
  elif grep -qiE 'centos|rhel|almalinux|rocky|fedora' /etc/os-release 2>/dev/null || [ -f /etc/redhat-release ]; then
    if command -v dnf &>/dev/null; then
      dnf install -y -q curl
      curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
      dnf install -y -q nodejs
    else
      yum install -y -q curl
      curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
      yum install -y -q nodejs
    fi
  else
    error "Sistema operacional não suportado para instalação automática do Node.js. Instale Node.js 18+ manualmente."
  fi
  log "Node.js instalado: \$(node --version)"
else
  log "Node.js já instalado: \$(node --version)"
fi

if ! command -v npm &>/dev/null; then
  error "npm não encontrado após instalação do Node.js."
fi

# ── Dependências de compilação (node-pty) ─────────────────────────────────────
log "Verificando dependências de compilação..."
if grep -qiE 'debian|ubuntu' /etc/os-release 2>/dev/null; then
  apt-get install -y -qq python3 make g++ build-essential 2>/dev/null || apt-get install -y -qq python3 make g++
elif grep -qiE 'centos|rhel|almalinux|rocky|fedora' /etc/os-release 2>/dev/null || [ -f /etc/redhat-release ]; then
  if command -v dnf &>/dev/null; then
    dnf install -y -q python3 make gcc-c++ 2>/dev/null || true
  else
    yum install -y -q python3 make gcc-c++ 2>/dev/null || true
  fi
fi

# ── Remover instalação Docker legada ──────────────────────────────────────────
if command -v docker &>/dev/null; then
  for legacy in ${LEGACY_DOCKER_CONTAINERS.join(' ')}; do
    if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$legacy"; then
      warn "Removendo container Docker legado: $legacy"
      docker rm -f "$legacy" 2>/dev/null || true
    fi
  done
fi

# ── Baixar arquivos do ISP Consultor ──────────────────────────────────────────
log "Baixando arquivos do agente de \$SERVER_URL..."
mkdir -p "\$AGENT_DIR"
curl -fsSL "\$FILES_BASE/index.js" -o "\$AGENT_DIR/index.js"
curl -fsSL "\$FILES_BASE/package.json" -o "\$AGENT_DIR/package.json"
log "Arquivos baixados com sucesso."

# ── Dependências npm ──────────────────────────────────────────────────────────
log "Instalando dependências npm..."
cd "\$AGENT_DIR"
npm install --omit=dev --no-audit --no-fund
log "Dependências instaladas."

# ── Variáveis de ambiente ─────────────────────────────────────────────────────
log "Configurando variáveis de ambiente..."
cat > "\$ENV_FILE" << EOF
ISPCONSULTOR_SERVER=\$SERVER_URL
ISPCONSULTOR_TOKEN=\$TOKEN
EOF
chmod 600 "\$ENV_FILE"

# ── Serviço systemd ─────────────────────────────────────────────────────────────
log "Configurando serviço systemd \$SERVICE_NAME..."
NODE_BIN="$(command -v node)"
cat > "/etc/systemd/system/\$SERVICE_NAME.service" << EOF
[Unit]
Description=${SYSTEM_NAME} Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=\$AGENT_DIR
EnvironmentFile=\$ENV_FILE
ExecStart=\$NODE_BIN index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "\$SERVICE_NAME"
systemctl restart "\$SERVICE_NAME"

log "Aguardando inicialização do agente (3s)..."
sleep 3

if systemctl is-active --quiet "\$SERVICE_NAME"; then
  echo ""
  log "✅ Instalação concluída! O agente deve aparecer online em instantes."
  log "   Serviço: systemctl status \$SERVICE_NAME"
else
  LOGS="$(journalctl -u "\$SERVICE_NAME" -n 20 --no-pager 2>&1 || echo "")"
  error "Serviço não está ativo.\\nLogs:\\n\$LOGS"
fi
`;
}
