document.addEventListener("DOMContentLoaded", () => {
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const NUMERO_WHATSAPP = "5491157270544";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Estado global
let productos = [];
let productoActivo = null;
let colorSeleccionado = "";
let fotoIndex = 0;

let talle = "";
// ── Capturar talle ─────────────────────────────
document.addEventListener("input", function(e){
    if(e.target.id === "talle"){
        talle = e.target.value;
    }
});

let hebilla = "";
// ── Capturar hebilla ───────────────────────────
document.addEventListener("change", function(e){
    if(e.target.name === "hebilla"){
        hebilla = e.target.value;
    }
});

// Leer paso desde URL
const grupo = document.body.dataset.grupo;
const pasoNum = parseFloat(document.body.dataset.grupo);
const slides = document.getElementById("slides");
const dots = document.getElementById("dots");
// ── Cargar productos ──────────────────────────────
fetch("./data/productos.json")
.then(res => res.json())
.then(data => {

    productos = data.productos.filter(p => parseFloat(p.grupo) === pasoNum);

    if(productos.length === 0) return;

    productoActivo = productos[0];

    colorSeleccionado = productoActivo.colores[0].nombre;

    actualizarUI();

});

// ── Actualizar UI según estado ─────────────────────
function actualizarUI() {
    const colores = productoActivo.colores;
    const fotos = productoActivo.fotos[colorSeleccionado];

    // TEXTO PRODUCTO 
    document.getElementById("prodNombre").textContent = productoActivo.nombre;
    document.getElementById("precioProducto").innerHTML = "<strong>Precio:</strong> $" + productoActivo.precio;
    if (productoActivo.paso == "Especial"){
        document.getElementById("prodAncho").textContent = productoActivo.paso
    }
    else{
        document.getElementById("prodAncho").textContent = productoActivo.paso + " cm";
    }
    

    // IMAGEN
    slides.innerHTML = `
    <img src="${fotos[fotoIndex]}" class="slide active">
    `;

    // DOTS (uno por color)
    dots.innerHTML = colores.map(c => `
    <span 
        class="dot ${c.nombre === colorSeleccionado ? 'activo' : ''}"
        style="background:${c.hex}"
        onclick="cambiarColor('${c.nombre}')"
    ></span>
    `).join("");
}
// ── Acciones carrusel ──────────────────────────────
function anteriorFoto() {
    const total = (productoActivo?.fotos[colorSeleccionado] || []).length;
    fotoIndex = (fotoIndex - 1 + total) % total;
    actualizarUI();
}
function siguienteFoto() {
    const total = (productoActivo?.fotos[colorSeleccionado] || []).length;
    fotoIndex = (fotoIndex + 1) % total;
    actualizarUI();
}
function setFoto(i) {
    fotoIndex = i;
    actualizarUI();
}
// ── Cambiar color ──────────────────────────────────
function cambiarColor(color){
  colorSeleccionado = color;
  actualizarUI();
}
window.cambiarColor = cambiarColor;
// ── Cambiar producto ───────────────────────────────
function cambiarProducto(grupo) {
    productoActivo = productos.find(p => p.grupo === grupo);
    colorSeleccionado = productoActivo.colores[0].nombre;
    hebilla = "";
    fotoIndex = 0;
    renderPagina();
}
// ── Modal ──────────────────────────────────────────
function abrirModal() {
    // Validar talle y hebilla antes de abrir
    if (!talle) {
        alert("Ingresá tu talle antes de comprar");
        return;
    }

    if (!hebilla) {
        alert("Seleccioná una hebilla antes de comprar");
        return;
    }
    // Resumen
    document.getElementById("pedidoResumen").innerHTML = `
    <p><strong>Tu pedido:</strong></p>
    <p>${productoActivo.nombre} • ${colorSeleccionado} • Hebilla: ${hebilla} • Su talle: ${talle} cm</p>
    <p class="resumen-precio">$${productoActivo.precio.toLocaleString("es-AR")}</p>
    `;
    document.getElementById("modal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

document.getElementById("cerrarModal").onclick = () => {
    document.getElementById("modal").style.display = "none";
    document.body.style.overflow = "";
};

document.getElementById("modal").addEventListener("click", function(e) {
    if (e.target === this) {
    this.style.display = "none";
    document.body.style.overflow = "";
    }
});

// ── Eventos de botones ─────────────────────────
document.getElementById("btn-comprar")
.addEventListener("click", abrirModal);

// ── Validar y enviar WhatsApp ──────────────────────
document.getElementById("btnEnviar").onclick = () => {
    const foto = document.querySelector(".slide.active")?.src || "";
    const campos = {
    nombre:   document.getElementById("f_nombre").value.trim(),
    dni:      document.getElementById("f_dni").value.trim(),
    telefono: document.getElementById("f_telefono").value.trim(),
    calle:    document.getElementById("f_calle").value.trim(),
    numero:   document.getElementById("f_numero").value.trim(),
    piso:     document.getElementById("f_piso").value.trim(),
    localidad:document.getElementById("f_localidad").value.trim(),
    provincia:document.getElementById("f_provincia").value.trim(),
    cp:       document.getElementById("f_cp").value.trim(),
    };
    let valido = true;
    const requeridos = ["nombre","dni","telefono","calle","numero","localidad","provincia","cp"];
    requeridos.forEach(k => {
    const err = document.getElementById(`err_${k}`);
    if (!campos[k]) {
        if (err) err.textContent = "Requerido";
        valido = false;
    } else {
        if (err) err.textContent = "";
    }
    });
    const avisoTA = document.getElementById("avisoTalleHebilla");
    if (!talle || !hebilla) {
    avisoTA.style.display = "block";
    valido = false;
    } else {
    avisoTA.style.display = "none";
    }
    if (!valido) return;
    const msg = encodeURIComponent(
    `🛍️ *NUEVO PEDIDO - La Cintería*\n\n` +
    `*Cinto:* ${productoActivo.nombre}\n` +
    `*Color:* ${colorSeleccionado}\n` +
    `*Precio:* $${productoActivo.precio.toLocaleString("es-AR")}\n` +
    `*Ancho:* ${productoActivo.paso} cm\n` +
    `*Talle:* ${talle} cm\n` +
    `*Hebilla:* ${hebilla}\n\n` +
    `📷 *Foto del producto:* ${foto}\n\n` +
    `📦 *Datos de envío:*\n` +
    `*Nombre:* ${campos.nombre}\n` +
    `*DNI:* ${campos.dni}\n` +
    `*Teléfono:* ${campos.telefono}\n` +
    `*Dirección:* ${campos.calle} ${campos.numero}${campos.piso ? ` Piso/Depto: ${campos.piso}` : ""}\n` +
    `*Localidad:* ${campos.localidad}\n` +
    `*Provincia:* ${campos.provincia}\n` +
    `*Código Postal:* ${campos.cp}`
    );
    window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${msg}`, "_blank");
};
});