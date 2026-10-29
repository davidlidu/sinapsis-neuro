# Registro de cambios

Formato: versión, fecha y cambios agrupados en *Agregado*, *Cambiado* y *Corregido*.

## [0.3.3] — 2026-10-29
### Corregido
- Celular: los campos de fecha ya no se salen de la pantalla (iPhone).
- Con una ventana emergente abierta, la página de fondo ya no se desplaza.
- La ventana emergente se cierra al arrastrar la raya superior hacia abajo o al tocar fuera de ella.

## [0.3.2] — 2026-10-29
### Agregado
- Filtro por sección en **Inventario → Productos** (se combina con *Bajo mínimo* y con la búsqueda).
### Cambiado
- Respaldo con IA: más margen de respuesta y poco razonamiento, para modelos que piensan antes de
  responder (como NVIDIA Nemotron).

## [0.3.1] — 2026-10-29
### Agregado
- Lista de secciones: en el producto la sección se elige de una lista (o se crea una nueva ahí mismo).
  En **Configuración** se agregan, renombran (sus productos quedan con el nombre nuevo) y eliminan
  (sus productos pasan a otra sección o quedan sin sección). La lista se arma sola con las secciones
  que ya tenían los productos y con las que llegan en la carga del Excel.
- Guía de despliegue en Dokploy (`docs/despliegue-dokploy.md`).

## [0.3.0] — 2026-10-29 · Pedidos a farmacia
### Agregado
- El pedido sugerido incluye solo lo que está en cero, bajo el mínimo o con lotes que vencen en los
  próximos 10 días (o ya vencidos), con el motivo de cada línea.
- Botón **Quitar** en cada línea del borrador.
- Cód. farmacia resaltado bajo cada producto del pedido y de la recepción: un toque lo copia para el
  sistema interno. **Copiar lista** copia todos los códigos con su cantidad.
- Formato de pedido en blanco (PDF llenable y Excel) con todos los productos, mínimo y cantidad a pedir;
  al subirlo lleno se arma el borrador.
- Pantalla **Configuración** (administrador): días de vencimiento para el pedido y para las alertas.
### Cambiado
- "Referencia" se llama ahora **Cód. farmacia** en la app, las etiquetas, la exportación y la plantilla
  (`cod_farmacia`; el encabezado `referencia` se sigue aceptando).

## [0.2.0] — 2026-10-29 · Laboratorio clínico
### Agregado
- Reactivos que se cuentan por pruebas (`pruebas_por_unidad`): existencias y mínimo en pruebas,
  ingresos y pedidos en kits con conversión automática; el pedido sugerido redondea a kits enteros.
- Sección del producto (laboratorio o servicio), visible en las listas y buscable.
- Listado del laboratorio clínico convertido: `plantillas/catalogo_laboratorio_clinico.xlsx` (231 productos).
- Columnas opcionales en la plantilla: `seccion`, `pruebas_por_unidad`, `activo`.
- Notificaciones push con el ícono de la app: resumen diario de alertas, prueba y desactivación por dispositivo.
- Instalación como app desde **Más opciones → Este dispositivo** (con guía para iPhone, Android y escritorio)
  y accesos directos del ícono (Escanear, Alertas, Manual).
- Manual de uso animado dentro de la app (`#/manual`).
- Logo del Hospital Neurológico de Colombia en el ingreso, la barra lateral y *Acerca de*.
### Cambiado
- Una recarga del catálogo fija la existencia inicial de los productos que siguen en 0 y sin movimientos.
- La imagen de Docker usa la zona horaria `America/Bogota`; el respaldo incluye la clave de notificaciones.
### Corregido
- La carga del Excel reconoce encabezados que el normalizador abrevia (como `unidad` → `und`).

## [0.1.1] — 2026-10-29
### Agregado
- Vista de escritorio (desde 1024 px): navegación lateral, contenido más ancho, diálogos centrados
  y estados al pasar el mouse. En el celular la app se ve igual que antes.
### Corregido
- `.gitignore`: ignora `.sf/`, `.venv/` y `.DS_Store`.
- README: las pruebas se corren con `python -m pytest -q`.

## [0.1.0] — 2026-10-29 · Primera versión
### Agregado
- Identificación por código de barras y etiqueta QR propia, leída en el celular.
- Identificación por foto del nombre con OCR local (Tesseract) y búsqueda tolerante a errores (RapidFuzz).
- Aprendizaje de alias a partir de las lecturas confirmadas.
- Respaldo opcional con IA vía OpenRouter: modelo principal y alterno, límite diario y registro de llamadas.
- Carga inicial del catálogo desde Excel con validación previa, plantilla e instrucciones.
- Registro de ingresos con fecha de ingreso, vencimiento y lote; conteo físico; historial de movimientos.
- Alertas de lotes vencidos, próximos a vencer, productos bajo el mínimo y pendientes de farmacia.
- Pedidos: borrador sugerido por stock mínimo, confirmación manual con PDF, recepción por línea
  (completa o parcial) que suma al inventario, cierre con pendientes y entregas tardías.
- Marca de posible desabastecimiento tras pedidos seguidos sin llegar.
- Hoja imprimible de etiquetas QR y exportación del inventario a Excel.
- Usuarios con roles administrador y operador.
- App del celular instalable (PWA) con la identidad visual de DeerSystems.
- Docker Compose con límites de memoria, configuración de Nginx con HTTPS y respaldo diario.
- Documentación completa en `docs/`.
