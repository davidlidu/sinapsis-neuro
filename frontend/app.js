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
// Reactivos que se gastan por pruebas: existencias y mínimo van en pruebas; ingresos y pedidos, en unidades.
const porPruebas = (p) => Boolean(p?.pruebas_por_unidad);
const cant = (p, n) => `${num(n)} ${porPruebas(p) ? "pruebas" : "und"}`;
const enUnidades = (p, n) => porPruebas(p) ? `≈ ${(n / p.pruebas_por_unidad).toLocaleString("es-CO", { maximumFractionDigits: 1 })} und` : "";

function aviso(texto, tipo = "") {
  $$(".aviso").forEach((a) => a.remove());
  const el = document.createElement("div");
  el.className = `aviso ${tipo}`;
  el.setAttribute("role", "status");
  el.textContent = texto;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

async function copiar(texto, mensaje = "Copiado.") {
  try { await navigator.clipboard.writeText(texto); }
  catch { // navegadores sin permiso de portapapeles
    const t = Object.assign(document.createElement("textarea"), { value: texto });
    document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
  }
  aviso(mensaje);
}
// Código de farmacia resaltado y copiable (para pegarlo en el sistema interno de farmacia).
const codigoFarmacia = (cod) => `<button type="button" class="cod-farmacia" data-copiar="${esc(cod)}" title="Copiar código de farmacia">
  <small>Cód. farmacia</small><b>${esc(cod)}</b>${I('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>')}</button>`;
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-copiar]");
  if (b) { e.preventDefault(); e.stopPropagation(); copiar(b.dataset.copiar, `Código ${b.dataset.copiar} copiado.`); }
}, true);

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
  campana: I('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  instalar: I('<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 7v7M9 11l3 3 3-3M10 18h4"/>'),
  ajustes: I('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>'),
  quitar: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  libro: I('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h13M9 7h6M9 11h4"/>'),
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
    <img class="lateral-logo" src="assets/neurologico-logo-claro.png" alt="Hospital Neurológico de Colombia">
    ${nav.map(([ruta, i, t]) => ruta === "escanear"
      ? `<a href="#/escanear" class="escanear ${activo === ruta ? "activo" : ""}"><span class="boton">${ico[i]}</span>${t}</a>`
      : `<a href="#/${ruta}" class="${activo === ruta ? "activo" : ""}">${ico[i]}${t}</a>`).join("")}
    <a href="#/manual" class="lateral-extra ${activo === "manual" ? "activo" : ""}">${ico.libro}Manual de uso</a>
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
      <img class="logo-neuro" src="assets/neurologico-logo-claro.png" alt="Hospital Neurológico de Colombia">
      <div><h1><span>Sinapsis</span></h1>
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
    <section class="pila" id="pendientes-inicio"></section>
    <section id="dispositivo-inicio"></section>
    <a class="tarjeta fila enlace-manual" href="#/manual">${ico.libro}<div style="flex:1"><h3>Manual de uso</h3>
      <p class="small mute">Aprende a escanear, registrar, contar pruebas y pedir a farmacia, paso a paso.</p></div></a>` });
  pintarDispositivo($("#dispositivo-inicio", v), { compacto: true });
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
      <div class="sub">${esc(c.presentacion)} · Cód. <span class="mono">${esc(c.referencia)}</span></div></div>
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
    <div class="buscador">${ico.buscar}<input id="q" placeholder="Nombre, cód. farmacia o código de barras" autocomplete="off"></div>
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
      <p class="eyebrow">${esc(p.seccion || p.presentacion || "Producto")}</p>
      <h1>${esc(p.nombre)}</h1>
      <div class="fila" style="flex-wrap:wrap;gap:6px;margin-top:6px">
        ${codigoFarmacia(p.referencia)}
        ${porPruebas(p) ? `<span class="chip info">${esc(p.presentacion || "Unidad")} de ${num(p.pruebas_por_unidad)} pruebas</span>` : ""}
        ${p.codigo_barras ? `<span class="chip neutro">${esc(p.codigo_barras)}</span>` : ""}
        ${p.codigo_qr ? `<span class="chip info">${esc(p.codigo_qr)}</span>` : ""}
        ${params.get("ia") ? '<span class="chip ia">Identificado con IA</span>' : ""}
      </div>
    </div>
    <section class="tarjeta pila">
      <div class="fila entre"><div><p class="caption">${porPruebas(p) ? "Pruebas disponibles" : "Cantidad actual"}</p><b style="font:700 32px/38px var(--display);color:${p.bajo_minimo ? "var(--warning-text)" : "var(--ink)"}">${num(p.cantidad_actual)}</b>
          ${porPruebas(p) ? `<p class="caption">${enUnidades(p, p.cantidad_actual)}</p>` : ""}</div>
        <div style="text-align:right"><p class="caption">${porPruebas(p) ? "Pedir al quedar" : "Stock mínimo"}</p><b style="font:600 20px var(--display);color:var(--ink)">${num(p.stock_minimo)}</b>
          ${porPruebas(p) ? '<p class="caption">pruebas</p>' : ""}</div></div>
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
          <div class="sub">Ingresó ${fecha(l.fecha_ingreso)} · ${cant(p, l.cantidad)}${l.lote ? ` · Lote <span class="mono">${esc(l.lote)}</span>` : ""}</div></div>
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
      <div class="campo"><label for="can">${porPruebas(p) ? "Unidades (kits)" : "Cantidad"}</label><input id="can" name="cantidad" type="number" inputmode="numeric" min="1" value="1" required></div>
      <div class="campo"><label for="lot">Lote</label><input id="lot" name="lote" autocomplete="off" placeholder="Opcional"></div>
    </div>
    ${porPruebas(p) ? `<p class="caption" id="equiv">Suma ${num(p.pruebas_por_unidad)} pruebas al inventario.</p>` : ""}
    <div class="campo"><label for="ing">Fecha de ingreso</label><input id="ing" name="fecha_ingreso" type="date" value="${hoyISO()}" max="${hoyISO()}" required></div>
    <label class="fila small"><input type="checkbox" id="sinfecha"> El producto no tiene fecha de vencimiento</label>
    ${sugerirEtiqueta ? `<div class="tarjeta fuerte pila"><p class="small">Este producto se identificó con IA. Imprime su etiqueta QR para que la próxima vez se lea al instante, sin IA.</p>
      <button type="button" class="btn chico" id="imp">${ico.qr} Imprimir etiqueta</button></div>` : ""}
    <button class="btn primario grande bloque" type="submit">Guardar ingreso</button>
  </form>`);
  $("#sinfecha", h.el).onchange = (e) => { $("#ven", h.el).required = !e.target.checked; $("#ven", h.el).disabled = e.target.checked; };
  if (porPruebas(p)) $("#can", h.el).oninput = (e) => { $("#equiv", h.el).textContent = `Suma ${num(Number(e.target.value || 0) * p.pruebas_por_unidad)} pruebas al inventario.`; };
  $("#imp", h.el)?.addEventListener("click", () => abrirEnVentana(`/api/productos/etiquetas?ids=${p.id}`));
  $("#f", h.el).onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    conBoton($("[type=submit]", e.target), async () => {
      await api("/api/inventario/ingresos", { metodo: "POST", json: {
        producto_id: p.id, cantidad: Number(d.cantidad), lote: d.lote || "",
        fecha_vencimiento: $("#sinfecha", h.el).checked ? null : d.fecha_vencimiento, fecha_ingreso: d.fecha_ingreso } });
      h.cerrar();
      aviso(`Ingreso guardado: ${d.cantidad} und${porPruebas(p) ? ` (${num(d.cantidad * p.pruebas_por_unidad)} pruebas)` : ""}.`);
      history.replaceState(null, "", `#/producto/${p.id}`);
      vistaProducto(p.id, new URLSearchParams());
    });
  };
}

function formConteo(p) {
  const h = hoja(`<form class="pila" id="f">
    <div><p class="eyebrow">Conteo físico</p><h2>${esc(p.nombre)}</h2></div>
    <p class="small">${porPruebas(p) ? `Cuenta las pruebas que quedan: ${num(p.pruebas_por_unidad)} por cada unidad cerrada más las que le queden a la abierta. ` : ""}La cantidad contada reemplaza la registrada (${cant(p, p.cantidad_actual)}). El cambio queda en el historial.</p>
    <div class="campo"><label for="can">${porPruebas(p) ? "Pruebas que quedan" : "Cantidad contada"}</label><input id="can" name="cantidad" type="number" inputmode="numeric" min="0" value="${p.cantidad_actual}" required></div>
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

async function formProducto(p = null) {
  const secciones = await api("/api/secciones");
  const enLista = !p?.seccion || secciones.some((x) => x.nombre === p.seccion);
  const opcionesSeccion = `<option value="">Sin sección</option>
    ${secciones.map((x) => `<option ${x.nombre === p?.seccion ? "selected" : ""}>${esc(x.nombre)}</option>`).join("")}
    ${enLista ? "" : `<option selected>${esc(p.seccion)}</option>`}
    <option value="__nueva">＋ Nueva sección…</option>`;
  const h = hoja(`<form class="pila" id="f"><h2>${p ? "Editar producto" : "Nuevo producto"}</h2>
    <div class="campo"><label>Nombre</label><input name="nombre" value="${esc(p?.nombre)}" required></div>
    <div class="grid-2"><div class="campo"><label>Código de farmacia</label><input name="referencia" value="${esc(p?.referencia)}" required></div>
      <div class="campo"><label>Stock mínimo (en pruebas si aplica)</label><input name="stock_minimo" type="number" min="0" value="${p?.stock_minimo ?? 0}" required></div></div>
    <div class="grid-2"><div class="campo"><label>Presentación</label><input name="presentacion" value="${esc(p?.presentacion)}" placeholder="Kit, Caja…"></div>
      <div class="campo"><label for="sec">Sección</label><select id="sec" name="seccion">${opcionesSeccion}</select>
        <input name="seccion_nueva" placeholder="Nombre de la sección nueva" maxlength="120" hidden style="margin-top:6px"></div></div>
    <div class="campo"><label>Pruebas por unidad</label><input name="pruebas_por_unidad" type="number" min="1" inputmode="numeric" value="${p?.pruebas_por_unidad ?? ""}" placeholder="Vacío si no se gasta por pruebas">
      <p class="caption">Si lo llenas, el inventario y el stock mínimo se cuentan en pruebas.</p></div>
    <div class="campo"><label>Código de barras</label><input name="codigo_barras" value="${esc(p?.codigo_barras)}" inputmode="numeric"></div>
    <div class="campo"><label>Cómo se identifica</label><select name="metodo_identificacion">
      ${["barras", "nombre", "qr"].map((m) => `<option value="${m}" ${p?.metodo_identificacion === m ? "selected" : ""}>${{ barras: "Código de barras", nombre: "Nombre impreso", qr: "Etiqueta QR propia" }[m]}</option>`).join("")}
    </select></div>
    <button class="btn primario bloque" type="submit">Guardar</button></form>`);
  const nueva = $("[name=seccion_nueva]", h.el);
  $("#sec", h.el).onchange = (e) => { nueva.hidden = e.target.value !== "__nueva"; nueva.required = !nueva.hidden; if (!nueva.hidden) nueva.focus(); };
  $("#f", h.el).onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    if (d.seccion === "__nueva") d.seccion = d.seccion_nueva.trim();
    delete d.seccion_nueva;
    d.stock_minimo = Number(d.stock_minimo); d.codigo_barras = d.codigo_barras || null;
    d.pruebas_por_unidad = Number(d.pruebas_por_unidad) || null;
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

  c.innerHTML = `<div class="buscador">${ico.buscar}<input id="q" placeholder="Buscar por nombre, cód. farmacia o código de barras" autocomplete="off"></div>
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
      <div class="sub">${esc(p.seccion || p.presentacion)} · Cód. <span class="mono">${esc(p.referencia)}</span></div></div>
      ${cifra(p)}</a>`).join("");
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

const cifra = (p) => `<div class="cifra ${p.bajo_minimo ? "bajo" : ""}">${num(p.cantidad_actual)}<small>${porPruebas(p) ? "pruebas · " : ""}mín. ${num(p.stock_minimo)}</small></div>`;

const filaLote = (l) => `<a class="item" href="#/producto/${l.producto.id}"><div class="cuerpo"><div class="titulo">${esc(l.producto.nombre)}</div>
  <div class="sub">Vence ${fecha(l.fecha_vencimiento)} · ${cant(l.producto, l.cantidad)}${l.lote ? ` · Lote <span class="mono">${esc(l.lote)}</span>` : ""}</div></div>${chipVence[l.estado_vencimiento]}</a>`;

/* ---- Pedidos ---- */
async function vistaPedidos() {
  const v = pintar({ activo: "pedidos", contenido: `<div class="cabecera"><p class="eyebrow">Farmacia</p><h1>Pedidos</h1></div><div id="c" class="pila">${esqueleto()}</div>` });
  try {
    const [pedidos, ajustes] = await Promise.all([api("/api/pedidos"), api("/api/ajustes")]);
    const borrador = pedidos.find((p) => p.estado === "borrador");
    const dias = ajustes.valores.dias_vencimiento_pedido;
    $("#c", v).innerHTML = `
      ${borrador ? `<a class="btn primario grande bloque" href="#/pedido/${borrador.id}">Continuar borrador #${borrador.id}</a>`
        : `<button class="btn primario grande bloque" id="nuevo">${ico.sumar} Nuevo pedido sugerido</button>
           <p class="caption">Se arma solo con lo que está en cero, bajo el mínimo o con lotes que vencen en los próximos ${num(dias)} días. Lo revisas, quitas lo que no necesites y confirmas antes de enviarlo.</p>`}
      <section class="tarjeta pila"><div><h3>Pedido a mano</h3>
        <p class="small">Descarga el formato con todos los productos, su cód. farmacia y mínimo. Llena la cantidad a pedir (en el computador o impreso) y súbelo: Sinapsis arma el borrador.</p></div>
        <div class="grid-2"><button class="btn" id="fpdf">${ico.pdf} Formato PDF</button><button class="btn" id="fxlsx">${ico.descarga} Formato Excel</button></div>
        <label class="btn">${ico.subir} Cargar formato lleno<input type="file" id="fcarga" accept=".pdf,.xlsx,application/pdf" hidden></label></section>
      ${pedidos.length ? `<div class="lista">${pedidos.map((p) => `<a class="item" href="#/pedido/${p.id}"><div class="cuerpo">
        <div class="titulo">Pedido #${p.id}</div><div class="sub">${fecha(p.fecha_envio || p.fecha_creacion)} · ${p.total_items} productos${p.pendientes && p.estado !== "borrador" ? ` · ${p.pendientes} pendientes` : ""}</div></div>
        ${chip(estadosPedido[p.estado])}</a>`).join("")}</div>` : '<div class="lista"><div class="vacio">Aún no hay pedidos.</div></div>'}`;
    $("#nuevo", v)?.addEventListener("click", (e) => conBoton(e.currentTarget, async () => {
      const p = await api("/api/pedidos", { metodo: "POST" });
      location.hash = `#/pedido/${p.id}`;
    }));
    $("#fpdf", v).onclick = () => descargar("/api/pedidos/formato?tipo=pdf", `formato_pedido_${hoyISO()}.pdf`);
    $("#fxlsx", v).onclick = () => descargar("/api/pedidos/formato?tipo=xlsx", `formato_pedido_${hoyISO()}.xlsx`);
    $("#fcarga", v).onchange = async (e) => {
      const archivo = e.target.files[0]; e.target.value = "";
      if (!archivo) return;
      if (borrador && !(await confirmar("Reemplazar borrador", `Ya hay un borrador abierto (#${borrador.id}). Se reemplazará por el formato <b>${esc(archivo.name)}</b>.`, { boton: "Reemplazar", peligro: true }))) return;
      const f = new FormData(); f.append("archivo", archivo);
      try {
        const p = await api(`/api/pedidos/formato?reemplazar=${Boolean(borrador)}`, { metodo: "POST", form: f });
        aviso(`Borrador creado con ${p.items.length} productos del formato.`);
        location.hash = `#/pedido/${p.id}`;
      } catch (err) { aviso(err.message, "error"); }
    };
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
    ${p.items.length ? `<div class="fila entre"><span class="caption">${p.items.length} productos · cantidades en unidades (kits, cajas)</span>
      <button class="btn chico" id="copiar-lista">Copiar lista (código y cantidad)</button></div>` : ""}
    <div class="lista" id="items">${p.items.length ? p.items.map((i) => `
      <div class="item item-pedido"><div class="cuerpo"><div class="titulo">${esc(i.producto.nombre)}</div>
        <div class="sub">Hay ${cant(i.producto, i.producto.cantidad_actual)} · mín. ${num(i.producto.stock_minimo)}${i.cantidad_sugerida ? ` · sugerido ${num(i.cantidad_sugerida)} und` : ""}</div>
        <div class="fila" style="flex-wrap:wrap;gap:6px;margin-top:6px">${codigoFarmacia(i.producto.referencia)}
          ${(i.motivo || (i.cantidad_sugerida ? "" : "Agregado a mano")).split(" · ").filter(Boolean).map((m) => `<span class="chip ${/Venc/.test(m) ? "error" : /cero|mínimo/.test(m) ? "alerta" : "neutro"}">${esc(m)}</span>`).join("")}</div></div>
        <div class="pila" style="gap:6px;align-items:center">
          <input type="number" min="0" inputmode="numeric" value="${i.cantidad_pedida}" data-cant="${i.producto_id}" aria-label="Cantidad a pedir" class="cant-pedido">
          <button class="enlace quitar" data-quitar="${i.producto_id}" aria-label="Quitar del pedido">${ico.quitar} Quitar</button></div>
      </div>`).join("") : '<div class="vacio">El pedido está vacío. Agrega productos.</div>'}</div>
    <button class="btn" id="agregar">${ico.sumar} Agregar producto</button>
    <section class="tarjeta fuerte pila">
      <div><p class="eyebrow">Paso 2 de 2 · Confirmar</p><h3>Adjunta el PDF del pedido final</h3>
      <p class="small">Es el pedido tal como se envió a farmacia. Al adjuntarlo, el pedido queda como enviado y empieza a esperar la mercancía.</p></div>
      <label class="btn">${ico.pdf} <span id="nombre-pdf">Elegir PDF</span><input type="file" accept="application/pdf" id="pdf" hidden></label>
      <button class="btn primario grande bloque" id="enviar" disabled>Confirmar y marcar como enviado</button>
    </section>
    <button class="btn peligro" id="eliminar">Eliminar borrador</button>`;

  $("#copiar-lista", v)?.addEventListener("click", () => {
    const filas = $$("[data-cant]", v).map((inp) => [p.items.find((i) => i.producto_id === Number(inp.dataset.cant)).producto.referencia, inp.value]);
    copiar(filas.filter(([, q]) => Number(q) > 0).map((f) => f.join("\t")).join("\n"), "Lista copiada: pégala en el sistema de farmacia.");
  });
  $$("[data-quitar]", v).forEach((b) => (b.onclick = () => conBoton(b, async () => {
    await api(`/api/pedidos/${p.id}/items`, { metodo: "PUT", json: { producto_id: Number(b.dataset.quitar), cantidad: 0 } });
    aviso("Producto quitado del pedido."); vistaPedido(p.id);
  })));
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
        <div class="sub">Pedido ${num(i.cantidad_pedida)} · llegó ${num(i.cantidad_recibida)}${i.nota ? ` · ${esc(i.nota)}` : ""}</div>
        <div style="margin-top:6px">${codigoFarmacia(i.producto.referencia)}</div></div>
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
    <div><p class="eyebrow">Recibir</p><h2>${esc(i.producto.nombre)}</h2><p class="caption">Pedido ${num(i.cantidad_pedida)} und · ya llegó ${num(i.cantidad_recibida)} · faltan ${num(faltante)}${porPruebas(i.producto) ? ` · cada unidad suma ${num(i.producto.pruebas_por_unidad)} pruebas` : ""}</p></div>
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
        <div class="sub">${esc(p.seccion || p.presentacion)}</div></div>${cifra(p)}</a>`).join(""));
  } catch (e) { $("#c", v).innerHTML = `<div class="vacio">${esc(e.message)}</div>`; }
}

/* ---- Más opciones ---- */
async function vistaMas() {
  const u = sesion.usuario;
  const v = pintar({ titulo: "Más opciones", atras: true, contenido: `
    <section class="tarjeta fila"><div style="flex:1"><h3>${esc(u.nombre || u.usuario)}</h3><p class="caption">${esc(u.usuario)} · ${u.rol === "admin" ? "Administrador" : "Operador"}</p></div>
      <button class="btn chico" id="clave">Cambiar clave</button></section>
    <section class="pila"><h2>Este dispositivo</h2><div id="dispositivo"></div></section>
    <div class="lista">
      <a class="item" href="#/manual">${ico.libro}<div class="cuerpo"><div class="titulo">Manual de uso</div><div class="sub">Guía animada paso a paso</div></div></a>
      ${esAdmin() ? `<a class="item" href="#/configuracion">${ico.ajustes}<div class="cuerpo"><div class="titulo">Configuración</div><div class="sub">Secciones y días de vencimiento para alertas y pedidos</div></div></a>` : ""}
      ${esAdmin() ? `<a class="item" href="#/catalogo">${ico.subir}<div class="cuerpo"><div class="titulo">Carga del catálogo</div><div class="sub">Plantilla de Excel y carga inicial</div></div></a>` : ""}
      <button class="item" id="etiquetas">${ico.qr}<div class="cuerpo"><div class="titulo">Etiquetas QR</div><div class="sub">Hoja para imprimir de los productos sin código</div></div></button>
      <button class="item" id="exportar">${ico.descarga}<div class="cuerpo"><div class="titulo">Exportar inventario</div><div class="sub">Excel con existencias, lotes y vencimientos</div></div></button>
      ${esAdmin() ? `<a class="item" href="#/usuarios">${ico.usuarios}<div class="cuerpo"><div class="titulo">Usuarios</div><div class="sub">Crear y desactivar accesos</div></div></a>` : ""}
      <button class="item" id="salir">${ico.salir}<div class="cuerpo"><div class="titulo">Cerrar sesión</div></div></button>
    </div>
    <section class="tarjeta pila small" id="ia"></section>
    <section class="tarjeta pila small"><p class="eyebrow">Acerca de</p>
      <img class="logo-neuro chico" src="assets/neurologico-logo-claro.png" alt="Hospital Neurológico de Colombia">
      <p><b style="color:var(--ink)">Sinapsis</b> conecta el producto físico, el inventario y la farmacia del Instituto Neurológico de Colombia.</p>
      <p class="mute">Desarrollado por DeerSystems como proyecto sin ánimo de lucro. <span class="mono" id="version"></span></p></section>` });
  $("#clave", v).onclick = formClave;
  pintarDispositivo($("#dispositivo", v));
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
          <p class="caption">Si un cód. farmacia ya existe se actualizan sus datos. Su cantidad solo se toma si el producto sigue en 0 y sin movimientos: así puedes cargar el catálogo primero y las existencias después.</p>
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

/* ---- Configuración (admin) ---- */
async function vistaConfiguracion() {
  const v = pintar({ titulo: "Configuración", atras: true, contenido: esqueleto(2) });
  const { valores } = await api("/api/ajustes");
  v.innerHTML = `<div class="cabecera"><p class="eyebrow">Administración</p><h1>Configuración</h1></div>
    <form class="tarjeta pila" id="f">
      <div class="campo"><label for="dvp">Días para incluir en el pedido por vencimiento</label>
        <input id="dvp" name="dias_vencimiento_pedido" type="number" min="0" max="365" inputmode="numeric" value="${valores.dias_vencimiento_pedido}" required>
        <p class="caption">Un producto con un lote que vence en estos días (o ya vencido) entra solo al pedido sugerido. 0 = solo los vencidos.</p></div>
      <div class="campo"><label for="dav">Días de alerta de vencimiento</label>
        <input id="dav" name="dias_alerta_vencimiento" type="number" min="1" max="365" inputmode="numeric" value="${valores.dias_alerta_vencimiento}" required>
        <p class="caption">Desde cuántos días antes un lote aparece como <i>Por vencer</i> en Inicio, Alertas y notificaciones.</p></div>
      <button class="btn primario bloque" type="submit">Guardar</button></form>
    <section class="pila"><div><h2>Secciones</h2>
      <p class="caption">La lista que se elige en cada producto. Al renombrar una sección, sus productos quedan con el nombre nuevo.</p></div>
      <form class="fila" id="fsec" style="gap:8px"><input name="nombre" placeholder="Nueva sección (ej. Microbiología · Reactivo)" maxlength="120" required
        style="flex:1;min-height:46px;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--hairline-strong);background:var(--surface-strong);color:var(--ink)">
        <button class="btn primario" type="submit">${ico.sumar} Agregar</button></form>
      <div class="lista" id="secciones">${esqueleto(2)}</div></section>`;
  pintarSecciones($("#secciones", v));
  $("#fsec", v).onsubmit = (e) => {
    e.preventDefault();
    const nombre = e.target.nombre.value.trim();
    conBoton($("[type=submit]", e.target), async () => {
      await api("/api/secciones", { metodo: "POST", json: { nombre } });
      e.target.reset(); aviso(`Sección «${nombre}» agregada.`); pintarSecciones($("#secciones", v));
    });
  };
  $("#f", v).onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries([...new FormData(e.target)].map(([k, x]) => [k, Number(x)]));
    conBoton($("[type=submit]", e.target), async () => { await api("/api/ajustes", { metodo: "PUT", json: d }); aviso("Configuración guardada."); });
  };
}

async function pintarSecciones(cont) {
  const lista = await api("/api/secciones");
  cont.innerHTML = lista.length ? lista.map((x) => `<div class="item"><div class="cuerpo"><div class="titulo">${esc(x.nombre)}</div>
      <div class="sub">${x.productos === 1 ? "1 producto" : `${num(x.productos)} productos`}</div></div>
      <button class="btn chico" data-renombrar="${x.id}">Renombrar</button>
      <button class="enlace quitar" data-borrar="${x.id}" aria-label="Eliminar sección">${ico.quitar}</button></div>`).join("")
    : '<div class="vacio">Aún no hay secciones.</div>';
  const buscar = (id) => lista.find((x) => x.id === Number(id));
  $$("[data-renombrar]", cont).forEach((b) => (b.onclick = () => {
    const x = buscar(b.dataset.renombrar);
    const h = hoja(`<form class="pila" id="fr"><h2>Renombrar sección</h2>
      <div class="campo"><label for="nn">Nombre</label><input id="nn" name="nombre" value="${esc(x.nombre)}" maxlength="120" required></div>
      <p class="caption">${x.productos ? `Los ${num(x.productos)} productos de esta sección quedan con el nombre nuevo.` : "Ningún producto usa esta sección."}</p>
      <button class="btn primario bloque" type="submit">Guardar</button></form>`);
    $("#fr", h.el).onsubmit = (e) => {
      e.preventDefault();
      conBoton($("[type=submit]", e.target), async () => {
        await api(`/api/secciones/${x.id}`, { metodo: "PUT", json: { nombre: e.target.nombre.value.trim() } });
        h.cerrar(); aviso("Sección renombrada."); pintarSecciones(cont);
      });
    };
  }));
  $$("[data-borrar]", cont).forEach((b) => (b.onclick = () => {
    const x = buscar(b.dataset.borrar);
    const h = hoja(`<form class="pila" id="fb"><h2>Eliminar «${esc(x.nombre)}»</h2>
      ${x.productos ? `<div class="campo"><label for="ma">Sus ${num(x.productos)} productos pasan a</label><select id="ma" name="mover_a">
        <option value="">Sin sección</option>${lista.filter((o) => o.id !== x.id).map((o) => `<option>${esc(o.nombre)}</option>`).join("")}</select></div>`
        : '<p class="caption">Ningún producto usa esta sección.</p>'}
      <div class="grid-2"><button class="btn" type="button" data-cerrar>Cancelar</button><button class="btn peligro" type="submit">Eliminar</button></div></form>`);
    $("#fb", h.el).onsubmit = (e) => {
      e.preventDefault();
      const destino = e.target.mover_a?.value || "";
      conBoton($("[type=submit]", e.target), async () => {
        await api(`/api/secciones/${x.id}?mover_a=${encodeURIComponent(destino)}`, { metodo: "DELETE" });
        h.cerrar(); aviso("Sección eliminada."); pintarSecciones(cont);
      });
    };
  }));
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

/* ================= Instalación (PWA) y notificaciones push ================= */
let eventoInstalar = null; // el navegador lo entrega cuando la app se puede instalar (Chrome, Edge, Android)
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); eventoInstalar = e; refrescarDispositivo(); });
window.addEventListener("appinstalled", () => { eventoInstalar = null; aviso("Sinapsis quedó instalada en este dispositivo."); refrescarDispositivo(); });

const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const pushSoportado = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const b64aBytes = (b64) => {
  const s = atob((b64 + "===".slice((b64.length + 3) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function instalarApp() {
  if (eventoInstalar) {
    eventoInstalar.prompt();
    const r = await eventoInstalar.userChoice;
    eventoInstalar = null;
    if (r.outcome !== "accepted") aviso("Puedes instalarla cuando quieras desde Más opciones.");
    return refrescarDispositivo();
  }
  const pasos = esIOS()
    ? ["Abre Sinapsis en <b>Safari</b>.", "Toca <b>Compartir</b> (el cuadro con la flecha hacia arriba).", "Elige <b>Agregar a inicio</b> y luego <b>Agregar</b>."]
    : /android/i.test(navigator.userAgent)
      ? ["Abre el menú <b>⋮</b> de Chrome.", "Toca <b>Instalar aplicación</b> o <b>Agregar a la pantalla principal</b>.", "Confirma con <b>Instalar</b>."]
      : ["En Chrome o Edge, busca el ícono de <b>instalar</b> al final de la barra de direcciones.", "También está en el menú <b>⋮</b> → <b>Instalar Sinapsis</b>.", "Se abrirá en su propia ventana, como un programa."];
  hoja(`<div class="pila"><div class="fila">${ico.instalar}<h2>Instalar Sinapsis</h2></div>
    <ol class="pasos">${pasos.map((t) => `<li>${t}</li>`).join("")}</ol>
    <p class="caption">Instalada abre más rápido, ocupa toda la pantalla y puede recibir notificaciones${esIOS() ? " (en iPhone, solo instalada)" : ""}.</p>
    <button class="btn primario bloque" data-cerrar>Entendido</button></div>`);
}

async function suscripcionActual() {
  if (!pushSoportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

async function activarNotificaciones() {
  if (!pushSoportado()) {
    throw new ErrorAPI(esIOS() && !instalada() ? "En iPhone primero instala Sinapsis en la pantalla de inicio y ábrela desde ese ícono."
      : "Este navegador no permite notificaciones.");
  }
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new ErrorAPI("Las notificaciones quedaron bloqueadas. Permítelas en los ajustes del navegador para este sitio.");
  const { clave } = await api("/api/notificaciones/clave");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64aBytes(clave) }));
  await api("/api/notificaciones/suscribir", { metodo: "POST", json: sub.toJSON() });
}

async function desactivarNotificaciones() {
  const sub = await suscripcionActual();
  if (!sub) return;
  await api("/api/notificaciones/desuscribir", { metodo: "POST", json: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}

const contenedoresDispositivo = new Map();
const refrescarDispositivo = () => contenedoresDispositivo.forEach((o, c) => (c.isConnected ? pintarDispositivo(c, o) : contenedoresDispositivo.delete(c)));

// "Este dispositivo": instalar la app y activar notificaciones. compacto = solo lo pendiente (para el inicio).
async function pintarDispositivo(cont, opciones = {}) {
  if (!cont) return;
  contenedoresDispositivo.set(cont, opciones);
  const sub = await suscripcionActual().catch(() => null);
  const permiso = "Notification" in window ? Notification.permission : "default";
  const activas = Boolean(sub) && permiso === "granted";
  const yaInstalada = instalada();
  if (opciones.compacto && yaInstalada && activas) { cont.innerHTML = ""; return; }

  const filaInstalar = yaInstalada
    ? `<div class="item">${ico.instalar}<div class="cuerpo"><div class="titulo">App instalada</div><div class="sub">Sinapsis se abre desde su propio ícono.</div></div><span class="chip ok">Lista</span></div>`
    : `<button class="item" id="instalar">${ico.instalar}<div class="cuerpo"><div class="titulo">Instalar la app</div>
        <div class="sub">Ícono en la pantalla de inicio o el escritorio; abre en su propia ventana.</div></div><span class="chip info">Instalar</span></button>`;
  const filaAvisos = activas
    ? `<div class="item">${ico.campana}<div class="cuerpo"><div class="titulo">Notificaciones activas</div>
        <div class="sub">Resumen diario de vencidos, por vencer, bajo mínimo y pendientes.</div>
        <div class="fila" style="gap:16px;margin-top:6px"><button class="enlace" id="probar">Enviar prueba</button><button class="enlace" id="apagar">Desactivar</button></div></div><span class="chip ok">Activas</span></div>`
    : `<button class="item" id="activar">${ico.campana}<div class="cuerpo"><div class="titulo">Activar notificaciones</div>
        <div class="sub">${permiso === "denied" ? "Están bloqueadas: permítelas en los ajustes del navegador para este sitio." : "Recibe cada mañana lo que está por vencer o bajo el mínimo."}</div></div>
        <span class="chip ${permiso === "denied" ? "error" : "alerta"}">${permiso === "denied" ? "Bloqueadas" : "Apagadas"}</span></button>`;
  cont.innerHTML = `${opciones.compacto ? '<p class="eyebrow" style="margin-bottom:8px">Saca más provecho</p>' : ""}
    <div class="lista">${opciones.compacto && yaInstalada ? "" : filaInstalar}${opciones.compacto && activas ? "" : filaAvisos}</div>`;
  $("#instalar", cont)?.addEventListener("click", instalarApp);
  $("#activar", cont)?.addEventListener("click", (e) => conBoton(e.currentTarget, async () => {
    await activarNotificaciones(); aviso("Notificaciones activadas en este dispositivo."); refrescarDispositivo();
  }));
  $("#probar", cont)?.addEventListener("click", (e) => conBoton(e.currentTarget, async () => {
    await api("/api/notificaciones/probar", { metodo: "POST" }); aviso("Notificación de prueba enviada.");
  }));
  $("#apagar", cont)?.addEventListener("click", (e) => conBoton(e.currentTarget, async () => {
    await desactivarNotificaciones(); aviso("Notificaciones desactivadas."); refrescarDispositivo();
  }));
}

/* ---- Manual de uso (animado) ---- */
// Cada capítulo trae una escena animada en CSS (clases .man-*). Las animaciones solo corren mientras
// la escena está en pantalla y se apagan si el sistema pide reducir el movimiento.
const capitulosManual = [
  { id: "escanear", corto: "Escanear", titulo: "Identifica un producto",
    resumen: "Apunta la cámara al código de barras o a la etiqueta QR. Si no tiene código, toma una foto del nombre o búscalo a mano.",
    pasos: ["Toca <b>Escanear</b>.", "Apunta al código dentro del marco.", "Confirma que el producto que aparece es el correcto."],
    escena: `<div class="man-tel man-escaner"><div class="man-camara"><div class="man-codigo">${"<i></i>".repeat(14)}</div><div class="man-linea"></div></div>
      <div class="man-toast"><b>✓</b> ALB2 X 750 PRUEBAS</div></div>` },
  { id: "ingreso", corto: "Ingresos", titulo: "Registra lo que entra",
    resumen: "Cada ingreso guarda la fecha de vencimiento y el lote. Así Sinapsis sabe qué vence primero.",
    pasos: ["En el producto, toca <b>Registrar ingreso</b>.", "Escribe la fecha de vencimiento y las unidades que llegaron.", "Guarda. Los reactivos por pruebas se convierten solos: 2 kits de 750 = 1.500 pruebas."],
    escena: `<div class="man-tel man-form"><p class="man-tit">Registrar ingreso</p>
      <div class="man-campo"><span>Vence</span><i class="man-escribe" style="--d:.3s;--w:9ch">2027-03-31</i></div>
      <div class="man-campo"><span>Unidades (kits)</span><i class="man-escribe" style="--d:1.4s;--w:1ch">2</i></div>
      <p class="man-equiv">Suma 1.500 pruebas</p><div class="man-boton">Guardar ingreso</div><div class="man-toast">Ingreso guardado</div></div>` },
  { id: "pruebas", corto: "Pruebas", titulo: "Reactivos que se gastan por pruebas",
    resumen: "En los reactivos del laboratorio el inventario se lleva en pruebas, como en el listado: se pide cuando quedan pocas pruebas, no cuando se acaba el kit.",
    pasos: ["Cada kit suma sus pruebas (ALB2: 750 por kit).", "Haz un <b>Conteo físico</b> con las pruebas que quedan.", "Al bajar del umbral (150), el producto pasa a <b>Bajo el mínimo</b> y entra al próximo pedido."],
    escena: `<div class="man-tel man-pruebas"><p class="man-tit">ALB2 · pruebas disponibles</p>
      <div class="man-cifra"><b><span class="man-n1">1.500</span><span class="man-n2">620</span><span class="man-n3">120</span></b><small>pedir al quedar 150</small></div>
      <div class="man-barra"><i></i><em></em></div><div class="man-chip">Bajo el mínimo</div></div>` },
  { id: "alertas", corto: "Alertas", titulo: "Revisa las alertas",
    resumen: "El inicio y la pestaña Alertas muestran lo urgente: lotes vencidos, próximos a vencer, productos bajo el mínimo y lo que farmacia no ha entregado.",
    pasos: ["Mira las cifras del <b>Inicio</b> cada mañana.", "Toca una cifra para ver el detalle.", "Retira los lotes vencidos para que dejen de alertar."],
    escena: `<div class="man-tel man-kpis">${[["5", "Vencidos", "e"], ["8", "Por vencer", "a"], ["12", "Bajo mínimo", "a"], ["3", "Pendientes", "a"]]
      .map(([n, t, c], i) => `<div class="man-kpi ${c}" style="--i:${i}"><b>${n}</b><span>${t}</span></div>`).join("")}</div>` },
  { id: "pedido", corto: "Pedidos", titulo: "Pide a farmacia",
    resumen: "Sinapsis arma un borrador con lo que está en cero, bajo el mínimo o por vencer. Copias cada cód. farmacia al sistema interno, adjuntas el PDF enviado y, cuando llega, escaneas lo recibido. También puedes llenar el formato en blanco y subirlo.",
    pasos: ["En <b>Pedidos</b>, toca <b>Nuevo pedido sugerido</b>. Quita lo que no necesites.", "Toca el <b>cód. farmacia</b> para copiarlo y pegarlo en el sistema interno; ajusta las cantidades y adjunta el PDF.", "Al llegar, toca <b>Escanear lo que llegó</b>: se suma al inventario. Lo que falte queda pendiente."],
    escena: `<div class="man-tel man-flujo">${["Borrador", "Enviado · PDF", "Recibido"].map((t, i) => `<div class="man-paso" style="--i:${i}"><span>${i + 1}</span>${t}</div>`).join("")}</div>` },
  { id: "dispositivo", corto: "Instalar", titulo: "Instala la app y activa las notificaciones",
    resumen: "Instalada, Sinapsis abre desde su ícono como cualquier app. Con las notificaciones activas recibes cada mañana un resumen de las alertas.",
    pasos: ["Ve a <b>Más opciones → Este dispositivo</b>.", "Toca <b>Instalar la app</b> (en iPhone: Compartir → Agregar a inicio).", "Toca <b>Activar notificaciones</b> y acepta el permiso."],
    escena: `<div class="man-tel man-inicio"><div class="man-iconos">${"<i></i>".repeat(7)}<img src="assets/icono-192.png" alt=""></div>
      <div class="man-notif"><img src="assets/icono-192.png" alt=""><div><b>Sinapsis · Alertas de hoy</b><span>5 lotes vencidos · 12 bajo el mínimo</span></div></div></div>` },
];

function vistaManual(params) {
  const v = pintar({ titulo: "Manual de uso", atras: true, activo: "manual", contenido: `
    <div class="cabecera"><p class="eyebrow">Guía rápida</p><h1>Cómo usar Sinapsis</h1>
      <p class="small">Seis pasos para el día a día del laboratorio y la farmacia. Toca un tema para ir directo.</p></div>
    <div class="segmentos man-indice">${capitulosManual.map((c, i) => `<button data-ir="${c.id}">${i + 1}. ${c.corto}</button>`).join("")}</div>
    ${capitulosManual.map((c, i) => `
    <section class="tarjeta man-capitulo" id="man-${c.id}">
      <div class="man-texto pila"><p class="eyebrow">Paso ${i + 1} de ${capitulosManual.length}</p><h2>${c.titulo}</h2><p class="small">${c.resumen}</p>
        <ol class="pasos">${c.pasos.map((t) => `<li>${t}</li>`).join("")}</ol></div>
      <div class="man-escena" aria-hidden="true">${c.escena}</div>
    </section>`).join("")}
    <section class="tarjeta pila small"><p class="eyebrow">¿Más detalle?</p>
      <p>El manual completo, con la carga del catálogo y los usuarios, está en la documentación del proyecto (<span class="mono">docs/manual-usuario.md</span>). Si algo no funciona, avisa al administrador.</p></section>` });
  $$("[data-ir]", v).forEach((b) => (b.onclick = () => $(`#man-${b.dataset.ir}`, v).scrollIntoView({ behavior: "smooth", block: "start" })));
  const observador = new IntersectionObserver((entradas) => entradas.forEach((e) => e.target.classList.toggle("en-vista", e.isIntersecting)), { threshold: 0.3 });
  $$(".man-escena", v).forEach((e) => observador.observe(e));
  limpiarVista = () => observador.disconnect();
  if (params.get("ver")) setTimeout(() => $(`#man-${params.get("ver")}`, v)?.scrollIntoView({ block: "start" }), 50);
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
      case "manual": return vistaManual(params);
      case "configuracion": return esAdmin() ? vistaConfiguracion() : (location.hash = "#/");
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
