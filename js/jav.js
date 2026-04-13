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

function mostrarToast(mensaje, tipo = 'info') {
    const contenedor = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const icono = tipo === 'success' ? '✅' : '🍞';
    toast.innerHTML = `<span>${icono} ${mensaje}</span>`;
    contenedor.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function toggleCarrito() {
    document.getElementById('carrito-lateral').classList.toggle('abierto');
}

function agregarAlCarrito(nombreProducto, precio) {
    carrito.push({ nombre: nombreProducto, precio: precio });
    actualizarCarrito();
    mostrarToast(nombreProducto + ' agregado al carrito.', 'info');
    const contador = document.getElementById('contador-carrito');
    contador.classList.remove('animar-contador');
    void contador.offsetWidth;
    contador.classList.add('animar-contador');
}

function actualizarCarrito() {
    const listaCarrito = document.getElementById('lista-carrito');
    const contadorCarrito = document.getElementById('contador-carrito');
    const precioTotal = document.getElementById('precio-total');
    listaCarrito.innerHTML = '';
    totalActual = 0;

    if (carrito.length === 0) {
        listaCarrito.innerHTML = '<p>El carrito está vacío.</p>';
        contadorCarrito.innerText = '0';
        precioTotal.innerText = '0.00';
        return;
    }

    carrito.forEach((producto, index) => {
        totalActual += producto.precio;
        const div = document.createElement('div');
        div.className = 'carrito-item';
        div.innerHTML = `
            <span>${producto.nombre}</span>
            <div>
                <strong>$${producto.precio.toFixed(2)}</strong>
                <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">X</button>
            </div>`;
        listaCarrito.appendChild(div);
    });

    contadorCarrito.innerText = carrito.length;
    precioTotal.innerText = totalActual.toFixed(2);
}

function eliminarDelCarrito(indice) {
    carrito.splice(indice, 1);
    actualizarCarrito();
}

function abrirModalPago() {
    if (carrito.length === 0) {
        mostrarToast("Tu carrito está vacío. ¡Agrega productos primero!", "error");
    } else {
        document.getElementById('total-modal').innerText = totalActual.toFixed(2);
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
            nombre: nombre,
            direccion: direccion,
            productos: carrito.map(p => ({ nombre: p.nombre, precio: p.precio })),
            total: totalActual,
            fecha: serverTimestamp()
        });

        mostrarToast("¡Compra confirmada! Gracias por tu pedido.", 'success');
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
            nombre: nombre,
            correo: correo,
            mensaje: mensaje,
            fecha: serverTimestamp()
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