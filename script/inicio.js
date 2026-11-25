// =========================================
//  INICIO — arma los modelos y la sección del puesto desde /data
// =========================================

// ── Tarjetas de modelos (data/productos.json) ─────────
fetch("data/productos.json")
    .then(res => res.json())
    .then(({ productos }) => {
        document.getElementById("modelosGrid").innerHTML = productos.map(p => {
            const titulo = p.tipo === "Especial" ? p.nombre : `Paso ${p.paso} cm`;
            return `
            <a href="producto.html?modelo=${encodeURIComponent(p.id)}" class="category-card">
                <div class="category-img">
                    <img src="${esc(p.portada)}" alt="${esc(p.nombre)}" loading="lazy" width="900" height="900">
                </div>
                <div class="category-body">
                    <span class="category-tipo">${esc(p.tipo)}</span>
                    <span class="category-title">${esc(titulo)}</span>
                    <span class="category-link">Ver colores <span>→</span></span>
                </div>
            </a>`;
        }).join("");
    })
    .catch(() => {
        document.getElementById("modelosGrid").innerHTML =
            `<p class="error-carga">No pudimos cargar los modelos. Probá recargar la página.</p>`;
    });

// ── Nosotros y puestos (data/puesto.json) ─────────────
// Lo que empieza con "COMPLETAR" se marca para que se note que falta cargarlo.
const pendiente = t => /^\s*COMPLETAR/i.test(t);
const texto = t => `<span class="${pendiente(t) ? "pendiente" : ""}">${esc(t)}</span>`;

fetch("data/puesto.json")
    .then(res => res.json())
    .then(info => {

        // Historia
        document.getElementById("historia").innerHTML =
            (info.historia || []).map(p => `<p class="${pendiente(p) ? "pendiente" : ""}">${esc(p)}</p>`).join("");

        // Qué hay en el puesto
        document.getElementById("enPuesto").innerHTML =
            (info.en_el_puesto || []).map(t => `<li>${esc(t)}</li>`).join("");

        // Instagram (solo si está cargado)
        if (info.instagram) {
            const ig = document.getElementById("linkInstagram");
            ig.href = info.instagram.startsWith("http")
                ? info.instagram
                : `https://instagram.com/${info.instagram.replace(/^@/, "")}`;
            ig.hidden = false;
        }

        // Galería: no repite la foto que ya está arriba en la portada
        const fotoPortada = document.querySelector(".hero-foto img").getAttribute("src");
        const fotos = (info.fotos || []).filter(f => f.src !== fotoPortada);
        const galeria = document.getElementById("galeriaPuesto");
        if (fotos.length) {
            galeria.classList.add(`fotos-${Math.min(fotos.length, 4)}`);
            galeria.innerHTML = fotos.map(f => `
                <a href="${esc(f.src)}" target="_blank" rel="noopener">
                    <img src="${esc(f.src)}" alt="${esc(f.alt || "Foto del puesto")}" loading="lazy">
                </a>`).join("");
        } else {
            galeria.remove();
            document.querySelector(".nosotros-grid").classList.add("sin-fotos");
        }

        // Puestos
        document.getElementById("puestos").innerHTML = (info.puestos || []).map(p => {
            const direccionOk = p.direccion && !pendiente(p.direccion);
            const q = encodeURIComponent(p.direccion || "");
            return `
            <article class="puesto-card">
                ${p.mapa && direccionOk ? `
                <iframe class="puesto-mapa" src="https://maps.google.com/maps?q=${q}&z=16&output=embed"
                    loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                    title="Mapa: ${esc(p.nombre)}"></iframe>` : ""}
                <div class="puesto-body">
                    <h3>${texto(p.nombre)}</h3>
                    <ul class="puesto-datos">
                        <li>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
                            ${texto(p.direccion)}
                        </li>
                        <li>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>
                            ${texto(p.dias)}
                        </li>
                        <li>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>
                            ${texto(p.horario)}
                        </li>
                    </ul>
                    ${p.nota ? `<p class="puesto-nota">${esc(p.nota)}</p>` : ""}
                    ${direccionOk ? `
                    <a class="btn btn-primario btn-chico" target="_blank" rel="noopener"
                       href="https://www.google.com/maps/search/?api=1&query=${q}">Cómo llegar</a>` : ""}
                </div>
            </article>`;
        }).join("");
    })
    .catch(() => {
        document.getElementById("puestos").innerHTML =
            `<p class="error-carga">No pudimos cargar la información del puesto.</p>`;
    });
