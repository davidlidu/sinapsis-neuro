# API

La documentación interactiva, siempre al día con el código, está en **`/docs`** (Swagger) y
**`/redoc`** del servidor. Este resumen sirve como mapa.

Todas las rutas salvo `/api/auth/login` y `/api/salud` piden el encabezado
`Authorization: Bearer <token>`. Los errores responden `{"detail": "mensaje en español"}`.

```bash
TOKEN=$(curl -s -X POST https://sinapsis.ejemplo.co/api/auth/login \
  -H 'Content-Type: application/json' -d '{"usuario":"admin","clave":"..."}' | jq -r .token)
curl -s https://sinapsis.ejemplo.co/api/inventario/resumen -H "Authorization: Bearer $TOKEN"
```

## Usuarios — `/api/auth`
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/login` | Devuelve `token` y datos del usuario. |
| POST | `/logout` | Cierra la sesión. |
| GET | `/yo` | Usuario actual. |
| POST | `/clave` | `{actual, nueva}` cambia la clave propia. |
| GET / POST | `/usuarios` | Listar / crear (admin). |
| POST | `/usuarios/{id}/activo?activo=true` | Activar o desactivar (admin). |

## Catálogo — `/api/productos`
| Método | Ruta | Qué hace |
|---|---|---|
| GET | `?q=&filtro=todos\|bajo_minimo\|qr&limite=&desde=` | Listar o buscar. |
| GET | `/plantilla` | Descarga la plantilla de Excel. |
| POST | `/carga?aplicar=false` | Sube el Excel (`archivo`). Con `aplicar=false` solo valida; con `true` guarda si no hay errores (admin). |
| GET | `/etiquetas?ids=1,2` | Hoja HTML imprimible de etiquetas QR (sin `ids`: todos los de método `qr`). |
| GET | `/exportar` | Excel con inventario y lotes. |
| GET | `/{id}` | Detalle con lotes activos y alias. |
| GET | `/{id}/qr.svg` | QR del producto. |
| POST / PUT | `` / `/{id}` | Crear / editar (admin). |
| DELETE | `/{id}/alias/{alias_id}` | Quitar alias (admin). |
| POST | `/{id}/lotes/{lote_id}/retirar?motivo=retirado\|agotado` | Deja de alertar un lote. |

## Identificación — `/api/identificar`
| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/codigo/{valor}` | Busca por código de barras, QR propio o referencia. 404 si no existe. |
| POST | `/texto` | `{texto}` → hasta 5 candidatos con `puntaje` (0–100). |
| POST | `/foto` | Foto (`foto`, ≤ 8 MB) → OCR local → candidatos. Indica si la IA está disponible. |
| POST | `/ia` | Foto → OpenRouter → candidatos. 503 si está desactivada o se alcanzó el límite. |
| GET | `/ia/estado` | Activa o no, consultas de hoy y límite diario. |
| POST | `/confirmar` | `{producto_id, texto_leido}` guarda la lectura como alias. |

Ejemplo de respuesta de `/foto`:
```json
{"texto": "LEVETIRACETAM\n500 mg x 30 tabletas",
 "candidatos": [{"id": 2, "nombre": "Levetiracetam", "presentacion": "500 mg x 30 tab", "puntaje": 95, "...": "..."}],
 "ia_disponible": false}
```

## Inventario — `/api/inventario`
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/ingresos` | `{producto_id, cantidad, fecha_vencimiento, fecha_ingreso, lote}` crea un lote y suma. |
| POST | `/conteo/{producto_id}` | `{cantidad, nota}` reemplaza la cantidad (conteo físico). |
| GET | `/lotes?estado=vencido\|por_vencer\|vigente\|sin_fecha\|todos` | Lotes activos. |
| GET | `/movimientos/{producto_id}` | Últimos 100 movimientos. |
| GET | `/resumen` | Cifras del panel. |
| GET | `/alertas` | `vencidos`, `por_vencer`, `bajo_minimo`, `pendientes` (con `posible_desabastecimiento`). |

## Pedidos — `/api/pedidos`
| Método | Ruta | Qué hace |
|---|---|---|
| GET | `` | Últimos 100 pedidos. |
| POST | `` | Crea el borrador con lo que está bajo el mínimo. 400 si ya hay un borrador. |
| GET | `/{id}` | Detalle con líneas. |
| PUT | `/{id}/items` | `{producto_id, cantidad}` agrega o ajusta; `cantidad: 0` quita. Solo en borrador. |
| DELETE | `/{id}` | Elimina un borrador. |
| POST | `/{id}/enviar` | Adjunta el PDF (`pdf`, ≤ 20 MB) y pasa a enviado. |
| GET | `/{id}/pdf` | Descarga el PDF. |
| POST | `/{id}/recibir` | `{item_id, cantidad, fecha_vencimiento, lote}` suma al inventario. |
| POST | `/{id}/cancelar-pendiente` | `{item_id, nota}` deja de esperar una línea. |
| POST | `/{id}/cerrar` | `{observaciones}` cierra la recepción; lo que falta queda con alerta. |

## Sistema
`GET /api/salud` → `{ok, version, ia_respaldo}` (sin sesión; lo usa el healthcheck de Docker).
