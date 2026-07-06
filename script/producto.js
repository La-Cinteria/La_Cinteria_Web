const params = new URLSearchParams(window.location.search);
const paso = parseFloat(params.get("paso"));

if (!paso) {
  alert("Grupo no válido");
  throw new Error("Falta paso");
}

// Título del grupo
const titulo = document.getElementById("titulo-grupo");
titulo.textContent = `Cintos de ${paso} cm de ancho`;

fetch("data/productos.json")
  .then(res => res.json())
  .then(productos => {

    const contenedor = document.getElementById("productos");

    // FILTRAR POR PASO
    const filtrados = productos.filter(p => p.ancho === paso);

    if (filtrados.length === 0) {
      contenedor.innerHTML = "<p>No hay productos para este grupo.</p>";
      return;
    }

    filtrados.forEach((p, index) => {
      contenedor.innerHTML += `
        <div class="product-card">
          <a href="producto.html?id=${index}">
            <img src="${p.imagen}" alt="${p.nombre}">
          </a>
          <div class="product-name">${p.nombre}</div>
          <div class="product-info">Precio: ${p.precio}</div>
        </div>
      `;
    });
  });

// Traer productos
fetch("data/productos.json")
  .then(res => res.json())
  .then(productos => {

    const producto = productos[id];

    if (!producto) {
      alert("Producto inexistente");
      return;
    }

    // Cargar datos
    document.getElementById("nombre-cinto").textContent = producto.nombre;
    document.getElementById("precio").textContent = producto.precio;
    document.getElementById("ancho").textContent = producto.ancho / 10;

    const imgPrincipal = document.getElementById("imagen-principal");
    imgPrincipal.src = producto.imagen;

    // Colores (si existen)
    const contColores = document.getElementById("colores");
    contColores.innerHTML = "";

    let colorElegido = "Único";

    if (producto.colores) {
      producto.colores.forEach(c => {
        const btn = document.createElement("button");
        btn.className = "color-btn";
        btn.title = c.nombre;
        btn.style.backgroundImage = `url(${c.imagen})`;

        btn.onclick = () => {
          imgPrincipal.src = c.imagen;
          colorElegido = c.nombre;
        };

        contColores.appendChild(btn);
      });
    }

    // Comprar
    document.getElementById("comprar").onclick = () => {
      const talle = document.getElementById("talle").value;
      const hebilla = document.querySelector('input[name="hebilla"]:checked');

      if (!talle || !hebilla) {
        alert("Completá talle y hebilla");
        return;
      }

      alert(
        "Hacemos envíos dentro de la zona acordada.\n" +
        "Si estás fuera, podemos coordinar un encuentro."
      );

      const mensaje =
`Hola! Quiero comprar:
• ${producto.nombre}
• Ancho: ${producto.ancho / 10} cm
• Color: ${colorElegido}
• Talle: ${talle}
• Hebilla: ${hebilla.value}
• Precio: ${producto.precio}`;

      const telefono = "549XXXXXXXXXX";
      window.open(
        `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
      );
    };
  });