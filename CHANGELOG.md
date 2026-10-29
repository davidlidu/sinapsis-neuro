# Registro de cambios

Formato: versión, fecha y cambios agrupados en *Agregado*, *Cambiado* y *Corregido*.

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
