// =========================================
//  PÁGINA DE PRODUCTO — producto.html?modelo=<id>
//  El <id> es el campo "id" de cada modelo en data/productos.json
// =========================================

document.addEventListener("DOMContentLoaded", () => {

    // ── Estado ─────────────────────────────────────────
    let productos = [];
    let producto = null;
    let colorSeleccionado = "";
    let hebilla = "";

    const $ = id => document.getElementById(id);
    const idModelo = new URLSearchParams(location.search).get("modelo");

    // ── Cargar productos ──────────────────────────────
    fetch("data/productos.json")
        .then(res => res.json())
        .then(data => {
            productos = data.productos;
            producto = productos.find(p => p.id === idModelo);

            if (!producto) {
                $("productoLayout").hidden = true;
                $("noEncontrado").hidden = false;
                $("prodNombre").textContent = "Modelo no encontrado";
                return;
            }

            colorSeleccionado = producto.colores[0].nombre;
            iniciarPagina();
            actualizarUI();
            renderOtrosModelos();

            // Precargar las fotos de los otros colores para que el cambio sea instantáneo
            Object.values(producto.fotos).flat().forEach(src => { new Image().src = src; });
        });

    // ── Datos fijos del modelo (se arman una vez) ─────
    function iniciarPagina() {
        document.title = `${producto.nombre} — La Cintería`;
        document.querySelector('meta[name="description"]')
            .setAttribute("content", `${producto.nombre}, de cuero 100% vacuno, hecho a medida. Elegí color y hebilla.`);

        $("prodNombre").textContent = producto.nombre;
        $("precioProducto").textContent = formatearPrecio(producto.precio);
        $("prodAncho").textContent = textoAncho();

        // Hebillas desde el JSON
        const hebillas = producto.hebillas || ["Bronce", "Plateada"];
        $("hebillas").innerHTML = hebillas.map(h => `
            <label class="pill ${esc(h.toLowerCase())}">
                <input type="radio" name="hebilla" value="${esc(h)}">
                <span>${esc(h)}</span>
            </label>`).join("");

        // El WhatsApp flotante pregunta por este modelo
        $("waFlotante").dataset.wa = `¡Hola! Quería hacer una consulta sobre el ${producto.nombre}.`;
        actualizarLinksWhatsApp();
    }

    // ── Lo que cambia al elegir color ─────────────────
    function actualizarUI() {
        $("prodColor").textContent = colorSeleccionado;

        $("slides").innerHTML = `<img src="${esc(producto.fotos[colorSeleccionado][0])}" class="slide active"
            alt="${esc(producto.nombre)} color ${esc(colorSeleccionado)}" draggable="false">`;

        $("dots").innerHTML = producto.colores.map(c => `
            <button type="button"
                class="dot ${c.nombre === colorSeleccionado ? "activo" : ""}"
                style="background:${esc(c.hex)}"
                title="${esc(c.nombre)}"
                aria-label="Color ${esc(c.nombre)}"
                aria-pressed="${c.nombre === colorSeleccionado}"
                data-color="${esc(c.nombre)}"></button>`).join("");
    }

    function textoAncho() {
        return typeof producto.paso === "number" ? `${producto.paso} cm` : String(producto.paso);
    }

    // ── Otros modelos ─────────────────────────────────
    function renderOtrosModelos() {
        const otros = productos.filter(p => p.id !== producto.id);
        if (!otros.length) return;
        $("otrosGrid").innerHTML = otros.map(p => `
            <a href="producto.html?modelo=${encodeURIComponent(p.id)}" class="otro-card">
                <img src="${esc(p.portada)}" alt="${esc(p.nombre)}" loading="lazy">
                <span class="otro-tipo">${esc(p.tipo)}</span>
                <span class="otro-nombre">${esc(p.tipo === "Especial" ? p.nombre : `Paso ${p.paso} cm`)}</span>
            </a>`).join("");
        $("otrosModelos").hidden = false;
    }

    // ── Cambio de color: dots, flechas y deslizar ─────
    function moverColor(paso) {
        const colores = producto.colores;
        const i = colores.findIndex(c => c.nombre === colorSeleccionado);
        colorSeleccionado = colores[(i + paso + colores.length) % colores.length].nombre;
        actualizarUI();
    }

    $("dots").addEventListener("click", e => {
        const dot = e.target.closest(".dot");
        if (!dot) return;
        colorSeleccionado = dot.dataset.color;
        actualizarUI();
    });
    $("btnAnterior").addEventListener("click", () => moverColor(-1));
    $("btnSiguiente").addEventListener("click", () => moverColor(1));

    const slider = document.querySelector(".slider");
    let startX = null;
    const empezar = x => { startX = x; };
    const terminar = x => {
        if (startX === null || !producto) return;
        const dif = x - startX;
        startX = null;
        if (Math.abs(dif) >= 40) moverColor(dif > 0 ? -1 : 1);
    };
    slider.addEventListener("touchstart", e => empezar(e.touches[0].clientX), { passive: true });
    slider.addEventListener("touchend", e => terminar(e.changedTouches[0].clientX));
    slider.addEventListener("mousedown", e => empezar(e.clientX));
    slider.addEventListener("mouseup", e => terminar(e.clientX));
    slider.addEventListener("mouseleave", () => { startX = null; });

    // =================================================
    //  VALIDACIONES
    // =================================================
    const TALLE_MIN = 40;
    const TALLE_MAX = 200;

    const soloDigitos = v => v.replace(/\D/g, "");

    // Cada regla devuelve "" si está bien, o el mensaje de error.
    const reglas = {
        talle: v => {
            if (!v) return "Ingresá tu talle.";
            const n = Number(v);
            if (!Number.isInteger(n)) return "Usá un número entero, sin comas.";
            if (n < TALLE_MIN || n > TALLE_MAX) return `El talle tiene que estar entre ${TALLE_MIN} y ${TALLE_MAX} cm.`;
            return "";
        },
        nombre: v => {
            if (!v) return "Ingresá tu nombre y apellido.";
            if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(v)) return "Usá solo letras.";
            if (v.split(/\s+/).filter(Boolean).length < 2) return "Ingresá nombre y apellido.";
            return "";
        },
        dni: v => {
            if (!v) return "Ingresá tu DNI.";
            if (!/^[\d.\s]+$/.test(v)) return "Usá solo números.";
            const d = soloDigitos(v);
            if (d.length < 7 || d.length > 8) return "El DNI tiene 7 u 8 números.";
            return "";
        },
        telefono: v => {
            if (!v) return "Ingresá tu teléfono.";
            if (!/^[\d\s()+-]+$/.test(v)) return "Usá solo números.";
            const d = soloDigitos(v);
            if (d.length < 8 || d.length > 13) return "Revisá el número (con código de área, ej: 11 1234-5678).";
            return "";
        },
        calle: v => {
            if (!v) return "Ingresá la calle.";
            if (v.length < 2) return "Revisá la calle.";
            return "";
        },
        numero: v => {
            if (!v) return "Ingresá el número.";
            if (!/^\d{1,5}$/.test(v) && !/^s\/?n$/i.test(v)) return "Solo números, o S/N.";
            return "";
        },
        piso: v => v.length > 15 ? "Demasiado largo." : "",
        localidad: v => {
            if (!v) return "Ingresá la localidad.";
            if (v.length < 2) return "Revisá la localidad.";
            return "";
        },
        provincia: v => v ? "" : "Elegí la provincia.",
        cp: v => {
            if (!v) return "Ingresá el código postal.";
            // 4 números (1414) o el formato nuevo (C1414ABC)
            if (!/^\d{4}$/.test(v) && !/^[A-Za-z]\d{4}[A-Za-z]{3}$/.test(v)) return "Usá 4 números (ej: 1414) o el formato C1414ABC.";
            return "";
        },
    };

    const camposForm = ["nombre", "dni", "telefono", "calle", "numero", "piso", "localidad", "provincia", "cp"];
    const inputDe = k => k === "talle" ? $("talle") : $(`f_${k}`);
    const valorDe = k => inputDe(k).value.trim();

    function validarCampo(k) {
        const msg = reglas[k](valorDe(k));
        const input = inputDe(k);
        $(`err_${k}`).textContent = msg;
        input.classList.toggle("invalido", !!msg);
        input.setAttribute("aria-invalid", msg ? "true" : "false");
        return !msg;
    }

    function validarHebilla() {
        const msg = hebilla ? "" : "Elegí una hebilla.";
        $("err_hebilla").textContent = msg;
        return !msg;
    }

    // Validar al salir del campo; si ya tenía error, revalidar mientras escribe
    ["talle", ...camposForm].forEach(k => {
        const input = inputDe(k);
        input.addEventListener("blur", () => { if (input.value.trim()) validarCampo(k); });
        input.addEventListener(k === "provincia" ? "change" : "input", () => {
            if (input.classList.contains("invalido")) validarCampo(k);
        });
    });

    // El DNI solo acepta números al escribir
    $("f_dni").addEventListener("input", e => {
        e.target.value = soloDigitos(e.target.value).slice(0, 8);
    });

    $("hebillas").addEventListener("change", e => {
        if (e.target.name === "hebilla") {
            hebilla = e.target.value;
            validarHebilla();
        }
    });

    // =================================================
    //  MODAL
    // =================================================
    function abrirModal() {
        const talleOk = validarCampo("talle");
        const hebillaOk = validarHebilla();
        if (!talleOk) { $("talle").focus(); return; }
        if (!hebillaOk) return;

        $("pedidoResumen").innerHTML = `
            <p><strong>Tu pedido</strong></p>
            <p>${esc(producto.nombre)} · Color ${esc(colorSeleccionado)} · Hebilla ${esc(hebilla)} · Talle ${esc(valorDe("talle"))} cm</p>
            <p class="resumen-precio">${esc(formatearPrecio(producto.precio))}</p>`;

        $("modal").hidden = false;
        document.body.style.overflow = "hidden";
        setTimeout(() => $("f_nombre").focus(), 50);
    }

    function cerrarModal() {
        $("modal").hidden = true;
        document.body.style.overflow = "";
        $("btn-comprar").focus();
    }

    $("btn-comprar").addEventListener("click", abrirModal);
    $("cerrarModal").addEventListener("click", cerrarModal);
    $("modal").addEventListener("click", e => { if (e.target === e.currentTarget) cerrarModal(); });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && !$("modal").hidden) cerrarModal();
    });

    // =================================================
    //  ENVIAR POR WHATSAPP
    // =================================================
    $("formPedido").addEventListener("submit", e => {
        e.preventDefault();

        const invalidos = camposForm.filter(k => !validarCampo(k));
        if (invalidos.length) {
            const primero = inputDe(invalidos[0]);
            primero.focus();
            primero.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        const d = Object.fromEntries(camposForm.map(k => [k, valorDe(k)]));
        const foto = document.querySelector(".slide.active")?.src || "";

        const msg =
            `🛍️ *NUEVO PEDIDO - La Cintería*\n\n` +
            `*Cinto:* ${producto.nombre}\n` +
            `*Color:* ${colorSeleccionado}\n` +
            `*Precio:* ${formatearPrecio(producto.precio)}\n` +
            `*Ancho:* ${textoAncho()}\n` +
            `*Talle:* ${valorDe("talle")} cm\n` +
            `*Hebilla:* ${hebilla}\n\n` +
            `📷 *Foto del producto:* ${foto}\n\n` +
            `📦 *Datos de envío:*\n` +
            `*Nombre:* ${d.nombre}\n` +
            `*DNI:* ${soloDigitos(d.dni)}\n` +
            `*Teléfono:* ${d.telefono}\n` +
            `*Dirección:* ${d.calle} ${d.numero.toUpperCase()}${d.piso ? `, Piso/Depto: ${d.piso}` : ""}\n` +
            `*Localidad:* ${d.localidad}\n` +
            `*Provincia:* ${d.provincia}\n` +
            `*Código Postal:* ${d.cp.toUpperCase()}`;

        window.open(linkWhatsApp(msg), "_blank");
    });
});
