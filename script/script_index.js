fetch("data/productos.json")
  .then(res => res.json())
  .then(productos => {

    const contenedor = document.getElementById("productos");

    productos.forEach(p => {

      contenedor.innerHTML += `
        <div class="product-card">
          <img src="${p.imagen}">
          <div class="product-name">${p.nombre}</div>
          <div class="product-info">
            Ancho: ${p.paso} <br>
            Precio: $${p.precio}
          </div>
        </div>
      `;

    });

  });