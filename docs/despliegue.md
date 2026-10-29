# Instalación y despliegue en el VPS

Sinapsis corre en un contenedor Docker detrás de Nginx. Está pensado para un VPS compartido:
usa alrededor de 100 MB de RAM y tiene un límite de 512 MB.

## Requisitos
* Docker y Docker Compose v2.
* Nginx y Certbot (Let's Encrypt).
* Un subdominio apuntando al VPS, por ejemplo `sinapsis.ejemplo.co`.
* **HTTPS es obligatorio**: sin él, el navegador del celular no permite usar la cámara.

## 1. Subir el proyecto
```bash
sudo mkdir -p /opt/sinapsis && sudo chown $USER /opt/sinapsis
# copie aquí el contenido del repositorio (git clone o scp)
cd /opt/sinapsis
```

## 2. Configurar
```bash
cp .env.example .env
nano .env        # como mínimo: SINAPSIS_ADMIN_CLAVE
mkdir -p datos && sudo chown 1000:1000 datos
```
Variables principales (todas en `.env.example`, con comentarios):

| Variable | Defecto | Uso |
|---|---|---|
| `SINAPSIS_ADMIN_USUARIO` / `SINAPSIS_ADMIN_CLAVE` | `admin` / — | Primer administrador. Si la clave queda vacía se genera una y aparece en el log. |
| `SINAPSIS_DIAS_ALERTA_VENCIMIENTO` | 30 | Días antes del vencimiento para avisar. |
| `SINAPSIS_DIAS_ALERTA_PENDIENTE` | 5 | Días para marcar un pendiente como atrasado. |
| `SINAPSIS_PEDIDOS_DESABASTECIMIENTO` | 2 | Pedidos seguidos sin llegar para marcar posible desabastecimiento. |
| `SINAPSIS_OCR_MAX_SIMULTANEOS` | 1 | Lecturas de texto al mismo tiempo. |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODELO`, `OPENROUTER_MODELO_ALTERNO` | vacío | Respaldo con IA. Vacío = desactivado. |
| `SINAPSIS_IA_LIMITE_DIARIO` | 50 | Consultas de IA por día. |

## 3. Levantar
```bash
docker compose up -d --build
docker compose logs -f sinapsis      # verifique que arrancó
curl -s http://127.0.0.1:8040/api/salud
```
El contenedor solo escucha en `127.0.0.1:8040`; si ese puerto ya lo usa otro proyecto, cámbielo en
`docker-compose.yml` y en Nginx.

## 4. Nginx y HTTPS
```bash
sudo cp nginx/sinapsis.conf /etc/nginx/sites-available/sinapsis
sudo sed -i 's/sinapsis.ejemplo.co/SU-DOMINIO/g' /etc/nginx/sites-available/sinapsis
sudo ln -s /etc/nginx/sites-available/sinapsis /etc/nginx/sites-enabled/
# Primera vez: comente temporalmente el bloque 443 o use "certbot --nginx" directamente
sudo certbot --nginx -d SU-DOMINIO
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Primer ingreso
1. Abra `https://SU-DOMINIO` e ingrese con el usuario administrador.
2. Cambie la clave en **Más → Cambiar clave**.
3. Cree los usuarios del personal en **Más → Usuarios**.
4. Haga la carga inicial del catálogo ([guía](carga-inicial.md)).
5. En cada celular, abra el sitio y use **"Agregar a pantalla de inicio"** para instalar la app.

## 6. Activar el respaldo con IA (opcional)
1. Cree una cuenta y una clave en openrouter.ai y fije un tope de gasto en la cuenta.
2. Elija en el catálogo de OpenRouter un modelo **con soporte de imágenes**: uno gratuito
   (sufijo `:free`) como principal y uno pequeño de pago como alterno.
3. Complete en `.env` las variables `OPENROUTER_*` y ejecute `docker compose up -d`.
4. Verifique en la app: **Más → Respaldo con IA** debe decir *Activo*.

Las fotos solo salen del VPS cuando un usuario pulsa *Probar con IA*. Para apagarlo:
`SINAPSIS_IA_HABILITADA=false`.

## Actualizar a una versión nueva
```bash
cd /opt/sinapsis
./scripts/respaldo.sh                # siempre respaldar antes
git pull                             # o copie los archivos nuevos
docker compose up -d --build
```
Revise el [registro de cambios](../CHANGELOG.md) antes de actualizar.

## Revisar consumo
```bash
docker stats sinapsis --no-stream
```
