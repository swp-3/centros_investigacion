<script setup>
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { ref, computed, watch } from 'vue'
import { FilterMatchMode, FilterOperator } from '@primevue/core/api';



const props = defineProps({
  data: { type: Array, default: () => [] }
})

const dt = ref(null)
const globalFilter = ref('')

const total = computed(() => props.data.length)

function exportExcel() {
  dt.value.exportCSV({ selectionOnly: false })
}

// Función para mostrar dirección
function bodyDireccion(row) {
  return `${row.street_name ?? ''} ${row.street_number ?? ''}`.trim()
}

// Cierre panel 
function cerrarPanel() {
  emit('closeRowPanel')
}
const emit = defineEmits(['closeRowPanel'])

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})
watch(globalFilter, val => {
  filters.value.global.value = val
})
</script>

<template>
  <div class="p-4 bg-white rounded-lg shadow-md relative">
    <button
        @click="cerrarPanel"
        class="absolute top-2 right-2 flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-gray-700 shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        aria-label="Cerrar panel"
        title="Cerrar panel"
        >
        <i class="fa-solid fa-xmark text-xl"></i>
    </button>


    <h2 class="text-lg font-semibold mb-4">Datos en bruto</h2>
    <div class="flex justify-between items-center mb-2">
      <span class="text-sm text-gray-500">Total registros: {{ total }}</span>
      <button
        @click="exportExcel"
        class="flex items-center gap-2 px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded shadow text-xs font-medium transition"
      >
        <i class="pi pi-file-excel"></i>
        Exportar Excel
      </button>
    </div>
    <div class="mb-2">
      <input
        v-model="globalFilter"
        type="text"
        placeholder="Buscar en todos los campos..."
        class="w-full px-3 py-2 border rounded text-sm"
      />
    </div>
    <DataTable
      ref="dt"
      :value="props.data"
      :filters="filters"
      filterDisplay="row"
      scrollable
      scrollHeight="400px" 
      class="text-xs"
      paginator
      :rows="20"
      :rowsPerPageOptions="[10, 20, 50, 100]"
      removableSort
      dataKey="center_id"
    >
      <Column field="center_id" header="ID" filter sortable />
      <Column field="center_name" header="Nombre del centro" filter sortable />
      <Column field="center_type" header="Tipo de centro" filter sortable />
      <Column field="area_salud" header="Área de salud" filter sortable />
      <Column header="Dirección" filter filterField="street_name" sortable>
        <template #body="slotProps">
          {{ slotProps.data.street_name ?? '' }} {{ slotProps.data.street_number ?? '' }}
        </template>
      </Column>
      <Column field="postal_code" header="Código postal" filter sortable />
      <Column field="municipio" header="Municipio" filter sortable />
      <Column field="province" header="Provincia" filter sortable />
      <Column field="miembros" header="Personal" filter sortable />
    </DataTable>
  </div>
</template>