# Manual de usuario de Sinapsis

Sinapsis te ayuda a saber qué hay, qué está por vencer y qué falta pedir a farmacia, desde tu celular.

Dentro de la app hay un **manual animado** paso a paso: **⋯ → Manual de uso** (en el computador, en la
barra lateral).

## 1. Instalar e ingresar
1. Abre en el navegador del celular o del computador la dirección que te dio el administrador.
2. Ingresa con tu usuario y clave. Cámbiala la primera vez en **⋯ → Cambiar clave**.
3. Ve a **⋯ → Este dispositivo → Instalar la app**. En Android, Chrome y Edge se instala con un toque;
   en iPhone: Safari → Compartir → **Agregar a inicio**. Queda un ícono propio y abre en su ventana.
4. En el mismo lugar toca **Activar notificaciones** y acepta el permiso. Cada mañana (7 a. m.) llega un
   resumen de lotes vencidos, por vencer, productos bajo el mínimo y pendientes de farmacia. Tocarlo
   abre las alertas. En iPhone solo funcionan con la app instalada (iOS 16.4 o superior).
   **Enviar prueba** confirma que llegan; **Desactivar** las apaga en ese dispositivo.

<img src="capturas/01-login.png" width="240"> <img src="capturas/02-inicio.png" width="240">

El **inicio** muestra cuatro cifras. Toca cualquiera para ver el detalle:
* **Lotes vencidos** (en coral): retíralos y regístralo en la app.
* **Vencen en 30 días** (en oro): úsalos primero.
* **Bajo el mínimo**: entrarán en el próximo pedido sugerido.
* **Pendientes de farmacia**: lo pedido que no ha llegado.

## 2. Registrar un ingreso
1. Toca el botón verde **Escanear** de la barra inferior y permite el uso de la cámara.
2. Apunta al **código de barras** o a la **etiqueta QR** del producto. Al leerlo, el celular vibra y abre el producto.
3. Si no tiene código: toca **Leer con foto** y toma una foto clara del nombre, de cerca y con buena luz.
   Elige el producto correcto de la lista. Cada vez que confirmas, Sinapsis aprende esa lectura.
4. Si tampoco funciona, toca **Buscar a mano** y escribe parte del nombre o el cód. farmacia.
   Se toleran errores de ortografía.
5. Llena la **fecha de vencimiento**, la **cantidad** y el **lote** (opcional). La fecha de ingreso
   ya viene con la de hoy. Toca **Guardar ingreso**.

<img src="capturas/03-escanear.png" width="240"> <img src="capturas/12-ingreso.png" width="240">

> Si aparece el botón violeta **Probar con IA**, es el último recurso: úsalo solo cuando la foto
> normal no encuentre el producto. Si el producto se identificó con IA, imprime su etiqueta QR para
> que la próxima vez se lea al instante.

## 3. Consultar el inventario
En **Inventario** puedes buscar cualquier producto y filtrar los que están **bajo mínimo** o los que
usan **etiqueta QR**. La pestaña **Vencimientos** muestra los lotes vencidos, por vencer y vigentes.
El botón **Excel** descarga todo el inventario.

En la ficha de un producto ves su cantidad, el stock mínimo, sus lotes con vencimiento y el historial.
* **Conteo físico**: cuando cuentes el producto, escribe la cantidad real. Reemplaza la registrada y queda en el historial.
* **Retirar** un lote: cuando se vence, se daña o se acaba. Deja de generar alertas.
* **Etiqueta QR**: imprime la etiqueta del producto.

<img src="capturas/04-inventario.png" width="240"> <img src="capturas/06-producto.png" width="240">

## 4. Hacer un pedido a farmacia
1. Después del inventario, ve a **Pedidos → Nuevo pedido sugerido**. Sinapsis agrega solo lo que está
   **en cero**, **bajo el mínimo** o con un lote que **vence en los próximos 10 días** (o ya vencido).
   Cada línea dice el motivo. Los días se cambian en **Más opciones → Configuración** (administrador).
2. **Revisa cada línea**: cambia cantidades, toca **Quitar** para sacar un producto, o toca **Agregar producto**.
   Nada se envía solo.
3. Debajo de cada producto está su **Cód. farmacia** resaltado: tócalo para copiarlo y pegarlo en el
   sistema interno de farmacia. **Copiar lista** copia todos los códigos con su cantidad (se pegan en
   Excel como dos columnas).
4. Haz el pedido a farmacia como siempre y guarda el **PDF del pedido final**.
5. En Sinapsis toca **Elegir PDF**, selecciona ese archivo y luego **Confirmar y marcar como enviado**.

<img src="capturas/20-borrador.png" width="240">

### Pedido a mano con el formato en blanco
Si prefieres hacerlo en papel o en el computador:
1. En **Pedidos → Pedido a mano**, descarga el **Formato PDF** o el **Formato Excel**. Trae todos los
   productos activos por sección, con su cód. farmacia, presentación y mínimo.
2. Llena la columna **Cantidad a pedir** (en unidades: kits, cajas, frascos). Deja vacío lo que no se pide.
   El PDF se puede llenar en el computador (Adobe, Vista previa, Edge) o imprimirlo.
3. Toca **Cargar formato lleno** y elige el archivo. Sinapsis arma el borrador con esas líneas
   (motivo *Formato manual*). Si ya había un borrador, te pregunta antes de reemplazarlo.

> Un formato impreso y llenado a mano no se puede subir: hay que pasar las cantidades a un formato digital.

## 5. Recibir el pedido
1. Cuando llegue la mercancía, abre el pedido en **Pedidos**.
2. Toca **Escanear lo que llegó** y escanea cada producto, o toca la línea en la lista.
3. Escribe la **cantidad que llegó** y su **fecha de vencimiento**. Toca **Registrar recepción**:
   se suma al inventario de inmediato.
4. Si llegó menos de lo pedido, la línea queda como **Parcial**.
5. Cuando termines, toca **Cerrar recepción**. Lo que no llegó queda como **pendiente** con alerta.
   Si llega días después, todavía puedes recibirlo en el mismo pedido.
6. Si un producto ya no se espera, toca su línea y **Ya no se espera este producto**.

<img src="capturas/13-recepcion.png" width="240"> <img src="capturas/09-alertas.png" width="240">

## Reactivos que se cuentan por pruebas
Los reactivos del laboratorio que traen un número de pruebas (ej. *ALB2 X 750 PRUEBAS*) se llevan
**en pruebas**, como en el listado del laboratorio:
* La ficha muestra **Pruebas disponibles** y **Pedir al quedar** (el umbral en pruebas).
* **Registrar ingreso** y **Recibir pedido** se hacen en **unidades (kits)**: 2 kits de 750 suman 1.500 pruebas.
* **Conteo físico** se hace en **pruebas que quedan**: las de los kits cerrados más las del abierto.
* Al bajar del umbral pasa a *Bajo el mínimo* y el pedido sugerido propone kits enteros.

## 6. Alertas
* **Sin llegar / Atrasado**: el producto se pidió y no ha llegado (atrasado: más de 5 días).
* **Posible desabastecimiento**: el producto no llegó en dos pedidos seguidos. Conviene preguntar a
  farmacia o buscar otra fuente.
* **Vencidos / Próximos a vencer / Bajo el mínimo**.

## 7. Para administradores
* **⋯ → Carga del catálogo**: plantilla de Excel y carga inicial ([guía](carga-inicial.md)).
* **⋯ → Etiquetas QR**: hoja lista para imprimir con las etiquetas de los productos sin código.
* **⋯ → Configuración**: días de vencimiento para el pedido y las alertas, y la **lista de secciones**
  (agregar, renombrar o eliminar; al eliminar eliges a qué sección pasan sus productos).
  En **Editar producto** la sección se elige de esa lista, o con **＋ Nueva sección…** se crea ahí mismo.
* **⋯ → Usuarios**: crear usuarios (operador o administrador) y desactivar a quien ya no trabaje.
* En la ficha de un producto: **Editar producto** y quitar alias mal aprendidos.

## Preguntas frecuentes
**La cámara no abre.** Revisa que el navegador tenga permiso de cámara para el sitio y que la dirección empiece por `https://`.

**La foto no encuentra el producto.** Acércate más, evita reflejos y que el nombre ocupe buena parte de la foto. Si sigue fallando, usa **Buscar a mano** y luego imprime su etiqueta QR.

**No me llegan las notificaciones.** Revisa en **⋯ → Este dispositivo** que digan *Activas* y toca
*Enviar prueba*. Si dicen *Bloqueadas*, permítelas en los ajustes del navegador para el sitio. En iPhone,
abre Sinapsis desde el ícono instalado.

**Me equivoqué en una cantidad.** Haz un **Conteo físico** con la cantidad correcta. El historial guarda los dos registros.

---
Sinapsis · Desarrollado por DeerSystems para el Instituto Neurológico de Colombia.
