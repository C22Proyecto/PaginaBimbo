// 1. Importaciones de Firebase (Versión unificada 10.12.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 2. Configuración de tu proyecto (Bimbo Tienda)
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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 4. Variables de estado
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
    const panel = document.getElementById('carrito-lateral');
    if (panel) panel.classList.toggle('abierto');
}

// --- LÓGICA DEL CARRITO ---

function agregarAlCarrito(nombreProducto, precio) {
    carrito.push({ nombre: nombreProducto, precio: precio });
    actualizarCarrito();
    mostrarToast(`${nombreProducto} agregado.`, 'info');
    
    const contador = document.getElementById('contador-carrito');
    if (contador) {
        contador.classList.remove('animar-contador');
        void contador.offsetWidth; 
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

// --- PROCESOS DE PAGO Y FIRESTORE (RESTRIGIDO A LOGIN) ---

function abrirModalPago() {
    // BLOQUEO: Si no hay sesión, no abre el modal
    if (!auth.currentUser) {
        mostrarToast("Debes iniciar sesión para realizar un pedido.", "error");
        return;
    }

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

    // Verificación de seguridad secundaria
    if (!auth.currentUser) {
        mostrarToast("Sesión no detectada.", "error");
        return;
    }

    const form = event.target;
    const nombre = form[0].value;
    const direccion = form[1].value;

    try {
        await addDoc(collection(db, "pedidos"), {
            cliente: nombre,
            direccion: direccion,
            email: auth.currentUser.email,
            uid: auth.currentUser.uid,
            productos: carrito.map(p => ({ nombre: p.nombre, precio: p.precio })),
            total: totalActual,
            fecha: serverTimestamp()
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
        mostrarToast("Error al enviar.", "error");
        console.error(error);
    }
}

// --- SISTEMA DE AUTENTICACIÓN ---

const authContainer = document.getElementById('auth-container');

onAuthStateChanged(auth, (user) => {
    if (!authContainer) return;

    if (user) {
        // Interfaz con sesión activa
        authContainer.innerHTML = `
            <div class="user-nav-info" style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 0.9rem; font-weight: bold;">Hola, ${user.displayName.split(' ')[0]}</span>
                <button id="logoutBtn" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-weight:bold; text-decoration:underline;">Salir</button>
            </div>
        `;

        document.getElementById('logoutBtn').addEventListener('click', () => {
            signOut(auth).then(() => mostrarToast("Sesión cerrada", "info"));
        });
    } else {
        // Interfaz sin sesión
        authContainer.innerHTML = `<button id="loginBtn" class="btn-auth">Ingresar</button>`;

        document.getElementById('loginBtn').addEventListener('click', async () => {
            try {
                await signInWithPopup(auth, provider);
                mostrarToast("Bienvenido", "success");
            } catch (error) {
                console.error("Error Auth:", error);
                mostrarToast("Error al conectar con Google", "error");
            }
        });
    }
});

// --- EXPOSICIÓN GLOBAL ---
window.toggleCarrito = toggleCarrito;
window.agregarAlCarrito = agregarAlCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.abrirModalPago = abrirModalPago;
window.cerrarModalPago = cerrarModalPago;
window.procesarPago = procesarPago;
window.enviarFormulario = enviarFormulario;
