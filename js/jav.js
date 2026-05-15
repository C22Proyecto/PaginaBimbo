import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTMvwBPJxjGsyWpUN8jzGooAslhMu9QVA",
  authDomain: "bimbotienda.firebaseapp.com",
  projectId: "bimbotienda",
  storageBucket: "bimbotienda.firebasestorage.app",
  messagingSenderId: "542527915409",
  appId: "1:542527915409:web:261774b18078774d568630"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let carrito = [];
let totalActual = 0;

function cambiarCantidad(btn, delta) {
    const control = btn.parentElement;
    const span = control.querySelector('.cantidad-valor');
    let val = parseInt(span.textContent) + delta;
    if (val < 1) val = 1;
    if (val > 99) val = 99;
    span.textContent = val;
}

function filtrarProductos() {
    const termino = document.getElementById('buscador').value.toLowerCase();
    const productos = document.querySelectorAll('#grid-productos .producto');
    let visibles = 0;
    productos.forEach(p => {
        const nombre = p.getAttribute('data-nombre');
        if (nombre.includes(termino)) { p.style.display = ''; visibles++; }
        else { p.style.display = 'none'; }
    });
    document.getElementById('sin-resultados').style.display = visibles === 0 ? 'block' : 'none';
}

function mostrarToast(mensaje, tipo = 'info') {
    const contenedor = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const icono = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : '🍞';
    toast.innerHTML = `<span>${icono} ${mensaje}</span>`;
    contenedor.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.4s forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function toggleCarrito() {
    document.getElementById('carrito-lateral').classList.toggle('abierto');
}

function agregarAlCarrito(nombreProducto, precioPorUnidad, btn) {
    const control = btn.previousElementSibling;
    const cantidad = parseInt(control.querySelector('.cantidad-valor').textContent);

    for (let i = 0; i < cantidad; i++) {
        carrito.push({ nombre: nombreProducto, precio: precioPorUnidad });
    }

    const tarjeta = btn.closest('.producto');
    tarjeta.classList.remove('agregado');
    void tarjeta.offsetWidth;
    tarjeta.classList.add('agregado');
    setTimeout(() => tarjeta.classList.remove('agregado'), 500);

    actualizarCarrito();

    const msg = cantidad > 1
        ? `${cantidad}x ${nombreProducto} agregados al carrito.`
        : `${nombreProducto} agregado al carrito.`;
    mostrarToast(msg, 'info');

    const badge = document.getElementById('badge-carrito');
    badge.classList.remove('pop');
    void badge.offsetWidth;
    badge.classList.add('pop');

    control.querySelector('.cantidad-valor').textContent = '1';
}

function actualizarCarrito() {
    const listaCarrito = document.getElementById('lista-carrito');
    const badge = document.getElementById('badge-carrito');
    const precioTotal = document.getElementById('precio-total');
    listaCarrito.innerHTML = '';
    totalActual = 0;

    if (carrito.length === 0) {
        listaCarrito.innerHTML = '<p class="carrito-vacio">El carrito está vacío.</p>';
        badge.textContent = '0';
        precioTotal.textContent = '0.00';
        return;
    }

    const agrupados = {};
    carrito.forEach((p) => {
        if (!agrupados[p.nombre]) agrupados[p.nombre] = { precio: p.precio, cantidad: 0 };
        agrupados[p.nombre].cantidad++;
    });

    Object.entries(agrupados).forEach(([nombre, data]) => {
        totalActual += data.precio * data.cantidad;
        const div = document.createElement('div');
        div.className = 'carrito-item';
        div.innerHTML = `
            <span>${nombre} <small style="color:#aaa">x${data.cantidad}</small></span>
            <div style="display:flex;align-items:center;gap:8px">
                <strong>$${(data.precio * data.cantidad).toFixed(2)}</strong>
                <button class="btn-eliminar" onclick="eliminarDelCarrito('${nombre}')">✕</button>
            </div>`;
        listaCarrito.appendChild(div);
    });

    badge.textContent = carrito.length;
    precioTotal.textContent = totalActual.toFixed(2);
}

function eliminarDelCarrito(nombre) {
    const idx = carrito.findIndex(p => p.nombre === nombre);
    if (idx !== -1) carrito.splice(idx, 1);
    actualizarCarrito();
}

function abrirModalPago() {
    if (carrito.length === 0) {
        mostrarToast("Tu carrito está vacío. ¡Agrega productos primero!", "error");
    } else {
        document.getElementById('total-modal').textContent = totalActual.toFixed(2);
        document.getElementById('modal-pago').style.display = 'flex';
    }
}

function cerrarModalPago() {
    document.getElementById('modal-pago').style.display = 'none';
}

async function procesarPago(event) {
    event.preventDefault();
    const form = event.target;
    const nombre = form[0].value;
    const direccion = form[1].value;

    try {
        await addDoc(collection(db, "pedidos"), {
            nombre, direccion,
            productos: carrito.map(p => ({ nombre: p.nombre, precio: p.precio })),
            total: totalActual,
            fecha: serverTimestamp()
        });
        mostrarToast("¡Compra confirmada! Gracias por tu pedido. 🎉", 'success');
        carrito = [];
        actualizarCarrito();
        cerrarModalPago();
        const panel = document.getElementById('carrito-lateral');
        if (panel.classList.contains('abierto')) toggleCarrito();
        form.reset();
    } catch (error) {
        mostrarToast("Error al guardar el pedido. Intenta de nuevo.", "error");
        console.error(error);
    }
}

async function enviarFormulario(event) {
    event.preventDefault();
    const form = event.target;
    const nombre = form[0].value;
    const correo = form[1].value;
    const mensaje = form[2].value;

    try {
        await addDoc(collection(db, "mensajes"), {
            nombre, correo, mensaje, fecha: serverTimestamp()
        });
        mostrarToast("¡Mensaje enviado! Nos pondremos en contacto contigo.", "success");
        form.reset();
    } catch (error) {
        mostrarToast("Error al enviar el mensaje. Intenta de nuevo.", "error");
        console.error(error);
    }
}

window.toggleCarrito = toggleCarrito;
window.agregarAlCarrito = agregarAlCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.abrirModalPago = abrirModalPago;
window.cerrarModalPago = cerrarModalPago;
window.procesarPago = procesarPago;
window.enviarFormulario = enviarFormulario;
window.cambiarCantidad = cambiarCantidad;
window.filtrarProductos = filtrarProductos;