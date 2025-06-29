<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MapView from '@/components/MapView.vue'
import FiltersDrawer from '@/components/FiltersDrawer.vue'
import FloatingStatsPanel from '@/components/FloatingStatsPanel.vue'
import useMiembros from '@/composables/useMiembros'
import RawDataPanel from '@/components/RawDataPanel.vue'
import MembersTable from '@/components/MembersTable.vue'

const { t, locale } = useI18n()

const {
  healthAreas,
  tiposCentro,
  municipios,
  filteredData,
  selectedAreas,
  selectedTipos,
  selectedMunicipios,
  showWithPeople,
  setSelectedAreas,
  setSelectedTipos,
  setSelectedMunicipios,
  setShowWithPeople
} = useMiembros()

const isMobile = ref(false)
const showDrawer = ref(false)
const visibleCenters = ref([])
const showStatsPanel = ref(false)
const showRawData = ref(false)
const showMembersTable = ref(false)
const showHelp = ref(false)
const showInstallModal = ref(false)
let deferredPrompt = null

const checkScreenSize = () => { isMobile.value = window.innerWidth < 768 }
const setLanguage = () => {
  locale.value = ['es', 'ca'].includes(navigator.language.slice(0, 2)) 
    ? navigator.language.slice(0, 2) 
    : 'es'
}

onMounted(() => {
  checkScreenSize()
  setLanguage()
  window.addEventListener('resize', checkScreenSize)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Previene que el navegador muestre el banner de instalación por defecto
    e.preventDefault()
    deferredPrompt = e
    showInstallModal.value = true // Muestra el modal
  })
})

// Filter functions
const filtrarPorArea = (area) => {
  selectedAreas.value = [area]
  showDrawer.value = false
}

const filtrarPorMunicipio = (municipio) => {
  selectedMunicipios.value = [municipio]
  showDrawer.value = false
}

const clearAllFilters = () => {
  selectedAreas.value = []
  selectedTipos.value = []
  selectedMunicipios.value = []
  showEmpty.value = true
}

// Option generators with unique values
const generateOptions = (data, key) => {
  const centers = Array.isArray(visibleCenters.value) ? visibleCenters.value : []
  return [...new Set(centers.map(c => c[key] || '—'))]
    .filter(Boolean)
    .map(item => ({ 
      label: item, 
      value: item 
    }))
}

const areasOptions = computed(() => generateOptions(visibleCenters.value, 'area_salud'))
const tiposOptions = computed(() => generateOptions(visibleCenters.value, 'tipo_centro'))
const municipiosOptions = computed(() => generateOptions(visibleCenters.value, 'municipio'))

const cerrarPanelMiembros = () => {
  showMembersTable.value = false
}

const cerrarPanelDatos = () => {
  showRawData.value = false
}

// Debug
watch([selectedAreas, selectedTipos, selectedMunicipios], (newValues) => {
  console.log('Active filters:', {
    areas: newValues[0],
    tipos: newValues[1],
    municipios: newValues[2]
  })
}, { deep: true })

const installPWA = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt() // Muestra el prompt de instalación
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('El usuario aceptó instalar la PWA.')
    } else {
      console.log('El usuario rechazó instalar la PWA.')
    }
    deferredPrompt = null // Limpia el evento
    showInstallModal.value = false // Cierra el modal
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <!-- Navbar -->
    <nav class="h-16 bg-white shadow-sm flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-4">
        <button
          @click="showDrawer = true"
          class="p-2 rounded-md text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Abrir filtros"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <h1 class="text-xl font-semibold flex items-center gap-2">
          <i class="fa-solid fa-hospital text-blue-600"></i>
          {{ t('app.title') }}
        </h1>
      </div>
      <button
        @click="locale = locale === 'es' ? 'ca' : 'es'"
        class="px-3 py-1 text-sm font-medium rounded-md text-blue-600 hover:bg-blue-50"
      >
        {{ locale === 'es' ? 'Valencià' : 'Español' }}
      </button>
    </nav>

    <!-- Main content -->
    <main class="flex-1 w-full">
      <div class="h-[calc(100dvh-4rem)] w-full relative">
        <!-- Desktop Filters -->
        <transition name="drawer">
          <div
            v-if="!isMobile && showDrawer"
            class="fixed top-16 left-0 z-50 h-[calc(100dvh-4rem)] bg-gray-50 shadow-lg p-6"
            style="width: min(90vw, 400px);"
          >
            <FiltersDrawer
              :areas="areasOptions"
              :tipos="tiposOptions"
              :municipios="municipiosOptions"
              :model-value-areas="selectedAreas"
              :model-value-tipos="selectedTipos"
              :model-value-municipios="selectedMunicipios"
              :model-value-show-with-people="showWithpeople"
              :model-value-show="showDrawer"
              @update:model-value-areas="setSelectedAreas"
              @update:model-value-tipos="setSelectedTipos"
              @update:model-value-municipios="setSelectedMunicipios"
              @update:model-value-show-with-people="setShowWithPeople"
              @update:model-value-show="showDrawer = $event"
              @update:modelValueAreas="selectedAreas = $event"

            />
          </div>
        </transition>

        <!-- Map -->
        <MapView
          :filtered-data="filteredData"
          @update:visible-centers="visibleCenters = $event"
          class="h-full w-full"
        />

        <!-- Floating buttons -->
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-4">

          <button
            v-if="!showMembersTable"
            @click="showMembersTable = true"
            class="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-full shadow-lg hover:bg-blue-500 transition"
            style="min-width: 110px;"
          >
            <i class="fa-solid fa-user"></i>
            {{ t('buttons.teams') }}
          </button>
          
          <button
            v-if="!showRawData"
            @click="showRawData = true"
            class="flex items-center gap-2 bg-orange-600 text-white px-5 py-2 rounded-full shadow-lg hover:bg-orange-500 transition"
            style="min-width: 110px;"
          >
            <i class="fa-solid fa-table"></i>
            {{ t('buttons.datos') }}
          </button>
          <button
            @click="showHelp = true"
            class="flex items-center gap-2 bg-gray-600 text-white px-5 py-2 rounded-full shadow-lg hover:bg-gray-700 transition"
            style="min-width: 48px;"
          >
            <i class="fa-solid fa-circle-info"></i>
            <span v-if="!isMobile">{{ t('buttons.acercaDe') }}</span>
          </button>
          <button
            v-if="deferredPrompt"
            @click="installPWA"
            class="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-full shadow-lg hover:bg-green-700 transition"
            style="min-width: 130px;"
          >
            <i class="fa-solid fa-download"></i>
            Instalar
          </button>
        </div>
 
        <!-- Stats Panel -->
        <FloatingStatsPanel
          :show="showStatsPanel"
          :areas-salud="[...new Set(visibleCenters.map(c => c.area_salud || '—'))]"
          :municipios="[...new Set(visibleCenters.map(c => c.municipio || '—'))]"
          :centros="visibleCenters"
          @close="showStatsPanel = false"
          @filter-area="filtrarPorArea"
          @filter-municipio="filtrarPorMunicipio"
          @clear-filters="clearAllFilters"
        />

        <!-- Data Panel -->
        <transition name="fade">
          <div
            v-if="showMembersTable"
            class="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 bg-white/95 border-t border-gray-200 shadow-2xl rounded-t-xl p-6"
            style="width: 90vw; max-width: 1400px; max-height: 80vh;"
          >
            <MembersTable
              :data="visibleCenters"
              @close-row-panel="cerrarPanelMiembros"
            />
          </div>
        </transition>


        <!-- Data Panel -->
        <transition name="fade">
          <div
            v-if="showRawData"
            class="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 bg-white/95 border-t border-gray-200 shadow-2xl rounded-t-xl p-6"
            style="width: 90vw; max-width: 1400px; max-height: 80vh;"
          >
            <RawDataPanel
              :data="visibleCenters"
              @close-row-panel="cerrarPanelDatos"
            />
          </div>
        </transition>

        <!-- Help Modal -->
        <transition name="fade">
          <div
            v-if="showHelp"
            class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white shadow-lg rounded-lg p-6"
            style="width: 90vw; max-width: 400px;"
          > 
            <img
              src="/logo.png"
              alt="Logo de la marca"
              class="w-24 h-24 mx-auto mb-4"
            />
            <h2 class="text-lg font-semibold mb-4">{{ t('about.title') }}</h2>
            <p class="text-sm text-gray-700 mb-4">
              {{ t('about.description') }}
            </p>
            <p class="text-sm text-gray-700 mb-4"> 
              {{ t('about.contact') }}
            </p>
            <p class="text-sm text-gray-700 mb-4 font-semibold">
              {{ t('about.copyright') }}<br>
              <a :href="t('about.website')" target="_blank" class="text-blue-600 hover:underline">
                {{ t('about.website') }}
              </a>
            </p>
            <button
              @click="showHelp = false"
              class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
            >
              {{ t('about.close') }}
            </button>
          </div>
        </transition>

        <!-- Install Modal -->
        <transition name="fade">
          <div
            v-if="showInstallModal"
            class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white shadow-lg rounded-lg p-6"
            style="width: 90vw; max-width: 400px;"
          >
            <h2 class="text-lg font-semibold mb-4">Instalar aplicación</h2>
            <p class="text-sm text-gray-700 mb-4">
              Instala esta aplicación en tu dispositivo para acceder más rápido y disfrutar de una experiencia completa.
            </p>
            <div class="flex gap-4">
              <button
                @click="installPWA"
                class="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
              >
                Instalar
              </button>
              <button
                @click="showInstallModal = false"
                class="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </transition>
      </div>
    </main>

    <!-- Mobile Filters -->
    <transition name="drawer-mobile">
      <FiltersDrawer
        v-if="isMobile && showDrawer"
        :areas="areasOptions"
        :tipos="tiposOptions"
        :municipios="municipiosOptions"
        :model-value-areas="selectedAreas"
        :model-value-tipos="selectedTipos"
        :model-value-municipios="selectedMunicipios"
        :model-value-show-with-people="showWithPeople"
        :model-value-show="showDrawer"
        @update:model-value-areas="setSelectedAreas"
        @update:model-value-tipos="setSelectedTipos"
        @update:model-value-municipios="setSelectedMunicipios"
        @update:model-value-show-with-people="setShowWithPeople"
        @update:model-value-show="showDrawer = $event"
        @update:modelValueAreas="selectedAreas = $event"

        class="fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-lg"
      />
    </transition>

    <!-- Overlay -->
    <transition name="fade">
      <div
        v-if="showDrawer"
        class="fixed inset-0 bg-black bg-opacity-30 z-40"
        @click="showDrawer = false"
      ></div>
    </transition>
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active,
.drawer-mobile-enter-active,
.drawer-mobile-leave-active {
  transition: all 0.3s ease;
}

.drawer-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.drawer-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.drawer-mobile-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.drawer-mobile-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.popup-help {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>