<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
Chart.register(...registerables)

const props = defineProps({
  municipioStats: { type: Array, default: () => [] },
  centrosVisibles: { type: Array, default: () => [] } // <-- Añade esto
})

// NUEVO: Recibe también los datos filtrados para contar áreas y tipos
const filteredData = computed(() => props.municipioStats.flatMap(m => m.centros || []))

const numMunicipios = computed(() => new Set(props.centrosVisibles.map(c => c.municipio || c.municipality)).size)
const areasSalud = computed(() => {
  const set = new Set(filteredData.value.map(c => c.area_salud || c.department_name || '—'))
  return Array.from(set)
})
const numAreasSalud = computed(() => new Set(props.centrosVisibles.map(c => c.area_salud || c.department_name)).size)

const tiposCentro = computed(() => {
  const counts = {}
  props.centrosVisibles.forEach(c => {
    const tipo = c.tipo_centro || c.center_type || 'Sin clasificar'
    counts[tipo] = (counts[tipo] || 0) + 1
  })
  return counts
})

const chartRef = ref(null)
let chartInstance = null

function renderChart () {
  if (!chartRef.value) return

  const ctx = chartRef.value.getContext('2d')
  
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: getChartData(),
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: t('chart.title') }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: t('chart.plazas') }
        },
          x: {
            title: { display: true, text: t('chart.municipio') }
          }
        }
      }
    })
}

function updateChart () {
  if (chartInstance) {
    chartInstance.data = getChartData()
    chartInstance.update()
  }
}

function getChartData () {
  const labels = props.municipioStats.map(item => item.municipio)
  const data = props.municipioStats.map(item => item.plazas)

  return {
    labels,
    datasets: [{
      label: t('chart.plazas'),
      data,
      backgroundColor: '#2563eb',
      borderColor: '#1e40af',
      borderWidth: 1
    }]
  }
}

onMounted(renderChart)
watch(() => props.municipioStats, updateChart)
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-md mt-6">
    <!-- NUEVO: Estadísticas resumen -->
    <div class="mb-4 flex flex-wrap gap-4 text-sm">
      <div>
        <span class="font-semibold text-blue-800">{{ numMunicipios }}</span>
        {{ t('chart.municipios') }}
      </div>
      <div>
        <span class="font-semibold text-green-800">{{ numAreasSalud }}</span>
        {{ t('chart.areas_salud') }}:
        <span class="inline-block bg-green-100 text-green-800 rounded px-2 py-0.5 text-xs font-medium" v-for="a in areasSalud" :key="a">{{ a }}</span>
      </div>
      <div>
        <span class="font-semibold text-gray-800">{{ t('chart.tipos_centro') }}:</span>
        <span
          v-for="(n, tipo) in tiposCentro"
          :key="tipo"
          class="inline-block bg-gray-100 text-gray-800 rounded px-2 py-0.5 text-xs font-medium mr-1"
        >{{ tipo }}: {{ n }}</span>
      </div>
    </div>
    <canvas ref="chartRef" height="300"></canvas>
  </div>
</template>
