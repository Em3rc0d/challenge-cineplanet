// Global Variables
let map;
let markers = [];
let markerCluster = null;
let allPetsData = [];
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

            user.getIdToken().then(token => loadPets(token));
            
            // Check if owner exists, if not create basic record for gamification
            user.getIdToken().then(async token => {
                const res = await fetch(`/api/owners/${user.uid}`);
                if (!res.ok || !(await res.json())) {
                    fetch("/api/owners", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify({ id: user.uid, name: user.displayName || user.email.split('@')[0], email: user.email, score: 0 })
                    });
                }
            });
        } else {
            loginBtn.classList.remove("hidden");
            logoutBtn.classList.add("hidden");
            sidebar.classList.add("hidden");
            userInfo.classList.add("hidden");
            userInfo.classList.remove("flex");
            loadPets(null); 
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

// Load Pets
async function loadPets(token) {
    try {
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const response = await fetch("/api/pets", { headers });
        if (!response.ok) throw new Error("Failed to fetch pets");

        allPetsData = await response.json();
        applyFilters();
        connectWebSocket();
    } catch (error) {
        console.error("Error loading pets:", error);
    }
}

// WebSockets
let stompClient = null;
function connectWebSocket() {
    if (stompClient !== null) return;
    const socket = new SockJS('/ws-gpets');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 
    stompClient.connect({}, function (frame) {
        stompClient.subscribe('/topic/pets', function (petC) {
            handleRealtimeUpdate(JSON.parse(petC.body));
        });
    });
}

function handleRealtimeUpdate(pet) {
    Swal.fire({ toast: true, position: 'bottom-end', icon: 'info', title: `Mascota actualizada: ${pet.name}`, text: `Estado: ${pet.status}`, showConfirmButton: false, timer: 4000 });
    
    const idx = allPetsData.findIndex(p => p.id === pet.id);
    if (idx !== -1) allPetsData[idx] = pet;
    else allPetsData.push(pet);
    
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
        if (allPetsData) { updateMap(allPetsData); updatePetList(allPetsData); }
        return;
    }
    if (!allPetsData) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = statusSelect.value;

    const filteredPets = allPetsData.filter(pet => {
        const name = (pet.name || "").toLowerCase();
        const breed = (pet.breed || "").toLowerCase();
        const matchesSearch = name.includes(searchTerm) || breed.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || pet.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    updateMap(filteredPets);
    updatePetList(filteredPets);

    // Auto Zoom
    if (filteredPets.length === 1 && searchTerm !== "") {
        const pet = filteredPets[0];
        if (pet.location && map) {
            map.panTo({ lat: pet.location.latitude, lng: pet.location.longitude });
            map.setZoom(16);
            const marker = markers.find(m => m.petId === pet.id);
            if (marker) google.maps.event.trigger(marker, 'click');
        }
    }
}

// Map Rendering & Clustering
function updateMap(pets) {
    clearMarkers();
    pets.forEach(pet => {
        if (pet.location) {
            const marker = new google.maps.Marker({
                position: { lat: pet.location.latitude, lng: pet.location.longitude },
                map: map,
                title: pet.name,
                petId: pet.id
            });

            // Generate Timeline HTML
            let timelineHtml = '';
            if (pet.sightings && pet.sightings.length > 0) {
                timelineHtml = '<div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto custom-scrollbar"><p class="text-xs font-bold text-slate-500 mb-2">LÍNEA DE TIEMPO:</p>';
                pet.sightings.forEach(s => {
                    const d = new Date(s.date).toLocaleDateString();
                    timelineHtml += `<div class="mb-2 text-xs text-slate-600 dark:text-slate-300">
                        <span class="font-bold">${d} - ${s.status}:</span> ${s.comment}
                    </div>`;
                });
                timelineHtml += '</div>';
            }
            
            const btnPoster = pet.status === 'Perdido' ? 
                `<button onclick="generatePoster('${pet.id}')" class="mt-2 w-full bg-red-100 hover:bg-red-200 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"><i data-lucide="printer" class="w-3 h-3"></i> Generar Póster</button>` : '';

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="w-64 bg-white dark:bg-slate-900 overflow-hidden text-slate-800 dark:text-slate-100">
                        ${pet.imageUrl ? `<img src="${pet.imageUrl}" class="w-full h-32 object-cover" alt="Foto">` : `<div class="w-full h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"><i data-lucide="image-off" class="w-8 h-8"></i></div>`}
                        <div class="p-4">
                            <h3 class="font-bold text-lg">${pet.name}</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 mb-2">${pet.breed}</p>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pet.status === 'Perdido' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}">
                                ${pet.status}
                            </span>
                            
                            <button onclick="updatePetStatus('${pet.id}')" class="mt-4 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                                <i data-lucide="refresh-cw" class="w-3 h-3"></i> Actualizar Estado
                            </button>
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
window.generatePoster = async (petId) => {
    const pet = allPetsData.find(p => p.id === petId);
    if(!pet) return;

    Swal.fire({ title: 'Generando Póster...', allowEscapeKey: false, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    document.getElementById('poster-name').textContent = pet.name;
    document.getElementById('poster-img').src = pet.imageUrl || 'https://via.placeholder.com/600x600?text=SIN+FOTO';
    document.getElementById('poster-qr').innerHTML = '';
    
    // Generate QR (assuming app is deployed at the host domain)
    const url = window.location.href; 
    new QRCode(document.getElementById("poster-qr"), { text: url, width: 180, height: 180 });
    
    setTimeout(() => {
        const template = document.getElementById('poster-template');
        html2canvas(template, { scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Se_Busca_${pet.name}.png`;
            link.href = canvas.toDataURL();
            link.click();
            Swal.close();
        });
    }, 1000); // Give time for QR and Image to load
}

// Gamification: Update Status & Add Score
window.updatePetStatus = async (petId) => {
    const user = firebase.auth().currentUser;
    if (!user) {
        Swal.fire('Atención', 'Debes iniciar sesión para actualizar el estado.', 'warning');
        return;
    }

    const { value: formValues } = await Swal.fire({
        title: 'Actualizar Estado',
        html:
            '<select id="swal-status" class="w-full px-3 py-2 border rounded-lg text-sm mb-3">' +
                '<option value="Perdido">Perdido</option>' +
                '<option value="Encontrado">Encontrado</option>' +
                '<option value="Adopción">En Adopción</option>' +
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
            const currentPet = allPetsData.find(p => p.id === petId);
            currentPet.status = formValues.status;
            
            // Add Sighting
            if (!currentPet.sightings) currentPet.sightings = [];
            currentPet.sightings.push({
                date: new Date().toISOString(),
                status: formValues.status,
                comment: formValues.comment || 'Sin comentarios',
                reportedBy: user.uid
            });
            
            const updateRes = await fetch("/api/pets", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(currentPet)
            });

            if (updateRes.ok) {
                // Increment Score!
                const ownerRes = await fetch(`/api/owners/${user.uid}`);
                if (ownerRes.ok) {
                    const owner = await ownerRes.json();
                    if(owner) {
                        owner.score = (owner.score || 0) + 10; // +10 Points
                        fetch("/api/owners", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                            body: JSON.stringify(owner)
                        });
                    }
                }
                
                Swal.fire('¡Gracias!', 'Has actualizado el estado y ganado 10 puntos de rescatista.', 'success');
            } else {
                throw new Error("Update failed");
            }
        } catch (error) {
            Swal.fire('Error', 'Hubo un problema actualizando el estado.', 'error');
        }
    }
}

// UI Rendering
function updatePetList(pets) {
    const list = document.getElementById("pet-list");
    list.innerHTML = "";
    if (pets.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-400 text-center py-4">No hay mascotas registradas.</p>';
        return;
    }
    pets.forEach(pet => {
        const div = document.createElement("div");
        div.className = "p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm hover:shadow-md transition-shadow";
        div.innerHTML = `
            ${pet.imageUrl ? `<img src="${pet.imageUrl}" class="w-12 h-12 rounded-lg object-cover shrink-0">` : `<div class="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0"><i data-lucide="paw-print" class="w-5 h-5 text-slate-400"></i></div>`}
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">${pet.name}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 truncate">${pet.breed}</p>
            </div>
            <span class="inline-flex shrink-0 items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${pet.status === 'Perdido' ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/30 dark:border-red-800' : 'bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/30 dark:border-green-800'}">
                ${pet.status}
            </span>
        `;
        list.appendChild(div);
    });
    lucide.createIcons();
}

let currentImageBase64 = null;
function setupImagePreview() {
    const input = document.getElementById('pet-image');
    const preview = document.getElementById('image-preview');

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

document.getElementById("pet-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = firebase.auth().currentUser;
    if (!user) { Swal.fire('No Autenticado', 'Inicia sesión para reportar', 'warning'); return; }
    if (!selectedLocation) { Swal.fire('Ubicación requerida', 'Por favor selecciona la ubicación (Click en GPS o Mapa).', 'info'); return; }

    const token = await user.getIdToken();
    const petData = {
        name: document.getElementById("pet-name").value,
        breed: document.getElementById("pet-breed").value,
        status: document.getElementById("pet-status").value,
        ownerId: user.uid,
        location: selectedLocation,
        imageUrl: currentImageBase64,
        sightings: [{
            date: new Date().toISOString(),
            status: document.getElementById("pet-status").value,
            comment: "Registro Inicial",
            reportedBy: user.uid
        }]
    };

    try {
        const response = await fetch("/api/pets", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify(petData) });
        if (response.ok) {
            
            // Add +50 points for registering a new pet
            const ownerRes = await fetch(`/api/owners/${user.uid}`);
            if (ownerRes.ok) {
                const owner = await ownerRes.json();
                if(owner) {
                    owner.score = (owner.score || 0) + 50; 
                    fetch("/api/owners", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify(owner) });
                }
            }

            Swal.fire('¡Mascota Registrada!', 'Ganas 50 puntos.', 'success');
            e.target.reset();
            currentImageBase64 = null;
            document.getElementById('image-preview').classList.add('hidden');
            if (selectionMarker) selectionMarker.setMap(null);
            selectedLocation = null;
            document.getElementById("location-hint").className = "bg-sky-50 dark:bg-sky-900/30 border border-sky-100 dark:border-sky-800/50 text-sky-700 dark:text-sky-300 text-xs p-3 rounded-lg flex items-start gap-2 shadow-sm animate-pulse";
            document.getElementById("location-hint").innerHTML = `<i data-lucide="map-pin" class="w-4 h-4 shrink-0 mt-0.5"></i><p>Haz clic en el mapa para establecer la ubicación exacta.</p>`;
            lucide.createIcons();
            loadPets(token); 
        } else Swal.fire('Error', 'Fallo al registrar.', 'error');
    } catch (error) { Swal.fire('Error', 'Error de red.', 'error'); }
});
