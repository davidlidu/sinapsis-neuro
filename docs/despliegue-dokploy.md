# Despliegue en Dokploy

Sinapsis es **una sola imagen** (API + app) construida con el `Dockerfile` de la raíz. En Dokploy se
despliega como **Application** (no como Compose): Dokploy construye la imagen, la publica con su
proxy (Traefik) y le pone HTTPS de Let's Encrypt. El `docker-compose.yml` del repositorio es para el
despliegue manual con Nginx ([despliegue.md](despliegue.md)) y no se usa aquí.

**HTTPS es obligatorio**: sin él el celular no permite la cámara, la instalación ni las notificaciones.

## Antes de empezar
1. Sube el código a tu repositorio (GitHub, GitLab o Gitea). `.env` y `datos/` no se suben.
2. Crea el registro DNS del subdominio, por ejemplo `sinapsis.neurologico.org` → IP del VPS
   (registro **A**). Espera a que resuelva (`ping sinapsis.neurologico.org`).
3. En el VPS crea la carpeta de datos con el dueño que usa el contenedor (uid 1000):
   ```bash
   sudo mkdir -p /opt/sinapsis/datos && sudo chown -R 1000:1000 /opt/sinapsis/datos
   ```

## 1. Crear la aplicación
1. **Projects → Create Project** → nombre `Sinapsis`.
2. Dentro del proyecto: **Create Service → Application** → nombre `sinapsis`.
3. Pestaña **General → Provider**: elige tu proveedor Git (si no aparece, conéctalo antes en
   **Settings → Git**), el repositorio y la rama (`main`).
4. **Build Type: Dockerfile**. Docker File: `Dockerfile` · Docker Context Path: `.` · Build Stage: vacío.
5. **Save**.

## 2. Variables de entorno
Pestaña **Environment**. Pega esto y cambia los valores marcados:
```env
SINAPSIS_ADMIN_USUARIO=admin
SINAPSIS_ADMIN_CLAVE=una-clave-larga-y-unica        # ← cámbiala; luego cámbiala otra vez desde la app
SINAPSIS_SESION_HORAS=12
SINAPSIS_DIAS_ALERTA_VENCIMIENTO=30
SINAPSIS_DIAS_ALERTA_PENDIENTE=5
SINAPSIS_PEDIDOS_DESABASTECIMIENTO=2
SINAPSIS_OCR_IDIOMA=spa+eng
SINAPSIS_OCR_MAX_SIMULTANEOS=1
SINAPSIS_NOTIFICACIONES=true
SINAPSIS_HORA_NOTIFICACION=7
SINAPSIS_VAPID_CONTACTO=mailto:sistemas@neurologico.org   # ← un correo real del responsable
# IA de respaldo (opcional; vacío = sin IA)
OPENROUTER_API_KEY=
OPENROUTER_MODELO=
OPENROUTER_MODELO_ALTERNO=
SINAPSIS_IA_LIMITE_DIARIO=50
```
**Save**. (La zona horaria `America/Bogota` ya viene en la imagen.)

## 3. Datos persistentes (¡no te lo saltes!)
Sin este paso **cada despliegue borra la base de datos**.

Pestaña **Advanced → Volumes / Mounts → Add Volume**:
* Tipo **Bind Mount** · Host Path: `/opt/sinapsis/datos` · Mount Path: `/datos`.

Ahí quedan la base (`sinapsis.db`), los PDF de los pedidos, las fotos y la clave de las
notificaciones (`vapid_privada.pem`; si se pierde, cada dispositivo debe volver a activar las notificaciones).

## 4. Recursos
En **Advanced → Resources**: Memory Limit `536870912` (512 MB) y CPU Limit `1` (o lo que permita el VPS).
Deja **una sola réplica**: Sinapsis usa SQLite y un solo proceso.

## 5. Dominio y HTTPS
Pestaña **Domains → Add Domain**:
* Host: `sinapsis.neurologico.org` · Path: `/` · **Container Port: `8000`**
* HTTPS: activado · Certificate: **Let's Encrypt**.

## 6. Desplegar
1. **Deploy** (arriba a la derecha). Sigue el avance en **Deployments → logs**: la primera vez tarda
   unos minutos (instala Tesseract y las librerías).
2. Cuando termine, en **Logs** debe aparecer `Application startup complete.`
3. Comprueba: `https://sinapsis.neurologico.org/api/salud` → `{"ok":true,"version":"0.3.1",…}`.
4. Entra a la app con `admin` y la clave de `SINAPSIS_ADMIN_CLAVE` y **cámbiala** en ⋯ → Usuarios.
5. Carga el catálogo: ⋯ → Carga del catálogo → `plantillas/catalogo_laboratorio_clinico.xlsx`.

## 7. Actualizaciones
* Manual: haz `git push` y pulsa **Deploy** (o **Rebuild**).
* Automático: en **General** activa **Autodeploy**; con GitHub conectado como App, cada push a la
  rama despliega solo. Con otro proveedor, copia la **Webhook URL** de Deployments en el webhook del repositorio.
* Los datos no se pierden al actualizar (están en `/opt/sinapsis/datos`). Las columnas nuevas de la base se
  agregan solas al arrancar.

## 8. Respaldo diario
En el VPS, con `crontab -e` (como root o un usuario con acceso a Docker):
```cron
15 2 * * * C=$(docker ps -q -f name=sinapsis | head -1) && docker exec $C python -c "import sqlite3; s=sqlite3.connect('/datos/sinapsis.db'); d=sqlite3.connect('/datos/respaldo.db'); s.backup(d)" && mkdir -p /opt/respaldos/sinapsis && tar -czf /opt/respaldos/sinapsis/sinapsis_$(date +\%F).tar.gz -C /opt/sinapsis/datos respaldo.db pedidos fotos vapid_privada.pem 2>/dev/null; rm -f /opt/sinapsis/datos/respaldo.db; find /opt/respaldos/sinapsis -name '*.tar.gz' -mtime +30 -delete
```
Copia `/opt/respaldos/sinapsis` fuera del VPS de vez en cuando. Para restaurar, ver [respaldo.md](respaldo.md).

## Problemas comunes
| Síntoma | Causa y solución |
|---|---|
| `PermissionError: /datos/...` en los logs | La carpeta del host no es del uid 1000: `sudo chown -R 1000:1000 /opt/sinapsis/datos` y **Restart**. |
| 404 o "Bad Gateway" en el dominio | El Container Port del dominio no es `8000`, o el despliegue aún no terminó. |
| El certificado no se emite | El DNS aún no apunta al VPS o los puertos 80/443 están cerrados. |
| Se perdieron los datos al desplegar | Falta el Bind Mount del paso 3. |
| No llegan las notificaciones | Revisa `SINAPSIS_VAPID_CONTACTO` y que el sitio abra con HTTPS; en iPhone, la app debe estar instalada en la pantalla de inicio. |
