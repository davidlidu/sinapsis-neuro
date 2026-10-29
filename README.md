# Sinapsis

**Inventario, vencimientos y pedidos a farmacia del Instituto Neurológico de Colombia.**
Desarrollado por **DeerSystems** como proyecto sin ánimo de lucro.

Sinapsis se usa desde el celular o el computador, se instala como app (PWA) y envía notificaciones: se escanea un producto, se registra su fecha de ingreso y de
vencimiento, y la plataforma avisa qué está por vencer, qué está bajo el mínimo y qué no ha
llegado de farmacia. Funciona **sin inteligencia artificial**; la IA es solo un respaldo opcional.

## Cómo identifica cada producto

1. **Código de barras de fábrica** — se lee con la cámara del celular.
2. **Nombre impreso** — foto + lectura de texto local (Tesseract) + búsqueda tolerante a errores.
3. **Etiqueta QR propia** — para los productos sin código ni nombre legible (`SNP-000123`).
4. **Respaldo con IA (opcional)** — vía OpenRouter, solo si fallan los anteriores.

En todos los casos el usuario confirma el producto. Cada lectura confirmada se aprende como alias.

## Estructura

```
sinapsis/
├── backend/            API en Python (FastAPI + SQLite)
│   ├── app/
│   │   ├── main.py         arranque de la app
│   │   ├── models.py       tablas
│   │   ├── routers/        rutas de la API por módulo
│   │   └── services/       reglas de negocio (catálogo, OCR, pedidos, alertas…)
│   └── tests/          prueba de punta a punta
├── frontend/           app del celular (PWA, sin compilación)
├── docs/               documentación completa
├── nginx/              configuración de ejemplo para HTTPS
├── plantillas/         plantilla de Excel para la carga inicial
├── scripts/            respaldo diario y datos de demostración
├── Dockerfile
└── docker-compose.yml
```

## Correr en local

Requisitos: Python 3.12+ y Tesseract (`sudo apt install tesseract-ocr tesseract-ocr-spa`).

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export SINAPSIS_ADMIN_CLAVE=una-clave-local
python ../scripts/datos_demo.py          # opcional: carga 26 productos de prueba
uvicorn app.main:app --reload --port 8000
```

Abra <http://localhost:8000> (usuario `admin`). La documentación interactiva de la API queda en
<http://localhost:8000/docs>. En el celular la cámara solo funciona con HTTPS (ver despliegue).

Pruebas: `cd backend && python -m pytest -q`.

## Poner en el VPS

```bash
cp .env.example .env      # complete la clave del administrador
docker compose up -d --build
```

Luego configure Nginx con `nginx/sinapsis.conf` y el certificado de Let's Encrypt.
Paso a paso en [docs/despliegue.md](docs/despliegue.md).

## Documentación

| Documento | Para quién |
|---|---|
| [Manual de usuario](docs/manual-usuario.md) | Personal del instituto |
| [Guía de carga inicial](docs/carga-inicial.md) | Personal del instituto |
| [Arquitectura](docs/arquitectura.md) | Desarrolladores |
| [Modelo de datos](docs/modelo-datos.md) | Desarrolladores |
| [API](docs/api.md) | Desarrolladores |
| [Decisiones técnicas](docs/decisiones.md) | Desarrolladores |
| [Instalación y despliegue](docs/despliegue.md) | Administrador |
| [Respaldo y recuperación](docs/respaldo.md) | Administrador |
| [Registro de cambios](CHANGELOG.md) | Todos |

Regla del proyecto: **ninguna funcionalidad se da por terminada sin su documentación actualizada.**

---
DeerSystems · *Sistemas que conectan, soluciones que simplifican.*
