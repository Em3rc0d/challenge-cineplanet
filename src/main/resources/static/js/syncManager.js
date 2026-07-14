// syncManager.js
// Maneja la Cola de Sincronización Offline-First y las Claves de Idempotencia usando IndexedDB

const DB_NAME = 'gpets-offline-db';
const STORE_NAME = 'sync-queue';

let dbPromise = null;

// Inicializa IndexedDB
async function initDB() {
    if (!window.idb) {
        console.warn("Librería idb no cargada aún, reintentando en breve...");
        return null;
    }
    if (!dbPromise) {
        dbPromise = window.idb.openDB(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // La clave primaria será un ID autoincremental
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            },
        });
    }
    return dbPromise;
}

// Genera un UUID v4 para la Idempotency-Key
function generateUUID() {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback simple si randomUUID no está disponible
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Encola una petición (POST, PUT) para ser sincronizada
async function enqueueRequest(url, method, headers, body, token) {
    const db = await initDB();
    if (!db) return;
    
    // Asegurarse de inyectar Idempotency-Key si no existe
    let finalHeaders = { ...headers };
    if (!finalHeaders['Idempotency-Key']) {
        finalHeaders['Idempotency-Key'] = generateUUID();
    }
    
    const requestItem = {
        url,
        method,
        headers: finalHeaders,
        body,
        token, // guardamos el token de Firebase actual
        timestamp: Date.now()
    };
    
    await db.add(STORE_NAME, requestItem);
    updateSyncStatus();
    
    // Si estamos online, intentar sincronizar inmediatamente
    if (navigator.onLine) {
        syncQueue();
    }
}

// Procesa la cola de IndexedDB enviando al backend
async function syncQueue() {
    if (!navigator.onLine) return;
    
    const db = await initDB();
    if (!db) return;
    
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const allItems = await store.getAll();
    
    if (allItems.length === 0) return;
    
    console.log(`Intentando sincronizar ${allItems.length} operaciones pendientes...`);
    
    for (const item of allItems) {
        try {
            // Refrescar el token del header por si acaso (aunque Firebase Auth se encarga)
            let currentHeaders = { ...item.headers };
            if (item.token) {
                currentHeaders['Authorization'] = `Bearer ${item.token}`;
            }
            
            const response = await fetch(item.url, {
                method: item.method,
                headers: currentHeaders,
                body: item.body
            });
            
            if (response.ok) {
                // Si tuvo éxito, eliminar de la cola
                const deleteTx = db.transaction(STORE_NAME, 'readwrite');
                await deleteTx.objectStore(STORE_NAME).delete(item.id);
                console.log(`Operación ${item.id} sincronizada correctamente.`);
            } else {
                console.warn(`Falló la sincronización de ${item.id}, código: ${response.status}`);
                // Si es un error 400 (Bad Request), tal vez deberíamos eliminarlo para que no bloquee, pero lo dejamos simple por ahora
            }
        } catch (error) {
            console.error(`Error de red al sincronizar ${item.id}:`, error);
            // Salimos del loop para intentar luego (ej: si se volvió a caer el internet)
            break;
        }
    }
    
    updateSyncStatus();
}

// Actualiza el indicador visual en el Panel de Estado
async function updateSyncStatus() {
    const db = await initDB();
    if (!db) return;
    
    const count = await db.count(STORE_NAME);
    const syncStatusEl = document.getElementById('status-sync');
    if (syncStatusEl) {
        if (count > 0) {
            syncStatusEl.innerHTML = `<span class="text-amber-500 font-bold">${count} pendientes</span>`;
        } else {
            syncStatusEl.innerHTML = `<span class="text-slate-500">0 pendientes</span>`;
        }
    }
}

// Listeners globales para estado de red
window.addEventListener('online', () => {
    const netStatusEl = document.getElementById('status-network');
    if (netStatusEl) {
        netStatusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-green-500"></span> Online`;
        netStatusEl.className = 'flex items-center gap-1 text-green-600';
    }
    // Sincronizar cola
    syncQueue();
});

window.addEventListener('offline', () => {
    const netStatusEl = document.getElementById('status-network');
    if (netStatusEl) {
        netStatusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Offline`;
        netStatusEl.className = 'flex items-center gap-1 text-red-600';
    }
});

// Inicializar el contador visual al cargar
document.addEventListener('DOMContentLoaded', () => {
    // Si la librería idb tarda un poco, esperamos
    setTimeout(updateSyncStatus, 1000);
});
