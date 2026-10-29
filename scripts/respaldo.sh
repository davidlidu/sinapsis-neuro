#!/usr/bin/env bash
# Respaldo diario de Sinapsis: base de datos (copia consistente), PDF de pedidos y fotos.
# Programar con cron, por ejemplo a las 2:15 a. m.:
#   15 2 * * * /opt/sinapsis/scripts/respaldo.sh >> /var/log/sinapsis-respaldo.log 2>&1
set -euo pipefail

PROYECTO="${PROYECTO:-/opt/sinapsis}"
DESTINO="${DESTINO:-/opt/respaldos/sinapsis}"
DIAS_A_GUARDAR="${DIAS_A_GUARDAR:-30}"
FECHA="$(date +%Y-%m-%d_%H%M)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$DESTINO"
# Copia consistente de SQLite aunque la app esté en uso.
docker exec sinapsis python -c "import sqlite3; s=sqlite3.connect('/datos/sinapsis.db'); d=sqlite3.connect('/datos/respaldo.db'); s.backup(d); d.close(); s.close()"
mv "$PROYECTO/datos/respaldo.db" "$TMP/sinapsis.db"
cp -r "$PROYECTO/datos/pedidos" "$PROYECTO/datos/fotos" "$TMP/" 2>/dev/null || true

tar -czf "$DESTINO/sinapsis_$FECHA.tar.gz" -C "$TMP" .
find "$DESTINO" -name 'sinapsis_*.tar.gz' -mtime +"$DIAS_A_GUARDAR" -delete
echo "$(date -Is) respaldo creado: $DESTINO/sinapsis_$FECHA.tar.gz"
