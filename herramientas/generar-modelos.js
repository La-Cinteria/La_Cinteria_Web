// =========================================
//  GENERADOR DE PÁGINAS DE MODELOS
//
//  Para qué sirve: cuando alguien comparte el link de un cinto por WhatsApp,
//  Instagram o Facebook, la vista previa (foto, título y precio) sale de la
//  página HTML tal cual está guardada; esas apps no ejecutan el JavaScript.
//  Por eso cada cinto, y cada color, necesita su propia página.
//
//  Este script toma producto.html como plantilla y data/productos.json, y crea:
//    modelos/<id>/index.html          -> el modelo (vista previa con la foto de portada)
//    modelos/<id>/<color>.html        -> cada color (vista previa con la foto de ese color)
//    image/og/*.jpg                   -> las fotos de vista previa en .jpg (WhatsApp no siempre muestra .webp)
//    sitemap.xml                      -> la lista de páginas para Google
//  Además, cada página lleva la "ficha de producto" para Google (nombre, foto y precio).
//
//  NORMALMENTE NO HACE FALTA CORRERLO A MANO: al subir cambios a GitHub, la
//  automatización de .github/workflows/generar-modelos.yml lo corre sola y guarda
//  el resultado. (Después de eso, hacé "git pull" antes de seguir trabajando.)
//
//  Si querés correrlo en tu compu para ver el resultado antes de subir:
//      node herramientas/generar-modelos.js
//
//  Las fotos .jpg se crean con lo que trae Windows; en Linux (GitHub) se usa la
//  librería "sharp". Si no hay ninguna de las dos, se usan las .webp tal cual.
// =========================================

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

// Dirección pública del sitio (con "/" al final). Si algún día cambia (dominio propio), cambiala acá.
const SITIO = "https://la-cinteria.github.io/La_Cinteria_Web/";
const MARCA = "La Cintería";

const RAIZ = path.join(__dirname, "..");
const CARPETA_MODELOS = path.join(RAIZ, "modelos");
const CARPETA_OG = path.join(RAIZ, "image", "og");
const REGISTRO_OG = path.join(CARPETA_OG, "origenes.json");   // de qué versión de cada foto salió cada .jpg
const LADO_MAX_OG = 800;      // px del lado más largo de la foto de vista previa
const CALIDAD_OG = 82;

// Tiene que dar lo mismo que slug() de script/comun.js
const slug = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const escAttr = t => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mayuscula = t => t.charAt(0).toUpperCase() + t.slice(1);
const precioTexto = p => typeof p === "number" ? "$" + p.toLocaleString("es-AR") : String(p).trim();
const urlAbsoluta = ruta => SITIO + ruta.split(path.sep).join("/").split("/").map(encodeURIComponent).join("/");

// ── Leer datos ─────────────────────────────────────
const { productos } = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "productos.json"), "utf8"));
const plantilla = fs.readFileSync(path.join(RAIZ, "producto.html"), "utf8");

// ── Fotos de vista previa (.webp -> .jpg) ─────────
// Un .jpg se rehace solo si la foto original cambió (se compara el contenido, no la fecha,
// así no se rehacen todas cada vez que GitHub descarga el proyecto).
const huella = archivo => crypto.createHash("sha1").update(fs.readFileSync(archivo)).digest("hex");

function prepararFotosOG(fotos) {
    fs.mkdirSync(CARPETA_OG, { recursive: true });
    const destinoDe = src => path.join(CARPETA_OG, path.basename(src).replace(/\.[^.]+$/, "") + ".jpg");
    const registro = fs.existsSync(REGISTRO_OG) ? JSON.parse(fs.readFileSync(REGISTRO_OG, "utf8")) : {};

    const pendientes = fotos.filter(src => {
        const origen = path.join(RAIZ, src);
        if (!fs.existsSync(origen)) {
            console.warn(`⚠ No existe la foto ${src} (revisá data/productos.json).`);
            return false;
        }
        return !fs.existsSync(destinoDe(src)) || registro[src] !== huella(origen);
    });

    if (pendientes.length) {
        const pares = pendientes.map(src => [path.join(RAIZ, src), destinoDe(src)]);
        const convertidas = convertir(pares);
        if (convertidas) {
            pendientes.forEach(src => { registro[src] = huella(path.join(RAIZ, src)); });
            console.log(`  ${pendientes.length} foto(s) de vista previa creadas con ${convertidas}.`);
        }
    }

    // Guardar el registro ordenado y sin fotos que ya no se usan
    const limpio = Object.fromEntries(Object.keys(registro).filter(k => fotos.includes(k)).sort().map(k => [k, registro[k]]));
    fs.writeFileSync(REGISTRO_OG, JSON.stringify(limpio, null, 2) + "\n", "utf8");

    const resultado = {};
    for (const src of fotos) {
        const destino = destinoDe(src);
        const archivo = fs.existsSync(destino) ? destino : path.join(RAIZ, src);
        const dims = fs.existsSync(archivo) ? medirImagen(archivo) : null;
        resultado[src] = {
            url: urlAbsoluta(path.relative(RAIZ, archivo)),
            ancho: dims?.ancho,
            alto: dims?.alto,
        };
    }
    return resultado;
}

// Devuelve el nombre de la herramienta usada, o null si no se pudo convertir.
function convertir(pares) {
    // GENERAR_SIN_WINDOWS=1 sirve para probar en Windows el mismo camino que usa GitHub
    if (process.platform === "win32" && !process.env.GENERAR_SIN_WINDOWS) {
        try {
            convertirConWindows(pares);
            return "Windows";
        } catch (e) {
            console.warn("⚠ No se pudieron crear las fotos con Windows:", e.message);
        }
    }
    try {
        convertirConSharp(pares);
        return "sharp";
    } catch (e) {
        console.warn("⚠ No se pudieron crear las fotos .jpg de vista previa; se usan las .webp.", e.code === "MODULE_NOT_FOUND" ? "(falta la librería sharp)" : e.message);
        return null;
    }
}

// Usa las librerías de imágenes que ya trae Windows (no hay que instalar nada).
function convertirConWindows(pares) {
    const lista = path.join(os.tmpdir(), `cinteria-og-${process.pid}.txt`);
    const script = path.join(os.tmpdir(), `cinteria-og-${process.pid}.ps1`);
    fs.writeFileSync(lista, pares.map(p => p.join("|")).join("\n"), "utf8");
    fs.writeFileSync(script, `
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName PresentationCore
foreach ($linea in [IO.File]::ReadAllLines("${lista.replace(/\\/g, "\\\\")}")) {
    if (-not $linea) { continue }
    $origen, $destino = $linea.Split("|")
    $entrada = [IO.File]::OpenRead($origen)
    try {
        $foto = [Windows.Media.Imaging.BitmapDecoder]::Create($entrada, "None", "OnLoad").Frames[0]
        $escala = [Math]::Min(1.0, ${LADO_MAX_OG} / [Math]::Max($foto.PixelWidth, $foto.PixelHeight))
        $chica = New-Object Windows.Media.Imaging.TransformedBitmap($foto, (New-Object Windows.Media.ScaleTransform($escala, $escala)))
        $jpg = New-Object Windows.Media.Imaging.JpegBitmapEncoder
        $jpg.QualityLevel = ${CALIDAD_OG}
        $jpg.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($chica))
        $salida = [IO.File]::Create($destino)
        try { $jpg.Save($salida) } finally { $salida.Close() }
    } finally { $entrada.Close() }
}
`, "utf8");
    try {
        execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], { stdio: "pipe" });
    } finally {
        fs.rmSync(lista, { force: true });
        fs.rmSync(script, { force: true });
    }
}

// En Linux (la automatización de GitHub) se usa la librería sharp.
// Se ejecuta como proceso aparte porque sharp trabaja de forma asíncrona.
function convertirConSharp(pares) {
    require.resolve("sharp");
    const codigo = `
        const sharp = require("sharp");
        const pares = JSON.parse(process.argv[1]);
        Promise.all(pares.map(([o, d]) => sharp(o)
            .resize(${LADO_MAX_OG}, ${LADO_MAX_OG}, { fit: "inside", withoutEnlargement: true })
            .flatten({ background: "#ffffff" })
            .jpeg({ quality: ${CALIDAD_OG}, mozjpeg: true })
            .toFile(d)))
          .catch(e => { console.error(e.message); process.exit(1); });`;
    execFileSync(process.execPath, ["-e", codigo, JSON.stringify(pares)], { stdio: "pipe", cwd: RAIZ });
}

// Ancho y alto de un .jpg (o .webp) leyendo su encabezado.
function medirImagen(archivo) {
    const b = fs.readFileSync(archivo);
    if (b[0] === 0xff && b[1] === 0xd8) {                     // JPEG
        let i = 2;
        while (i < b.length) {
            const marca = b[i + 1];
            const largo = b.readUInt16BE(i + 2);
            if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) {
                return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
            }
            i += 2 + largo;
        }
    } else if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
        const tipo = b.toString("ascii", 12, 16);
        if (tipo === "VP8X") return { ancho: 1 + b.readUIntLE(24, 3), alto: 1 + b.readUIntLE(27, 3) };
        if (tipo === "VP8 ") return { ancho: b.readUInt16LE(26) & 0x3fff, alto: b.readUInt16LE(28) & 0x3fff };
        if (tipo === "VP8L") {
            const n = b.readUInt32LE(21);
            return { ancho: (n & 0x3fff) + 1, alto: ((n >> 14) & 0x3fff) + 1 };
        }
    }
    return null;
}

// ── Ficha de producto para Google (datos estructurados) ─
// Google la lee para poder mostrar foto y precio en los resultados de búsqueda.
// Solo se arma si el precio es un número (Google no acepta "Consultar precio").
function fichaGoogle({ producto, color, url, descripcion }) {
    if (typeof producto.precio !== "number") return "";
    const fotos = color
        ? producto.fotos[color]
        : producto.colores.map(c => producto.fotos[c.nombre][0]);
    const ficha = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: color ? `${producto.nombre} ${color}` : producto.nombre,
        description: descripcion,
        image: [...new Set(fotos)].map(f => urlAbsoluta(f)),
        brand: { "@type": "Brand", name: MARCA },
        material: "Cuero vacuno",
        ...(color ? { color } : {}),
        offers: {
            "@type": "Offer",
            url,
            price: String(producto.precio),
            priceCurrency: "ARS",
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@type": "Organization", name: MARCA },
        },
    };
    // "<" escapado para que el JSON nunca pueda cerrar la etiqueta <script>
    const json = JSON.stringify(ficha, null, 2).replace(/</g, "\\u003c").replace(/\n/g, "\n        ");
    return `\n        <script type="application/ld+json">\n        ${json}\n        </script>`;
}

// ── Armar cada página a partir de la plantilla ────
function reemplazar(html, buscar, nuevo, que) {
    if (!buscar.test(html)) throw new Error(`No encontré ${que} en producto.html`);
    return html.replace(buscar, nuevo);
}

const rutaModelo = (producto, color) =>
    `modelos/${encodeURIComponent(producto.id)}/${color ? slug(color) + ".html" : ""}`;

function armarPagina({ producto, color, og }) {
    const nombre = color ? `${producto.nombre} — ${mayuscula(color)}` : producto.nombre;
    const titulo = `${nombre} | ${MARCA}`;
    const precio = precioTexto(producto.precio);
    const descripcion = `${precio}. Cuero 100% vacuno, hecho a mano y a tu medida. Elegí color, hebilla y talle, y pedilo por WhatsApp.`;
    const ruta = rutaModelo(producto, color);
    const url = SITIO + ruta;
    // Para Google, las páginas de cada color son "la misma" que la del modelo: así no
    // aparecen repetidas en los resultados. (La vista previa al compartir no cambia.)
    const canonica = SITIO + rutaModelo(producto, null);

    let html = plantilla;
    html = reemplazar(html, /<meta charset="UTF-8">/,
        `<meta charset="UTF-8">\n        <base href="../../">`, "el <meta charset>");
    html = reemplazar(html, /<!--\s*\n\s*Esta página es la PLANTILLA[\s\S]*?-->/,
        `<!-- ARCHIVO GENERADO por herramientas/generar-modelos.js: no lo edites a mano, editá producto.html y volvé a correr el script. -->`,
        "el comentario de plantilla");
    html = reemplazar(html, /\s*<meta name="robots" content="noindex">/, "", "el noindex de la plantilla");
    html = reemplazar(html, /<title>[\s\S]*?<\/title>/, `<title>${escAttr(titulo)}</title>`, "el <title>");
    html = reemplazar(html, /<meta name="description" content="[^"]*">/,
        `<meta name="description" content="${escAttr(descripcion)}">\n        <link rel="canonical" href="${escAttr(canonica)}">`, "la descripción");
    html = reemplazar(html, /<meta property="og:title" content="[^"]*">/,
        `<meta property="og:title" content="${escAttr(nombre)}">`, "og:title");
    html = reemplazar(html, /<meta property="og:description" content="[^"]*">/,
        `<meta property="og:description" content="${escAttr(descripcion)}">\n        <meta property="og:url" content="${escAttr(url)}">`, "og:description");
    html = reemplazar(html, /<meta property="og:image" content="[^"]*">\s*<meta property="og:image:width" content="[^"]*">\s*<meta property="og:image:height" content="[^"]*">/,
        [
            `<meta property="og:image" content="${escAttr(og.url)}">`,
            og.ancho ? `<meta property="og:image:width" content="${og.ancho}">` : "",
            og.alto ? `<meta property="og:image:height" content="${og.alto}">` : "",
            `<meta property="og:image:alt" content="${escAttr(nombre)}">`,
        ].filter(Boolean).join("\n        "), "og:image");
    html = reemplazar(html, /<meta name="twitter:card" content="[^"]*">/,
        m => m + fichaGoogle({ producto, color, url, descripcion }), "twitter:card");
    html = reemplazar(html, /<body>/,
        `<body data-modelo="${escAttr(producto.id)}"${color ? ` data-color="${escAttr(color)}"` : ""}>`, "el <body>");
    return { ruta, html };
}

// ── Mapa del sitio para Google ────────────────────
// Solo el inicio y una página por modelo (las de cada color apuntan a la del modelo).
function escribirSitemap() {
    const urls = [SITIO, ...productos.map(p => SITIO + rutaModelo(p, null))];
    const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<!-- Generado por herramientas/generar-modelos.js -->\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls.map(u => `  <url><loc>${escAttr(u)}</loc></url>`).join("\n") +
        `\n</urlset>\n`;
    fs.writeFileSync(path.join(RAIZ, "sitemap.xml"), xml, "utf8");
}

// ── Generar todo ──────────────────────────────────
const fotosNecesarias = new Set();
for (const p of productos) {
    fotosNecesarias.add(p.portada);
    for (const c of p.colores) fotosNecesarias.add(p.fotos[c.nombre][0]);
}
const og = prepararFotosOG([...fotosNecesarias]);

fs.rmSync(CARPETA_MODELOS, { recursive: true, force: true });   // borra modelos que ya no existan

let cantidad = 0;
for (const producto of productos) {
    const paginas = [
        armarPagina({ producto, color: null, og: og[producto.portada] }),
        ...producto.colores.map(c => armarPagina({ producto, color: c.nombre, og: og[producto.fotos[c.nombre][0]] })),
    ];
    for (const { ruta, html } of paginas) {
        const archivo = path.join(RAIZ, decodeURIComponent(ruta.endsWith("/") ? ruta + "index.html" : ruta));
        fs.mkdirSync(path.dirname(archivo), { recursive: true });
        fs.writeFileSync(archivo, html, "utf8");
        cantidad++;
    }
}
escribirSitemap();

console.log(`✓ ${cantidad} páginas generadas en modelos/ para ${productos.length} modelos, y sitemap.xml.`);
