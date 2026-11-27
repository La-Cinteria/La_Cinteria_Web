// =========================================
//  LA CINTERÍA — código compartido por todas las páginas
// =========================================

// Número de WhatsApp (código de país + área + número, sin "+" ni espacios).
// Cambiándolo acá se actualiza en toda la web. 5492216365027
const NUMERO_WHATSAPP = "5492216365027";

// Se usa api.whatsapp.com y no wa.me: la redirección de wa.me rompe algunos emojis
// (aparecen como �), sobre todo en WhatsApp Web y en el de escritorio.
function linkWhatsApp(texto) {
    const base = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}`;
    return texto ? `${base}&text=${encodeURIComponent(texto)}` : base;
}

// El "instagram" de data/puesto.json puede ser "@usuario", "usuario" o el link completo.
function linkInstagram(valor) {
    valor = String(valor || "").trim();
    if (!valor) return "";
    return valor.startsWith("http") ? valor : `https://instagram.com/${valor.replace(/^@/, "")}`;
}

// "18000" -> "$18.000". Si el precio no es un número (ej. "Consultar"), se muestra tal cual.
function formatearPrecio(precio) {
    return typeof precio === "number"
        ? "$" + precio.toLocaleString("es-AR")
        : String(precio).trim();
}

// Evita que texto del JSON se interprete como HTML.
function esc(texto) {
    return String(texto)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// "Negro cocido con amarillo" -> "negro-cocido-con-amarillo" (para armar direcciones).
// Tiene que dar lo mismo que la función slug() de herramientas/generar-modelos.js
function slug(texto) {
    return String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Dirección de la página de un modelo (y color, si se indica), relativa a la raíz del sitio.
function urlModelo(id, color) {
    return `modelos/${encodeURIComponent(id)}/${color ? `${slug(color)}.html` : ""}`;
}

// Completa todos los links marcados con data-wa (botones, footer, flotante).
function actualizarLinksWhatsApp(texto) {
    document.querySelectorAll("[data-wa]").forEach(a => {
        a.href = linkWhatsApp(texto ?? a.dataset.wa);
        a.target = "_blank";
        a.rel = "noopener";
    });
}

// Muestra un cartelito abajo de la pantalla por unos segundos. `html` puede incluir un link.
let avisoTimer;
function mostrarAviso(html) {
    let aviso = document.getElementById("aviso");
    if (!aviso) {
        aviso = document.createElement("div");
        aviso.id = "aviso";
        aviso.className = "aviso";
        aviso.setAttribute("role", "status");
        document.body.appendChild(aviso);
    }
    aviso.innerHTML = html;
    aviso.classList.remove("visible");
    void aviso.offsetWidth;            // reinicia la animación si ya estaba visible
    aviso.classList.add("visible");
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => aviso.classList.remove("visible"), 5000);
}

// =========================================
//  CARRITO — se guarda en el navegador del cliente (localStorage)
// =========================================
const Carrito = (() => {
    const CLAVE = "cinteria_carrito";
    const MAX_CANT = 10;

    function leer() {
        try {
            const items = JSON.parse(localStorage.getItem(CLAVE));
            return Array.isArray(items) ? items : [];
        } catch {
            return [];
        }
    }

    function guardar(items) {
        try {
            localStorage.setItem(CLAVE, JSON.stringify(items));
        } catch { /* navegador sin almacenamiento: el carrito dura hasta recargar */ }
        actualizarContador(items);
    }

    // Mismo modelo, color, hebilla y talle = mismo renglón (se suma la cantidad).
    const mismaCombinacion = (a, b) =>
        a.modelo === b.modelo && a.color === b.color && a.hebilla === b.hebilla && a.talle === b.talle;

    function agregar(item) {
        const items = leer();
        const existente = items.find(i => mismaCombinacion(i, item));
        if (existente) existente.cant = Math.min(existente.cant + 1, MAX_CANT);
        else items.push({ ...item, cant: 1 });
        guardar(items);
    }

    function cambiarCantidad(indice, cant) {
        const items = leer();
        if (!items[indice]) return;
        items[indice].cant = Math.max(1, Math.min(cant, MAX_CANT));
        guardar(items);
    }

    function quitar(indice) {
        const items = leer();
        items.splice(indice, 1);
        guardar(items);
    }

    const vaciar = () => guardar([]);
    const cantidadTotal = (items = leer()) => items.reduce((s, i) => s + i.cant, 0);

    function actualizarContador(items = leer()) {
        const n = cantidadTotal(items);
        document.querySelectorAll("[data-carrito-cant]").forEach(el => {
            el.textContent = n;
            el.hidden = n === 0;
        });
        document.querySelectorAll(".carrito-btn").forEach(a => {
            a.setAttribute("aria-label", n ? `Ver carrito (${n} ${n === 1 ? "cinto" : "cintos"})` : "Ver carrito");
        });
    }

    // Si el carrito cambia en otra pestaña, actualizar el contador
    window.addEventListener("storage", e => { if (e.key === CLAVE) actualizarContador(); });

    return { leer, agregar, cambiarCantidad, quitar, vaciar, cantidadTotal, actualizarContador, MAX_CANT };
})();

document.addEventListener("DOMContentLoaded", () => {
    actualizarLinksWhatsApp();
    Carrito.actualizarContador();
    document.querySelectorAll("[data-anio]").forEach(el => el.textContent = new Date().getFullYear());
});
