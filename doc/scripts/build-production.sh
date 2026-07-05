#!/usr/bin/env bash
# Build da wiki (GitHub Actions / dev local). O PM2 `doc` deve estar parado em produção.
set -euo pipefail

DOC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$DOC_ROOT/.vitepress/dist"
CACHE="$DOC_ROOT/.vitepress/cache"

fail() { echo "[build-doc] ERRO: $*" >&2; exit 1; }

if command -v pm2 >/dev/null 2>&1 && pm2 describe doc >/dev/null 2>&1; then
  PM2_STATUS="$(pm2 jlist 2>/dev/null | node -e "
    let s = '';
    process.stdin.on('data', (c) => { s += c; });
    process.stdin.on('end', () => {
      try {
        const list = JSON.parse(s);
        const doc = list.find((p) => p.name === 'doc');
        console.log(doc?.pm2_env?.status || 'unknown');
      } catch { console.log('unknown'); }
    });
  " 2>/dev/null || echo unknown)"
  if [[ "$PM2_STATUS" == "online" ]]; then
    fail "PM2 doc ainda online — pare com 'pm2 stop doc' antes do build para evitar 404 cacheados no Cloudflare"
  fi
fi

rm -rf "$DIST" "$CACHE"

cd "$DOC_ROOT"
npx vitepress build

bash "$DOC_ROOT/scripts/verify-dist.sh"
echo "[build-doc] OK — dist em $DIST"
