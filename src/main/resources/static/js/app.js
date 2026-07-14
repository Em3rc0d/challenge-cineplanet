// Global Variables
let map;
let markers = [];
let markerCluster = null;
let allIncidents = [];
let selectedLocation = null;
let selectionMarker = null;
let isDarkMode = false;

// Custom SVG Icon
const pinSymbol = {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
    fillColor: "#0ea5e9",
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: "#ffffff",
    scale: 2,
    anchor: { x: 12, y: 22 },
};

// Dark Maps Style
const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

// Start
window.addEventListener('load', () => {
    initApp();
    setupImagePreview();
    setupFilters();
    setupDarkMode();
    setupGPS();
});

async function initApp() {
    try {
        const response = await fetch("/api/config");
        if (!response.ok) throw new Error("Failed to load configuration");
        const config = await response.json();
        if (!firebase.apps.length) firebase.initializeApp(config.firebaseConfig);
        
        setupAuthListeners();
        loadGoogleMaps(config.googleMapsApiKey);
        loadTopOwners();
    } catch (error) {
        console.error("Error initializing app:", error);
    }
}

function loadGoogleMaps(apiKey) {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&v=weekly`;
    script.async = true;
    document.body.appendChild(script);
}

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -12.0464, lng: -77.0428 },
        zoom: 12,
        draggableCursor: 'crosshair',
        clickableIcons: false,
        disableDefaultUI: true,
        zoomControl: true,
        styles: isDarkMode ? darkMapStyle : []
    });

    map.addListener("click", (e) => {
        const user = firebase.auth().currentUser;
        if(!user) return;
        placeSelectionMarker(e.latLng.lat(), e.latLng.lng());
    });
}

function placeSelectionMarker(lat, lng) {
    selectedLocation = { latitude: lat, longitude: lng };
    if (selectionMarker) selectionMarker.setMap(null);
    
    selectionMarker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: "Ubicación",
        animation: google.maps.Animation.DROP,
        icon: pinSymbol,
    });

    const hint = document.getElementById("location-hint");
    hint.classList.remove("animate-pulse");
    hint.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 shrink-0 mt-0.5 text-green-600"></i><p class="text-green-700">Ubicación guardada: ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>`;
    hint.className = "bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800/50 text-green-700 dark:text-green-300 text-xs p-3 rounded-lg flex items-start gap-2 shadow-sm transition-all";
    lucide.createIcons();
    map.panTo({ lat, lng });
}

// GPS Feature
function setupGPS() {
    document.getElementById('btn-gps').addEventListener('click', () => {
        const user = firebase.auth().currentUser;
        if(!user) {
            Swal.fire('No Autenticado', 'Inicia sesión para reportar una mascota.', 'warning');
            return;
        }

        if (navigator.geolocation) {
            Swal.fire({
                title: 'Obteniendo GPS...',
                allowEscapeKey: false,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    Swal.close();
                    placeSelectionMarker(position.coords.latitude, position.coords.longitude);
                    map.setZoom(16);
                },
                (error) => {
                    Swal.fire('Error GPS', 'No pudimos obtener tu ubicación. Verifica tus permisos.', 'error');
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            Swal.fire('Error', 'Geolocalización no soportada por el navegador.', 'error');
        }
    });
}

// Dark Mode Toggle
function setupDarkMode() {
    const toggleBtn = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    
    toggleBtn.addEventListener('click', () => {
        isDarkMode = !document.documentElement.classList.contains('dark');
        
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            icon.setAttribute('data-lucide', 'sun');
            if(map) map.setOptions({ styles: darkMapStyle });
        } else {
            document.documentElement.classList.remove('dark');
            icon.setAttribute('data-lucide', 'moon');
            if(map) map.setOptions({ styles: [] });
        }
        lucide.createIcons();
    });
}

// Gamification: Load Top Owners
async function loadTopOwners() {
    try {
        const res = await fetch('/api/owners/top');
        if (!res.ok) return;
        const owners = await res.json();
        
        const list = document.getElementById('top-owners-list');
        list.innerHTML = '';
        
        if(owners.length === 0) {
            list.innerHTML = '<p class="text-xs text-slate-400">Nadie ha puntuado aún.</p>';
            return;
        }
        
        owners.forEach((owner, idx) => {
            const medals = ['text-yellow-500', 'text-slate-400', 'text-amber-700'];
            const medalColor = medals[idx] || 'text-slate-300';
            const html = `
                <div class="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div class="flex items-center gap-2">
                        <i data-lucide="medal" class="w-4 h-4 ${medalColor}"></i>
                        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">${owner.name}</span>
                    </div>
                    <span class="text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 px-2 py-1 rounded-full">${owner.score} pts</span>
                </div>
            `;
            list.innerHTML += html;
        });
        lucide.createIcons();
    } catch (e) {
        console.error(e);
    }
}

// Authentication
function setupAuthListeners() {
    firebase.auth().onAuthStateChanged((user) => {
        const loginBtn = document.getElementById("login-btn");
        const logoutBtn = document.getElementById("logout-btn");
        const sidebar = document.getElementById("sidebar");
        const userInfo = document.getElementById("user-info");
        const userEmailText = document.getElementById("user-email-text");

        if (user) {
            loginBtn.classList.add("hidden");
            logoutBtn.classList.remove("hidden");
            sidebar.classList.remove("hidden");
            userInfo.classList.remove("hidden");
            userInfo.classList.add("flex");
            userEmailText.textContent = user.email;

            user.getIdToken().then(token => loadIncidents(token));
            
            // Check if owner exists, if not create basic record for gamification
            user.getIdToken().then(async token => {
                const res = await fetch(`/api/owners/${user.uid}`);
                if (!res.ok || !(await res.json())) {
                    if (window.enqueueRequest) {
                        enqueueRequest("/api/owners", "POST", { "Content-Type": "application/json" }, JSON.stringify({ id: user.uid, name: user.displayName || user.email.split('@')[0], email: user.email, score: 0 }), token);
                    }
                }
            });
        } else {
            loginBtn.classList.remove("hidden");
            logoutBtn.classList.add("hidden");
            sidebar.classList.add("hidden");
            userInfo.classList.add("hidden");
            userInfo.classList.remove("flex");
            loadIncidents(null); 
        }
    });

    document.getElementById("login-btn").addEventListener("click", () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider).then((res) => {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Sesión iniciada correctamente', showConfirmButton: false, timer: 3000 });
        }).catch((error) => {
            Swal.fire('Error', 'Login fallido: ' + error.message, 'error');
        });
    });

    document.getElementById("logout-btn").addEventListener("click", () => {
        Swal.fire({
            title: '¿Cerrar sesión?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#0ea5e9',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, salir'
        }).then((result) => {
            if (result.isConfirmed) firebase.auth().signOut();
        });
    });
}

// Load Incidents
async function loadIncidents(token) {
    try {
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const response = await fetch("/api/incidents", { headers });
        if (!response.ok) throw new Error("Failed to fetch incidents");

        allIncidents = await response.json();
        applyFilters();
        connectWebSocket();
    } catch (error) {
        console.error("Error loading incidents:", error);
    }
}

// WebSockets
let stompClient = null;
let reconnectAttempts = 0;

function connectWebSocket() {
    if (stompClient !== null) return;
    const socket = new SockJS('/ws-gpets');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 
    
    updateWSStatus('Reconectando');
    
    stompClient.connect({}, function (frame) {
        reconnectAttempts = 0;
        updateWSStatus('Online');
        stompClient.subscribe('/topic/incidents', function (message) {
            handleRealtimeUpdate(JSON.parse(message.body));
        });
    }, function(error) {
        // Falló la conexión o se cayó
        stompClient = null;
        reconnectAttempts++;
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential Backoff max 30s
        updateWSStatus('Reconectando');
        console.log(`WebSocket caído. Reintentando en ${timeout/1000}s...`);
        setTimeout(connectWebSocket, timeout);
    });
}

function updateWSStatus(status) {
    const el = document.getElementById('status-ws');
    if(el) {
        if(status === 'Online') {
            el.innerHTML = `<span class="w-2 h-2 rounded-full bg-green-500"></span> Conectado`;
            el.className = "flex items-center gap-1 text-green-600";
        } else {
            el.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Reconectando`;
            el.className = "flex items-center gap-1 text-amber-500";
        }
    }
}

function handleRealtimeUpdate(incident) {
    const typeLabels = {
        'LOST': 'Mascota Perdida',
        'FOUND': 'Mascota Encontrada',
        'SIGHTING': 'Avistamiento',
        'ADOPTION': 'En Adopción'
    };
    const tipo = typeLabels[incident.type] || incident.type;
    
    Swal.fire({ toast: true, position: 'bottom-end', icon: 'info', title: `Nuevo evento en el radar`, text: tipo, showConfirmButton: false, timer: 4000 });
    
    const idx = allIncidents.findIndex(i => i.id === incident.id);
    if (idx !== -1) allIncidents[idx] = incident;
    else allIncidents.push(incident);
    
    applyFilters();
    loadTopOwners(); // Update rankings dynamically
}

// Search and Filters
function setupFilters() {
    const searchInput = document.getElementById("search-input");
    const statusSelect = document.getElementById("status-filter");
    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (statusSelect) statusSelect.addEventListener("change", applyFilters);
}

function applyFilters() {
    const searchInput = document.getElementById("search-input");
    const statusSelect = document.getElementById("status-filter");
    if (!searchInput || !statusSelect) {
        if (allIncidents) { updateMap(allIncidents); updateFeed(allIncidents); }
        return;
    }
    if (!allIncidents) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = statusSelect.value;

    const filtered = allIncidents.filter(inc => {
        const name = (inc.petName || "").toLowerCase();
        const breed = (inc.petBreed || "").toLowerCase();
        const matchesSearch = name.includes(searchTerm) || breed.includes(searchTerm);
        
        let matchesStatus = true;
        if (statusFilter !== 'all') {
            // Mapeamos los viejos estados del select al nuevo modelo
            if (statusFilter === 'Perdido' && inc.type !== 'LOST') matchesStatus = false;
            if (statusFilter === 'Encontrado' && inc.type !== 'FOUND') matchesStatus = false;
            if (statusFilter === 'Adopción' && inc.type !== 'ADOPTION') matchesStatus = false;
        }
        
        return matchesSearch && matchesStatus;
    });

    updateMap(filtered);
    updateFeed(filtered);

    // Auto Zoom
    if (filtered.length === 1 && searchTerm !== "") {
        const inc = filtered[0];
        if (inc.location && map) {
            map.panTo({ lat: inc.location.latitude, lng: inc.location.longitude });
            map.setZoom(16);
            const marker = markers.find(m => m.incidentId === inc.id);
            if (marker) google.maps.event.trigger(marker, 'click');
        }
    }
}

// Map Rendering & Clustering
function updateMap(incidents) {
    clearMarkers();
    incidents.forEach(inc => {
        // Ocultar incidentes resueltos del mapa para evitar saturación
        if (inc.status === 'CLOSED') return;
        
        if (inc.location) {
            
            // Dynamic Icon based on Incident Type
            let iconColor = "#0ea5e9"; // Default SIGHTING (Blue)
            if (inc.status === 'CLOSED') {
                iconColor = "#94a3b8"; // Gray for closed
            } else {
                if (inc.type === 'LOST') iconColor = "#ef4444"; // Red
                if (inc.type === 'FOUND') iconColor = "#22c55e"; // Green
                if (inc.type === 'ADOPTION') iconColor = "#a855f7"; // Purple
            }
            
            const customPin = { ...pinSymbol, fillColor: iconColor };

            const marker = new google.maps.Marker({
                position: { lat: inc.location.latitude, lng: inc.location.longitude },
                map: map,
                title: inc.petName || 'Mascota',
                icon: customPin,
                incidentId: inc.id
            });

            // Generate Timeline HTML
            let timelineHtml = '';
            if (inc.timeline && inc.timeline.length > 0) {
                timelineHtml = '<div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto custom-scrollbar"><p class="text-xs font-bold text-slate-500 mb-2">LÍNEA DE TIEMPO:</p>';
                inc.timeline.forEach(s => {
                    const d = new Date(s.date).toLocaleDateString();
                    timelineHtml += `<div class="mb-2 text-xs text-slate-600 dark:text-slate-300">
                        <span class="font-bold">${d} - ${s.status}:</span> ${s.comment}
                    </div>`;
                });
                timelineHtml += '</div>';
            }
            
            const btnPoster = inc.type === 'LOST' && inc.status === 'OPEN' ? 
                `<button onclick="generatePoster('${inc.id}')" class="mt-2 w-full bg-red-100 hover:bg-red-200 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"><i data-lucide="printer" class="w-3 h-3"></i> Generar Póster</button>` : '';

            const btnResolve = inc.status === 'OPEN' ?
                `<button onclick="resolveIncident('${inc.id}')" class="mt-2 w-full bg-green-100 hover:bg-green-200 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"><i data-lucide="check-circle" class="w-3 h-3"></i> Dar por terminado</button>` : '';

            // Map Type to Spanish UI Text
            const typeLabels = {
                'LOST': '<span class="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 px-2 py-0.5 rounded-full">Perdido</span>',
                'FOUND': '<span class="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2 py-0.5 rounded-full">Encontrado</span>',
                'SIGHTING': '<span class="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">Avistamiento</span>',
                'ADOPTION': '<span class="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 px-2 py-0.5 rounded-full">Adopción</span>'
            };
            
            const statusBadge = inc.status === 'CLOSED' ? 
                '<span class="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-bold ml-2">RESUELTO</span>' : '';

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="w-64 bg-white dark:bg-slate-900 overflow-hidden text-slate-800 dark:text-slate-100">
                        ${inc.imageUrl ? `<img src="${inc.imageUrl}" class="w-full h-32 object-cover" alt="Foto">` : `<div class="w-full h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"><i data-lucide="image-off" class="w-8 h-8"></i></div>`}
                        <div class="p-4">
                            <h3 class="font-bold text-lg flex items-center">${inc.petName || 'Sin Nombre'} ${statusBadge}</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 mb-2">${inc.petBreed || 'Desconocido'}</p>
                            <div class="mb-3 text-xs font-medium">${typeLabels[inc.type] || ''}</div>
                            <p class="text-xs text-slate-600 dark:text-slate-400 italic mb-2">${inc.description || ''}</p>
                            
                            ${inc.status === 'OPEN' ? `
                            <button onclick="addSightingToIncident('${inc.id}')" class="mt-2 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                                <i data-lucide="eye" class="w-3 h-3"></i> Vi a este animal
                            </button>
                            ` : ''}
                            ${btnResolve}
                            ${btnPoster}
                            ${timelineHtml}
                        </div>
                    </div>
                `
            });

            marker.addListener("click", () => {
                infoWindow.open(map, marker);
                setTimeout(() => lucide.createIcons(), 50);
            });

            markers.push(marker);
        }
    });

    // Initialize Clustering
    if (markerCluster) {
        markerCluster.clearMarkers();
    }
    // Using @googlemaps/markerclusterer
    markerCluster = new markerClusterer.MarkerClusterer({ map, markers });
}

function clearMarkers() {
    if (markerCluster) {
        markerCluster.clearMarkers();
    } else {
        markers.forEach(m => m.setMap(null));
    }
    markers = [];
}

// Poster Generator
window.generatePoster = async (incidentId) => {
    const inc = allIncidents.find(p => p.id === incidentId);
    if(!inc) return;

    Swal.fire({ title: 'Generando Póster...', allowEscapeKey: false, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    document.getElementById('poster-name').textContent = inc.petName || 'Mascota';
    document.getElementById('poster-img').src = inc.imageUrl || 'https://via.placeholder.com/600x600?text=SIN+FOTO';
    document.getElementById('poster-qr').innerHTML = '';
    
    // Generate QR
    const url = window.location.href; 
    new QRCode(document.getElementById("poster-qr"), { text: url, width: 180, height: 180 });
    
    setTimeout(() => {
        const template = document.getElementById('poster-template');
        html2canvas(template, { scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Se_Busca_${inc.petName || 'Mascota'}.png`;
            link.href = canvas.toDataURL();
            link.click();
            Swal.close();
        });
    }, 1000); // Give time for QR and Image to load
}

// Sighting Update to Incident
window.addSightingToIncident = async (incidentId) => {
    const user = firebase.auth().currentUser;
    if (!user) {
        Swal.fire('Atención', 'Debes iniciar sesión para reportar.', 'warning');
        return;
    }

    const { value: formValues } = await Swal.fire({
        title: 'Reportar Avistamiento',
        html:
            '<select id="swal-status" class="w-full px-3 py-2 border rounded-lg text-sm mb-3">' +
                '<option value="Visto">Lo vi pasar</option>' +
                '<option value="Encontrado">Lo atrapé / Lo tengo</option>' +
            '</select>' +
            '<textarea id="swal-comment" placeholder="Comentario u observación (ej. Lo vi corriendo por la avenida)..." class="w-full px-3 py-2 border rounded-lg text-sm"></textarea>',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar Avistamiento',
        preConfirm: () => {
            return {
                status: document.getElementById('swal-status').value,
                comment: document.getElementById('swal-comment').value
            }
        }
    });

    if (formValues) {
        try {
            const token = await user.getIdToken();
            // Optimistic UI Update
            const currentInc = allIncidents.find(p => p.id === incidentId);
            
            // Add Sighting
            if (!currentInc.timeline) currentInc.timeline = [];
            currentInc.timeline.push({
                date: new Date().toISOString(),
                status: formValues.status,
                comment: formValues.comment || 'Sin comentarios',
                reportedBy: user.uid
            });
            
            // Re-render UI immediately
            applyFilters();
            
            // Enqueue Operation Offline-First
            if (window.enqueueRequest) {
                enqueueRequest("/api/incidents", "POST", { "Content-Type": "application/json" }, JSON.stringify(currentInc), token);
            }
            
            // Increment Score!
            const ownerRes = await fetch(`/api/owners/${user.uid}`);
            if (ownerRes.ok) {
                const owner = await ownerRes.json();
                if(owner) {
                    owner.score = (owner.score || 0) + 10; // +10 Points
                    if (window.enqueueRequest) {
                        enqueueRequest("/api/owners", "POST", { "Content-Type": "application/json" }, JSON.stringify(owner), token);
                    }
                }
            }
            
            Swal.fire('¡Gracias!', 'Has actualizado el estado optimistamente (Sincronización en proceso).', 'success');
        } catch (error) {
            Swal.fire('Error', 'Hubo un problema actualizando el estado.', 'error');
        }
    }
}

// Resolve Incident
window.resolveIncident = async (incidentId) => {
    const user = firebase.auth().currentUser;
    if (!user) {
        Swal.fire('Atención', 'Debes iniciar sesión para realizar esta acción.', 'warning');
        return;
    }
    
    const currentInc = allIncidents.find(p => p.id === incidentId);
    if (!currentInc) return;
    
    if (currentInc.reporterId !== user.uid) {
        Swal.fire('Acceso denegado', 'Solo la persona que reportó este incidente puede darlo por terminado.', 'error');
        return;
    }

    const { isConfirmed } = await Swal.fire({
        title: '¿Dar por terminado?',
        text: 'El caso se marcará como Resuelto y dejará de estar activo.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, terminar',
        cancelButtonText: 'Cancelar'
    });

    if (isConfirmed) {
        try {
            const token = await user.getIdToken();
            currentInc.status = 'CLOSED';
            
            if (!currentInc.timeline) currentInc.timeline = [];
            currentInc.timeline.push({
                date: new Date().toISOString(),
                status: 'Resuelto',
                comment: 'El incidente ha sido dado por terminado.',
                reportedBy: user.uid
            });
            
            applyFilters();
            
            if (window.enqueueRequest) {
                enqueueRequest("/api/incidents", "POST", { "Content-Type": "application/json" }, JSON.stringify(currentInc), token);
            }
            
            Swal.fire('Resuelto', 'El incidente se ha cerrado exitosamente.', 'success');
        } catch (error) {
            Swal.fire('Error', 'Hubo un problema cerrando el caso.', 'error');
        }
    }
}

// History Modal
window.openHistoryModal = () => {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';
    
    const closedIncidents = allIncidents.filter(inc => inc.status === 'CLOSED').sort((a, b) => b.timestamp - a.timestamp);
    
    if (closedIncidents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">No hay casos resueltos aún.</td></tr>';
    } else {
        closedIncidents.forEach(inc => {
            let timelineHtml = '<ul class="list-disc pl-4 space-y-1 text-xs">';
            if (inc.timeline) {
                inc.timeline.forEach(t => {
                    const d = new Date(t.date).toLocaleDateString();
                    timelineHtml += `<li><strong>${d} [${t.status}]:</strong> ${t.comment}</li>`;
                });
            }
            timelineHtml += '</ul>';
            
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors";
            tr.innerHTML = `
                <td class="py-3 px-4 align-top w-1/4">
                    <span class="block text-xs font-mono text-slate-400 mb-1" title="${inc.id}">${inc.id.substring(0, 8)}...</span>
                    <span class="block text-sm whitespace-nowrap">${new Date(inc.timestamp).toLocaleDateString()}</span>
                </td>
                <td class="py-3 px-4 align-top w-1/4">
                    <div class="flex items-center gap-3">
                        ${inc.imageUrl ? `<img src="${inc.imageUrl}" class="w-10 h-10 rounded-lg object-cover">` : `<div class="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><i data-lucide="image-off" class="w-4 h-4 text-slate-400"></i></div>`}
                        <div>
                            <p class="font-bold">${inc.petName || 'N/A'}</p>
                            <p class="text-xs text-slate-500">${inc.petBreed || 'N/A'}</p>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-4 align-top w-1/6">
                    <span class="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-md text-xs font-semibold">${inc.type}</span>
                </td>
                <td class="py-3 px-4 align-top w-1/3">
                    ${timelineHtml}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    document.getElementById('history-modal').classList.remove('hidden');
    document.getElementById('history-modal').classList.add('flex');
    lucide.createIcons();
}

window.closeHistoryModal = () => {
    document.getElementById('history-modal').classList.add('hidden');
    document.getElementById('history-modal').classList.remove('flex');
}

// Feed UI (Social Media Style)
function updateFeed(incidents) {
    const list = document.getElementById("incident-feed");
    if(!list) return;
    list.innerHTML = "";
    
    if (incidents.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-400 text-center py-4">No hay incidentes reportados.</p>';
        return;
    }
    
    // Sort by newest first
    const sorted = [...incidents].sort((a,b) => b.timestamp - a.timestamp);
    
    sorted.forEach(inc => {
        // Feed UI configurations per Type
        let iconHtml = '';
        let titleHtml = '';
        let borderClass = '';
        
        if (inc.status === 'CLOSED') {
            iconHtml = '<div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0"><i data-lucide="check-circle" class="w-5 h-5"></i></div>';
            titleHtml = `🎉 <span class="font-bold">${inc.petName || 'Mascota'}</span>: Caso Resuelto`;
            borderClass = 'border-l-4 border-l-slate-400 opacity-60';
        } else if (inc.type === 'LOST') {
            iconHtml = '<div class="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0"><i data-lucide="alert-triangle" class="w-5 h-5"></i></div>';
            titleHtml = `🚨 <span class="font-bold">${inc.petName || 'Mascota'}</span> reportado/a perdido`;
            borderClass = 'border-l-4 border-l-red-500';
        } else if (inc.type === 'FOUND') {
            iconHtml = '<div class="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><i data-lucide="search" class="w-5 h-5"></i></div>';
            titleHtml = `🔍 Mascota encontrada (${inc.petBreed || 'Desconocido'})`;
            borderClass = 'border-l-4 border-l-green-500';
        } else if (inc.type === 'SIGHTING') {
            iconHtml = '<div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><i data-lucide="eye" class="w-5 h-5"></i></div>';
            titleHtml = `👀 Posible avistamiento`;
            borderClass = 'border-l-4 border-l-blue-500';
        } else if (inc.type === 'ADOPTION') {
            iconHtml = '<div class="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0"><i data-lucide="heart" class="w-5 h-5"></i></div>';
            titleHtml = `❤️ <span class="font-bold">${inc.petName || 'Mascota'}</span> busca hogar`;
            borderClass = 'border-l-4 border-l-purple-500';
        }

        const timeString = new Date(inc.timestamp).toLocaleDateString();

        const div = document.createElement("div");
        div.className = `p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer ${borderClass}`;
        
        div.innerHTML = `
            <div class="flex items-start gap-3">
                ${iconHtml}
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-slate-800 dark:text-slate-100">${titleHtml}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${inc.description || 'Sin descripción'}</p>
                    <p class="text-[10px] text-slate-400 mt-2 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> ${timeString}</p>
                </div>
                ${inc.imageUrl ? `<img src="${inc.imageUrl}" class="w-16 h-16 rounded-lg object-cover shrink-0 ml-2">` : ''}
            </div>
        `;
        
        div.addEventListener("click", () => {
            if (inc.location && map) {
                map.panTo({ lat: inc.location.latitude, lng: inc.location.longitude });
                map.setZoom(16);
                const marker = markers.find(m => m.incidentId === inc.id);
                if (marker) google.maps.event.trigger(marker, 'click');
            }
        });

        list.appendChild(div);
    });
    lucide.createIcons();
}

let currentImageBase64 = null;
function setupImagePreview() {
    const input = document.getElementById('incident-image');
    const preview = document.getElementById('incident-image-preview');

    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.src = e.target.result;
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX = 500;
                    let width = img.width, height = img.height;
                    if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } } 
                    else { if (height > MAX) { width *= MAX / height; height = MAX; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    currentImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    preview.src = currentImageBase64;
                    preview.classList.remove('hidden');
                }
            }
            reader.readAsDataURL(file);
        }
    });
}

// Modals and New Forms Flow
window.openIncidentModal = (type) => {
    document.getElementById('incident-type').value = type;
    document.getElementById('incident-modal').classList.remove('hidden');
    document.getElementById('incident-modal').classList.add('flex');
    
    // Adjust UI text based on intention
    const titleEl = document.getElementById('modal-title');
    const nameField = document.getElementById('field-name');
    
    if(type === 'LOST') {
        titleEl.textContent = 'Perdí mi mascota';
        nameField.classList.remove('hidden');
    } else if (type === 'FOUND') {
        titleEl.textContent = 'Encontré una mascota';
        nameField.classList.add('hidden');
    } else if (type === 'SIGHTING') {
        titleEl.textContent = 'Reportar Avistamiento';
        nameField.classList.add('hidden');
    } else if (type === 'ADOPTION') {
        titleEl.textContent = 'Dar en Adopción';
        nameField.classList.remove('hidden');
    }
}

window.closeIncidentModal = () => {
    document.getElementById('incident-modal').classList.add('hidden');
    document.getElementById('incident-modal').classList.remove('flex');
    document.getElementById('incident-form').reset();
    currentImageBase64 = null;
    document.getElementById('incident-image-preview').classList.add('hidden');
}

// Map Location Select from Modal
document.getElementById('incident-btn-gps').addEventListener('click', () => {
    if (navigator.geolocation) {
        Swal.fire({ title: 'Obteniendo GPS...', didOpen: () => Swal.showLoading() });
        navigator.geolocation.getCurrentPosition(pos => {
            Swal.close();
            placeSelectionMarker(pos.coords.latitude, pos.coords.longitude);
            document.getElementById('incident-gps-hint').innerHTML = `<span class="text-green-600 font-bold">✓ Ubicación capturada (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})</span>`;
            map.setZoom(16);
        }, err => Swal.fire('Error', 'No se pudo obtener el GPS', 'error'), { enableHighAccuracy: true });
    }
});

// Submit Incident Form
document.getElementById("incident-submit-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    const user = firebase.auth().currentUser;
    if (!user) { Swal.fire('No Autenticado', 'Inicia sesión para reportar', 'warning'); return; }
    if (!selectedLocation) { Swal.fire('Ubicación requerida', 'Por favor usa el GPS o selecciona en el mapa.', 'info'); return; }

    const type = document.getElementById('incident-type').value;
    const token = await user.getIdToken();
    
    const incidentData = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'temp-' + Date.now(),
        type: type,
        petName: document.getElementById("incident-name").value,
        petBreed: document.getElementById("incident-breed").value,
        description: document.getElementById("incident-desc").value,
        status: "OPEN",
        reporterId: user.uid,
        location: selectedLocation,
        imageUrl: currentImageBase64,
        timestamp: Date.now(),
        timeline: [{
            date: new Date().toISOString(),
            status: type === 'LOST' ? 'Perdido' : type === 'FOUND' ? 'Encontrado' : 'Registro',
            comment: "Registro Inicial del Incidente",
            reportedBy: user.uid
        }]
    };

    // Optimistic UI
    allIncidents.push(incidentData);
    applyFilters();

    try {
        if (window.enqueueRequest) {
            enqueueRequest("/api/incidents", "POST", { "Content-Type": "application/json" }, JSON.stringify(incidentData), token);
        }
        
        // Add +50 points
        const ownerRes = await fetch(`/api/owners/${user.uid}`);
        if (ownerRes.ok) {
            const owner = await ownerRes.json();
            if(owner) {
                owner.score = (owner.score || 0) + 50; 
                if (window.enqueueRequest) {
                    enqueueRequest("/api/owners", "POST", { "Content-Type": "application/json" }, JSON.stringify(owner), token);
                }
            }
        }

        Swal.fire('¡Incidente Registrado!', 'Reporte publicado en la red (Offline-Ready).', 'success');
        closeIncidentModal();
        if (selectionMarker) selectionMarker.setMap(null);
        selectedLocation = null;
    } catch (error) { Swal.fire('Error', 'Error de red.', 'error'); }
});
