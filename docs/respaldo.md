# Respaldo y recuperación

Todo lo que Sinapsis guarda está en la carpeta `datos/` del proyecto:

| Qué | Dónde |
|---|---|
| Base de datos (productos, lotes, pedidos, usuarios) | `datos/sinapsis.db` |
| PDF de los pedidos a farmacia | `datos/pedidos/` |
| Fotos de referencia | `datos/fotos/` |

## Respaldo diario automático
`scripts/respaldo.sh` hace una copia consistente de la base de datos aunque la app esté en uso,
la empaqueta con los PDF y fotos en `/opt/respaldos/sinapsis/sinapsis_AAAA-MM-DD_HHMM.tar.gz` y
borra los respaldos de más de 30 días.

```bash
sudo crontab -e
# agregar:
15 2 * * * /opt/sinapsis/scripts/respaldo.sh >> /var/log/sinapsis-respaldo.log 2>&1
```
Variables opcionales: `PROYECTO`, `DESTINO`, `DIAS_A_GUARDAR`.

**Recomendado:** copiar también los respaldos fuera del VPS (otro servidor, almacenamiento en la nube
o un disco del instituto) al menos una vez por semana. Un respaldo en el mismo servidor no protege si
el servidor falla.

## Restaurar
```bash
cd /opt/sinapsis
docker compose stop sinapsis
mkdir -p /tmp/restaurar && tar -xzf /opt/respaldos/sinapsis/sinapsis_FECHA.tar.gz -C /tmp/restaurar
cp datos/sinapsis.db datos/sinapsis.db.antes-de-restaurar     # por si acaso
cp /tmp/restaurar/sinapsis.db datos/sinapsis.db
rm -f datos/sinapsis.db-wal datos/sinapsis.db-shm
cp -r /tmp/restaurar/pedidos/. datos/pedidos/
cp -r /tmp/restaurar/fotos/. datos/fotos/ 2>/dev/null || true
sudo chown -R 1000:1000 datos
docker compose start sinapsis
```

## Probar el respaldo
Una vez al mes, restaure el último respaldo en una carpeta de prueba y abra la base con
`sqlite3 sinapsis.db "select count(*) from productos;"`. Un respaldo que nunca se probó no es un respaldo.
