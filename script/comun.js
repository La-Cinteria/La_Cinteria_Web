// =========================================
//  LA CINTERÍA — código compartido por todas las páginas
// =========================================

// Número de WhatsApp (código de país + área + número, sin "+" ni espacios).
// Cambiándolo acá se actualiza en toda la web.
const NUMERO_WHATSAPP = "5491157270544";

function linkWhatsApp(texto) {
    const base = `https://wa.me/${NUMERO_WHATSAPP}`;
    return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
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

// Completa todos los links marcados con data-wa (botones, footer, flotante).
function actualizarLinksWhatsApp(texto) {
    document.querySelectorAll("[data-wa]").forEach(a => {
        a.href = linkWhatsApp(texto ?? a.dataset.wa);
        a.target = "_blank";
        a.rel = "noopener";
    });
}

document.addEventListener("DOMContentLoaded", () => {
    actualizarLinksWhatsApp();
    document.querySelectorAll("[data-anio]").forEach(el => el.textContent = new Date().getFullYear());
});
