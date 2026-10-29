# Guía de carga inicial del catálogo

El catálogo es la base con la que Sinapsis compara todo lo que se escanea o se lee por foto.
Si está bien armado, la identificación funciona bien; si tiene errores, ningún método lo compensa.

## 1. Descargar la plantilla
En la app: **⋯ → Carga del catálogo → Descargar plantilla**. También está en
`plantillas/plantilla_catalogo_sinapsis.xlsx`. Las columnas verdes son obligatorias.

| Columna | Obligatoria | Qué va | Ejemplo |
|---|---|---|---|
| nombre | Sí | Nombre **tal como aparece impreso** en el empaque. | Levetiracetam |
| referencia | Sí | Código interno o del proveedor. Único. | MED-0002 |
| codigo_barras | No | Código de barras de fábrica (como texto). | 7702001000011 |
| metodo | No | `barras`, `nombre` o `qr`. Vacío: `barras` si hay código, si no `nombre`. | qr |
| alias | No | Otros nombres, separados por coma. | Keppra, LEV |
| presentacion | No | Concentración, tamaño o unidad. Ayuda mucho con productos parecidos. | 500 mg x 30 tab |
| stock_minimo | Sí | Por debajo de este número se sugiere pedir. | 10 |
| cantidad_actual | Sí | Lo que hay hoy (inventario de arranque). | 24 |
| fecha_vencimiento | No | Del inventario de arranque, `AAAA-MM-DD`. | 2027-06-30 |
| lote | No | Del inventario de arranque. | L2406A |

## 2. Consejos para llenarla
* **Una fila por producto distinto.** Si dos presentaciones son distintas (500 mg y 1000 mg), son dos filas con referencias distintas.
* Escribe el **nombre como está en la caja**, no como se dice en el día a día; lo coloquial va en **alias**.
* Copia los códigos de barras como texto para que Excel no los convierta (la plantilla ya viene preparada).
* Usa `metodo = qr` para todo producto sin código de barras y con nombre difícil de leer (insumos sueltos, frascos reenvasados).
* Si un producto tiene varios lotes con fechas distintas, carga aquí uno y registra los demás desde la app con **Registrar ingreso**.
* Borra las dos filas de ejemplo antes de subir el archivo.

## 3. Subir y revisar
1. **⋯ → Carga del catálogo → Elegir archivo .xlsx**.
2. Sinapsis revisa todo **sin guardar nada**. Si hay errores, muestra cada uno con su fila:
   nombres o referencias vacías, referencias o códigos repetidos, números inválidos, fechas que no se entienden.
3. Corrige el Excel y vuelve a subirlo hasta que diga *listos para cargar, sin errores*.
4. Toca **Cargar N productos**. Al terminar puedes imprimir las etiquetas QR pendientes.

## 4. Recargar o corregir
Puedes volver a subir el archivo cuando quieras. Si una **referencia ya existe**, se actualizan su
nombre, código, presentación, stock mínimo y alias, pero **no se toca el inventario** registrado
(para eso está el conteo físico). Las referencias nuevas se crean.

## 5. Etiquetas QR
Cada producto recibe un código propio `SNP-000123`. **⋯ → Etiquetas QR** abre una hoja carta con
3 columnas de etiquetas (con QR, nombre, presentación y referencia) lista para imprimir en papel
adhesivo. Pégala en el producto o en su estante.

## 6. Cómo mejora con el uso
Cuando la foto lee algo distinto al nombre del catálogo y el usuario confirma el producto correcto,
esa lectura se guarda como **alias aprendido**. Con el tiempo los productos se reconocen mejor sin IA.
Un administrador puede borrar alias equivocados desde la ficha del producto.
