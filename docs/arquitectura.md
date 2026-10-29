# Arquitectura

Sinapsis es una sola aplicación que corre en un contenedor Docker dentro del VPS compartido.

```
 Celular (navegador / app instalada)                    VPS
┌──────────────────────────────────┐     HTTPS    ┌───────────────────────────────────────┐
│ PWA (frontend/)                  │ ───────────▶ │ Nginx  (certificado Let's Encrypt)    │
│ • Lector de códigos html5-qrcode │              │   │                                    │
│   (lee el código EN el celular)  │              │   ▼  127.0.0.1:8040                    │
│ • Cámara para fotos del nombre   │              │ Contenedor "sinapsis" (512 MB máx.)    │
│ • Formularios de ingreso,        │              │ ├─ FastAPI (backend/app)               │
│   pedidos y recepción            │              │ │   ├─ routers/   rutas HTTP           │
└──────────────────────────────────┘              │ │   └─ services/  reglas de negocio    │
                                                  │ ├─ Tesseract (OCR local, 1 a la vez)   │
                                                  │ └─ /datos (volumen)                    │
                                                  │     ├─ sinapsis.db   SQLite            │
                                                  │     ├─ pedidos/      PDF de pedidos    │
                                                  │     └─ fotos/                          │
                                                  └───────────────┬───────────────────────┘
                                                                  │ solo si se activa
                                                                  ▼
                                                        OpenRouter (respaldo con IA)
```

## Componentes

| Componente | Archivo(s) | Responsabilidad |
|---|---|---|
| Configuración | `app/config.py` | Lee todas las variables de entorno. |
| Base de datos | `app/database.py`, `app/models.py` | Conexión SQLite (WAL) y tablas. |
| Seguridad | `app/seguridad.py`, `routers/auth.py` | Usuarios, claves PBKDF2, sesiones con token. |
| Catálogo | `services/catalogo.py`, `routers/productos.py` | Plantilla y carga desde Excel, edición, etiquetas, exportación. |
| Identificación | `services/busqueda.py`, `services/ocr.py`, `services/ia_respaldo.py`, `routers/identificar.py` | Código → OCR → IA; búsqueda aproximada; aprendizaje de alias. |
| Inventario | `services/inventario.py`, `routers/inventario.py` | Ingresos con vencimiento, conteos, movimientos, alertas. |
| Pedidos | `services/pedidos.py`, `routers/pedidos.py` | Borrador por stock mínimo, PDF, recepción, pendientes. |
| App del celular | `frontend/` | Interfaz PWA con la marca DeerSystems. |

## Flujo de identificación

1. El celular lee el código de barras o QR **localmente** y consulta `GET /api/identificar/codigo/{valor}`.
   Coincide contra código de barras, código QR propio o referencia.
2. Si no hay código, se toma una foto: `POST /api/identificar/foto`. El servidor la reduce, la pasa a
   escala de grises, mejora el contraste y la lee con Tesseract. El texto se compara con el catálogo
   con RapidFuzz (`WRatio`) contra el nombre normalizado, la presentación, la referencia y los alias,
   línea por línea. Devuelve hasta 5 candidatos con su puntaje.
3. Si nada coincide y el respaldo está activo, `POST /api/identificar/ia` envía la foto reducida
   (≈800 px, JPEG 70 %) a OpenRouter. La IA solo devuelve texto; la búsqueda sigue siendo local.
4. El usuario elige el producto. `POST /api/identificar/confirmar` guarda la lectura como alias
   aprendido, para que la próxima vez coincida mejor sin IA.

## Flujo de pedidos

```
borrador ──(PDF adjunto, confirmación manual)──▶ enviado ──▶ recibido_parcial ──▶ recibido
                                                     │              │
                                                     └──(cerrar)────┴──▶ cerrado_con_pendientes
                                                                           │  (aún acepta entregas tardías)
                                                                           └──▶ recibido
```

* Solo puede haber un borrador abierto a la vez.
* Lo recibido crea un lote con su vencimiento y suma al inventario en la misma transacción.
* Una línea pendiente o parcial genera alerta. Si el mismo producto queda pendiente en
  `SINAPSIS_PEDIDOS_DESABASTECIMIENTO` pedidos seguidos (2 por defecto), se marca como
  **posible desabastecimiento**.

## Consumo de recursos

Con el catálogo de ~1.000 productos, el servidor usa alrededor de 100 MB de RAM (medido en pruebas con datos de demostración, incluido el OCR).
El OCR genera picos cortos (1–2 s) y se limita a un proceso simultáneo. Docker Compose fija un
máximo de 512 MB y 1 CPU para proteger los demás proyectos del VPS.
