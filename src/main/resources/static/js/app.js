// Global Variables
let map;
let markers = [];
let selectedLocation = null;
let selectionMarker = null;

// Custom SVG Icon (Pin)
const pinSymbol = {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
    fillColor: "#2c3e50", // Primary Theme Color
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: "#ffffff",
    scale: 2,
    anchor: { x: 12, y: 22 }, // Anchor to bottom tip
    labelOrigin: { x: 12, y: 10 }
};

// Initialize App
async function initApp() {
    try {
        const response = await fetch("/api/config");
        if (!response.ok) throw new Error("Failed to load configuration");

        const config = await response.json();

        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(config.firebaseConfig);
        }

        // Setup Auth Listeners AFTER initialization
        setupAuthListeners();

        // Load Google Maps
        loadGoogleMaps(config.googleMapsApiKey);

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

// Start Initialization
initApp();

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -12.0464, lng: -77.0428 }, // Lima, Peru
        zoom: 12,
        draggableCursor: 'crosshair', // Visual cue for selection
        clickableIcons: false // Reduce clutter
    });

    map.addListener("click", (e) => {
        selectedLocation = {
            latitude: e.latLng.lat(),
            longitude: e.latLng.lng()
        };

        // Remove previous selection marker if it exists
        if (selectionMarker) {
            selectionMarker.setMap(null);
        }

        // Add new custom marker
        selectionMarker = new google.maps.Marker({
            position: e.latLng,
            map: map,
            title: "Selected Location",
            animation: google.maps.Animation.DROP,
            icon: pinSymbol,
            label: {
                text: "✓",
                color: "white",
                fontSize: "12px",
                fontWeight: "bold"
            }
        });
    });
}

function setupAuthListeners() {
    // Auth State Listener
    firebase.auth().onAuthStateChanged((user) => {
        const loginBtn = document.getElementById("login-btn");
        const logoutBtn = document.getElementById("logout-btn");
        const sidebar = document.getElementById("sidebar");
        const userInfo = document.getElementById("user-info");

        if (user) {
            loginBtn.classList.add("hidden");
            logoutBtn.classList.remove("hidden");
            sidebar.style.display = "flex";
            userInfo.textContent = `Hello, ${user.displayName}`;

            // Fetch Token and call API
            user.getIdToken().then((token) => {
                loadPets(token);
            });

        } else {
            loginBtn.classList.remove("hidden");
            logoutBtn.classList.add("hidden");
            sidebar.style.display = "none";
            userInfo.textContent = "";
            clearMarkers();
        }
    });

    // Login
    document.getElementById("login-btn").addEventListener("click", () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider).catch((error) => {
            console.error("Login failed:", error);
            alert("Login failed: " + error.message);
        });
    });

    // Logout
    document.getElementById("logout-btn").addEventListener("click", () => {
        firebase.auth().signOut();
    });
}

// Load Pets
async function loadPets(token) {
    try {
        const response = await fetch("/api/pets", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Failed to fetch pets");

        const pets = await response.json();
        updateMap(pets);
        updatePetList(pets);

        // Connect WebSocket
        connectWebSocket();

    } catch (error) {
        console.error("Error loading pets:", error);
    }
}

// WebSocket Connection
let stompClient = null;

function connectWebSocket() {
    if (stompClient !== null) return;

    const socket = new SockJS('/ws-gpets');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Disable debug logs

    stompClient.connect({}, function (frame) {
        console.log('Connected: ' + frame);
        stompClient.subscribe('/topic/pets', function (petC) {
            handleRealtimeUpdate(JSON.parse(petC.body));
        });
    });
}

function handleRealtimeUpdate(pet) {
    // Check if pet already exists in markers/list to update or add
    const existingMarkerIndex = markers.findIndex(m => m.getTitle() === pet.name); // Simple check by name for now, better by ID

    // For simplicity in this challenge, we just reload the whole list or append
    // Ideally we update the specific item. Let's append/update map.

    if (pet.location) {
        // Remove existing marker if any (simple approach)
        if (existingMarkerIndex !== -1) {
            markers[existingMarkerIndex].setMap(null);
            markers.splice(existingMarkerIndex, 1);
        }

        const marker = new google.maps.Marker({
            position: { lat: pet.location.latitude, lng: pet.location.longitude },
            map: map,
            title: pet.name
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div>
                    <h3>${pet.name}</h3>
                    <p>Breed: ${pet.breed}</p>
                    <p>Status: ${pet.status}</p>
                </div>
            `
        });

        marker.addListener("click", () => {
            infoWindow.open(map, marker);
        });

        markers.push(marker);
    }

    // Update List
    const list = document.getElementById("pet-list");
    // Check if element exists
    // For now, just append to keep it simple as requested
    const div = document.createElement("div");
    div.className = "pet-card";
    div.innerHTML = `<strong>${pet.name}</strong> (${pet.breed})<br>${pet.status}`;
    list.appendChild(div);
}

// Update Map Makers
function updateMap(pets) {
    clearMarkers();
    pets.forEach(pet => {
        if (pet.location) {
            const marker = new google.maps.Marker({
                position: { lat: pet.location.latitude, lng: pet.location.longitude },
                map: map,
                title: pet.name
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div>
                        <h3>${pet.name}</h3>
                        <p>Breed: ${pet.breed}</p>
                        <p>Status: ${pet.status}</p>
                    </div>
                `
            });

            marker.addListener("click", () => {
                infoWindow.open(map, marker);
            });

            markers.push(marker);
        }
    });
}

function clearMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}

// Update Sidebar List
function updatePetList(pets) {
    const list = document.getElementById("pet-list");
    list.innerHTML = "";
    pets.forEach(pet => {
        const div = document.createElement("div");
        div.className = "pet-card";
        div.innerHTML = `<strong>${pet.name}</strong> (${pet.breed})<br>${pet.status}`;
        list.appendChild(div);
    });
}

// Register Owner Form
document.getElementById("owner-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = firebase.auth().currentUser;
    if (!user) return;

    const token = await user.getIdToken();
    const ownerData = {
        name: document.getElementById("owner-name").value,
        email: user.email,
        phoneNumber: document.getElementById("owner-phone").value,
        address: document.getElementById("owner-address").value,
        id: user.uid // Use Firebase UID as Owner ID
    };

    try {
        const response = await fetch("/api/owners", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(ownerData)
        });

        if (response.ok) {
            alert("Owner registered successfully!");
            e.target.reset();
        } else {
            alert("Registration failed");
        }
    } catch (error) {
        console.error("Error registering owner:", error);
    }
});

// Register Pet Form
document.getElementById("pet-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Please login first");
        return;
    }

    if (!selectedLocation) {
        alert("Please click on the map to select a location for the pet.");
        return;
    }

    const token = await user.getIdToken();
    const petData = {
        name: document.getElementById("pet-name").value,
        breed: document.getElementById("pet-breed").value,
        status: document.getElementById("pet-status").value,
        ownerId: user.uid,
        location: selectedLocation
    };

    try {
        const response = await fetch("/api/pets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(petData)
        });

        if (response.ok) {
            alert("Pet registered successfully!");
            e.target.reset();
            loadPets(token); // Reload map and list
            selectedLocation = null; // Reset
        } else {
            alert("Pet registration failed");
        }
    } catch (error) {
        console.error("Error registering pet:", error);
    }
});
