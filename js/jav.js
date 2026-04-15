// 1. Importaciones de Firebase (Versión unificada 10.12.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 2. Configuración de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyCTMvwBPJxjGsyWpUN8jzGooAslhMu9QVA",
  authDomain: "bimbotienda.firebaseapp.com",
  projectId: "bimbotienda",
  storageBucket: "bimbotienda.firebasestorage.app",
  messagingSenderId: "542527915409",
  appId: "1:542527915409:web:261774b18078774d568630"
};

// 3. Inicialización de servicios
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Importante: pasar 'app' aquí
const provider = new GoogleAuthProvider();

// 4. Variables de estado del Carrito
let carrito = [];
let totalActual = 0;

// --- FUNCIONES DE INTERFAZ (UI) ---

function mostrarToast(mensaje, tipo = 'info') {
    const contenedor = document.getElementById('toast-container');
    if (!contenedor) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const icono = tipo === 'success' ? '✅' : (tipo === 'error' ? '❌' : '🍞');
    toast.innerHTML = `<span>${icono} ${mensaje}</span>`;
    
    contenedor.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function toggleCarrito() {
    const carritoLateral = document.getElementById('carrito-lateral');
    if (carritoLateral) carritoLateral.classList.toggle('abierto');
}

// --- LÓGICA DEL CARRITO ---

function agregarAlCarrito(nombreProducto, precio) {
    carrito.push({ nombre: nombreProducto, precio: precio });
    actualizarCarrito();
    mostrarToast(`${nombreProducto} agregado.`, 'info');
    
    const contador = document.getElementById('contador-carrito');
    if (contador) {
        contador.classList.remove('animar-contador');
        void contador.offsetWidth; // Truco para reiniciar la animación CSS
        contador.classList.add('animar-contador');
    }
}

function actualizarCarrito() {
    const listaCarrito = document.getElementById('lista-carrito');
    const contadorCarrito = document.getElementById('contador-carrito');
    const precioTotal = document.getElementById('precio-total');
    
    if (!listaCarrito) return;
    
    listaCarrito.innerHTML = '';
    totalActual = 0;

    if (carrito.length === 0) {
        listaCarrito.innerHTML = '<p>El carrito está vacío.</p>';
        if (contadorCarrito) contadorCarrito.innerText = '0';
        if (precioTotal) precioTotal.innerText = '0.00';
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

    if (contadorCarrito) contadorCarrito.innerText = carrito.length;
    if (precioTotal) precioTotal.innerText = totalActual.toFixed(2);
}

function eliminarDelCarrito(indice) {
    carrito.splice(indice, 1);
    actualizarCarrito();
}

// --- PROCESOS DE PAGO Y FORMULARIOS (FIRESTORE) ---

function abrirModalPago() {
    if (carrito.length === 0) {
        mostrarToast("Tu carrito está vacío.", "error");
    } else {
        const modalTotal = document.getElementById('total-modal');
        if (modalTotal) modalTotal.innerText = totalActual.toFixed(2);
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
            cliente: nombre,
            direccion: direccion,
            productos: carrito.map(p => ({ nombre: p.nombre, precio: p.precio })),
            total: totalActual,
            fecha: serverTimestamp(),
            usuarioId: auth.currentUser ? auth.currentUser.uid : "Anónimo"
        });

        mostrarToast("¡Compra confirmada!", 'success');
        carrito = [];
        actualizarCarrito();
        cerrarModalPago();
        
        const panel = document.getElementById('carrito-lateral');
        if (panel && panel.classList.contains('abierto')) toggleCarrito();
        form.reset();

    } catch (error) {
        mostrarToast("Error al procesar el pedido.", "error");
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

        mostrarToast("¡Mensaje enviado!", "success");
        form.reset();
    } catch (error) {
        mostrarToast("Error al enviar el mensaje.", "error");
        console.error(error);
    }
}

// --- AUTENTICACIÓN (FIREBASE AUTH) ---

const authContainer = document.getElementById('auth-container');

onAuthStateChanged(auth, (user) => {
    if (!authContainer) return;

    if (user) {
        // Interfaz cuando el usuario está logueado
        authContainer.innerHTML = `
            <div class="user-nav-info" style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 0.9rem;">Hola, ${user.displayName.split(' ')[0]}</span>
                <button id="logoutBtn" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-weight:bold;">Salir</button>
            </div>
        `;

        document.getElementById('logoutBtn').addEventListener('click', () => {
            signOut(auth).then(() => mostrarToast("Sesión cerrada", "info"));
        });
    } else {
        // Interfaz cuando no hay sesión
        authContainer.innerHTML = `<button id="loginBtn" class="btn-auth">Ingresar</button>`;

        document.getElementById('loginBtn').addEventListener('click', async () => {
            try {
                await signInWithPopup(auth, provider);
                mostrarToast("Sesión iniciada", "success");
            } catch (error) {
                console.error("Error Login:", error);
                mostrarToast("Error al ingresar", "error");
            }
        });
    }
});

// --- EXPOSICIÓN GLOBAL PARA HTML ---
window.toggleCarrito = toggleCarrito;
window.agregarAlCarrito = agregarAlCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.abrirModalPago = abrirModalPago;
window.cerrarModalPago = cerrarModalPago;
window.procesarPago = procesarPago;
window.enviarFormulario = enviarFormulario;
