#!/usr/bin/env bash
set -euo pipefail

DOC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="$(cd "$DOC_ROOT/.." && pwd)"
cd "$PROJECT_ROOT"

log() { echo "[update-doc] $*"; }
fail() { echo "[update-doc] ERRO: $*" >&2; exit 1; }

log "Iniciando atualização da documentação em $DOC_ROOT"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  fail "Este diretório não é um repositório Git."
fi

if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  log "AVISO: existem alterações locais não commitadas. O pull pode falhar ou sobrescrever arquivos."
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REMOTE="${DOC_GIT_REMOTE:-origin}"

log "Buscando atualizações de $REMOTE/$BRANCH..."
git fetch "$REMOTE"

LOCAL="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse "$REMOTE/$BRANCH" 2>/dev/null || true)"

if [[ -z "$REMOTE_HEAD" ]]; then
  fail "Branch remota $REMOTE/$BRANCH não encontrada."
fi

if [[ "$LOCAL" == "$REMOTE_HEAD" ]]; then
  log "Repositório já está na versão mais recente ($LOCAL)."
else
  log "Atualizando $LOCAL -> $REMOTE_HEAD"
  git pull "$REMOTE" "$BRANCH"
fi

log "Instalando dependências da documentação..."
npm install --prefix doc

log "Gerando build de produção (dist limpo + verificação de assets)..."
npm run build --prefix doc

log "Reiniciando PM2..."
if pm2 describe doc >/dev/null 2>&1; then
  pm2 restart doc
else
  pm2 start ecosystem.config.js --only doc
fi

pm2 save

log "Atualização concluída com sucesso."
pm2 list
