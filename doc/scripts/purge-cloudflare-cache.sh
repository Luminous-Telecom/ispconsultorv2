#!/usr/bin/env bash
# Purga cache Cloudflare da wiki após deploy (evita servir 404 cacheado de assets JS).
set -euo pipefail

if [[ -z "${CF_API_TOKEN:-}" || -z "${CF_ZONE_ID:-}" ]]; then
  echo "[purge-cf] CF_API_TOKEN/CF_ZONE_ID não configurados — pulando purge"
  exit 0
fi

WIKI_HOST="${WIKI_HOST:-wiki-erp.ispconsultor.com.br}"

RESPONSE="$(curl -sf -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{\"hosts\":[\"${WIKI_HOST}\"]}")" || {
  echo "[purge-cf] AVISO: falha ao purgar cache Cloudflare" >&2
  exit 0
}

echo "$RESPONSE" | node -e "
  let s = '';
  process.stdin.on('data', (c) => { s += c; });
  process.stdin.on('end', () => {
    try {
      const j = JSON.parse(s);
      if (j.success) console.log('[purge-cf] Cache purgado para ${WIKI_HOST}');
      else console.warn('[purge-cf] Resposta inesperada:', s);
    } catch {
      console.warn('[purge-cf] Resposta não-JSON:', s);
    }
  });
"
