// =========================================
//  FICHA DE PRODUCTO
//  Funciona de dos formas:
//   - modelos/<id>/<color>.html  (páginas generadas, con su propia vista previa al compartir)
//   - producto.html?modelo=<id>&color=<color>  (la plantilla, sigue andando por si acaso)
//  El <id> es el campo "id" de cada modelo en data/productos.json
// =========================================

document.addEventListener("DOMContentLoaded", () => {

    // ── Estado ─────────────────────────────────────────
    let productos = [];
    let producto = null;
    let colorSeleccionado = "";
    let hebilla = "";

    const $ = id => document.getElementById(id);
    const params = new URLSearchParams(location.search);
    const idModelo = document.body.dataset.modelo || params.get("modelo");
    const colorPedido = document.body.dataset.color || params.get("color") || "";

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

            colorSeleccionado = colorInicial();
            iniciarPagina();
            actualizarUI();
            renderOtrosModelos();

            // Precargar las fotos de los otros colores para que el cambio sea instantáneo
            Object.values(producto.fotos).flat().forEach(src => { new Image().src = src; });
        });

    // El color de la dirección; si no hay, el de la foto de portada; si no, el primero.
    function colorInicial() {
        const colores = producto.colores;
        const porDireccion = colores.find(c => slug(c.nombre) === slug(colorPedido));
        if (porDireccion) return porDireccion.nombre;
        const dePortada = colores.find(c => (producto.fotos[c.nombre] || []).includes(producto.portada));
        return (dePortada || colores[0]).nombre;
    }

    // ── Datos fijos del modelo (se arman una vez) ─────
    function iniciarPagina() {
        document.querySelector('meta[name="description"]')
            .setAttribute("content", `${producto.nombre}, de cuero 100% vacuno, hecho a medida. Elegí color y hebilla.`);

        $("prodNombre").textContent = producto.nombre;
        $("precioProducto").textContent = formatearPrecio(producto.precio);
        $("prodAncho").textContent = textoAncho();

        // Hebillas desde el JSON
        const hebillas = producto.hebillas || ["Bronce", "Plateada"];
        $("hebillas").innerHTML = hebillas.map(h => `
            <label class="pill ${esc(slug(h))}">
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
        document.title = `${producto.nombre} ${colorSeleccionado} — La Cintería`;

        $("slides").innerHTML = `<img src="${esc(fotoActual())}" class="slide active"
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

    const fotoActual = () => producto.fotos[colorSeleccionado][0];
    const urlActual = () => new URL(urlModelo(producto.id, colorSeleccionado), document.baseURI).href;

    function textoAncho() {
        return typeof producto.paso === "number" ? `${producto.paso} cm` : String(producto.paso);
    }

    // Al elegir otro color, la dirección pasa a ser la de ese color:
    // así, si copian el link o lo comparten, la vista previa muestra ese cinto.
    function elegirColor(nombre) {
        colorSeleccionado = nombre;
        actualizarUI();
        if (location.protocol.startsWith("http")) history.replaceState(null, "", urlActual());
    }

    // ── Otros modelos ─────────────────────────────────
    function renderOtrosModelos() {
        const otros = productos.filter(p => p.id !== producto.id);
        if (!otros.length) return;
        $("otrosGrid").innerHTML = otros.map(p => `
            <a href="${urlModelo(p.id)}" class="otro-card">
                <img src="${esc(p.portada)}" alt="${esc(p.nombre)}" loading="lazy">
                <span class="otro-tipo">${esc(p.tipo)}</span>
                <span class="otro-nombre">${esc(p.titulo_tarjeta || `Paso ${p.paso} cm`)}</span>
            </a>`).join("");
        $("otrosModelos").hidden = false;
    }

    // ── Cambio de color: dots, flechas y deslizar ─────
    function moverColor(paso) {
        const colores = producto.colores;
        const i = colores.findIndex(c => c.nombre === colorSeleccionado);
        elegirColor(colores[(i + paso + colores.length) % colores.length].nombre);
    }

    $("dots").addEventListener("click", e => {
        const dot = e.target.closest(".dot");
        if (dot) elegirColor(dot.dataset.color);
    });
    $("btnAnterior").addEventListener("click", () => moverColor(-1));
    $("btnSiguiente").addEventListener("click", () => moverColor(1));

    const slider = document.querySelector(".slider");
    let startX = null;
    let huboArrastre = false;      // para que deslizar no abra el zoom
    const empezar = x => { startX = x; };
    const terminar = x => {
        if (startX === null || !producto) return;
        const dif = x - startX;
        startX = null;
        huboArrastre = Math.abs(dif) >= 10;
        if (Math.abs(dif) >= 40) moverColor(dif > 0 ? -1 : 1);
    };
    slider.addEventListener("touchstart", e => empezar(e.touches[0].clientX), { passive: true });
    slider.addEventListener("touchend", e => terminar(e.changedTouches[0].clientX));
    slider.addEventListener("mousedown", e => empezar(e.clientX));
    slider.addEventListener("mouseup", e => terminar(e.clientX));
    slider.addEventListener("mouseleave", () => { startX = null; });

    // ── Zoom de la foto ───────────────────────────────
    // Tocar la foto la abre en grande; ahí, tocar acerca (en el punto tocado)
    // y mover el mouse o el dedo recorre la foto. Tocar de nuevo aleja.
    const zoom = $("zoom");
    const zoomImg = $("zoomImg");

    function abrirZoom() {
        if (!producto) return;
        zoomImg.src = fotoActual();
        zoomImg.alt = `${producto.nombre} color ${colorSeleccionado}`;
        zoom.classList.remove("ampliada");
        zoom.hidden = false;
        document.body.style.overflow = "hidden";
        $("zoomCerrar").focus();
    }

    function cerrarZoom() {
        zoom.hidden = true;
        document.body.style.overflow = "";
        $("btnZoom").focus();
    }

    // Centra el acercamiento en el punto donde está el mouse o el dedo
    function enfocar(e) {
        const r = $("zoomMarco").getBoundingClientRect();
        const x = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100));
        const y = Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100));
        zoomImg.style.transformOrigin = `${x}% ${y}%`;
    }

    $("slides").addEventListener("click", () => {
        if (huboArrastre) { huboArrastre = false; return; }
        abrirZoom();
    });
    $("btnZoom").addEventListener("click", abrirZoom);
    $("zoomCerrar").addEventListener("click", cerrarZoom);
    zoom.addEventListener("click", e => { if (e.target === zoom) cerrarZoom(); });
    zoomImg.addEventListener("click", e => {
        enfocar(e);
        zoom.classList.toggle("ampliada");
    });
    zoomImg.addEventListener("pointermove", e => {
        if (zoom.classList.contains("ampliada")) enfocar(e);
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && !zoom.hidden) cerrarZoom();
    });

    // ── Compartir ─────────────────────────────────────
    $("btnCompartir").addEventListener("click", async () => {
        if (!producto) return;
        const datos = {
            title: `${producto.nombre} — La Cintería`,
            text: `Mirá este cinto: ${producto.nombre}, color ${colorSeleccionado}`,
            url: urlActual(),
        };
        if (navigator.share) {
            try { await navigator.share(datos); } catch { /* lo cancelaron */ }
            return;
        }
        try {
            await navigator.clipboard.writeText(datos.url);
            mostrarAviso("Link copiado. Ya lo podés pegar donde quieras.");
        } catch {
            window.open(`https://wa.me/?text=${encodeURIComponent(`${datos.text} ${datos.url}`)}`, "_blank");
        }
    });

    // =================================================
    //  VALIDACIONES (talle y hebilla)
    // =================================================
    const TALLE_MIN = 40;
    const TALLE_MAX = 200;

    function validarTalle() {
        const v = $("talle").value.trim();
        const n = Number(v);
        let msg = "";
        if (!v) msg = "Ingresá tu talle.";
        else if (!Number.isInteger(n)) msg = "Usá un número entero, sin comas.";
        else if (n < TALLE_MIN || n > TALLE_MAX) msg = `El talle tiene que estar entre ${TALLE_MIN} y ${TALLE_MAX} cm.`;

        $("err_talle").textContent = msg;
        $("talle").classList.toggle("invalido", !!msg);
        $("talle").setAttribute("aria-invalid", msg ? "true" : "false");
        return !msg;
    }

    function validarHebilla() {
        const msg = hebilla ? "" : "Elegí una hebilla.";
        $("err_hebilla").textContent = msg;
        return !msg;
    }

    $("talle").addEventListener("blur", () => { if ($("talle").value.trim()) validarTalle(); });
    $("talle").addEventListener("input", () => { if ($("talle").classList.contains("invalido")) validarTalle(); });

    $("hebillas").addEventListener("change", e => {
        if (e.target.name === "hebilla") {
            hebilla = e.target.value;
            validarHebilla();
        }
    });

    // =================================================
    //  CARRITO
    // =================================================
    function agregarAlCarrito() {
        if (!producto) return false;
        const talleOk = validarTalle();
        const hebillaOk = validarHebilla();
        if (!talleOk) { $("talle").focus(); return false; }
        if (!hebillaOk) { document.querySelector('#hebillas input')?.focus(); return false; }

        Carrito.agregar({
            modelo: producto.id,
            nombre: producto.nombre,
            ancho: textoAncho(),
            color: colorSeleccionado,
            hebilla,
            talle: Number($("talle").value),
            precio: producto.precio,
            foto: fotoActual(),
        });
        return true;
    }

    $("btnAgregar").addEventListener("click", () => {
        if (!agregarAlCarrito()) return;
        const n = Carrito.cantidadTotal();
        mostrarAviso(`✓ Agregado al carrito · <a href="carrito.html">Ver carrito (${n})</a>`);
    });

    $("btnComprarYa").addEventListener("click", () => {
        if (agregarAlCarrito()) location.href = new URL("carrito.html", document.baseURI).href;
    });
});
