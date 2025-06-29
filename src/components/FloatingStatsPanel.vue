<template>
  <transition name="fade">
    <div
      v-if="show"
      class="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 bg-white/65 backdrop-blur-md border-t border-gray-200 shadow-2xl rounded-t-xl p-6 flex flex-col overflow-y-auto"
      style="width: 90vw; max-width: 1400px; min-height: 100px; max-height: 80vh;"
    >
      <div class="absolute top-3 right-4 flex gap-2 items-center">
        <button
          v-if="hasFilters" 
          @click="$emit('clear-filters')"
          class="text-xs bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 rounded px-3 py-1 font-medium shadow focus:outline-none"
          aria-label="Eliminar filtros"
        >
          <i class="fa-solid fa-filter-circle-xmark mr-1 text-red-400"></i>
        </button>
        <button
          @click="$emit('close')"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-gray-700 shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          aria-label="Cerrar panel"
          title="Cerrar panel"
        >
          <i class="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>
      <div class="flex flex-col md:flex-row gap-6 w-full">
        <!-- Departamentos de Salud como tarjetas -->
        <div class="flex-1 min-w-0">
          <div v-if="areasSalud?.length" class="mb-3">
            <div class="font-semibold text-gray-700 mb-2 text-sm">Departamentos de Salud</div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div
                v-for="area in showAllAreas ? areasSalud : areasSalud?.slice(0, 3)"
                :key="area"
                @click="$emit('filter-area', area)"
                class="cursor-pointer transition ring-1 ring-transparent hover:ring-green-400 bg-green-100 border border-green-300 rounded-lg px-4 py-2 flex items-center shadow-sm"
              >
                <span
                  class="text-xs text-green-900 font-medium truncate"
                  :title="area"
                >{{ area }}</span>
              </div>
              <button
                v-if="areasSalud.length > 3"
                @click.stop="showAllAreas = !showAllAreas"
                class="bg-green-200 text-green-900 border border-green-300 rounded-lg px-4 py-2 text-xs font-medium shadow-sm focus:outline-none"
              >
                {{ showAllAreas ? 'Ver menos' : `+${areasSalud.length - 3} más` }}
              </button>
            </div>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="mb-3">
            <div class="font-semibold text-gray-700 mb-2 text-sm">Personas asignadas</div>
            <div class="grid grid-cols-1 gap-3">
              <div class="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                <span class="text-xs text-gray-600 font-semibold">Listado:</span>
                <ul class="text-sm text-gray-800 mt-2 space-y-1">
                  <li v-for="(persona, index) in feature?.properties?.miembros || []" :key="index">
                    <i class="fa-solid fa-user-circle text-gray-500 mr-2"></i> {{ persona }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  props: {
    feature: Object,
    show: Boolean,
    hasFilters: Boolean,
    areasSalud: Array,
    showAllAreas: Boolean
  }
}
</script>
