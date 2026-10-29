/* Sinapsis — app móvil (PWA). Desarrollado por DeerSystems para el Instituto Neurológico de Colombia.
 * JavaScript sin dependencias de compilación: se sirve tal cual desde el VPS.
 * Estructura: utilidades → API → íconos → vistas (una función por pantalla) → enrutador.
 */
"use strict";

/* ================= Utilidades ================= */
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hoyISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fecha = (v) => v ? new Date(String(v).length === 10 ? v + "T12:00:00" : v).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const num = (n) => Number(n ?? 0).toLocaleString("es-CO");

function aviso(texto, tipo = "") {
  $$(".aviso").forEach((a) => a.remove());
  const el = document.createElement("div");
  el.className = `aviso ${tipo}`;
  el.setAttribute("role", "status");
  el.textContent = texto;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function debounce(fn, ms = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ================= Sesión y API ================= */
const sesion = {
  get token() { try { return localStorage.getItem("sinapsis_token") || ""; } catch { return ""; } },
  set token(v) { try { v ? localStorage.setItem("sinapsis_token", v) : localStorage.removeItem("sinapsis_token"); } catch {} },
  usuario: null,
};

class ErrorAPI extends Error { constructor(msg, estado) { super(msg); this.estado = estado; } }

async function api(ruta, { metodo = "GET", json, form, crudo = false } = {}) {
  const opciones = { method: metodo, headers: { Authorization: `Bearer ${sesion.token}` } };
  if (json !== undefined) { opciones.body = JSON.stringify(json); opciones.headers["Content-Type"] = "application/json"; }
  if (form) opciones.body = form;
  let r;
  try { r = await fetch(ruta, opciones); }
  catch { throw new ErrorAPI("Sin conexión con el servidor. Revise el internet.", 0); }
  if (r.status === 401 && !ruta.endsWith("/login")) { sesion.token = ""; sesion.usuario = null; render(); throw new ErrorAPI("Sesión vencida.", 401); }
  if (!r.ok) {
    let msg = "Ocurrió un error.";
    try { const d = await r.json(); msg = typeof d.detail === "string" ? d.detail : (d.detail?.[0]?.msg || msg); } catch {}
    throw new ErrorAPI(msg, r.status);
  }
  return crudo ? r : r.json();
}

async function descargar(ruta, nombre) {
  try {
    const r = await api(ruta, { crudo: true });
    const url = URL.createObjectURL(await r.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) { aviso(e.message, "error"); }
}

async function abrirEnVentana(ruta, tipo = "text/html") {
  const ventana = window.open("", "_blank");
  try {
    const r = await api(ruta, { crudo: true });
    const url = URL.createObjectURL(new Blob([await r.blob()], { type: tipo }));
    if (ventana) ventana.location.href = url; else location.href = url;
  } catch (e) { ventana?.close(); aviso(e.message, "error"); }
}

/* ================= Íconos (trazo redondeado, como el isotipo) ================= */
const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ico = {
  inicio: I('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  caja: I('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
  escanear: I('<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M8 8v8M11 8v8M14 8v8M17 8v8"/>'),
  pedido: I('<path d="M9 4h6l1 2h3a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3z"/><path d="M9 12h6M9 16h4"/>'),
  alerta: I('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
  camara: I('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>'),
  buscar: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  atras: I('<path d="m15 18-6-6 6-6"/>'),
  mas: I('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'),
  sumar: I('<path d="M12 5v14M5 12h14"/>'),
  pdf: I('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 14h6M9 17h4"/>'),
  descarga: I('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  subir: I('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
  qr: I('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2M20 14v.01M14 20h.01M17 17h3v3"/>'),
  chispa: I('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  texto: I('<path d="M4 7V5h16v2M9 19h6M12 5v14"/>'),
  check: I('<path d="m5 12 5 5 9-10"/>'),
  usuarios: I('<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M21 20a6 6 0 0 0-4-5.6"/>'),
  salir: I('<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H4"/>'),
};

const chipVence = {
  vencido: '<span class="chip error">Vencido</span>',
  por_vencer: '<span class="chip alerta">Por vencer</span>',
  vigente: '<span class="chip ok">Vigente</span>',
  sin_fecha: '<span class="chip neutro">Sin fecha</span>',
};
const estadosPedido = {
  borrador: ["Borrador", "neutro"], enviado: ["Enviado", "info"], recibido_parcial: ["Recibido parcial", "alerta"],
  recibido: ["Recibido", "ok"], cerrado_con_pendientes: ["Con pendientes", "alerta"],
};
const estadosItem = { pendiente: ["Pendiente", "alerta"], parcial: ["Parcial", "alerta"], llego: ["Llegó", "ok"], cancelado: ["Cancelado", "neutro"] };
const chip = ([t, c]) => `<span class="chip ${c}">${esc(t)}</span>`;

/* ================= Marco de la app ================= */
const raiz = () => $("#raiz");
let limpiarVista = null; // se llama al salir de una pantalla (p. ej. para apagar la cámara)

function marco({ titulo = "", atras = false, activo = null, contenido = "" }) {
  const nav = [
    ["", "inicio", "Inicio"], ["inventario", "caja", "Inventario"], ["escanear", "escanear", "Escanear"],
    ["pedidos", "pedido", "Pedidos"], ["alertas", "alerta", "Alertas"],
  ];
  return `
  <div class="app">
    <header class="topbar">
      ${atras ? `<button class="atras" data-atras aria-label="Volver">${ico.atras}</button>` : ""}
      <div class="marca">
        ${atras ? `<div style="min-width:0"><b>${esc(titulo)}</b></div>` :
        `<img src="assets/deersystems-isotipo.svg" alt=""><div style="min-width:0"><b>Sinapsis</b><span>Instituto Neurológico de Colombia</span></div>`}
      </div>
      <a class="atras" href="#/mas" aria-label="Más opciones">${ico.mas}</a>
    </header>
    <main id="vista" class="vista">${contenido}</main>
    <footer class="firma"><img src="assets/deersystems-isotipo.svg" alt=""><span>Desarrollado por DeerSystems para el Instituto Neurológico de Colombia</span></footer>
  </div>
  <nav class="nav" aria-label="Principal">
    ${nav.map(([ruta, i, t]) => ruta === "escanear"
      ? `<a href="#/escanear" class="escanear ${activo === ruta ? "activo" : ""}"><span class="boton">${ico[i]}</span>${t}</a>`
      : `<a href="#/${ruta}" class="${activo === ruta ? "activo" : ""}">${ico[i]}${t}</a>`).join("")}
  </nav>`;
}

function pintar(opciones) {
  raiz().innerHTML = marco(opciones);
  $("[data-atras]")?.addEventListener("click", () => history.length > 1 ? history.back() : (location.hash = "#/"));
  window.scrollTo(0, 0);
  return $("#vista");
}

function hoja(html, { alCerrar } = {}) {
  const velo = document.createElement("div");
  velo.className = "velo";
  velo.innerHTML = `<div class="hoja" role="dialog" aria-modal="true"><div class="asa"></div>${html}</div>`;
  const cerrar = () => { velo.remove(); alCerrar?.(); };
  velo.addEventListener("click", (e) => { if (e.target === velo || e.target.closest("[data-cerrar]")) cerrar(); });
  document.body.appendChild(velo);
  setTimeout(() => $("input:not([type=hidden]):not([type=file])", velo)?.focus(), 250);
  return { el: $(".hoja", velo), cerrar };
}

function confirmar(titulo, texto, { boton = "Confirmar", peligro = false } = {}) {
  return new Promise((ok) => {
    let decidido = false;
    const h = hoja(`<div class="pila"><h2>${esc(titulo)}</h2><p>${texto}</p>
      <div class="grid-2"><button class="btn" data-cerrar>Cancelar</button>
      <button class="btn ${peligro ? "peligro" : "primario"}" data-si>${esc(boton)}</button></div></div>`,
      { alCerrar: () => { if (!decidido) ok(false); } });
    $("[data-si]", h.el).onclick = () => { decidido = true; h.cerrar(); ok(true); };
  });
}

async function conBoton(boton, tarea) {
  const original = boton.innerHTML;
  boton.disabled = true;
  boton.innerHTML = '<span class="cargando"></span>';
  try { return await tarea(); }
  catch (e) { aviso(e.message, "error"); }
  finally { boton.disabled = false; boton.innerHTML = original; }
}

const esqueleto = (n = 3) => Array.from({ length: n }, () => '<div class="esqueleto"></div>').join("");
const esAdmin = () => sesion.usuario?.rol === "admin";

/* ================= Escáner de códigos (reutilizable) ================= */
function crearEscaner(idContenedor, alLeer) {
  let lector = null, activo = false, ultimo = "", ultimoEn = 0;
  const formatos = window.Html5QrcodeSupportedFormats;
  const config = {
    fps: 10, // sin qrbox: lee todo el cuadro; el marco de la interfaz solo orienta
    formatsToSupport: formatos ? [formatos.EAN_13, formatos.EAN_8, formatos.UPC_A, formatos.UPC_E, formatos.CODE_128,
      formatos.CODE_39, formatos.CODE_93, formatos.ITF, formatos.QR_CODE, formatos.DATA_MATRIX] : undefined,
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
  };
  return {
    async iniciar() {
      if (!window.Html5Qrcode) throw new Error("El lector de códigos no cargó.");
      lector = new Html5Qrcode(idContenedor, { verbose: false });
      await lector.start({ facingMode: "environment" }, config, (texto) => {
        const ahora = Date.now();
        if (texto === ultimo && ahora - ultimoEn < 2500) return; // evita lecturas repetidas
        ultimo = texto; ultimoEn = ahora;
        navigator.vibrate?.(60);
        alLeer(texto.trim());
      });
      activo = true;
    },
    pausar() { try { if (activo) lector.pause(true); } catch {} },
    reanudar() { try { if (activo) lector.resume(); } catch {} },
    async detener() { if (activo) { activo = false; try { await lector.stop(); lector.clear(); } catch {} } },
  };
}

/* ================= Vistas ================= */

/* ---- Ingreso ---- */
function vistaLogin() {
  raiz().innerHTML = `
  <div class="login">
    <div class="logo">
      <img src="assets/deersystems-isotipo.svg" alt="DeerSystems">
      <div><p class="eyebrow">Instituto Neurológico de Colombia</p>
      <h1><span>Sinapsis</span></h1>
      <p class="mute">Inventario, vencimientos y pedidos a farmacia.</p></div>
    </div>
    <form class="pila" id="f">
      <div class="campo"><label for="u">Usuario</label><input id="u" name="usuario" autocomplete="username" autocapitalize="none" required></div>
      <div class="campo"><label for="c">Clave</label><input id="c" name="clave" type="password" autocomplete="current-password" required></div>
      <button class="btn primario grande bloque" type="submit">Ingresar</button>
    </form>
    <footer class="firma"><img src="assets/deersystems-isotipo.svg" alt=""><span>Desarrollado por DeerSystems · Sin ánimo de lucro</span></footer>
  </div>`;
  $("#f").onsubmit = (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.target));
    conBoton($("button", e.target), async () => {
      const r = await api("/api/auth/login", { metodo: "POST", json: datos });
      sesion.token = r.token; sesion.usuario = r.usuario;
      if (!location.hash || location.hash === "#/login") location.hash = "#/";
      render();
    });
  };
}

/* ---- Inicio ---- */
async function vistaInicio() {
  const v = pintar({ activo: "", contenido: `
    <section class="hero pila">
      <p class="eyebrow">Hola, ${esc(sesion.usuario?.nombre || sesion.usuario?.usuario)}</p>
      <h1>Tu inventario, <span>al día</span>.</h1>
      <p class="small">Escanea un producto para registrar su ingreso y vencimiento.</p>
      <a href="#/escanear" class="btn primario grande bloque">${ico.escanear} Escanear producto</a>
    </section>
    <div class="kpis" id="kpis">${esqueleto(4)}</div>
    <section class="pila" id="pendientes-inicio"></section>` });
  try {
    const r = await api("/api/inventario/resumen");
    const kpi = (cifra, texto, clase, ruta) => `<a class="kpi ${cifra ? clase : "cero"}" href="${ruta}"><b>${num(cifra)}</b><span class="small">${texto}</span></a>`;
    $("#kpis", v).innerHTML =
      kpi(r.vencidos, "Lotes vencidos", "error", "#/alertas") +
      kpi(r.por_vencer, `Vencen en ${r.dias_alerta_vencimiento} días`, "alerta", "#/alertas") +
      kpi(r.bajo_minimo, "Bajo el mínimo", "alerta", "#/inventario?filtro=bajo_minimo") +
      kpi(r.pendientes, "Pendientes de farmacia", "alerta", "#/alertas");
    if (!r.productos) {
      $("#pendientes-inicio", v).innerHTML = `<div class="tarjeta pila"><h3>Empieza por el catálogo</h3>
        <p class="small">Aún no hay productos. ${esAdmin() ? "Descarga la plantilla, llénala y súbela." : "Pide a un administrador que cargue el catálogo."}</p>
        ${esAdmin() ? `<a class="btn primario" href="#/catalogo">${ico.subir} Cargar catálogo</a>` : ""}</div>`;
    }
  } catch (e) { $("#kpis", v).innerHTML = `<div class="vacio">${esc(e.message)}</div>`; }
}

/* ---- Escanear e identificar ---- */
async function vistaEscanear() {
  const v = pintar({ activo: "escanear", contenido: `
    <div class="cabecera"><p class="eyebrow">Identificar producto</p><h1>Escanear</h1></div>
    <div class="camara"><div id="lector"></div><div class="marco" id="marco"></div>
      <div class="estado" id="estado-camara">Apunta al código de barras o a la etiqueta QR</div></div>
    <div class="grid-2">
      <label class="btn">${ico.camara} Leer con foto<input type="file" accept="image/*" capture="environment" id="foto" hidden></label>
      <button class="btn" id="escribir">${ico.texto} Buscar a mano</button>
    </div>` });

  const escaner = crearEscaner("lector", async (codigo) => {
    escaner.pausar();
    try {
      const p = await api(`/api/identificar/codigo/${encodeURIComponent(codigo)}`);
      await escaner.detener();
      location.hash = `#/producto/${p.id}?registrar=1`;
    } catch (e) {
      if (e.estado === 404) {
        const h = hoja(`<div class="pila"><h2>Código no registrado</h2>
          <p class="small">El código <code>${esc(codigo)}</code> no pertenece a ningún producto del catálogo.</p>
          <p class="small mute">Puede buscarlo por nombre o pedir a un administrador que lo agregue al producto.</p>
          <button class="btn primario" data-texto>${ico.texto} Buscar por nombre</button>
          <button class="btn" data-cerrar>Seguir escaneando</button></div>`, { alCerrar: () => escaner.reanudar() });
        $("[data-texto]", h.el).onclick = () => { h.cerrar(); buscarPorTexto(); };
      } else { aviso(e.message, "error"); escaner.reanudar(); }
    }
  });
  limpiarVista = () => escaner.detener();
  try { await escaner.iniciar(); }
  catch {
    $("#marco", v)?.remove();
    $("#estado-camara", v).remove();
    $(".camara", v).insertAdjacentHTML("beforeend", `<div class="sin-camara">${ico.camara}<p>No se pudo abrir la cámara.</p>
      <p class="small mute">Revisa el permiso de cámara del navegador. La app debe abrirse con https.</p></div>`);
  }

  $("#foto", v).onchange = async (e) => {
    const archivo = e.target.files[0];
    e.target.value = "";
    if (archivo) identificarPorFoto(archivo, escaner);
  };
  $("#escribir", v).onclick = () => { escaner.pausar(); buscarPorTexto(escaner); };
}

function listaCandidatos(candidatos) {
  if (!candidatos.length) return '<div class="vacio">No se encontraron coincidencias.</div>';
  return `<div class="lista">${candidatos.map((c) => `
    <button class="item" data-elegir="${c.id}">
      <div class="cuerpo"><div class="titulo">${esc(c.nombre)}</div>
      <div class="sub">${esc(c.presentacion)} · <span class="mono">${esc(c.referencia)}</span></div></div>
      <span class="chip ${c.puntaje >= 85 ? "ok" : c.puntaje >= 70 ? "info" : "neutro"}">${c.puntaje}%</span>
    </button>`).join("")}</div>`;
}

async function elegirCandidato(id, textoLeido, { viaIA = false } = {}) {
  try { await api("/api/identificar/confirmar", { metodo: "POST", json: { producto_id: Number(id), texto_leido: textoLeido || "" } }); } catch {}
  location.hash = `#/producto/${id}?registrar=1${viaIA ? "&ia=1" : ""}`;
}

async function identificarPorFoto(archivo, escaner) {
  escaner?.pausar();
  const h = hoja(`<div class="pila" id="res"><h2>Leyendo la foto</h2><div class="fila"><span class="cargando"></span><span class="small">Buscando el nombre en el catálogo…</span></div></div>`,
    { alCerrar: () => escaner?.reanudar() });
  const res = $("#res", h.el);
  const form = new FormData(); form.append("foto", archivo);
  try {
    const r = await api("/api/identificar/foto", { metodo: "POST", form });
    res.innerHTML = `<h2>¿Cuál es?</h2>
      ${r.texto ? `<p class="caption">Texto leído: <span class="mono">${esc(r.texto.split("\n").slice(0, 3).join(" · "))}</span></p>` : '<p class="small mute">No se pudo leer texto en la foto. Intenta acercarte más y con buena luz.</p>'}
      ${listaCandidatos(r.candidatos)}
      ${r.ia_disponible ? `<button class="btn ia" data-ia>${ico.chispa} No está aquí: probar con IA</button>` : ""}
      <button class="btn" data-texto>${ico.texto} Escribir el nombre</button>`;
    $$("[data-elegir]", res).forEach((b) => (b.onclick = () => { h.cerrar(); elegirCandidato(b.dataset.elegir, r.texto); }));
    $("[data-texto]", res).onclick = () => { h.cerrar(); buscarPorTexto(escaner); };
    const botonIA = $("[data-ia]", res);
    if (botonIA) botonIA.onclick = () => conBoton(botonIA, async () => {
      const f2 = new FormData(); f2.append("foto", archivo);
      const ia = await api("/api/identificar/ia", { metodo: "POST", form: f2 });
      res.innerHTML = `<div class="fila"><h2 style="flex:1">Lectura con IA</h2><span class="chip ia">IA</span></div>
        <p class="caption">La IA leyó: <span class="mono">${esc(ia.texto || "nada legible")}</span>. Confirma el producto correcto.</p>
        ${listaCandidatos(ia.candidatos)}
        <button class="btn" data-texto>${ico.texto} Escribir el nombre</button>`;
      $$("[data-elegir]", res).forEach((b) => (b.onclick = () => { h.cerrar(); elegirCandidato(b.dataset.elegir, ia.texto, { viaIA: true }); }));
      $("[data-texto]", res).onclick = () => { h.cerrar(); buscarPorTexto(escaner); };
    });
  } catch (e) {
    res.innerHTML = `<h2>No se pudo leer</h2><p class="small">${esc(e.message)}</p><button class="btn" data-cerrar>Cerrar</button>`;
  }
}

function buscarPorTexto(escaner, { alElegir } = {}) {
  const h = hoja(`<div class="pila"><h2>Buscar producto</h2>
    <div class="buscador">${ico.buscar}<input id="q" placeholder="Nombre, referencia o código" autocomplete="off"></div>
    <div id="res"><p class="small mute">Escribe al menos 3 letras. Se toleran errores de ortografía.</p></div></div>`,
    { alCerrar: () => escaner?.reanudar() });
  const buscar = debounce(async (texto) => {
    if (texto.trim().length < 3) return;
    try {
      const r = await api("/api/identificar/texto", { metodo: "POST", json: { texto } });
      $("#res", h.el).innerHTML = listaCandidatos(r.candidatos);
      $$("[data-elegir]", h.el).forEach((b) => (b.onclick = () => {
        h.cerrar();
        alElegir ? alElegir(Number(b.dataset.elegir)) : elegirCandidato(b.dataset.elegir, "");
      }));
    } catch (e) { aviso(e.message, "error"); }
  });
  $("#q", h.el).oninput = (e) => buscar(e.target.value);
}

/* ---- Producto ---- */
async function vistaProducto(id, params) {
  const v = pintar({ titulo: "Producto", atras: true, contenido: esqueleto(3) });
  let p;
  try { p = await api(`/api/productos/${id}`); } catch (e) { v.innerHTML = `<div class="vacio">${esc(e.message)}</div>`; return; }
  const pct = p.stock_minimo ? Math.min(100, Math.round((p.cantidad_actual / p.stock_minimo) * 100)) : 100;
  v.innerHTML = `
    <div class="cabecera">
      <p class="eyebrow">${esc(p.presentacion || "Producto")}</p>
      <h1>${esc(p.nombre)}</h1>
      <div class="fila" style="flex-wrap:wrap;gap:6px;margin-top:6px">
        <span class="chip neutro">Ref ${esc(p.referencia)}</span>
        ${p.codigo_barras ? `<span class="chip neutro">${esc(p.codigo_barras)}</span>` : ""}
        ${p.codigo_qr ? `<span class="chip info">${esc(p.codigo_qr)}</span>` : ""}
        ${params.get("ia") ? '<span class="chip ia">Identificado con IA</span>' : ""}
      </div>
    </div>
    <section class="tarjeta pila">
      <div class="fila entre"><div><p class="caption">Cantidad actual</p><b style="font:700 32px/38px var(--display);color:${p.bajo_minimo ? "var(--warning-text)" : "var(--ink)"}">${num(p.cantidad_actual)}</b></div>
        <div style="text-align:right"><p class="caption">Stock mínimo</p><b style="font:600 20px var(--display);color:var(--ink)">${num(p.stock_minimo)}</b></div></div>
      <div class="barra-progreso"><i style="width:${pct}%"></i></div>
      ${p.bajo_minimo ? '<p class="small" style="color:var(--warning-text)">Está por debajo del mínimo: se sugerirá en el próximo pedido.</p>' : ""}
    </section>
    <button class="btn primario grande bloque" id="registrar">${ico.sumar} Registrar ingreso</button>
    <div class="grid-2">
      <button class="btn" id="conteo">${ico.check} Conteo físico</button>
      <button class="btn" id="etiqueta">${ico.qr} Etiqueta QR</button>
    </div>
    <section class="pila"><div class="fila entre"><h2>Lotes y vencimientos</h2><span class="caption">${p.lotes.length} activos</span></div>
      ${p.lotes.length ? `<div class="lista">${p.lotes.map((l) => `
        <div class="item"><div class="cuerpo"><div class="titulo">Vence ${fecha(l.fecha_vencimiento)}</div>
          <div class="sub">Ingresó ${fecha(l.fecha_ingreso)} · ${num(l.cantidad)} und${l.lote ? ` · Lote <span class="mono">${esc(l.lote)}</span>` : ""}</div></div>
          <div class="pila" style="gap:6px;align-items:flex-end">${chipVence[l.estado_vencimiento]}
          <button class="enlace" data-retirar="${l.id}">Retirar</button></div></div>`).join("")}</div>`
      : '<div class="lista"><div class="vacio">Sin lotes activos.</div></div>'}
    </section>
    <details class="tarjeta"><summary class="enlace" style="cursor:pointer">Historial de movimientos</summary><div id="historial" class="pila" style="margin-top:12px"></div></details>
    ${esAdmin() ? `<section class="pila"><h2>Administración</h2>
      <button class="btn" id="editar">Editar producto</button>
      ${p.alias.length ? `<div class="tarjeta pila"><p class="caption">Alias para la búsqueda</p><div class="fila" style="flex-wrap:wrap;gap:6px">
        ${p.alias.map((a) => `<span class="chip ${a.origen === "aprendido" ? "info" : "neutro"}">${esc(a.texto)} <button class="enlace" data-alias="${a.id}" aria-label="Quitar alias">✕</button></span>`).join("")}</div></div>` : ""}
    </section>` : ""}`;

  $("#registrar", v).onclick = () => formIngreso(p);
  $("#conteo", v).onclick = () => formConteo(p);
  $("#etiqueta", v).onclick = () => abrirEnVentana(`/api/productos/etiquetas?ids=${p.id}`);
  $$("[data-retirar]", v).forEach((b) => (b.onclick = async () => {
    if (!(await confirmar("Retirar lote", "El lote deja de generar alertas. Use esta opción para lotes vencidos, dañados o agotados.", { boton: "Retirar", peligro: true }))) return;
    try { await api(`/api/productos/${p.id}/lotes/${b.dataset.retirar}/retirar`, { metodo: "POST" }); aviso("Lote retirado."); vistaProducto(id, new URLSearchParams()); } catch (e) { aviso(e.message, "error"); }
  }));
  $("details", v).ontoggle = async (e) => {
    if (!e.target.open || $("#historial", v).dataset.cargado) return;
    $("#historial", v).dataset.cargado = "1";
    const nombres = { carga_inicial: "Carga inicial", ingreso: "Ingreso", recepcion: "Recepción de pedido", conteo: "Conteo físico" };
    const movs = await api(`/api/inventario/movimientos/${p.id}`);
    $("#historial", v).innerHTML = movs.length ? movs.map((m) => `<div class="fila entre small"><div><b style="color:var(--ink)">${nombres[m.tipo] || m.tipo}</b><div class="caption">${fecha(m.fecha)} · ${esc(m.usuario)}</div></div>
      <span class="mono">${m.antes} → ${m.despues}</span></div>`).join("") : '<p class="small mute">Sin movimientos.</p>';
  };
  $("#editar", v)?.addEventListener("click", () => formProducto(p));
  $$("[data-alias]", v).forEach((b) => (b.onclick = async () => {
    try { await api(`/api/productos/${p.id}/alias/${b.dataset.alias}`, { metodo: "DELETE" }); vistaProducto(id, new URLSearchParams()); } catch (e) { aviso(e.message, "error"); }
  }));

  if (params.get("registrar")) formIngreso(p, { sugerirEtiqueta: params.get("ia") && p.metodo_identificacion !== "barras" });
}

function formIngreso(p, { sugerirEtiqueta = false } = {}) {
  const h = hoja(`<form class="pila" id="f">
    <div><p class="eyebrow">Registrar ingreso</p><h2>${esc(p.nombre)}</h2><p class="caption">${esc(p.presentacion)}</p></div>
    <div class="campo"><label for="ven">Fecha de vencimiento</label><input id="ven" name="fecha_vencimiento" type="date" min="${hoyISO()}" required></div>
    <div class="grid-2">
      <div class="campo"><label for="can">Cantidad</label><input id="can" name="cantidad" type="number" inputmode="numeric" min="1" value="1" required></div>
      <div class="campo"><label for="lot">Lote</label><input id="lot" name="lote" autocomplete="off" placeholder="Opcional"></div>
    </div>
    <div class="campo"><label for="ing">Fecha de ingreso</label><input id="ing" name="fecha_ingreso" type="date" value="${hoyISO()}" max="${hoyISO()}" required></div>
    <label class="fila small"><input type="checkbox" id="sinfecha"> El producto no tiene fecha de vencimiento</label>
    ${sugerirEtiqueta ? `<div class="tarjeta fuerte pila"><p class="small">Este producto se identificó con IA. Imprime su etiqueta QR para que la próxima vez se lea al instante, sin IA.</p>
      <button type="button" class="btn chico" id="imp">${ico.qr} Imprimir etiqueta</button></div>` : ""}
    <button class="btn primario grande bloque" type="submit">Guardar ingreso</button>
  </form>`);
  $("#sinfecha", h.el).onchange = (e) => { $("#ven", h.el).required = !e.target.checked; $("#ven", h.el).disabled = e.target.checked; };
  $("#imp", h.el)?.addEventListener("click", () => abrirEnVentana(`/api/productos/etiquetas?ids=${p.id}`));
  $("#f", h.el).onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    conBoton($("[type=submit]", e.target), async () => {
      await api("/api/inventario/ingresos", { metodo: "POST", json: {
        producto_id: p.id, cantidad: Number(d.cantidad), lote: d.lote || "",
        fecha_vencimiento: $("#sinfecha", h.el).checked ? null : d.fecha_vencimiento, fecha_ingreso: d.fecha_ingreso } });
      h.cerrar();
      aviso(`Ingreso guardado: ${d.cantidad} und.`);
      history.replaceState(null, "", `#/producto/${p.id}`);
      vistaProducto(p.id, new URLSearchParams());
    });
  };
}

function formConteo(p) {
  const h = hoja(`<form class="pila" id="f">
    <div><p class="eyebrow">Conteo físico</p><h2>${esc(p.nombre)}</h2></div>
    <p class="small">La cantidad contada reemplaza la registrada (${num(p.cantidad_actual)}). El cambio queda en el historial.</p>
    <div class="campo"><label for="can">Cantidad contada</label><input id="can" name="cantidad" type="number" inputmode="numeric" min="0" value="${p.cantidad_actual}" required></div>
    <div class="campo"><label for="nota">Nota</label><input id="nota" name="nota" placeholder="Opcional"></div>
    <button class="btn primario grande bloque" type="submit">Guardar conteo</button></form>`);
  $("#f", h.el).onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    conBoton($("[type=submit]", e.target), async () => {
      await api(`/api/inventario/conteo/${p.id}`, { metodo: "POST", json: { cantidad: Number(d.cantidad), nota: d.nota } });
      h.cerrar(); aviso("Conteo guardado."); vistaProducto(p.id, new URLSearchParams());
    });
  };
}

function formProducto(p = null) {
  const h = hoja(`<form class="pila" id="f"><h2>${p ? "Editar producto" : "Nuevo producto"}</h2>
    <div class="campo"><label>Nombre</label><input name="nombre" value="${esc(p?.nombre)}" required></div>
    <div class="grid-2"><div class="campo"><label>Referencia</label><input name="referencia" value="${esc(p?.referencia)}" required></div>
      <div class="campo"><label>Stock mínimo</label><input name="stock_minimo" type="number" min="0" value="${p?.stock_minimo ?? 0}" required></div></div>
    <div class="campo"><label>Presentación</label><input name="presentacion" value="${esc(p?.presentacion)}"></div>
    <div class="campo"><label>Código de barras</label><input name="codigo_barras" value="${esc(p?.codigo_barras)}" inputmode="numeric"></div>
    <div class="campo"><label>Cómo se identifica</label><select name="metodo_identificacion">
      ${["barras", "nombre", "qr"].map((m) => `<option value="${m}" ${p?.metodo_identificacion === m ? "selected" : ""}>${{ barras: "Código de barras", nombre: "Nombre impreso", qr: "Etiqueta QR propia" }[m]}</option>`).join("")}
    </select></div>
    <button class="btn primario bloque" type="submit">Guardar</button></form>`);
  $("#f", h.el).onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    d.stock_minimo = Number(d.stock_minimo); d.codigo_barras = d.codigo_barras || null;
    conBoton($("[type=submit]", e.target), async () => {
      const r = await api(p ? `/api/productos/${p.id}` : "/api/productos", { metodo: p ? "PUT" : "POST", json: d });
      h.cerrar(); aviso("Producto guardado.");
      location.hash = `#/producto/${r.id}`; if (p) vistaProducto(r.id, new URLSearchParams());
    });
  };
}

/* ---- Inventario ---- */
async function vistaInventario(params) {
  const pestana = params.get("ver") || "productos";
  const filtro = params.get("filtro") || "todos";
  const v = pintar({ activo: "inventario", contenido: `
    <div class="fila entre" style="padding-top:8px;align-items:flex-end"><div class="cabecera" style="padding:0"><p class="eyebrow">Inventario</p><h1>${pestana === "productos" ? "Productos" : "Vencimientos"}</h1></div>
      <button class="btn chico" id="exportar">${ico.descarga} Excel</button></div>
    <div class="segmentos"><button data-ver="productos" class="${pestana === "productos" ? "activo" : ""}">Productos</button>
      <button data-ver="vencimientos" class="${pestana === "vencimientos" ? "activo" : ""}">Vencimientos</button></div>
    <div id="contenido" class="pila"></div>` });
  $$("[data-ver]", v).forEach((b) => (b.onclick = () => (location.hash = `#/inventario?ver=${b.dataset.ver}`)));
  $("#exportar", v).onclick = () => descargar("/api/productos/exportar", `sinapsis_inventario_${hoyISO()}.xlsx`);
  const c = $("#contenido", v);

  if (pestana === "vencimientos") {
    const estado = params.get("estado") || "por_vencer";
    c.innerHTML = `<div class="segmentos">${[["vencido", "Vencidos"], ["por_vencer", "Por vencer"], ["vigente", "Vigentes"], ["todos", "Todos"]]
      .map(([k, t]) => `<button data-estado="${k}" class="${estado === k ? "activo" : ""}">${t}</button>`).join("")}</div><div id="lotes">${esqueleto()}</div>`;
    $$("[data-estado]", c).forEach((b) => (b.onclick = () => (location.hash = `#/inventario?ver=vencimientos&estado=${b.dataset.estado}`)));
    const lotes = await api(`/api/inventario/lotes?estado=${estado}`);
    $("#lotes", c).innerHTML = lotes.length ? `<div class="lista">${lotes.map(filaLote).join("")}</div>` : '<div class="lista"><div class="vacio">No hay lotes en esta categoría.</div></div>';
    return;
  }

  c.innerHTML = `<div class="buscador">${ico.buscar}<input id="q" placeholder="Buscar por nombre, referencia o código" autocomplete="off"></div>
    <div class="segmentos">${[["todos", "Todos"], ["bajo_minimo", "Bajo mínimo"], ["qr", "Con etiqueta QR"]]
      .map(([k, t]) => `<button data-filtro="${k}" class="${filtro === k ? "activo" : ""}">${t}</button>`).join("")}</div>
    <div id="productos">${esqueleto()}</div><button class="btn" id="mas" hidden>Cargar más</button>
    ${esAdmin() ? `<button class="btn" id="nuevo">${ico.sumar} Nuevo producto</button>` : ""}`;
  $$("[data-filtro]", c).forEach((b) => (b.onclick = () => (location.hash = `#/inventario?filtro=${b.dataset.filtro}`)));
  $("#nuevo", c)?.addEventListener("click", () => formProducto());
  let desde = 0, q = "";
  const cargar = async (reiniciar) => {
    if (reiniciar) desde = 0;
    const lista = await api(`/api/productos?q=${encodeURIComponent(q)}&filtro=${filtro}&limite=50&desde=${desde}`);
    const html = lista.map((p) => `<a class="item" href="#/producto/${p.id}"><div class="cuerpo"><div class="titulo">${esc(p.nombre)}</div>
      <div class="sub">${esc(p.presentacion)} · <span class="mono">${esc(p.referencia)}</span></div></div>
      <div class="cifra ${p.bajo_minimo ? "bajo" : ""}">${num(p.cantidad_actual)}<small>mín. ${num(p.stock_minimo)}</small></div></a>`).join("");
    const cont = $("#productos", c);
    if (reiniciar) cont.innerHTML = lista.length ? `<div class="lista">${html}</div>` : '<div class="lista"><div class="vacio">Sin resultados.</div></div>';
    else $(".lista", cont).insertAdjacentHTML("beforeend", html);
    desde += lista.length;
    $("#mas", c).hidden = lista.length < 50;
  };
  $("#q", c).oninput = debounce((e) => { q = e.target.value; cargar(true); });
  $("#mas", c).onclick = (e) => conBoton(e.currentTarget, () => cargar(false));
  cargar(true).catch((e) => aviso(e.message, "error"));
}

const filaLote = (l) => `<a class="item" href="#/producto/${l.producto.id}"><div class="cuerpo"><div class="titulo">${esc(l.producto.nombre)}</div>
  <div class="sub">Vence ${fecha(l.fecha_vencimiento)} · ${num(l.cantidad)} und${l.lote ? ` · Lote <span class="mono">${esc(l.lote)}</span>` : ""}</div></div>${chipVence[l.estado_vencimiento]}</a>`;

/* ---- Pedidos ---- */
async function vistaPedidos() {
  const v = pintar({ activo: "pedidos", contenido: `<div class="cabecera"><p class="eyebrow">Farmacia</p><h1>Pedidos</h1></div><div id="c" class="pila">${esqueleto()}</div>` });
  try {
    const pedidos = await api("/api/pedidos");
    const borrador = pedidos.find((p) => p.estado === "borrador");
    $("#c", v).innerHTML = `
      ${borrador ? `<a class="btn primario grande bloque" href="#/pedido/${borrador.id}">Continuar borrador #${borrador.id}</a>`
        : `<button class="btn primario grande bloque" id="nuevo">${ico.sumar} Nuevo pedido sugerido</button>
           <p class="caption">Se arma con los productos que están bajo el stock mínimo. Lo revisas y confirmas a mano antes de enviarlo.</p>`}
      ${pedidos.length ? `<div class="lista">${pedidos.map((p) => `<a class="item" href="#/pedido/${p.id}"><div class="cuerpo">
        <div class="titulo">Pedido #${p.id}</div><div class="sub">${fecha(p.fecha_envio || p.fecha_creacion)} · ${p.total_items} productos${p.pendientes && p.estado !== "borrador" ? ` · ${p.pendientes} pendientes` : ""}</div></div>
        ${chip(estadosPedido[p.estado])}</a>`).join("")}</div>` : '<div class="lista"><div class="vacio">Aún no hay pedidos.</div></div>'}`;
    $("#nuevo", v)?.addEventListener("click", (e) => conBoton(e.currentTarget, async () => {
      const p = await api("/api/pedidos", { metodo: "POST" });
      location.hash = `#/pedido/${p.id}`;
    }));
  } catch (e) { $("#c", v).innerHTML = `<div class="vacio">${esc(e.message)}</div>`; }
}

async function vistaPedido(id) {
  const v = pintar({ titulo: `Pedido #${id}`, atras: true, contenido: esqueleto(4) });
  let p;
  try { p = await api(`/api/pedidos/${id}`); } catch (e) { v.innerHTML = `<div class="vacio">${esc(e.message)}</div>`; return; }
  if (p.estado === "borrador") return pedidoBorrador(v, p);
  return pedidoRecepcion(v, p);
}

function pedidoBorrador(v, p) {
  v.innerHTML = `
    <div class="cabecera"><div class="fila entre"><p class="eyebrow">Paso 1 de 2 · Revisar</p>${chip(estadosPedido.borrador)}</div>
      <h1>Revisa el pedido</h1><p class="small">Ajusta las cantidades, quita lo que no se necesita o agrega productos. Nada se envía hasta que lo confirmes.</p></div>
    <div class="lista" id="items">${p.items.length ? p.items.map((i) => `
      <div class="item"><div class="cuerpo"><div class="titulo">${esc(i.producto.nombre)}</div>
        <div class="sub">Hay ${num(i.producto.cantidad_actual)} · mín. ${num(i.producto.stock_minimo)}${i.cantidad_sugerida ? ` · sugerido ${num(i.cantidad_sugerida)}` : " · agregado a mano"}</div></div>
        <input type="number" min="0" inputmode="numeric" value="${i.cantidad_pedida}" data-cant="${i.producto_id}" aria-label="Cantidad a pedir"
          style="width:76px;min-height:42px;text-align:center;border-radius:6px;border:1px solid var(--hairline-strong);background:var(--surface-strong);color:var(--ink)">
      </div>`).join("") : '<div class="vacio">El pedido está vacío. Agrega productos.</div>'}</div>
    <button class="btn" id="agregar">${ico.sumar} Agregar producto</button>
    <section class="tarjeta fuerte pila">
      <div><p class="eyebrow">Paso 2 de 2 · Confirmar</p><h3>Adjunta el PDF del pedido final</h3>
      <p class="small">Es el pedido tal como se envió a farmacia. Al adjuntarlo, el pedido queda como enviado y empieza a esperar la mercancía.</p></div>
      <label class="btn">${ico.pdf} <span id="nombre-pdf">Elegir PDF</span><input type="file" accept="application/pdf" id="pdf" hidden></label>
      <button class="btn primario grande bloque" id="enviar" disabled>Confirmar y marcar como enviado</button>
    </section>
    <button class="btn peligro" id="eliminar">Eliminar borrador</button>`;

  $$("[data-cant]", v).forEach((inp) => (inp.onchange = async () => {
    const cantidad = Math.max(0, Number(inp.value || 0));
    try {
      await api(`/api/pedidos/${p.id}/items`, { metodo: "PUT", json: { producto_id: Number(inp.dataset.cant), cantidad } });
      if (cantidad === 0) { aviso("Producto quitado del pedido."); vistaPedido(p.id); }
    } catch (e) { aviso(e.message, "error"); }
  }));
  $("#agregar", v).onclick = () => buscarPorTexto(null, { alElegir: async (pid) => {
    const h = hoja(`<form class="pila" id="f"><h2>¿Cuántas unidades?</h2>
      <div class="campo"><input name="c" type="number" min="1" value="1" inputmode="numeric" required></div>
      <button class="btn primario bloque">Agregar al pedido</button></form>`);
    $("#f", h.el).onsubmit = (e) => { e.preventDefault(); conBoton($("button", e.target), async () => {
      await api(`/api/pedidos/${p.id}/items`, { metodo: "PUT", json: { producto_id: pid, cantidad: Number(e.target.c.value) } });
      h.cerrar(); vistaPedido(p.id);
    }); };
  } });
  let archivo = null;
  $("#pdf", v).onchange = (e) => { archivo = e.target.files[0]; $("#nombre-pdf", v).textContent = archivo ? archivo.name : "Elegir PDF"; $("#enviar", v).disabled = !archivo || !p.items.length; };
  $("#enviar", v).onclick = async (e) => {
    const boton = e.currentTarget;
    if (!(await confirmar("Confirmar pedido", `Se marcará el pedido #${p.id} como enviado a farmacia con el PDF <b>${esc(archivo.name)}</b>. Después ya no se podrán cambiar las cantidades.`, { boton: "Confirmar" }))) return;
    conBoton(boton, async () => {
      const f = new FormData(); f.append("pdf", archivo);
      await api(`/api/pedidos/${p.id}/enviar`, { metodo: "POST", form: f });
      aviso("Pedido enviado. Queda esperando la mercancía."); vistaPedido(p.id);
    });
  };
  $("#eliminar", v).onclick = async () => {
    if (!(await confirmar("Eliminar borrador", "Se borrará este borrador. Puedes crear otro cuando quieras.", { boton: "Eliminar", peligro: true }))) return;
    try { await api(`/api/pedidos/${p.id}`, { metodo: "DELETE" }); location.hash = "#/pedidos"; } catch (e) { aviso(e.message, "error"); }
  };
}

function pedidoRecepcion(v, p) {
  const recibidas = p.items.filter((i) => i.estado === "llego").length;
  const abierto = ["enviado", "recibido_parcial"].includes(p.estado);
  const aceptaEntregas = abierto || p.estado === "cerrado_con_pendientes";
  v.innerHTML = `
    <div class="cabecera"><div class="fila entre"><p class="eyebrow">Enviado ${fecha(p.fecha_envio)}</p>${chip(estadosPedido[p.estado])}</div>
      <h1>${abierto ? "Recibir pedido" : "Pedido"} #${p.id}</h1></div>
    <section class="tarjeta pila"><div class="fila entre small"><span>${recibidas} de ${p.items.length} productos completos</span><span class="mono">${p.pendientes} pendientes</span></div>
      <div class="barra-progreso"><i style="width:${p.items.length ? (recibidas / p.items.length) * 100 : 0}%"></i></div></section>
    ${aceptaEntregas && p.pendientes ? `<button class="btn primario grande bloque" id="escanear">${ico.escanear} Escanear lo que llegó</button>` : ""}
    <div class="lista">${p.items.map((i) => `
      <button class="item" data-item="${i.id}" ${aceptaEntregas && ["pendiente", "parcial"].includes(i.estado) ? "" : "data-cerrado"}>
        <div class="cuerpo"><div class="titulo">${esc(i.producto.nombre)}</div>
        <div class="sub">Pedido ${num(i.cantidad_pedida)} · llegó ${num(i.cantidad_recibida)}${i.nota ? ` · ${esc(i.nota)}` : ""}</div></div>
        ${chip(estadosItem[i.estado])}</button>`).join("")}</div>
    <div class="grid-2">${p.tiene_pdf ? `<button class="btn" id="verpdf">${ico.pdf} Ver PDF</button>` : "<span></span>"}
      ${abierto ? '<button class="btn" id="cerrar">Cerrar recepción</button>' : ""}</div>
    ${p.observaciones ? `<div class="tarjeta small"><p class="caption">Observaciones</p>${esc(p.observaciones)}</div>` : ""}`;

  $("#verpdf", v)?.addEventListener("click", () => abrirEnVentana(`/api/pedidos/${p.id}/pdf`, "application/pdf"));
  $$("[data-item]:not([data-cerrado])", v).forEach((b) => (b.onclick = () => formRecepcion(p, p.items.find((i) => i.id === Number(b.dataset.item)))));
  $$("[data-item][data-cerrado]", v).forEach((b) => (b.style.cursor = "default"));
  $("#cerrar", v)?.addEventListener("click", async (e) => {
    const n = p.pendientes;
    if (!(await confirmar("Cerrar recepción", n ? `Quedan <b>${n}</b> productos sin llegar. Quedarán con alerta de pendiente y, si se repiten en el siguiente pedido, como posible desabastecimiento. Si llegan después, todavía se pueden recibir.` : "Todo llegó completo.", { boton: "Cerrar recepción" }))) return;
    conBoton(e.currentTarget, async () => { await api(`/api/pedidos/${p.id}/cerrar`, { metodo: "POST", json: {} }); vistaPedido(p.id); });
  });
  $("#escanear", v)?.addEventListener("click", () => escanearRecepcion(p));
}

function escanearRecepcion(p) {
  const h = hoja(`<div class="pila"><h2>Escanea un producto del pedido</h2>
    <div class="camara" style="aspect-ratio:4/3"><div id="lector-rec"></div><div class="marco"></div></div>
    <button class="btn" data-cerrar>Terminar</button></div>`, { alCerrar: () => escaner.detener() });
  const escaner = crearEscaner("lector-rec", (codigo) => {
    const c = codigo.toUpperCase();
    const item = p.items.find((i) => [i.producto.codigo_barras, i.producto.codigo_qr, i.producto.referencia].includes(c));
    if (!item) { aviso("Ese producto no está en este pedido.", "error"); return; }
    if (!["pendiente", "parcial"].includes(item.estado)) { aviso(`${item.producto.nombre} ya llegó completo.`); return; }
    escaner.detener(); h.cerrar(); formRecepcion(p, item);
  });
  escaner.iniciar().catch(() => { aviso("No se pudo abrir la cámara.", "error"); h.cerrar(); });
}

function formRecepcion(p, i) {
  const faltante = i.cantidad_pedida - i.cantidad_recibida;
  const h = hoja(`<form class="pila" id="f">
    <div><p class="eyebrow">Recibir</p><h2>${esc(i.producto.nombre)}</h2><p class="caption">Pedido ${num(i.cantidad_pedida)} · ya llegó ${num(i.cantidad_recibida)} · faltan ${num(faltante)}</p></div>
    <div class="grid-2"><div class="campo"><label for="can">Cantidad que llegó</label><input id="can" name="cantidad" type="number" min="1" inputmode="numeric" value="${faltante}" required></div>
      <div class="campo"><label for="lot">Lote</label><input id="lot" name="lote" placeholder="Opcional"></div></div>
    <div class="campo"><label for="ven">Fecha de vencimiento</label><input id="ven" name="fecha_vencimiento" type="date" min="${hoyISO()}" required></div>
    <label class="fila small"><input type="checkbox" id="sinfecha"> No tiene fecha de vencimiento</label>
    <p class="caption">Lo que llegue se suma al inventario con fecha de ingreso de hoy.</p>
    <button class="btn primario grande bloque" type="submit">Registrar recepción</button>
    <button class="btn peligro" type="button" id="cancelar">Ya no se espera este producto</button></form>`);
  $("#sinfecha", h.el).onchange = (e) => { $("#ven", h.el).required = !e.target.checked; $("#ven", h.el).disabled = e.target.checked; };
  $("#f", h.el).onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    conBoton($("[type=submit]", e.target), async () => {
      const r = await api(`/api/pedidos/${p.id}/recibir`, { metodo: "POST", json: {
        item_id: i.id, cantidad: Number(d.cantidad), lote: d.lote || "", fecha_vencimiento: $("#sinfecha", h.el).checked ? null : d.fecha_vencimiento } });
      h.cerrar();
      aviso(r.item.estado === "llego" ? "Recibido completo y sumado al inventario." : "Recepción parcial registrada.");
      vistaPedido(p.id);
    });
  };
  $("#cancelar", h.el).onclick = async () => {
    h.cerrar();
    if (!(await confirmar("Dejar de esperar", "La línea se marca como cancelada y deja de generar alerta. Úselo si se consiguió por otro medio o ya no se necesita.", { boton: "Dejar de esperar", peligro: true }))) return;
    try { await api(`/api/pedidos/${p.id}/cancelar-pendiente`, { metodo: "POST", json: { item_id: i.id, nota: "Ya no se espera" } }); vistaPedido(p.id); }
    catch (e) { aviso(e.message, "error"); }
  };
}

/* ---- Alertas ---- */
async function vistaAlertas() {
  const v = pintar({ activo: "alertas", contenido: `<div class="cabecera"><p class="eyebrow">Atención</p><h1>Alertas</h1></div><div id="c" class="pila">${esqueleto(4)}</div>` });
  try {
    const a = await api("/api/inventario/alertas");
    const seccion = (titulo, n, html) => `<section class="pila"><div class="fila entre"><h2>${titulo}</h2><span class="chip ${n ? "alerta" : "ok"}">${n}</span></div>
      ${n ? `<div class="lista">${html}</div>` : '<div class="lista"><div class="vacio">Todo en orden.</div></div>'}</section>`;
    $("#c", v).innerHTML =
      seccion("Pendientes de farmacia", a.pendientes.length, a.pendientes.map((x) => `
        <a class="item" href="#/pedido/${x.pedido.id}"><div class="cuerpo"><div class="titulo">${esc(x.producto.nombre)}</div>
          <div class="sub">Faltan ${num(x.faltante)} · pedido #${x.pedido.id} · ${x.dias === 0 ? "enviado hoy" : `hace ${x.dias} ${x.dias === 1 ? "día" : "días"}`}</div></div>
          <div class="pila" style="gap:4px;align-items:flex-end">
          ${x.posible_desabastecimiento ? '<span class="chip error">Posible desabastecimiento</span>' : `<span class="chip alerta">${x.atrasado ? "Atrasado" : "Sin llegar"}</span>`}</div></a>`).join("")) +
      seccion("Lotes vencidos", a.vencidos.length, a.vencidos.map(filaLote).join("")) +
      seccion("Próximos a vencer", a.por_vencer.length, a.por_vencer.map(filaLote).join("")) +
      seccion("Bajo el stock mínimo", a.bajo_minimo.length, a.bajo_minimo.map((p) => `<a class="item" href="#/producto/${p.id}"><div class="cuerpo"><div class="titulo">${esc(p.nombre)}</div>
        <div class="sub">${esc(p.presentacion)}</div></div><div class="cifra bajo">${num(p.cantidad_actual)}<small>mín. ${num(p.stock_minimo)}</small></div></a>`).join(""));
  } catch (e) { $("#c", v).innerHTML = `<div class="vacio">${esc(e.message)}</div>`; }
}

/* ---- Más opciones ---- */
async function vistaMas() {
  const u = sesion.usuario;
  const v = pintar({ titulo: "Más opciones", atras: true, contenido: `
    <section class="tarjeta fila"><div style="flex:1"><h3>${esc(u.nombre || u.usuario)}</h3><p class="caption">${esc(u.usuario)} · ${u.rol === "admin" ? "Administrador" : "Operador"}</p></div>
      <button class="btn chico" id="clave">Cambiar clave</button></section>
    <div class="lista">
      ${esAdmin() ? `<a class="item" href="#/catalogo">${ico.subir}<div class="cuerpo"><div class="titulo">Carga del catálogo</div><div class="sub">Plantilla de Excel y carga inicial</div></div></a>` : ""}
      <button class="item" id="etiquetas">${ico.qr}<div class="cuerpo"><div class="titulo">Etiquetas QR</div><div class="sub">Hoja para imprimir de los productos sin código</div></div></button>
      <button class="item" id="exportar">${ico.descarga}<div class="cuerpo"><div class="titulo">Exportar inventario</div><div class="sub">Excel con existencias, lotes y vencimientos</div></div></button>
      ${esAdmin() ? `<a class="item" href="#/usuarios">${ico.usuarios}<div class="cuerpo"><div class="titulo">Usuarios</div><div class="sub">Crear y desactivar accesos</div></div></a>` : ""}
      <button class="item" id="salir">${ico.salir}<div class="cuerpo"><div class="titulo">Cerrar sesión</div></div></button>
    </div>
    <section class="tarjeta pila small" id="ia"></section>
    <section class="tarjeta pila small"><p class="eyebrow">Acerca de</p>
      <p><b style="color:var(--ink)">Sinapsis</b> conecta el producto físico, el inventario y la farmacia del Instituto Neurológico de Colombia.</p>
      <p class="mute">Desarrollado por DeerSystems como proyecto sin ánimo de lucro. <span class="mono" id="version"></span></p></section>` });
  $("#clave", v).onclick = formClave;
  $("#etiquetas", v).onclick = () => abrirEnVentana("/api/productos/etiquetas");
  $("#exportar", v).onclick = () => descargar("/api/productos/exportar", `sinapsis_inventario_${hoyISO()}.xlsx`);
  $("#salir", v).onclick = async () => { try { await api("/api/auth/logout", { metodo: "POST" }); } catch {} sesion.token = ""; sesion.usuario = null; location.hash = "#/"; render(); };
  try {
    const [ia, salud] = await Promise.all([api("/api/identificar/ia/estado"), fetch("/api/salud").then((r) => r.json())]);
    $("#version", v).textContent = `v${salud.version}`;
    $("#ia", v).innerHTML = `<div class="fila entre"><p class="eyebrow">Respaldo con IA</p>${ia.habilitada ? '<span class="chip ia">Activo</span>' : '<span class="chip neutro">Desactivado</span>'}</div>
      <p>${ia.habilitada ? `Se usa solo cuando el código y la lectura de texto fallan. Hoy: <b style="color:var(--ink)">${ia.usadas_hoy}</b> de ${ia.limite_diario} consultas.` : "Sinapsis funciona sin IA. El administrador del servidor puede activarla como respaldo."}</p>`;
  } catch {}
}

function formClave() {
  const h = hoja(`<form class="pila" id="f"><h2>Cambiar clave</h2>
    <div class="campo"><label>Clave actual</label><input name="actual" type="password" autocomplete="current-password" required></div>
    <div class="campo"><label>Clave nueva (mínimo 8 caracteres)</label><input name="nueva" type="password" minlength="8" autocomplete="new-password" required></div>
    <button class="btn primario bloque">Guardar</button></form>`);
  $("#f", h.el).onsubmit = (e) => { e.preventDefault(); conBoton($("button", e.target), async () => {
    await api("/api/auth/clave", { metodo: "POST", json: Object.fromEntries(new FormData(e.target)) }); h.cerrar(); aviso("Clave actualizada.");
  }); };
}

/* ---- Carga del catálogo (admin) ---- */
function vistaCatalogo() {
  const v = pintar({ titulo: "Carga del catálogo", atras: true, contenido: `
    <div class="cabecera"><p class="eyebrow">Carga inicial</p><h1>Catálogo de productos</h1>
      <p class="small">Es la base contra la que Sinapsis compara todo lo que se escanea o se lee por foto.</p></div>
    <section class="tarjeta pila"><h3>1. Descarga y llena la plantilla</h3>
      <p class="small">Columnas obligatorias en verde. La hoja <i>Instrucciones</i> explica cada una. Borra las dos filas de ejemplo.</p>
      <button class="btn" id="plantilla">${ico.descarga} Descargar plantilla</button></section>
    <section class="tarjeta pila"><h3>2. Súbela para revisarla</h3>
      <p class="small">Primero se valida: no se guarda nada hasta que no haya errores.</p>
      <label class="btn">${ico.subir} <span id="nombre">Elegir archivo .xlsx</span><input type="file" id="archivo" accept=".xlsx" hidden></label>
      <div id="resultado"></div></section>` });
  $("#plantilla", v).onclick = () => descargar("/api/productos/plantilla", "plantilla_catalogo_sinapsis.xlsx");
  let archivo = null;
  const enviar = async (aplicar) => {
    const f = new FormData(); f.append("archivo", archivo);
    return api(`/api/productos/carga?aplicar=${aplicar}`, { metodo: "POST", form: f });
  };
  $("#archivo", v).onchange = async (e) => {
    archivo = e.target.files[0]; e.target.value = "";
    if (!archivo) return;
    $("#nombre", v).textContent = archivo.name;
    const res = $("#resultado", v);
    res.innerHTML = '<div class="fila small"><span class="cargando"></span> Revisando…</div>';
    try {
      const r = await enviar(false);
      if (r.errores.length) {
        res.innerHTML = `<div class="pila"><p class="small" style="color:var(--danger-text)"><b>${r.errores.length} errores</b> para corregir antes de cargar (${r.filas_validas} filas están bien):</p>
          <div class="tarjeta fuerte small pila" style="max-height:280px;overflow:auto">${r.errores.map((x) => `<div>${esc(x)}</div>`).join("")}</div>
          <p class="caption">Corrige el Excel y vuelve a subirlo.</p></div>`;
      } else {
        res.innerHTML = `<div class="pila"><p class="small" style="color:var(--primary-text)"><b>${r.filas_validas} productos</b> listos para cargar, sin errores.</p>
          <p class="caption">Si una referencia ya existe se actualizan sus datos, sin cambiar el inventario registrado.</p>
          <button class="btn primario grande bloque" id="aplicar">Cargar ${r.filas_validas} productos</button></div>`;
        $("#aplicar", res).onclick = (ev) => conBoton(ev.currentTarget, async () => {
          const a = await enviar(true);
          if (a.errores?.length) { res.innerHTML = `<div class="tarjeta fuerte small">${a.errores.map(esc).join("<br>")}</div>`; return; }
          res.innerHTML = `<div class="pila"><p style="color:var(--primary-text)"><b>Listo.</b> ${a.creados} creados, ${a.actualizados} actualizados.</p>
            <button class="btn" id="imp">${ico.qr} Imprimir etiquetas QR pendientes</button></div>`;
          $("#imp", res).onclick = () => abrirEnVentana("/api/productos/etiquetas");
        });
      }
    } catch (err) { res.innerHTML = `<p class="small" style="color:var(--danger-text)">${esc(err.message)}</p>`; }
  };
}

/* ---- Usuarios (admin) ---- */
async function vistaUsuarios() {
  const v = pintar({ titulo: "Usuarios", atras: true, contenido: esqueleto(2) });
  const usuarios = await api("/api/auth/usuarios");
  v.innerHTML = `<button class="btn primario bloque" id="nuevo">${ico.sumar} Nuevo usuario</button>
    <div class="lista">${usuarios.map((u) => `<div class="item"><div class="cuerpo"><div class="titulo">${esc(u.nombre || u.usuario)}</div>
      <div class="sub">${esc(u.usuario)} · ${u.rol === "admin" ? "Administrador" : "Operador"}</div></div>
      ${u.id === sesion.usuario.id ? '<span class="chip info">Tú</span>' : `<button class="btn chico ${u.activo ? "peligro" : ""}" data-u="${u.id}" data-activo="${!u.activo}">${u.activo ? "Desactivar" : "Activar"}</button>`}</div>`).join("")}</div>`;
  $$("[data-u]", v).forEach((b) => (b.onclick = () => conBoton(b, async () => {
    await api(`/api/auth/usuarios/${b.dataset.u}/activo?activo=${b.dataset.activo}`, { metodo: "POST" }); vistaUsuarios();
  })));
  $("#nuevo", v).onclick = () => {
    const h = hoja(`<form class="pila" id="f"><h2>Nuevo usuario</h2>
      <div class="campo"><label>Nombre</label><input name="nombre" required></div>
      <div class="campo"><label>Usuario</label><input name="usuario" autocapitalize="none" minlength="3" required></div>
      <div class="campo"><label>Clave inicial (mínimo 8)</label><input name="clave" type="password" minlength="8" required></div>
      <div class="campo"><label>Rol</label><select name="rol"><option value="operador">Operador</option><option value="admin">Administrador</option></select></div>
      <button class="btn primario bloque">Crear</button></form>`);
    $("#f", h.el).onsubmit = (e) => { e.preventDefault(); conBoton($("button", e.target), async () => {
      await api("/api/auth/usuarios", { metodo: "POST", json: Object.fromEntries(new FormData(e.target)) }); h.cerrar(); aviso("Usuario creado."); vistaUsuarios();
    }); };
  };
}

/* ================= Enrutador ================= */
async function render() {
  if (limpiarVista) { const l = limpiarVista; limpiarVista = null; await l(); }
  $$(".velo").forEach((x) => x.remove());
  if (!sesion.token) return vistaLogin();
  if (!sesion.usuario) {
    try { sesion.usuario = await api("/api/auth/yo"); } catch { return; }
  }
  const [ruta, consulta = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const params = new URLSearchParams(consulta);
  const [seccion, id] = ruta.split("/");
  try {
    switch (seccion) {
      case "": return vistaInicio();
      case "escanear": return vistaEscanear();
      case "inventario": return vistaInventario(params);
      case "producto": return vistaProducto(Number(id), params);
      case "pedidos": return vistaPedidos();
      case "pedido": return vistaPedido(Number(id));
      case "alertas": return vistaAlertas();
      case "mas": return vistaMas();
      case "catalogo": return esAdmin() ? vistaCatalogo() : (location.hash = "#/");
      case "usuarios": return esAdmin() ? vistaUsuarios() : (location.hash = "#/");
      default: location.hash = "#/";
    }
  } catch (e) { aviso(e.message, "error"); }
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  render();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
});
