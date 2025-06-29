<template>
  <div class="flex h-full w-full">
    <!-- the parent (App.vue) gives full height & width -->
    <div id="map" class="flex-1 h-full rounded-lg shadow-md"></div>

    <!-- Diálogo: solo muestra opciones, NO bloquea el mapa al seleccionar en el mapa -->
    <Dialog
      v-model:visible="showSelectStartModal"
      modal
      :header="t('route.selectStartHeader')"
      :closable="false"
      :style="{ width: '90vw', maxWidth: '400px' }"
    >
      <div class="mb-4">
        <p>{{ t('route.selectStartQuestion') }}</p>
      </div>
      <div class="flex flex-col gap-2">
        <button
          class="p-button p-component p-button-sm p-button-primary"
          @click="useGeolocation"
        >{{ t('route.useGeolocation') }}</button>
        <button
          class="p-button p-component p-button-sm p-button-secondary"
          @click="startSelectingOnMap"
        >{{ t('route.selectOnMap') }}</button>
        <button
          class="p-button p-component p-button-sm p-button-danger"
          @click="cancelRoute"
        >{{ t('route.cancel') }}</button>
      </div>
    </Dialog>

    <!-- Diálogo de geolocalización con botones estilizados con Tailwind y PrimeVue -->
    <Dialog
      v-model:visible="showGeoDialog"
      modal
      :header="t('route.selectStartHeader')"
      :closable="false"
      :style="{ width: '90vw', maxWidth: '400px' }"
    >
      <div class="mb-4">
        <p>{{ t('route.distanceNeedGeo') }}</p> 
      </div>
      <div class="flex flex-col gap-2">
        <button
          class="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-600 text-sm font-medium px-4 py-2 rounded hover:bg-blue-100 transition"
          @click="requestGeolocation"
        >
          <i class="fa-solid fa-location-crosshairs"></i>
          {{ t('route.useGeolocation') }}
        </button>
        <button
          class="inline-flex items-center gap-2 bg-white text-blue-600 border border-blue-600 text-sm font-medium px-4 py-2 rounded hover:bg-blue-50 transition"
          @click="startSelectingOnMap"
        >
          <i class="fa-solid fa-location-dot"></i>
          {{ t('route.selectOnMap') }}
        </button>
        <button
          class="inline-flex items-center gap-2 bg-red-50 text-red-700 border border-red-400 text-sm font-medium px-4 py-2 rounded hover:bg-red-100 transition"
          @click="showGeoDialog = false"
        >
          <i class="fa-solid fa-xmark"></i>
          {{ t('route.cancel') }}
        </button>
      </div>
    </Dialog>

    <!-- Mensaje flotante mientras selecciona en el mapa -->
    <div
      v-if="selectingOnMap"
      class="fixed left-1/2 top-8 z-[2000] -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg animate-pulse"
    >
      {{ t('route.clickOnMap') }}
    </div>
  </div>
</template> 

<script setup>
import { onMounted, watch, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Dialog from 'primevue/dialog'
import { useI18n } from 'vue-i18n'
const { locale } = useI18n()
 
/* ─── Plugins & CSS ───────────────────────────────────────────────────── */
import 'leaflet-fullscreen'
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
/* ─────────────────────────────────────────────────────────────────────── */

const { t } = useI18n()

// Grupos de overlays
const hospitalesGroup = L.layerGroup();
const centrosSaludGroup = L.layerGroup();
const consultoriosGroup = L.layerGroup();
const otrosGroup = L.layerGroup();

const props = defineProps({
  filteredData: { type: Array, required: true }
})

const emit = defineEmits(['update:visibleCenters'])

/* State */
let map, clusterLayer
let routingControl = null

const showSelectStartModal = ref(false)
const pendingRoute = ref(null)
const selectingOnMap = ref(false)
const showRoutingPanel = ref(false)
const routeInstructions = ref([])
const routeSummary = ref(null)
const lastRoute = ref(null)
const routeStartName = ref('')
const routeEndName = ref('')
const routeStartAddress = ref('')
const routeEndAddress = ref('')
const showGeoDialog = ref(false)

/* Custom default icon */
const DefaultIcon = L.icon({
  iconUrl   : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize  : [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

// Define iconos personalizados por tipo
const iconHospital = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/@tabler/icons@2.47.0/icons/outline/hospital.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})
const iconCentroSalud = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/@tabler/icons@2.47.0/icons/outline/stethoscope.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})
const iconConsultorio = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/@tabler/icons@2.47.0/icons/outline/home-heart.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})
const iconDefault = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/@tabler/icons@2.47.0/icons/outline/map-pin.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

function getIcon(tipo) {
  if (!tipo) return iconDefault
  const t = tipo.toLowerCase()
  if (t.includes('hospital')) return iconHospital
  if (t.includes('salud')) return iconCentroSalud
  if (t.includes('consultorio')) return iconConsultorio
  return iconDefault
}

// Asegúrate de tener FontAwesome cargado en tu proyecto (en tu index.html o main.js)

function getFAIcon(tipo) {
  let iconClass = 'fa-solid fa-location-dot';
  let color = '#2563eb';
  let bg = '#fff';

  if (tipo) {
    const t = tipo.toLowerCase();
    if (t.includes('hospital')) {
      iconClass = 'fa-solid fa-hospital';
      color = '#e11d48';
      bg = '#fff0f3';
    } else if (t.includes('salud')) {
      iconClass = 'fa-solid fa-user-doctor';
      color = '#2563eb';
      bg = '#eff6ff';
    } else if (t.includes('consultorio')) {
      iconClass = 'fa-solid fa-house-medical';
      color = '#059669';
      bg = '#ecfdf5';
    }
  }

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:38px;
        height:38px;
        background:${bg};
        border-radius:50% 50% 50% 50%/60% 60% 40% 40%;
        box-shadow:0 2px 6px rgba(0,0,0,0.15);
        display:flex;
        align-items:center;
        justify-content:center;
        border:2px solid ${color};
        position:relative;
      ">
        <i class="${iconClass}" style="font-size:1.3rem;color:${color};"></i>
        <div style="
          position:absolute;
          left:50%;
          bottom:-8px;
          transform:translateX(-50%);
          width:10px;
          height:10px;
          background:${color};
          border-radius:50%;
          box-shadow:0 1px 4px rgba(0,0,0,0.12);
        "></div>
      </div>
    `,
    iconSize: [38, 46],
    iconAnchor: [19, 42],
    popupAnchor: [0, -38]
  });
}

function getUserIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:38px;
        height:38px;
        background:#bbf7d0;
        border-radius:50% 50% 50% 50%/60% 60% 40% 40%;
        box-shadow:0 2px 6px rgba(0,0,0,0.15);
        display:flex;
        align-items:center;
        justify-content:center;
        border:2px solid #059669;
        position:relative;
      ">
        <i class="fa-solid fa-user-nurse" style="font-size:1.3rem;color:#059669;"></i>
        <div style="
          position:absolute;
          left:50%;
          bottom:-8px;
          transform:translateX(-50%);
          width:10px;
          height:10px;
          background:#059669;
          border-radius:50%;
          box-shadow:0 1px 4px rgba(0,0,0,0.12);
        "></div>
      </div>
    `,
    iconSize: [38, 46],
    iconAnchor: [19, 42],
    popupAnchor: [0, -38]
  });
}

/* ─────────────── Setup Map on Mount ─────────────── */
onMounted(() => {
  // Create map
  map = L.map('map', {
    fullscreenControl: true
  }).setView([39.5, -0.75], 8)

  // Add WMS layers
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    detectRetina: true
  }).addTo(map);

  const pnoa = L.tileLayer.wms("https://www.ign.es/wms-inspire/pnoa-ma", {
    layers: 'OI.OrthoimageCoverage',
    format: 'image/png',
    transparent: true,
    attribution: '© Instituto Geográfico Nacional',
    version: '1.3.0',
    maxZoom: 19
  });

  const ignBase = L.tileLayer.wms("https://www.ign.es/wms-inspire/ign-base", {
    layers: 'IGNBaseTodo',
    format: 'image/png',
    transparent: true,
    attribution: '© Instituto Geográfico Nacional',
    version: '1.3.0',
    maxZoom: 19
  });

  const cartoLight = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        detectRetina: true,
      }
    );

  const layerCodigosPostales = L.tileLayer.wms('https://www.cartociudad.es/wms-inspire/direcciones-ccpp', {
    layers: 'codigo-postal',
    format: 'image/png',
    transparent: false,
    opacity: 1,
    attribution: '© Instituto Geográfico Nacional',
    maxZoom: 19
  });

  const layerLimitesMunicipales = L.tileLayer.wms('https://www.ign.es/wms-inspire/unidades-administrativas', {
    layers: 'AU.AdministrativeBoundary',
    format: 'image/png',
    transparent: false,
    opacity: 0.35,
    attribution: '© Instituto Geográfico Nacional',
    maxZoom: 19
  });

  const layerIGNDirecciones = L.tileLayer.wms('https://www.cartociudad.es/wms-inspire/direcciones-ccpp', {
    layers: 'AD.Address',
    format: 'image/png',
    transparent: false,
    opacity: 0.35,
    attribution: '© Instituto Geográfico Nacional',
    maxZoom: 19
  });

  const layerDepartamentosSalud = L.tileLayer.wms('https://terramapas.icv.gva.es/15_SistemaValencianoSalud?', {
    layers: 'MapaSanitario.Departamentos',
    format: 'image/png',
    transparent: true,
    opacity: 0.6,
    attribution: '<a href="https://icv.gva.es" target="_blank">© Institut Cartogràfic Valencià</a>',
    version: '1.3.0',
    maxZoom: 19
  });

  const baseMaps = {
    "Carto Light": cartoLight,
    "🗺️ OpenStreetMap": osm,
    "🛰️ Ortofoto PNOA": pnoa,
    "🧭 Base IGN": ignBase
  };

  const overlayMaps = {
    "🏥 Departamentos de Salud (GVA)": layerDepartamentosSalud,
    "📮 Códigos postales": layerCodigosPostales,
    "📍 Límites municipales": layerLimitesMunicipales,
    "🏠 Direcciones (IGN)": layerIGNDirecciones
  };

  L.control.layers(baseMaps, overlayMaps, {
    position: 'topright',
    collapsed: true
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);
  // Create cluster layer
  clusterLayer = L.markerClusterGroup({
    disableClusteringAtZoom: 14,
    spiderfyOnMaxZoom: true
  })
  map.addLayer(clusterLayer)

  // Initial marker load
  updateMarkers(props.filteredData)

  // Escucha el movimiento del mapa
  map.on('moveend', emitVisibleCenters)

  // Llama una vez al cargar
  emitVisibleCenters()

  // Añade el control de geolocalización
  const locateControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
      container.style.backgroundColor = 'white'
      container.style.width = '34px'
      container.style.height = '34px'
      container.style.display = 'flex'
      container.style.alignItems = 'center'
      container.style.justifyContent = 'center'
      container.style.cursor = 'pointer'
      container.title = 'Ir a mi ubicación'
      container.innerHTML = `<i class="fa-solid fa-location-crosshairs" style="color:#2563eb;font-size:1.3rem;"></i>`

      container.onclick = function (e) {
        e.stopPropagation()
        locateUser()
      }
      return container
    }
  })
  map.addControl(new locateControl())
})

const userMarker = ref(null)
let routeStartMarker = null
let routeEndMarker = null

function getCentersInBounds() {
  if (!map || !props.filteredData) return []
  const bounds = map.getBounds()
  return props.filteredData.filter(feature => {
    const [lng, lat] = feature.geometry.coordinates
    return bounds.contains([lat, lng])
  })
}

function emitVisibleCenters() {
  const visibles = getCentersInBounds()
  emit('update:visibleCenters', visibles.map(f => f.properties))
}

/* ─────────────── Watch for Filtered Data Changes ─────────────── */
watch(
  () => props.filteredData,
  (newData) => updateMarkers(newData),
  { deep: true }
)

watch(
  () => t.locale ? t.locale.value : undefined, // para vue-i18n v9+
  () => updateMarkers(props.filteredData)
)

watch(locale, () => updateMarkers(props.filteredData))

/* ─────────────── Update Markers Function ─────────────── */
function updateMarkers(data) {
  if (!map || !clusterLayer) return

  clusterLayer.clearLayers()

  if (!data.length) {
    console.warn('⚠️ No data to display.')
    return
  }

  data.forEach(feature => {
    const p = feature.properties
    const [lng, lat] = feature.geometry.coordinates

    // Crea el marcador
    const marker = L.marker([lat, lng], {
      icon: getFAIcon(p.tipo_centro ?? p.center_type),
      markerId: p.center_id
    })
      .bindTooltip(p.centro ?? p.center_name ?? '—', { sticky: true })

    // Al abrir el popup, genera el contenido actualizado
    marker.on('popupopen', () => {
      let distanceHtml = ''
      if (!userMarker.value) {
        distanceHtml = `
          <div class="mt-2 text-xs text-blue-900">
            <div class="font-semibold mb-1">${t('route.distancePromptTitle') || 'Distancia al centro sanitario'}</div>
            <button
              onclick="window.__calcDistanceTo__(${lat},${lng},'${p.center_id}')"
              class="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-3 py-1 rounded hover:bg-blue-100 transition"
              style="cursor:pointer;"
            >
              <i class="fa-solid fa-location-dot"></i>
              <span>${t('route.distancePrompt')}</span>
            </button>
          </div>
        `
      } else {
        const userLatLng = userMarker.value.getLatLng()
        const centerLatLng = L.latLng(lat, lng)
        const distance = userLatLng.distanceTo(centerLatLng)
        let distanceText = distance >= 1000
          ? `${(distance / 1000).toFixed(2)} km`
          : `${Math.round(distance)} m`
        const timeMinutes = Math.round((distance / 1000) / 50 * 60)
        const timeText = timeMinutes > 0 ? `${timeMinutes} min` : '<1 min'
        distanceHtml = `
          <div class="mt-2 text-xs text-blue-900 flex flex-col gap-1">
            <span><i class="fa-solid fa-location-arrow"></i> ${t('route.distanceFromYou')}: <b>${distanceText}</b></span>
            <span><i class="fa-solid fa-clock"></i> ${t('route.timeFromYou')}: <b>${timeText}</b></span>
          </div>
        `
      }


      let personasHtml = ''
      let miembrosToShow = p.miembros || [];
      let miembrosCount = miembrosToShow.length;
      let showButton = miembrosCount > 5;
      // Generar un id único para la lista de miembros
      const miembrosListId = `miembros-list-${p.center_id || Math.random().toString(36).slice(2)}`;
      let miembrosHtml = miembrosToShow.slice(0, 5).map(persona => `
        <li><i class='fa-solid fa-user-circle text-gray-500 mr-2'></i> ${persona}</li>
      `).join('');
      if (showButton) {
        // Serializa los miembros y los guarda en un atributo data-miembros
        const miembrosData = encodeURIComponent(JSON.stringify(miembrosToShow));
        miembrosHtml += `
          <li class="flex justify-center mt-2">
            <button type="button"
              tabindex="0"
              class="expand-miembros-btn inline-flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded shadow text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              data-miembros="${miembrosData}"
              data-listid="${miembrosListId}"
              data-expanded="false"
            >
              <i class='fa-solid fa-users'></i>
              Mostrar más miembros
            </button>
          </li>
        `;
      }
      if (miembrosCount > 0) {
        personasHtml = `
          <ul id="${miembrosListId}" class="text-sm text-gray-800 mt-2 space-y-1">
            ${miembrosHtml}
          </ul>
        `;
      } else {
        personasHtml = `<p class="text-sm text-gray-500 italic">Sin personas asignadas</p>`;
      }

      const popupContent = `
        <div class="p-2 max-w-xs">
          <div class="font-bold text-base mb-1">${p.center_id ? p.center_id + ' - ' : ''}${p.centro ?? p.center_name ?? '—'}</div>
          <div class="flex flex-wrap gap-2 mb-2">
            <span class="inline-block bg-blue-100 text-blue-800 text-xs rounded px-2 py-1">${p.tipo_centro ?? p.center_type ?? '—'}</span>
            <span class="inline-block bg-green-100 text-green-800 text-xs rounded px-2 py-1">${p.area_salud ?? p.department_name ?? '—'}</span>
          </div>
          <div class="mb-2 text-xs">
            <div class="font-semibold mb-1 text-blue-700">${t('table.direccion') || 'Dirección completa'}</div>
            <div class="text-gray-700">
              ${p.street_name ?? '—'}
              ${p.street_number ? ', ' + p.street_number : ''}
              ${p.postal_code ? ' · ' + p.postal_code : ''}
              ${(p.municipio ?? p.municipality) ? ' · ' + (p.municipio ?? p.municipality) : ''}
              ${p.province ? ' · ' + p.province : ''}
            </div>
          </div>
          <div class="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-2">
            Personal investigación
            <span class="inline-block bg-gray-200 text-gray-700 text-xs font-semibold rounded-full px-2 py-0.5 ml-1">${miembrosCount}</span>
          </div>
          ${personasHtml}
          ${distanceHtml}
          <div class="flex gap-2 mt-4">
            <button
              onclick="window.__showRouteTo__([${lat},${lng}])"
              class="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-xs font-medium py-2 rounded-md hover:bg-blue-700 transition"
              style="border:none; cursor:pointer;"
            >
              <i class="fa-solid fa-car"></i>
              <span>${t('route.routeToHere')}</span>
            </button>
            <a
              href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}"
              target="_blank"
              class="flex-1 flex items-center justify-center gap-2 bg-white text-blue-600 border border-blue-600 text-xs font-medium py-2 rounded-md hover:bg-blue-50 transition"
              style="cursor:pointer; text-decoration:none;"
            >
              <i class="fa-brands fa-google"></i>
              <span>Google Maps</span>
            </a>
          </div>
        </div>
      `;
      marker.getPopup().setContent(popupContent);
    });

    // Inicializa el popup vacío (se rellenará al abrir)
    marker.bindPopup('<div></div>');

    clusterLayer.addLayer(marker);
  });

  // Delegated event for "Mostrar más miembros/menos" button in popups
  if (!window.__expandMiembrosListenerAdded) {
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('.expand-miembros-btn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const listId = btn.getAttribute('data-listid');
        const miembrosJson = decodeURIComponent(btn.getAttribute('data-miembros'));
        let miembrosArr = [];
        try {
          miembrosArr = JSON.parse(miembrosJson);
        } catch (err) {}
        const ul = document.getElementById(listId);
        if (!ul) return;
        const expanded = btn.getAttribute('data-expanded') === 'true';
        if (!expanded) {
          // Expandir: mostrar todos
          ul.innerHTML = miembrosArr.map(persona => `<li><i class='fa-solid fa-user-circle text-gray-500 mr-2'></i> ${persona}</li>`).join('');
          btn.setAttribute('data-expanded', 'true');
          btn.innerHTML = `<i class='fa-solid fa-chevron-up'></i> Mostrar menos`;
        } else {
          // Colapsar: mostrar solo 5 y el botón
          const miembrosData = btn.getAttribute('data-miembros');
          let miembrosHtml = miembrosArr.slice(0, 5).map(persona => `<li><i class='fa-solid fa-user-circle text-gray-500 mr-2'></i> ${persona}</li>`).join('');
          miembrosHtml += `
            <li class="flex justify-center mt-2">
              <button type="button"
                tabindex="0"
                class="expand-miembros-btn inline-flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded shadow text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                data-miembros="${miembrosData}"
                data-listid="${listId}"
                data-expanded="false"
              >
                <i class='fa-solid fa-users'></i>
                Mostrar más miembros
              </button>
            </li>
          `;
          ul.innerHTML = miembrosHtml;
        }
      }
    }, true);
    window.__expandMiembrosListenerAdded = true;
  }

  if (clusterLayer.getBounds().isValid()) {
    map.fitBounds(clusterLayer.getBounds(), { padding: [50, 50] });
  }
}

function showRouteTo(lat, lng) {
  if (!map) return

  let start
  if (userMarker.value) {
    start = userMarker.value.getLatLng()
    addRouting(start, [lat, lng])
  } else {
    pendingRoute.value = [lat, lng]
    showSelectStartModal.value = true
    // El resto se gestiona en el modal
  }
}

function addRouting(start, end) {
  // Elimina la ruta anterior si existe
  if (routingControl) {
    map.removeControl(routingControl)
    routingControl = null
    showRoutingPanel.value = false
  }
  showRoutingPanel.value = true // <-- Mueve esto antes de crear el control

  // Espera un tick para asegurar que el panel está en el DOM
  setTimeout(() => {
    routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start.lat, start.lng),
        L.latLng(end[0], end[1])
      ],
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      language: 'es',
      lineOptions: {
        styles: [
          { color: '#2563eb', weight: 8, opacity: 0.85 }
        ]
      },
      router: L.Routing.osrmv1({ language: 'es' }),
      routeDragInterval: 100,
      createMarker: () => null,
      container: document.getElementById('routing-panel')
    }).addTo(map)

    // Añade el botón "Limpiar ruta" al panel de Leaflet Routing Machine
    routingControl.on('routeselected', () => {
      const container = document.querySelector('.leaflet-routing-container')
      if (container && !container.querySelector('.btn-clear-route')) {
        const btn = document.createElement('button')
        btn.textContent = t('route.clearRoute') || 'Borrar ruta'
        btn.className = 'btn-clear-route leaflet-bar bg-red-100 text-red-700 py-2 px-3 rounded hover:bg-red-200'
        btn.style.margin = '12px 0 0 0'
        btn.onclick = clearRoute
        container.appendChild(btn)
      }
    })
  }, 0)

  // Elimina marcadores anteriores si existen
  if (routeStartMarker) {
    map.removeLayer(routeStartMarker)
    routeStartMarker = null
  }
  if (routeEndMarker) {
    map.removeLayer(routeEndMarker)
    routeEndMarker = null
  }

  // Añade marcador de inicio
  routeStartMarker = L.marker([start.lat, start.lng], {
    icon: getUserIcon()
  }).addTo(map).bindPopup(t('route.routeStart'))

  // Añade marcador de fin
  routeEndMarker = L.marker([end[0], end[1]], {
    icon: L.icon({
      iconUrl: 'https://cdn.jsdelivr.net/npm/@tabler/icons@2.47.0/icons/outline/map-pin.svg',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    })
  }).addTo(map).bindPopup(t('route.routeEnd'))

  // Geocodifica el inicio
  reverseGeocode(start.lat, start.lng).then(addr => {
    routeStartAddress.value = addr
  })
  // Geocodifica el final
  reverseGeocode(end[0], end[1]).then(addr => {
    routeEndAddress.value = addr
  })
}

window.__showRouteTo__ = (coords) => {
  showRouteTo(coords[0], coords[1])
}

function useGeolocation() {
  showSelectStartModal.value = false
  selectingOnMap.value = false
  locateUser(() => {
    // Cuando se obtenga la ubicación, traza la ruta
    if (userMarker.value && pendingRoute.value) {
      addRouting(userMarker.value.getLatLng(), pendingRoute.value)
      pendingRoute.value = null
    }
  })
}

function startSelectingOnMap() {
  showGeoDialog.value = false // Cierra el diálogo
  selectingOnMap.value = true // Activa el modo de selección

  // Escucha el clic en el mapa
  map.once('click', (e) => {
    const { lat, lng } = e.latlng
    if (userMarker.value) { 
      userMarker.value.setLatLng([lat, lng])
      userMarker.value.setIcon(getUserIcon()) // Usa el mismo icono que en la geolocalización
    } else {
      userMarker.value = L.marker([lat, lng], { icon: getUserIcon(), draggable: true }).addTo(map)
    }
    selectingOnMap.value = false // Desactiva el modo de selección

    // Recalcula la distancia para el último marcador abierto
    if (window.__lastMarkerId) {
      const marker = clusterLayer.getLayers().find(m => m.options.markerId === window.__lastMarkerId)
      if (marker) marker.openPopup()
      window.__lastMarkerId = null
    }
  })
}

function cancelRoute() { 
  showSelectStartModal.value = false
  selectingOnMap.value = false
  pendingRoute.value = null
}

function cancelSelectingOnMap() {
  selectingOnMap.value = false
  showSelectStartModal.value = false
  pendingRoute.value = null
}

watch(selectingOnMap, (active) => {
  if (active) {
    map.getContainer().style.cursor = 'crosshair'
    map.on('click', onMapClickForRoute)
  } else {
    map.getContainer().style.cursor = ''
    map.off('click', onMapClickForRoute)
  }
})

function onMapClickForRoute(e) {
  if (!pendingRoute.value) return
  showSelectStartModal.value = false
  selectingOnMap.value = false
  map.getContainer().style.cursor = ''
  addRouting(e.latlng, pendingRoute.value)
  pendingRoute.value = null
}

// Modifica locateUser para aceptar un callback opcional
function locateUser(cb) {
  if (!map) return
  if (!navigator.geolocation) {
    alert('La geolocalización no está soportada en este navegador.')
    return
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords
      if (userMarker.value) {
        userMarker.value.setLatLng([latitude, longitude])
        userMarker.value.setIcon(getUserIcon()) 
      } else {
        userMarker.value = L.marker([latitude, longitude], {
          icon: getUserIcon()
        })
          .addTo(map)
          .bindPopup(t('route.here'))
      }
      map.setView([latitude, longitude], 14)
      userMarker.value.openPopup()
      if (cb) cb()
    },
    err => {
      alert('No se pudo obtener tu ubicación.')
    }
  )
}

function clearRoute() {
  if (routingControl) {
    map.removeControl(routingControl)
    routingControl = null
  }
  showRoutingPanel.value = false 
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h} h ${m} min`
  return `${m} min`
}
 
function goToStep(i) {
  if (!lastRoute.value) return

  const step = routeInstructions.value[i]
  let coordIdx = null

  if (step && step.interval && Array.isArray(step.interval)) {
    coordIdx = step.interval[0]
  } else if (step && typeof step.index === 'number') {
    coordIdx = step.index
  }

  if (coordIdx !== null && lastRoute.value.coordinates && lastRoute.value.coordinates[coordIdx]) {
    const coord = lastRoute.value.coordinates[coordIdx]
    // Calcula el desplazamiento horizontal (en píxeles) para el panel lateral
    const offsetX = window.innerWidth > 768 ? 170 : window.innerWidth / 2
    const point = map.latLngToContainerPoint([coord.lat, coord.lng])
    const newPoint = L.point(point.x - offsetX, point.y)
    const newLatLng = map.containerPointToLatLng(newPoint)
    map.setView(newLatLng, 17, { animate: true })

    // Marcador temporal
    L.circleMarker([coord.lat, coord.lng], {
      radius: 10,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 0.4
    }).addTo(map).bringToFront().bindPopup(t('route.routeStep')).openPopup()
  }
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'es' }
    })
    const data = await res.json()
    return data.display_name || ''
  } catch (e) {
    return ''
  } 
}

window.__calcDistanceTo__ = (lat, lng, markerId) => {
  if (!userMarker.value) {
    showGeoDialog.value = true
    window.__lastMarkerId = markerId // Guarda el marcador para actualizarlo después
  } else {
    const marker = clusterLayer.getLayers().find(m => m.options.markerId === markerId)
    if (marker) marker.openPopup()
  }
}

function requestGeolocation() {
  locateUser(() => {
    showGeoDialog.value = false
    // Reabrir el popup del centro tras geolocalizar
    if (window.__lastMarkerId) {
      const marker = clusterLayer.getLayers().find(m => m.options.markerId === window.__lastMarkerId)
      if (marker) marker.openPopup()
      window.__lastMarkerId = null
    }
  })
}

function getInstructionIcon(type) {
  // Puedes personalizar los iconos según el tipo
  switch (type) {
    case 'Straight': return 'fa-arrow-up';
    case 'SlightRight': return 'fa-arrow-up-right';
    case 'Right': return 'fa-arrow-right';
    case 'SharpRight': return 'fa-arrow-turn-down';
    case 'TurnAround': return 'fa-rotate-left';
    case 'SharpLeft': return 'fa-arrow-turn-up';
    case 'Left': return 'fa-arrow-left';
    case 'SlightLeft': return 'fa-arrow-up-left';
    case 'StartAt': return 'fa-play';
    case 'DestinationReached': return 'fa-flag-checkered';
    case 'EnterRoundabout': return 'fa-circle-notch';
    default: return 'fa-location-arrow';
  }
}
</script> 

<style scoped>
/* ensure the map canvas fills its parent flex/grid cell */
#map {
  inset: 0;
}
</style>
