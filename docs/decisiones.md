# Decisiones técnicas

Cada decisión importante con su fecha, lo que se descartó y por qué. Las nuevas se agregan al final.

| # | Fecha | Decisión | Alternativa descartada | Razón |
|---|---|---|---|---|
| 1 | 2026-10-29 | Identificar por **código de barras, OCR de nombre y QR propio**, sin IA como método principal. | Reconocimiento por foto del producto (ORB o modelo de visión). | Son más de 1.000 productos y muchos se parecen; la comparación de fotos se equivocaría. El código y el texto impreso son exactos. |
| 2 | 2026-10-29 | **IA solo como respaldo** vía OpenRouter, con modelo gratuito y uno barato de alterno, límite diario y registro de cada llamada. | IA gratuita como método base para quitar carga al VPS. | El procesamiento local ya es liviano (~100 MB). Los modelos gratuitos tienen límites, cambian, agregan espera y requieren enviar fotos afuera. |
| 3 | 2026-10-29 | La IA **solo lee texto**; la búsqueda y la decisión siguen siendo locales y del usuario. | Pedirle a la IA que diga qué producto es. | La IA no conoce el catálogo; así se evita que invente y se mantiene el control del instituto. |
| 4 | 2026-10-29 | **SQLite** en modo WAL. | PostgreSQL. | Para ~1.000 productos y pocos usuarios sobra, no consume RAM fija y el respaldo es un archivo. Migrable a PostgreSQL cambiando `SINAPSIS_DB_URL`. |
| 5 | 2026-10-29 | **App web instalable (PWA)** servida por la misma API. | App nativa o ejecutable. | No hay que publicarla en tiendas, se actualiza sola y funciona en cualquier celular con navegador. |
| 6 | 2026-10-29 | El código de barras se lee **en el celular** (html5-qrcode, copia local). | Enviar la imagen al servidor para leer el código. | Cero carga en el VPS y respuesta inmediata. |
| 7 | 2026-10-29 | Preprocesar fotos con **Pillow**. | OpenCV. | Hace lo necesario (grises, contraste, tamaño, orientación) y la imagen Docker pesa mucho menos. |
| 8 | 2026-10-29 | Búsqueda con **RapidFuzz `WRatio`** sobre nombre normalizado, presentación, referencia y alias, línea por línea. | Búsqueda exacta o `LIKE`. | Tolera los errores típicos del OCR (`5OO`, `l` por `I`) y el ruido de otras líneas del empaque. |
| 9 | 2026-10-29 | Las lecturas confirmadas se **guardan como alias**. | Reentrenar o ajustar el OCR. | El sistema mejora con el uso sin IA ni mantenimiento. |
| 10 | 2026-10-29 | El pedido se **sugiere por stock mínimo y se confirma a mano** adjuntando el PDF. | Envío automático. | Pedido del instituto: la decisión final es humana y el PDF es el respaldo de lo que se pidió. |
| 11 | 2026-10-29 | Un pedido **cerrado con pendientes sigue aceptando entregas** tardías. | Exigir un pedido nuevo. | Farmacia suele completar días después; así la alerta se apaga sola cuando llega. |
| 12 | 2026-10-29 | **Posible desabastecimiento** = el producto queda pendiente en 2 pedidos seguidos (configurable). | Marcarlo desde el primer pendiente. | Un solo faltante puede ser un retraso; dos seguidos indican un problema de farmacia. |
| 13 | 2026-10-29 | Sesiones con **token propio** y claves PBKDF2 de la biblioteca estándar. | Librerías de JWT u OAuth. | Menos dependencias y se pueden revocar sesiones borrándolas. |
| 14 | 2026-10-29 | Fuentes de marca (Montserrat, Inter, JetBrains Mono) **servidas desde el VPS**. | Google Fonts. | La app abre igual sin internet externo y no se comparte información del uso con terceros. |
