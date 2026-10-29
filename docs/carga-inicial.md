# Guía de carga inicial del catálogo

El catálogo es la base con la que Sinapsis compara todo lo que se escanea o se lee por foto.
Si está bien armado, la identificación funciona bien; si tiene errores, ningún método lo compensa.

## 1. Descargar la plantilla
En la app: **⋯ → Carga del catálogo → Descargar plantilla**. También está en
`plantillas/plantilla_catalogo_sinapsis.xlsx`. Las columnas verdes son obligatorias.

| Columna | Obligatoria | Qué va | Ejemplo |
|---|---|---|---|
| nombre | Sí | Nombre **tal como aparece impreso** en el empaque. | Levetiracetam |
| cod_farmacia | Sí | Código de farmacia (el del sistema interno). Único. También se acepta el encabezado `referencia`. | 265947 |
| codigo_barras | No | Código de barras de fábrica (como texto). | 7702001000011 |
| metodo | No | `barras`, `nombre` o `qr`. Vacío: `barras` si hay código, si no `nombre`. | qr |
| alias | No | Otros nombres, separados por coma. | Keppra, LEV |
| presentacion | No | Concentración, tamaño o unidad. Ayuda mucho con productos parecidos. | 500 mg x 30 tab |
| stock_minimo | Sí | Por debajo de este número se sugiere pedir. | 10 |
| cantidad_actual | Sí | Lo que hay hoy (inventario de arranque). | 24 |
| fecha_vencimiento | No | Del inventario de arranque, `AAAA-MM-DD`. | 2027-06-30 |
| lote | No | Del inventario de arranque. | L2406A |
| seccion | No | Sección del laboratorio o servicio. Se muestra en las listas y sirve para buscar. | Microbiología · Reactivo |
| pruebas_por_unidad | No | Solo reactivos que se gastan por pruebas: cuántas trae cada kit. Si se llena, `stock_minimo` y `cantidad_actual` van **en pruebas**. | 750 |
| activo | No | `si` o `no`. Con `no` el producto no aparece ni se sugiere en pedidos. | no |

## 2. Consejos para llenarla
* **Una fila por producto distinto.** Si dos presentaciones son distintas (500 mg y 1000 mg), son dos filas con códigos de farmacia distintos.
* Escribe el **nombre como está en la caja**, no como se dice en el día a día; lo coloquial va en **alias**.
* Copia los códigos de barras como texto para que Excel no los convierta (la plantilla ya viene preparada).
* Usa `metodo = qr` para todo producto sin código de barras y con nombre difícil de leer (insumos sueltos, frascos reenvasados).
* Si un producto tiene varios lotes con fechas distintas, carga aquí uno y registra los demás desde la app con **Registrar ingreso**.
* Borra las dos filas de ejemplo antes de subir el archivo.

## 3. Subir y revisar
1. **⋯ → Carga del catálogo → Elegir archivo .xlsx**.
2. Sinapsis revisa todo **sin guardar nada**. Si hay errores, muestra cada uno con su fila:
   nombres o códigos de farmacia vacíos, códigos repetidos, números inválidos, fechas que no se entienden.
3. Corrige el Excel y vuelve a subirlo hasta que diga *listos para cargar, sin errores*.
4. Toca **Cargar N productos**. Al terminar puedes imprimir las etiquetas QR pendientes.

## 4. Recargar o corregir
Puedes volver a subir el archivo cuando quieras. Si un **cód. farmacia ya existe**, se actualizan su
nombre, código, presentación, sección, stock mínimo, activo y alias. Los códigos nuevos se crean.

**Existencias después del catálogo:** si el producto sigue en 0 y nadie le ha registrado ingresos ni
conteos, la `cantidad_actual` del archivo se toma como existencia inicial. Así se puede cargar el
catálogo primero y las cantidades después, en el mismo Excel. Una vez el producto tiene movimientos,
la recarga **no toca el inventario** (para eso está el conteo físico).

## Listado del laboratorio clínico
`plantillas/catalogo_laboratorio_clinico.xlsx` es el listado *Inventario Reactivos Imprimible* ya
convertido: 231 productos en 10 secciones, 56 contados por pruebas y 34 con umbral de pedido. Todos
arrancan en 0. Para cargar existencias, llena `cantidad_actual` (en pruebas cuando hay
`pruebas_por_unidad`) y vuelve a subirlo. Quedaron marcados para revisar:
* `LAB-SINREF-1` a `-3`: SCCS, START ANTIGEN e ISE DEPROTEINIZER no tenían referencia.
* `265962-B`: ELECSYS TSH V3 CALSET compartía la referencia 265962 con PRECINORM PUC; parece el mismo producto que 265956.
* `265963` FERRITIN: se cargó inactivo porque decía *NO VOLVER A PEDIR*.
* `265838` ACTIVADOR y `265954` HIV PRECICONTROL: tenían umbral en pruebas sin ser reactivos de prueba; quedaron con mínimo 0.
* `266018` estaba repetido en *Varios*; se cargó una sola vez.

## 5. Etiquetas QR
Cada producto recibe un código propio `SNP-000123`. **⋯ → Etiquetas QR** abre una hoja carta con
3 columnas de etiquetas (con QR, nombre, presentación y referencia) lista para imprimir en papel
adhesivo. Pégala en el producto o en su estante.

## 6. Cómo mejora con el uso
Cuando la foto lee algo distinto al nombre del catálogo y el usuario confirma el producto correcto,
esa lectura se guarda como **alias aprendido**. Con el tiempo los productos se reconocen mejor sin IA.
Un administrador puede borrar alias equivocados desde la ficha del producto.
