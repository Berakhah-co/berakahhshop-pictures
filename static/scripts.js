// ============================================================================
// BERAKHAH - CLIENT-SIDE APPLICATION
// Versión 2.1 - Sincronizada con HTML y Archivo Seguro
// ============================================================================

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
let PROMO_CONFIG = {
    enabled: false,
    fixedEnabled: false,
    percentEnabled: false,
    price: 0,
    discountPercent: 0,
    threshold: 0,
    announceEnabled: false,
    announceTitle: '',
    announceLargeText: '',
    announceSmallText: ''
};

let WHATSAPP_NUMBER = '+573208042101';
let carrito = [];

// ============================================================================
// HELPER DE IMÁGENES (GITHUB MODE)
// ============================================================================
function getImageUrl(path) {
    if (!path) return '/static/Placeholder.jpg';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    
    // Las fotos generales siempre van locales
    if (path.includes('images/general/')) {
        const cleanPath = path.replace(/^\/?static\//, '').replace(/^\//, '');
        return `/static/${cleanPath}`;
    }
    
    // Si el modo GitHub está activo, usar la base URL
    if (window.GITHUB_CONFIG && window.GITHUB_CONFIG.enabled) {
        const baseUrl = window.GITHUB_CONFIG.base_url.replace(/\/$/, '');
        const cleanPath = path.replace(/^\/?static\//, '').replace(/^\//, '');
        return `${baseUrl}/${cleanPath}`;
    }
    
    // Por defecto, usar la ruta local
    return path.startsWith('/') ? path : `/static/${path}`;
}

// ============================================================================
// EXPORTACIÓN DE FUNCIONES AL ÁMBITO GLOBAL
// ============================================================================
// Asignación inmediata para asegurar disponibilidad
function exportGlobals() {
    window.filterByCategory = filterByCategory;
    window.changeImage = changeImage;
    window.enviarWhatsApp = enviarWhatsApp;
    window.toggleCarrito = toggleCarrito;
    window.toggleDescription = toggleDescription;
}
exportGlobals();

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    loadPromoConfig();
    initializeUI();
    loadCartFromStorage();
});

// ============================================================================
// CARGA DE CONFIGURACIÓN DESDE SERVIDOR
// ============================================================================
async function loadPromoConfig() {
    try {
        // Usar variables inyectadas si existen
        if (typeof window.PROMO_ENABLED !== 'undefined') {
            PROMO_CONFIG = {
                enabled: window.PROMO_ENABLED,
                fixedEnabled: window.PROMO_FIXED_ENABLED,
                percentEnabled: window.PROMO_PERCENT_ENABLED,
                price: window.PROMO_PRICE,
                discountPercent: window.PROMO_DISCOUNT_PERCENT,
                announceEnabled: window.PROMO_ANNOUNCE_ENABLED,
                announceTitle: window.PROMO_ANNOUNCE_TITLE,
                announceLargeText: window.PROMO_ANNOUNCE_LARGE_TEXT,
                announceSmallText: window.PROMO_ANNOUNCE_SMALL_TEXT,
                appliesTo: window.PROMO_APPLIES_TO || 'all',
                productIds: window.PROMO_PRODUCT_IDS || []
            };
        }
        
        applyPromotions();
        showAnnouncementIfEnabled();
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}

// ============================================================================
// INICIALIZACIÓN DE UI
// ============================================================================
function initializeUI() {
    setupFilters();
    setupCartButtons();
    setupModals();
    setupMobileSidebar();
    updateCartDisplay();
}

function setupMobileSidebar() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('category-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileMenuBtn && sidebar && overlay) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Evitar scroll al estar abierto
        });

        const closeSidebar = () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        };

        if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);
        
        // Exportar para uso global
        window.closeCategorySidebar = closeSidebar;
    }
}

// ============================================================================
// SISTEMA DE FILTROS Y BÚSQUEDA
// ============================================================================
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('btn-search');
    
    if (searchInput) {
        // Buscar al presionar Enter
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') filterBySearch();
        });
        
        // Verificar "admin" y filtrar en tiempo real
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            if (val === 'admin') {
                window.location.href = 'https://berakhahmedellin.pythonanywhere.com/admin';
            } else {
                filterBySearch();
            }
        });
    }

    // KONAMI CODE STYLE: Detectar "admin" tipeado en cualquier lugar
    let secretCode = ['a', 'd', 'm', 'i', 'n'];
    let secretPosition = 0;
    
    document.addEventListener('keydown', (e) => {
        // Si el usuario está escribiendo en un input, no interferir (salvo el search input que ya manejamos)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key.toLowerCase() === secretCode[secretPosition]) {
            secretPosition++;
            if (secretPosition === secretCode.length) {
                window.location.href = 'https://berakhahmedellin.pythonanywhere.com/admin';
                secretPosition = 0;
            }
        } else {
            secretPosition = 0;
        }
    });
    
    if (searchBtn) {
        searchBtn.addEventListener('click', filterBySearch);
    }
}

function filterByCategory(category) {
    console.log("Filtrando por categoría:", category);
    if (!category) return;
    const catSearch = category.toLowerCase().trim();
    
    // Cerrar sidebar si está abierto (mobile)
    if (window.closeCategorySidebar) window.closeCategorySidebar();

    const productos = document.querySelectorAll('.producto');
    const buttons = document.querySelectorAll('.cat-btn, .cat-btn-side');
    
    // 1. Actualizar estado visual de los botones
    buttons.forEach(btn => {
        const span = btn.querySelector('span');
        const btnText = (span ? span.textContent : btn.textContent).toLowerCase().trim();
        
        let isActive = false;
        if (catSearch === 'todos' || catSearch === 'todo') {
            isActive = btnText.includes('todo');
        } else {
            // Comparación flexible: si el texto del botón contiene la categoría o viceversa
            isActive = btnText.includes(catSearch) || catSearch.includes(btnText);
        }
        
        btn.classList.toggle('active', isActive);
    });

    // 2. Filtrar productos
    let found = 0;
    productos.forEach(producto => {
        const prodCat = (producto.getAttribute('data-category') || '').toLowerCase().trim();
        
        const matches = (catSearch === 'todos' || catSearch === 'todo' || 
                         prodCat === catSearch || 
                         prodCat.includes(catSearch) || 
                         catSearch.includes(prodCat));
        
        if (matches) {
            producto.style.display = ''; // Revertir a estilo CSS (flex por defecto en grid)
            producto.classList.add('visible');
            producto.style.opacity = '1';
            found++;
        } else {
            producto.classList.remove('visible');
            producto.style.display = 'none';
        }
    });
    console.log(`Productos encontrados: ${found}`);
}

function filterBySearch() {
    const searchTerm = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
    
    // Acceso rápido a admin
    if (searchTerm === 'admin') {
        window.location.href = 'https://berakhahmedellin.pythonanywhere.com/admin';
        return;
    }

    const productos = document.querySelectorAll('.producto');
    
    productos.forEach(producto => {
        const nombre = producto.querySelector('.titulo-producto')?.textContent.toLowerCase() || '';
        const id = producto.querySelector('.carousel')?.id.toLowerCase() || '';
        
        if (nombre.includes(searchTerm) || id.includes(searchTerm)) {
            producto.style.display = 'flex';
            setTimeout(() => producto.classList.add('visible'), 50);
        } else {
            producto.classList.remove('visible');
            producto.style.display = 'none';
        }
    });
}

// ============================================================================
// SISTEMA DE CARRITO
// ============================================================================
function setupCartButtons() {
    document.querySelectorAll('.btn-primary[data-nombre]').forEach(boton => {
        if (boton.classList.contains('disabled')) return;
        
        boton.onclick = function() {
            const id = this.getAttribute('data-id');
            const nombre = this.getAttribute('data-nombre');
            const precio = parseFloat(this.getAttribute('data-precio'));
            const stock = parseInt(this.getAttribute('data-stock') || '0');
            const imagen = this.closest('.producto')?.querySelector('img')?.src || '';
            
            agregarAlCarrito(id, nombre, precio, stock, imagen);
        };
    });
}

function agregarAlCarrito(id, nombre, precio, stock, imagen = '') {
    if (!nombre || isNaN(precio)) return;
    
    // Validar stock antes de agregar
    const existente = carrito.find(p => p.id === id || p.nombre === nombre);
    const cantidadActual = existente ? existente.cantidad : 0;
    
    if (stock > 0 && cantidadActual + 1 > stock) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: '¡No hay más stock disponible!',
            showConfirmButton: false,
            timer: 2000
        });
        return;
    }
    
    if (existente) {
        existente.cantidad++;
        // Actualizar stock por si cambió (aunque en una sesión SPA no debería cambiar mucho sin recargar)
        existente.stock = stock;
    } else {
        carrito.push({ id, nombre, precio, cantidad: 1, stock, imagen });
    }
    
    saveCartToStorage();
    updateCartDisplay();
    
    Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        icon: 'success',
        title: 'Agregado al carrito'
    });
}

function updateCartDisplay() {
    const lista = document.getElementById('lista-carrito');
    const totalElement = document.getElementById('total-carrito');
    const contador = document.getElementById('contador-carrito');
    
    if (!lista) return;
    
    let total = 0;
    let totalItems = 0;
    
    if (carrito.length === 0) {
        lista.innerHTML = '';
    } else {
        lista.innerHTML = carrito.map((p, i) => {
            const sub = p.precio * p.cantidad;
            total += sub;
            totalItems += p.cantidad;
            return `
                <div class="cart-item">
                    <a href="${getImageUrl(p.imagen)}" data-fancybox="cart-gallery" data-caption="${p.nombre}">
                        <img src="${getImageUrl(p.imagen)}" alt="${p.nombre}" class="cart-item-image" style="cursor: zoom-in;">
                    </a>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${p.nombre}</div>
                        <div class="cart-item-price">${formatPrice(p.precio)}</div>
                        <div class="cart-item-quantity">
                            <button class="qty-btn" onclick="cambiarCantidad(${i}, -1)">−</button>
                            <span class="qty-display">${p.cantidad}</span>
                            <button class="qty-btn" onclick="cambiarCantidad(${i}, 1)">+</button>
                        </div>
                    </div>
                    <button class="cart-item-remove" onclick="eliminarDelCarrito(${i})" title="Eliminar">×</button>
                </div>
            `;
        }).join('');
    }
    
    if (totalElement) totalElement.textContent = `Total: ${formatPrice(total)}`;
    if (contador) {
        contador.textContent = totalItems;
        contador.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function cambiarCantidad(index, delta) {
    if (carrito[index]) {
        const item = carrito[index];
        const nuevaCantidad = item.cantidad + delta;
        
        // Validar stock al incrementar
        if (delta > 0 && item.stock > 0 && nuevaCantidad > item.stock) {
             Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: `Solo hay ${item.stock} unidades disponibles`,
                showConfirmButton: false,
                timer: 2000
            });
            return;
        }

        carrito[index].cantidad += delta;
        if (carrito[index].cantidad <= 0) {
            eliminarDelCarrito(index);
        } else {
            saveCartToStorage();
            updateCartDisplay();
        }
    }
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    saveCartToStorage();
    updateCartDisplay();
}

function vaciarCarrito() {
    carrito = [];
    saveCartToStorage();
    updateCartDisplay();
}


function toggleCarrito() {
    const modal = document.getElementById('carrito');
    if (!modal) return;
    
    const isOpening = modal.style.display === 'none' || modal.style.display === '';
    modal.style.display = isOpening ? 'flex' : 'none';
    
    if (isOpening) {
        irAPaso(1); // Siempre empezar en el paso 1 (Resumen)
    }
}

// ============================================================================
// NAVEGACIÓN PASOS DEL CARRITO
// ============================================================================
function irAPaso(paso) {
    const step1 = document.getElementById('cart-step-1');
    const step2 = document.getElementById('cart-step-2');
    const p1 = document.getElementById('p-step-1');
    const p2 = document.getElementById('p-step-2');
    
    if (!step1 || !step2) return;

    if (paso === 1) {
        step1.classList.add('active');
        step2.classList.remove('active');
        p1.classList.add('active');
        p2.classList.remove('active');
    } else if (paso === 2) {
        if (carrito.length === 0) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'El carrito está vacío',
                showConfirmButton: false,
                timer: 2000
            });
            return;
        }
        step1.classList.remove('active');
        step2.classList.add('active');
        p1.classList.add('active');
        p2.classList.add('active');
        cargarDatosCliente();
    }
}

// ============================================================================
// ENVÍO DE PEDIDO (SEGURO)
// ============================================================================
async function enviarPedido() {
    if (carrito.length === 0) return;
    
    const nombreCliente = document.getElementById('nombre-cliente')?.value?.trim();
    const correoCliente = document.getElementById('email-cliente')?.value?.trim();
    const telefonoCliente = document.getElementById('telefono-cliente')?.value?.trim();
    const direccionCliente = document.getElementById('direccion-cliente')?.value?.trim();
    
    // Validaciones
    if (!nombreCliente || !correoCliente || !telefonoCliente) {
        Swal.fire('Atención', 'Nombre, correo electrónico y teléfono son obligatorios', 'warning');
        return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoCliente)) {
        Swal.fire('Atención', 'Por favor ingresa un correo electrónico válido', 'warning');
        return;
    }
    
    localStorage.setItem('datosCliente', JSON.stringify({
        nombre: nombreCliente, 
        email: correoCliente, 
        telefono: telefonoCliente, 
        direccion: direccionCliente
    }));
    
    Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
     
    try {
        // Obtener el token CSRF del meta tag
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        // Enviar al Backend (que guardará en DB y enviará a Google Apps Script)
            const response = await fetch('/api/send-order', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                cliente: { 
                    nombre: nombreCliente, 
                    email: correoCliente, 
                    telefono: telefonoCliente, 
                    direccion: direccionCliente 
                },
                productos: carrito.map(p => ({
                    id: p.id,
                    nombre: p.nombre,
                    precio: p.precio,
                    cantidad: p.cantidad,
                    imagen: getImageUrl(p.imagen)
                }))
            })
        });
        
        const data = await response.json();
        
        if (response.status === 409) {
            throw new Error(data.message || 'Stock insuficiente');
        }
        
        if (data.status === 'success') {
            // Preparar mensaje para WhatsApp
            let mensaje = `🌟 *Nuevo Pedido - Berakhah* 🌟\n\n👤 *Cliente:* ${nombreCliente}\n📧 *Email:* ${correoCliente}\n📞 *Tel:* ${telefonoCliente}\n`;
            if (direccionCliente) mensaje += `📍 *Dir:* ${direccionCliente}\n`;
            mensaje += `\n📦 *Productos:*\n--------------------------------------------------------\n`;
            
            let total = 0;
            carrito.forEach((producto) => {
                let subtotalProducto = parseFloat(producto.precio) * producto.cantidad;
                mensaje += `🌟 ${producto.nombre} (x${producto.cantidad}): *${formatPrice(subtotalProducto)}*\n🖼️ ${getImageUrl(producto.imagen)}\n--------------------------------------------------------\n`;
                total += subtotalProducto;
            });
            mensaje += `\n✨ *Total:* ${formatPrice(total)}`;

            // Abrir WhatsApp en la misma pestaña para evitar bloqueo de popups y permisos
            const whatsappUrl = `https://wa.me/${data.whatsapp ? data.whatsapp.replace(/\D/g, '') : WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
            
            vaciarCarrito();
            
            // Cerrar el carrito inmediatamente
            const cartModal = document.getElementById('carrito');
            if (cartModal) {
                cartModal.style.display = 'none';
                cartModal.classList.remove('active'); // Por si acaso usa clase active
            }

            // Detectar si es dispositivo móvil
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile) {
                Swal.fire({
                    title: '¡Pedido Enviado!',
                    text: 'Redirigiendo a WhatsApp para finalizar...',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    position: 'center',
                    backdrop: true
                }).then(() => {
                    window.location.href = whatsappUrl;
                });
            } else {
                // En escritorio, solo mostrar éxito y botones de acción
                Swal.fire({
                    title: '<span style="font-family: var(--font-serif); color: var(--gold-deep);">¡Pedido Exitoso!</span>',
                    html: `
                        <p style="font-family: var(--font-sans); color: var(--text-secondary); margin-bottom: 25px;">
                            Tu pedido ha sido registrado correctamente en nuestro sistema.
                        </p>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button onclick="Swal.close()" 
                               style="
                                   padding: 10px 24px;
                                   background: transparent;
                                   color: var(--text-secondary);
                                   border: 1px solid #ccc;
                                   border-radius: 50px;
                                   font-family: var(--font-sans);
                                   cursor: pointer;
                                   font-size: 0.9rem;
                                   transition: all 0.2s;
                               "
                               onmouseover="this.style.borderColor='#999'; this.style.color='#333'"
                               onmouseout="this.style.borderColor='#ccc'; this.style.color='var(--text-secondary)'">
                               Cerrar
                            </button>
                            
                            <a href="${whatsappUrl}" target="_blank" 
                               style="
                                   display: inline-block;
                                   padding: 10px 24px;
                                   background: linear-gradient(135deg, #b39b6d, #a18a5e);
                                   color: white;
                                   text-decoration: none;
                                   font-family: 'Cinzel', serif;
                                   font-size: 0.9rem;
                                   letter-spacing: 1px;
                                   border-radius: 50px;
                                   box-shadow: 0 4px 15px rgba(179, 155, 109, 0.3);
                                   transition: transform 0.2s ease;
                                   border: none;
                                   cursor: pointer;
                               "
                               onmouseover="this.style.transform='scale(1.05)'"
                               onmouseout="this.style.transform='scale(1)'">
                                 Contactar WhatsApp
                            </a>
                        </div>
                    `,
                    icon: 'success',
                    iconColor: '#b39b6d',
                    showConfirmButton: false,
                    showCloseButton: false, // Ya tenemos botón explícito
                    background: '#f9f8f6',
                    backdrop: `rgba(0,0,0,0.4)`
                });
            }

        } else {
            throw new Error(data.message || 'Error desconocido');
        }
    } catch (error) {
        console.error("Error:", error);
        
        // Cerrar loading si está abierto
        if (Swal.isVisible() && Swal.isLoading()) {
            Swal.close();
        }

        // Manejar error de stock
        if (error.message.includes('Stock insuficiente')) {
             // Extraer detalles si vienen en el mensaje (e.g. "Stock insuficiente para Anillo. Disponibles: 2")
             Swal.fire({
                title: 'Stock Agotado',
                text: error.message, 
                icon: 'warning',
                confirmButtonColor: '#d4af37'
            }).then(() => {
                // location.reload(); 
            });
        } else {
             // Si falta un campo, etc.
             Swal.fire({
                 title: 'Atención', 
                 text: error.message || 'Hubo un problema procesando tu pedido.', 
                 icon: 'error'
             });
        }
    }
}

// ============================================================================
// UTILIDADES
// ============================================================================
function formatPrice(p) {
    return '$' + Math.round(p).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function saveCartToStorage() { localStorage.setItem('berakhah_cart_v3', JSON.stringify(carrito)); }
function loadCartFromStorage() {
    const saved = localStorage.getItem('berakhah_cart_v3');
    if (saved) { carrito = JSON.parse(saved); updateCartDisplay(); }
}

function cargarDatosCliente() {
    const datos = JSON.parse(localStorage.getItem('datosCliente') || '{}');
    if (datos.nombre) document.getElementById('nombre-cliente').value = datos.nombre;
    if (datos.email) document.getElementById('email-cliente').value = datos.email;
    if (datos.telefono) document.getElementById('telefono-cliente').value = datos.telefono;
    if (datos.direccion) document.getElementById('direccion-cliente').value = datos.direccion;
}

function changeImage(direction, id) {
    const container = document.querySelector(`#${id} .carousel-images`);
    if (!container) return;
    const imgs = container.querySelectorAll('img');
    let active = Array.from(imgs).findIndex(img => img.classList.contains('active'));
    imgs[active].classList.remove('active');
    active = (active + direction + imgs.length) % imgs.length;
    imgs[active].classList.add('active');
}

function enviarWhatsApp(product) {
    const msg = `¡Hola! Me interesa este producto: ${product}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

function setupModals() {
    const modal = document.getElementById('carrito');
    const closeBtn = document.getElementById('cerrar-carrito');
    const orderBtn = document.getElementById('btn-pedir');
    const emptyBtn = document.getElementById('btn-vaciar-carrito');
    const nextStepBtn = document.getElementById('btn-next-step');
    const prevStepBtn = document.getElementById('btn-prev-step');

    if (closeBtn) closeBtn.onclick = toggleCarrito;
    if (orderBtn) orderBtn.onclick = enviarPedido;
    
    if (nextStepBtn) nextStepBtn.onclick = () => irAPaso(2);
    if (prevStepBtn) prevStepBtn.onclick = () => irAPaso(1);
    
    if (emptyBtn) emptyBtn.onclick = () => {
        Swal.fire({
            title: '¿Vaciar carrito?',
            text: 'Esta acción eliminará todos los productos seleccionados.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, vaciar',
            cancelButtonText: 'No',
            confirmButtonColor: '#c0392b',
            cancelButtonColor: '#999'
        }).then(r => { 
            if (r.isConfirmed) {
                vaciarCarrito();
                irAPaso(1);
            }
        });
    };
    
    window.onclick = (e) => { if (e.target === modal) toggleCarrito(); };
}

function showAnnouncementIfEnabled() {
    if (!PROMO_CONFIG.announceEnabled || sessionStorage.getItem('promoShown')) return;
    Swal.fire({
        title: PROMO_CONFIG.announceTitle,
        html: `<div style="color: #d4af37; font-size: 1.2rem; font-weight: bold;">${PROMO_CONFIG.announceLargeText}</div>`,
        icon: 'info',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#d4af37'
    });
    sessionStorage.setItem('promoShown', 'true');
}

function applyPromotions() {
    if (!PROMO_CONFIG.enabled) return;
    
    document.querySelectorAll('.producto').forEach(prod => {
        const btn = prod.querySelector('.btn-primary');
        const priceTag = prod.querySelector('.precio');
        if (!btn || !priceTag) return;
        
        const productId = btn.getAttribute('data-id');
        
        // Determinar si aplica la promoción
        let applies = false;
        if (PROMO_CONFIG.appliesTo === 'all') {
            applies = true;
        } else if (PROMO_CONFIG.appliesTo === 'selected' && PROMO_CONFIG.productIds.includes(productId)) {
            applies = true;
        }
        
        if (!applies) return;

        const originalPrice = parseFloat(btn.getAttribute('data-original-price') || btn.getAttribute('data-precio'));
        
        let promoPrice = originalPrice;
        if (PROMO_CONFIG.fixedEnabled && PROMO_CONFIG.price > 0) promoPrice = PROMO_CONFIG.price;
        else if (PROMO_CONFIG.percentEnabled) promoPrice = originalPrice * (1 - PROMO_CONFIG.discountPercent/100);
        
        if (promoPrice < originalPrice) {
            priceTag.innerHTML = `<span class="precio-original">${formatPrice(originalPrice)}</span> <span class="precio-oferta">${formatPrice(promoPrice)}</span>`;
            btn.setAttribute('data-precio', promoPrice);
            
            // Añadir badge de oferta si no existe
            if (!prod.querySelector('.stock-badge.oferta')) {
                const badge = document.createElement('span');
                badge.className = 'stock-badge oferta';
                badge.textContent = 'Oferta';
                prod.insertBefore(badge, prod.firstChild);
            }
        }
    });
}

// Exportaciones ya realizadas al principio del archivo
// ============================================================================
// FUNCIONES ADICIONALES UI
// ============================================================================
function toggleDescription(btn) {
    const wrapper = btn.closest('.descripcion-wrapper');
    const content = wrapper.querySelector('.descripcion-content');
    
    content.classList.toggle('expanded');
    
    if (content.classList.contains('expanded')) {
        btn.textContent = 'Ver menos';
    } else {
        btn.textContent = 'Ver más';
        // Hacer scroll suave hacia arriba de la tarjeta para no perder el contexto
        wrapper.closest('.producto').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
