// =========================================
//  CARRITO — lista de cintos elegidos + datos de envío + pedido por WhatsApp
// =========================================

document.addEventListener("DOMContentLoaded", () => {

    const $ = id => document.getElementById(id);

    // ── Mostrar la lista ──────────────────────────────
    function render() {
        const items = Carrito.leer();
        const vacio = items.length === 0;
        $("carritoLayout").hidden = vacio;
        $("carritoVacio").hidden = !vacio || !$("pedidoEnviado").hidden;
        if (vacio) return;

        $("listaItems").innerHTML = items.map((it, i) => {
            const link = urlModelo(it.modelo, it.color);
            const precio = typeof it.precio === "number"
                ? formatearPrecio(it.precio * it.cant) + (it.cant > 1 ? ` <small>(${formatearPrecio(it.precio)} c/u)</small>` : "")
                : esc(formatearPrecio(it.precio));
            return `
            <li class="item">
                <a href="${link}" class="item-foto"><img src="${esc(it.foto)}" alt="" width="92" height="92"></a>
                <div>
                    <a href="${link}" class="item-nombre">${esc(it.nombre)}</a>
                    <p class="item-detalle">
                        Color ${esc(it.color.charAt(0).toUpperCase() + it.color.slice(1))} · Hebilla ${esc(it.hebilla)} · Talle ${esc(it.talle)} cm
                    </p>
                    <p class="item-precio">${precio}</p>
                </div>
                <div class="item-acciones">
                    <div class="cantidad" role="group" aria-label="Cantidad">
                        <button type="button" data-accion="menos" data-i="${i}" aria-label="Uno menos" ${it.cant <= 1 ? "disabled" : ""}>−</button>
                        <output aria-live="polite">${it.cant}</output>
                        <button type="button" data-accion="mas" data-i="${i}" aria-label="Uno más" ${it.cant >= Carrito.MAX_CANT ? "disabled" : ""}>+</button>
                    </div>
                    <button type="button" class="btn-quitar" data-accion="quitar" data-i="${i}">Quitar</button>
                </div>
            </li>`;
        }).join("");

        const { total, aConsultar } = calcularTotal(items);
        $("total").textContent = formatearPrecio(total);
        $("totalNota").hidden = !aConsultar;
        $("totalNota").textContent = aConsultar
            ? "Algunos modelos son a consultar: te pasamos el precio final por WhatsApp."
            : "";
    }

    function calcularTotal(items) {
        let total = 0, aConsultar = false;
        items.forEach(it => {
            if (typeof it.precio === "number") total += it.precio * it.cant;
            else aConsultar = true;
        });
        return { total, aConsultar };
    }

    $("listaItems").addEventListener("click", e => {
        const boton = e.target.closest("[data-accion]");
        if (!boton) return;
        const i = Number(boton.dataset.i);
        const item = Carrito.leer()[i];
        if (!item) return;

        if (boton.dataset.accion === "mas") Carrito.cambiarCantidad(i, item.cant + 1);
        if (boton.dataset.accion === "menos") Carrito.cambiarCantidad(i, item.cant - 1);
        if (boton.dataset.accion === "quitar") Carrito.quitar(i);
        render();

        // Mantener el foco en el mismo botón después de redibujar
        document.querySelector(`[data-accion="${boton.dataset.accion}"][data-i="${i}"]:not(:disabled)`)?.focus();
    });

    // Si agregan cintos en otra pestaña, actualizar
    window.addEventListener("storage", render);

    render();

    // Botón de Instagram para la pantalla de "pedido enviado" (solo si está cargado en puesto.json)
    fetch("data/puesto.json")
        .then(res => res.json())
        .then(info => {
            const url = linkInstagram(info.instagram);
            if (!url) return;
            $("linkInstagram").href = url;
            $("bloqueInstagram").hidden = false;
        })
        .catch(() => { /* sin Instagram, no pasa nada */ });

    // =================================================
    //  VALIDACIONES
    // =================================================
    const soloDigitos = v => v.replace(/\D/g, "");

    // Cada regla devuelve "" si está bien, o el mensaje de error.
    const reglas = {
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

    const campos = Object.keys(reglas);
    const inputDe = k => $(`f_${k}`);
    const valorDe = k => inputDe(k).value.trim();

    function validarCampo(k) {
        const msg = reglas[k](valorDe(k));
        const input = inputDe(k);
        $(`err_${k}`).textContent = msg;
        input.classList.toggle("invalido", !!msg);
        input.setAttribute("aria-invalid", msg ? "true" : "false");
        return !msg;
    }

    // Validar al salir del campo; si ya tenía error, revalidar mientras escribe
    campos.forEach(k => {
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

    // =================================================
    //  ENVIAR POR WHATSAPP
    // =================================================
    // Número corto para identificar el pedido en la charla (ej. "LC-4K7Q"): sale de la fecha y hora.
    const numeroPedido = () => "LC-" + Date.now().toString(36).slice(-5).toUpperCase();

    // Sin emojis a propósito: algunos WhatsApp los muestran como "�".
    // *texto* = negrita en WhatsApp.
    function armarMensaje(items, d) {
        const { total, aConsultar } = calcularTotal(items);
        const cantidad = Carrito.cantidadTotal(items);
        const mayus = t => t.charAt(0).toUpperCase() + t.slice(1);

        const lineasCintos = items.map((it, i) => {
            let precio = formatearPrecio(typeof it.precio === "number" ? it.precio * it.cant : it.precio);
            if (typeof it.precio === "number" && it.cant > 1) precio += ` (${formatearPrecio(it.precio)} c/u)`;
            return (
                `*${i + 1}. ${it.nombre}*${it.cant > 1 ? ` (x${it.cant})` : ""}\n` +
                `${mayus(it.color)} · Hebilla ${it.hebilla.toLowerCase()} · Talle ${it.talle} cm\n` +
                precio
            );
        }).join("\n\n");

        const direccion = `${d.calle} ${d.numero.toUpperCase()}${d.piso ? `, ${d.piso}` : ""}`;

        return (
            `¡Hola! Quiero hacer este pedido:\n\n` +
            `*Pedido ${numeroPedido()}*\n\n` +
            `${lineasCintos}\n\n` +
            `*TOTAL: ${formatearPrecio(total)}*` +
            `${aConsultar ? " + modelos a consultar" : ""}` +
            ` (${cantidad} ${cantidad === 1 ? "cinto" : "cintos"})\n\n` +
            `*Datos para el envío*\n` +
            `${d.nombre}\n` +
            `DNI ${soloDigitos(d.dni)} · Tel. ${d.telefono}\n` +
            `${direccion}\n` +
            `${d.localidad} (CP ${d.cp.toUpperCase()}), ${d.provincia}\n\n` +
            `¿Me confirman el pedido y cómo sigo con el pago? ¡Gracias!`
        );
    }

    $("formPedido").addEventListener("submit", e => {
        e.preventDefault();

        const items = Carrito.leer();
        if (!items.length) { render(); return; }

        const invalidos = campos.filter(k => !validarCampo(k));
        if (invalidos.length) {
            const primero = inputDe(invalidos[0]);
            primero.focus();
            primero.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        const datos = Object.fromEntries(campos.map(k => [k, valorDe(k)]));
        const link = linkWhatsApp(armarMensaje(items, datos));
        window.open(link, "_blank");

        // Pedido enviado: vaciar el carrito y dejar a mano el link por si WhatsApp no se abrió
        $("reabrirWhatsApp").href = link;
        $("pedidoEnviado").hidden = false;
        Carrito.vaciar();
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});
