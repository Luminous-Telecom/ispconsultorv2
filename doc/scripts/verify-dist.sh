#!/usr/bin/env bash
# Garante que os bundles referenciados no HTML existem no dist (evita 404 de assets após deploy).
set -euo pipefail

DOC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$DOC_ROOT/.vitepress/dist"

fail() { echo "[verify-dist] ERRO: $*" >&2; exit 1; }

[ -f "$DIST/index.html" ] || fail "dist/index.html ausente — rode npm run build em doc/"

verify_html_assets() {
  local html="$1"
  local label="$2"
  [ -f "$html" ] || fail "$label não encontrado: $html"

  local app theme framework
  app=$(grep -oE 'assets/app\.[^" ]+\.js' "$html" | head -1 || true)
  theme=$(grep -oE 'assets/chunks/theme\.[^" ]+\.js' "$html" | head -1 || true)
  framework=$(grep -oE 'assets/chunks/framework\.[^" ]+\.js' "$html" | head -1 || true)

  [ -n "$app" ] || fail "$label: referência assets/app.*.js não encontrada"
  [ -f "$DIST/$app" ] || fail "$label referencia $app mas o arquivo não existe no dist"

  if [ -n "$theme" ]; then
    [ -f "$DIST/$theme" ] || fail "$label referencia $theme mas o arquivo não existe no dist"
  fi

  if [ -n "$framework" ]; then
    [ -f "$DIST/$framework" ] || fail "$label referencia $framework mas o arquivo não existe no dist"
  fi
}

verify_html_assets "$DIST/index.html" "index.html"
[ -f "$DIST/doc/index.html" ] && verify_html_assets "$DIST/doc/index.html" "doc/index.html"

[ -f "$DIST/ispconsultor-icone.png" ] || fail "ispconsultor-icone.png ausente no dist"

echo "[verify-dist] OK — assets do HTML presentes em $DIST"
