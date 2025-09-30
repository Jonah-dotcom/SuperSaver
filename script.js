// Mock data for deals
const mockDeals = [
    {
        id: 1,
        title: "Premium Kaffe 500g",
        store: "ICA Maxi",
        category: "mat",
        currentPrice: 49,
        originalPrice: 89,
        value: 45, // percentage saved
        distance: 0.8,
        location: { lat: 59.3293, lng: 18.0686 }
    },
    {
        id: 2,
        title: "Vinter Jacka",
        store: "H&M",
        category: "kläder",
        currentPrice: 299,
        originalPrice: 599,
        value: 50,
        distance: 1.2,
        location: { lat: 59.3311, lng: 18.0701 }
    },
    {
        id: 3,
        title: "Bluetooth Hörlurar",
        store: "Elgiganten",
        category: "elektronik",
        currentPrice: 199,
        originalPrice: 399,
        value: 50,
        distance: 2.1,
        location: { lat: 59.3345, lng: 18.0632 }
    },
    {
        id: 4,
        title: "Ekologisk Pasta 500g",
        store: "Coop",
        category: "mat",
        currentPrice: 12,
        originalPrice: 18,
        value: 33,
        distance: 0.5,
        location: { lat: 59.3275, lng: 18.0712 }
    },
    {
        id: 5,
        title: "Löparskor Nike",
        store: "Stadium",
        category: "sport",
        currentPrice: 799,
        originalPrice: 1299,
        value: 38,
        distance: 1.8,
        location: { lat: 59.3322, lng: 18.0648 }
    },
    {
        id: 6,
        title: "Krukväxter 3-pack",
        store: "Plantagen",
        category: "hem",
        currentPrice: 89,
        originalPrice: 149,
        value: 40,
        distance: 3.2,
        location: { lat: 59.3267, lng: 18.0758 }
    },
    {
        id: 7,
        title: "Smartphone Samsung",
        store: "Telia",
        category: "elektronik",
        currentPrice: 2999,
        originalPrice: 4999,
        value: 40,
        distance: 1.5,
        location: { lat: 59.3298, lng: 18.0625 }
    },
    {
        id: 8,
        title: "Jeans Levi's",
        store: "Åhléns",
        category: "kläder",
        currentPrice: 599,
        originalPrice: 899,
        value: 33,
        distance: 1.1,
        location: { lat: 59.3315, lng: 18.0689 }
    }
];

// Global variables
let map;
let currentDeals = [...mockDeals];
let currentFilter = 'alla';
let userLocation = null;
let userMarker = null;
let dealMarkers = [];
let watchId = null;

// Initialize the application when Google Maps API is loaded
function initMap() {
    // Default to Stockholm coordinates
    const defaultLocation = { lat: 59.3293, lng: 18.0686 };
    
    // Initialize map
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: defaultLocation,
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
    });

    // Add click listener for manual location updates
    map.addListener('click', function(event) {
        updateUserLocation(event.latLng.lat(), event.latLng.lng(), 'Manuellt vald plats');
    });

    // Initialize other components
    displayDeals(currentDeals);
    setupEventListeners();
    sortDealsByValue();
    updateMapMarkers(currentDeals);
    
    // Try to get user's location automatically
    getCurrentLocation();
}

// Fallback initialization for OpenStreetMap (Leaflet)
function initMapFallback() {
    // Default to Stockholm coordinates
    const defaultLat = 59.3293;
    const defaultLng = 18.0686;
    
    map = L.map('map').setView([defaultLat, defaultLng], 13);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add click listener for manual location updates
    map.on('click', function(e) {
        updateUserLocationFallback(e.latlng.lat, e.latlng.lng, 'Manuellt vald plats');
    });
    
    // Initialize other components
    displayDeals(currentDeals);
    setupEventListeners();
    sortDealsByValue();
    updateMapMarkersFallback(currentDeals);
    
    // Try to get user's location automatically
    getCurrentLocationFallback();
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchBtn = document.querySelector('.search-btn');
    const locationSearch = document.getElementById('locationSearch');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', handleLocationSearch);
    }
    
    if (locationSearch) {
        locationSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLocationSearch();
            }
        });
    }

    // Location button
    const getCurrentLocationBtn = document.getElementById('getCurrentLocation');
    if (getCurrentLocationBtn) {
        getCurrentLocationBtn.addEventListener('click', getCurrentLocation);
    }

    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const category = this.dataset.category;
            filterDeals(category);
        });
    });

    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Get current location using Geolocation API
function getCurrentLocation() {
    const locationBtn = document.getElementById('getCurrentLocation');
    const locationText = document.getElementById('currentLocationText');
    
    if (!navigator.geolocation) {
        alert('Geolocation stöds inte av din webbläsare');
        return;
    }

    // Update button state
    if (locationBtn) {
        locationBtn.disabled = true;
        locationBtn.innerHTML = '<div class="loading"></div> Hämtar position...';
    }

    // Get current position with high accuracy
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            updateUserLocation(lat, lng, `Din plats (noggrannhet: ${Math.round(accuracy)}m)`);
            
            // Start watching position for real-time updates
            startWatchingPosition();
            
            // Reset button
            if (locationBtn) {
                locationBtn.disabled = false;
                locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Uppdatera plats';
            }
        },
        function(error) {
            console.error('Error getting location:', error);
            let errorMessage = 'Kunde inte hämta din plats';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Platsbehörighet nekad';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Plats ej tillgänglig';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Timeout vid platshämtning';
                    break;
            }
            
            if (locationText) {
                locationText.textContent = errorMessage;
            }
            
            // Reset button
            if (locationBtn) {
                locationBtn.disabled = false;
                locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Försök igen';
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Start watching position for real-time updates
function startWatchingPosition() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }

    watchId = navigator.geolocation.watchPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            // Only update if the position has changed significantly (more than 10 meters)
            if (userLocation) {
                const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
                if (distance < 0.01) { // Less than 10 meters
                    return;
                }
            }
            
            updateUserLocation(lat, lng, `Din plats (realtid, noggrannhet: ${Math.round(accuracy)}m)`);
        },
        function(error) {
            console.log('Watch position error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000
        }
    );
}

// Update user location
function updateUserLocation(lat, lng, description) {
    userLocation = { lat: lat, lng: lng };
    
    // Update location text
    const locationText = document.getElementById('currentLocationText');
    if (locationText) {
        locationText.textContent = description;
    }
    
    // Remove existing user marker
    if (userMarker) {
        userMarker.setMap(null);
    }
    
    // Create new user marker with custom icon
    userMarker = new google.maps.Marker({
        position: userLocation,
        map: map,
        title: 'Din plats',
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#dc2626',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
        },
        zIndex: 1000
    });
    
    // Add info window
    const infoWindow = new google.maps.InfoWindow({
        content: `<div style="text-align: center; padding: 0.5rem;"><strong>${description}</strong></div>`
    });
    
    userMarker.addListener('click', function() {
        infoWindow.open(map, userMarker);
    });
    
    // Center map on user location
    map.setCenter(userLocation);
    map.setZoom(15);
    
    // Recalculate distances to deals
    updateDealDistances();
}

// Calculate distance between two points in kilometers
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Update deal distances based on user location
function updateDealDistances() {
    if (!userLocation) return;
    
    mockDeals.forEach(deal => {
        deal.distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            deal.location.lat, deal.location.lng
        );
    });
    
    // Re-sort and display deals
    sortDealsByValue();
    displayDeals(currentDeals);
}

// Handle location search
function handleLocationSearch() {
    const searchInput = document.getElementById('locationSearch');
    const location = searchInput.value.trim();
    
    if (!location) {
        alert('Vänligen ange en plats eller postnummer');
        return;
    }

    // Show loading state
    const searchBtn = document.querySelector('.search-btn');
    const originalContent = searchBtn.innerHTML;
    searchBtn.innerHTML = '<div class="loading"></div>';
    
    // Use Google Geocoding API to find location
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: location }, function(results, status) {
        searchBtn.innerHTML = originalContent;
        
        if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            updateUserLocation(location.lat(), location.lng(), `Sökt plats: ${results[0].formatted_address}`);
            
            // Scroll to deals section
            document.getElementById('erbjudanden').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Kunde inte hitta platsen. Försök med en annan adress.');
        }
    });
}

// Filter deals by category
function filterDeals(category) {
    currentFilter = category;
    
    if (category === 'alla') {
        currentDeals = [...mockDeals];
    } else {
        currentDeals = mockDeals.filter(deal => deal.category === category);
    }
    
    sortDealsByValue();
    displayDeals(currentDeals);
    updateMapMarkers(currentDeals);
}

// Sort deals by value (best deals first)
function sortDealsByValue() {
    currentDeals.sort((a, b) => b.value - a.value);
}

// Display deals in the grid
function displayDeals(deals) {
    const dealsGrid = document.getElementById('dealsGrid');
    
    if (deals.length === 0) {
        dealsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <p style="color: var(--gray); font-size: 1.1rem;">Inga erbjudanden hittades för denna kategori.</p>
            </div>
        `;
        return;
    }
    
    dealsGrid.innerHTML = deals.map(deal => `
        <div class="deal-card" data-deal-id="${deal.id}">
            <div class="deal-header">
                <div>
                    <div class="deal-title">${deal.title}</div>
                    <div class="deal-store">${deal.store}</div>
                </div>
                <div class="deal-value">${deal.value}% rabatt</div>
            </div>
            
            <div class="deal-category">${getCategoryName(deal.category)}</div>
            
            <div class="deal-price">
                <span class="current-price">${deal.currentPrice} kr</span>
                <span class="original-price">${deal.originalPrice} kr</span>
            </div>
            
            <div class="deal-distance">
                <i class="fas fa-map-marker-alt"></i>
                ${deal.distance.toFixed(1)} km bort
            </div>
        </div>
    `).join('');

    // Add click handlers to deal cards
    const dealCards = document.querySelectorAll('.deal-card');
    dealCards.forEach(card => {
        card.addEventListener('click', function() {
            const dealId = parseInt(this.dataset.dealId);
            const deal = deals.find(d => d.id === dealId);
            if (deal) {
                showDealOnMap(deal);
            }
        });
    });
    
    // Add loading animation
    setTimeout(addLoadingAnimation, 100);
}

// Get category display name
function getCategoryName(category) {
    const categoryNames = {
        'mat': 'Mat & Dryck',
        'kläder': 'Kläder',
        'elektronik': 'Elektronik',
        'hem': 'Hem & Trädgård',
        'sport': 'Sport & Fritid'
    };
    return categoryNames[category] || category;
}

// Update map markers
function updateMapMarkers(deals) {
    // Clear existing deal markers
    dealMarkers.forEach(marker => marker.setMap(null));
    dealMarkers = [];
    
    // Add new markers for deals
    deals.forEach(deal => {
        const marker = new google.maps.Marker({
            position: deal.location,
            map: map,
            title: deal.title,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: getCategoryColor(deal.category),
                fillOpacity: 0.8,
                strokeColor: '#ffffff',
                strokeWeight: 2
            }
        });
        
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="text-align: center; min-width: 200px; padding: 0.5rem;">
                    <h4 style="color: #dc2626; margin-bottom: 0.5rem;">${deal.title}</h4>
                    <p style="margin-bottom: 0.5rem;"><strong>${deal.store}</strong></p>
                    <p style="margin-bottom: 0.5rem;">
                        <span style="color: #dc2626; font-weight: bold; font-size: 1.1rem;">${deal.currentPrice} kr</span>
                        <span style="text-decoration: line-through; color: #666; margin-left: 0.5rem;">${deal.originalPrice} kr</span>
                    </p>
                    <p style="background: #dc2626; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; display: inline-block; font-size: 0.9rem;">
                        ${deal.value}% rabatt
                    </p>
                    <p style="margin-top: 0.5rem; color: #666; font-size: 0.9rem;">
                        ${deal.distance.toFixed(1)} km bort
                    </p>
                </div>
            `
        });
        
        marker.addListener('click', function() {
            infoWindow.open(map, marker);
        });
        
        dealMarkers.push(marker);
    });
}

// Show specific deal on map
function showDealOnMap(deal) {
    // Scroll to map section
    document.getElementById('karta').scrollIntoView({ behavior: 'smooth' });
    
    // Center map on deal location
    setTimeout(() => {
        map.setCenter(deal.location);
        map.setZoom(16);
        
        // Find and trigger click on the corresponding marker
        const marker = dealMarkers.find(m => 
            m.getPosition().lat() === deal.location.lat && 
            m.getPosition().lng() === deal.location.lng
        );
        
        if (marker) {
            google.maps.event.trigger(marker, 'click');
        }
    }, 500);
}

// Get category color for map markers
function getCategoryColor(category) {
    const colors = {
        'mat': '#10b981',
        'kläder': '#8b5cf6',
        'elektronik': '#3b82f6',
        'hem': '#f59e0b',
        'sport': '#ef4444'
    };
    return colors[category] || '#dc2626';
}

// Add loading animations
function addLoadingAnimation() {
    const dealCards = document.querySelectorAll('.deal-card');
    dealCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Initialize when DOM is loaded (fallback if Google Maps API loads before DOM)
document.addEventListener('DOMContentLoaded', function() {
    if (typeof google !== 'undefined' && google.maps) {
        initMap();
    }
});

// Add scroll effect for header
document.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
    } else {
        header.style.background = 'var(--glass-bg)';
    }
});

// Clean up watch position when page unloads
window.addEventListener('beforeunload', function() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }
});

// Fallback functions for OpenStreetMap (Leaflet)
function getCurrentLocationFallback() {
    const locationBtn = document.getElementById('getCurrentLocation');
    const locationText = document.getElementById('currentLocationText');
    
    if (!navigator.geolocation) {
        alert('Geolocation stöds inte av din webbläsare');
        return;
    }

    // Update button state
    if (locationBtn) {
        locationBtn.disabled = true;
        locationBtn.innerHTML = '<div class="loading"></div> Hämtar position...';
    }

    // Get current position with high accuracy
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            updateUserLocationFallback(lat, lng, `Din plats (noggrannhet: ${Math.round(accuracy)}m)`);
            
            // Start watching position for real-time updates
            startWatchingPositionFallback();
            
            // Reset button
            if (locationBtn) {
                locationBtn.disabled = false;
                locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Uppdatera plats';
            }
        },
        function(error) {
            console.error('Error getting location:', error);
            let errorMessage = 'Kunde inte hämta din plats';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Platsbehörighet nekad';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Plats ej tillgänglig';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Timeout vid platshämtning';
                    break;
            }
            
            if (locationText) {
                locationText.textContent = errorMessage;
            }
            
            // Reset button
            if (locationBtn) {
                locationBtn.disabled = false;
                locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Försök igen';
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

function startWatchingPositionFallback() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }

    watchId = navigator.geolocation.watchPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            // Only update if the position has changed significantly (more than 10 meters)
            if (userLocation) {
                const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
                if (distance < 0.01) { // Less than 10 meters
                    return;
                }
            }
            
            updateUserLocationFallback(lat, lng, `Din plats (realtid, noggrannhet: ${Math.round(accuracy)}m)`);
        },
        function(error) {
            console.log('Watch position error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000
        }
    );
}

function updateUserLocationFallback(lat, lng, description) {
    userLocation = { lat: lat, lng: lng };
    
    // Update location text
    const locationText = document.getElementById('currentLocationText');
    if (locationText) {
        locationText.textContent = description;
    }
    
    // Remove existing user marker
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    // Create new user marker with custom icon
    userMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<div style="text-align: center; padding: 0.5rem;"><strong>${description}</strong></div>`);
    
    // Custom marker style
    userMarker.setIcon(L.divIcon({
        className: 'user-marker',
        html: `<div style="
            background-color: #dc2626;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    }));
    
    // Center map on user location
    map.setView([lat, lng], 15);
    
    // Recalculate distances to deals
    updateDealDistances();
}

function updateMapMarkersFallback(deals) {
    // Clear existing deal markers
    dealMarkers.forEach(marker => map.removeLayer(marker));
    dealMarkers = [];
    
    // Add new markers for deals
    deals.forEach(deal => {
        const marker = L.marker([deal.location.lat, deal.location.lng])
            .addTo(map)
            .bindPopup(`
                <div style="text-align: center; min-width: 200px; padding: 0.5rem;">
                    <h4 style="color: #dc2626; margin-bottom: 0.5rem;">${deal.title}</h4>
                    <p style="margin-bottom: 0.5rem;"><strong>${deal.store}</strong></p>
                    <p style="margin-bottom: 0.5rem;">
                        <span style="color: #dc2626; font-weight: bold; font-size: 1.1rem;">${deal.currentPrice} kr</span>
                        <span style="text-decoration: line-through; color: #666; margin-left: 0.5rem;">${deal.originalPrice} kr</span>
                    </p>
                    <p style="background: #dc2626; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; display: inline-block; font-size: 0.9rem;">
                        ${deal.value}% rabatt
                    </p>
                    <p style="margin-top: 0.5rem; color: #666; font-size: 0.9rem;">
                        ${deal.distance.toFixed(1)} km bort
                    </p>
                </div>
            `);
        
        // Custom marker icon based on category
        const iconColor = getCategoryColor(deal.category);
        marker.setIcon(L.divIcon({
            className: 'deal-marker',
            html: `<div style="
                background-color: ${iconColor};
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        }));
        
        dealMarkers.push(marker);
    });
}