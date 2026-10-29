# Modelo de datos

Base de datos SQLite en `/datos/sinapsis.db` (modo WAL). Las tablas se crean solas en el primer arranque.
Definición en `backend/app/models.py`.

```
usuarios ─┬─< sesiones
          │
productos ─┬─< alias
           ├─< lotes >──┐
           ├─< movimientos
           └─< pedido_items >── pedidos
                    └──────────┘ (un lote recibido apunta a su línea de pedido)
llamadas_ia   (registro del respaldo con IA)
```

## productos
| Campo | Tipo | Regla |
|---|---|---|
| id | entero | |
| nombre | texto | Como aparece impreso. |
| nombre_normalizado | texto | Minúsculas, sin tildes, unidades unificadas (`500mg` → `500 mg`). Se usa en la búsqueda. |
| referencia | texto, único | Clave de la carga desde Excel: si se repite, se actualiza el producto. |
| codigo_barras | texto, único, opcional | |
| codigo_qr | texto, único | Se asigna solo: `SNP-` + id con 6 dígitos. Todos los productos lo tienen. |
| presentacion | texto | Ayuda a distinguir productos parecidos. |
| metodo_identificacion | `barras` · `nombre` · `qr` | Indica cuáles necesitan etiqueta impresa. |
| stock_minimo | entero | Por debajo se sugiere pedir. |
| cantidad_actual | entero | Cambia solo con ingresos, recepciones y conteos (todo queda en `movimientos`). |
| activo | sí/no | |

## alias
Otros nombres de un producto. `origen = catalogo` viene del Excel; `origen = aprendido` sale de una
lectura de OCR o IA que el usuario confirmó. Un administrador puede borrar alias mal aprendidos.

## lotes
Cada ingreso con su vencimiento (en el plan inicial se llamaba *ingresos*).

| Campo | Regla |
|---|---|
| fecha_ingreso, fecha_vencimiento | El vencimiento puede quedar vacío si el producto no tiene. |
| cantidad | Cantidad que ingresó en ese lote. |
| estado | `activo` · `agotado` · `retirado`. Solo los activos generan alertas. |
| origen | `carga_inicial` · `manual` · `pedido`. |
| pedido_item_id | Línea de pedido de la que vino, si aplica. |

Estado de vencimiento (calculado): `vencido` (antes de hoy), `por_vencer` (dentro de
`SINAPSIS_DIAS_ALERTA_VENCIMIENTO` días, 30 por defecto), `vigente` y `sin_fecha`.

## movimientos
Bitácora de cada cambio de cantidad: `carga_inicial`, `ingreso`, `recepcion`, `conteo`, con la
cantidad antes y después, el usuario y la fecha. No se edita ni se borra.

## pedidos
| Campo | Regla |
|---|---|
| estado | `borrador` → `enviado` → `recibido_parcial` → `recibido`, o `cerrado_con_pendientes`. |
| archivo_pdf / nombre_pdf | PDF del pedido final enviado a farmacia (obligatorio para pasar a enviado). |
| fecha_envio, fecha_cierre | |

## pedido_items
| Campo | Regla |
|---|---|
| cantidad_sugerida | `stock_minimo − cantidad_actual` al crear el borrador (0 si se agregó a mano). |
| cantidad_pedida | La que el usuario confirma. |
| cantidad_recibida | Se acumula con cada recepción. |
| estado | `pendiente` · `parcial` · `llego` · `cancelado`. |

Un producto aparece una sola vez por pedido.

## usuarios y sesiones
Roles `admin` (carga del catálogo, edición de productos, usuarios) y `operador` (todo lo demás).
Las claves se guardan con PBKDF2-SHA256 (240.000 iteraciones). Las sesiones duran
`SINAPSIS_SESION_HORAS` (12 por defecto).

## llamadas_ia
Fecha, modelo, si funcionó, el texto leído o el error. Se usa para el límite diario y para revisar el consumo.
