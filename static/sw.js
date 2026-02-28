// Service Worker simplificado para Berakhah (Solo caché básico si se desea, o vacío)
// Esto sobreescribe cualquier SW anterior que tuviera lógica de Push Notifications.

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// No hay listeners de 'push' aquí, por lo que las notificaciones push antiguas dejarán de funcionar.
