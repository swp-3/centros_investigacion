<script setup>
import { computed, ref } from 'vue'
import MultiSelect from 'primevue/multiselect'
import InputSwitch from 'primevue/inputswitch'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  areas: {
    type: Array,
    default: () => [],
    required: true
  },
  tipos: {
    type: Array,
    default: () => [],
    required: true
  },
  municipios: {
    type: Array,
    default: () => [],
    required: true
  },
  modelValueAreas: {
    type: Array,
    default: () => [],
    required: true
  },
  modelValueTipos: {
    type: Array,
    default: () => [],
    required: true
  },
  modelValueMunicipios: {
    type: Array,
    default: () => [],
    required: true
  },
  modelValueShowEmpty: {
    type: Boolean,
    default: true,
    required: true
  },
  modelValueShow: {
    type: Boolean,
    default: false,
    required: true
  },
  modelValueShowWithPeople: {
    type: Boolean,
    default: false,
    required: false
  }
})

const emit = defineEmits([
  'update:modelValueAreas',
  'update:modelValueTipos',
  'update:modelValueMunicipios',
  'update:modelValueShowEmpty',
  'update:modelValueShow',
  'update:modelValueShowWithPeople'
])

// Clone the options to prevent data loss
const originalAreas = ref(JSON.parse(JSON.stringify(props.areas)))
const originalTipos = ref(JSON.parse(JSON.stringify(props.tipos)))
const originalMunicipios = ref(JSON.parse(JSON.stringify(props.municipios)))

const areasOptions = computed(() =>
  originalAreas.value
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(item => ({
      ...item,
      uniqueValue: `area_${item.value}`
    }))
)

const tiposOptions = computed(() =>
  originalTipos.value
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(item => ({
      ...item,
      uniqueValue: `tipo_${item.value}`
    }))
)

const municipiosOptions = computed(() =>
  originalMunicipios.value
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(item => ({
      ...item,
      uniqueValue: `mun_${item.value}`
    }))
)

// Convert model values to display format
const displayAreas = computed(() => 
  props.modelValueAreas.map(v => `area_${v}`)
)

const displayTipos = computed(() => 
  props.modelValueTipos.map(v => `tipo_${v}`)
)

const displayMunicipios = computed(() => 
  props.modelValueMunicipios.map(v => `mun_${v}`)
)

const handleUpdate = (type, values) => {
  const prefixMap = {
    area: 'modelValueAreas',
    tipo: 'modelValueTipos',
    mun: 'modelValueMunicipios'
  }

  const cleanValues = values.map(v => v.replace(`${type}_`, ''))
  
  emit(`update:${prefixMap[type]}`, cleanValues)
  
  console.log(`[DEBUG] Updated ${prefixMap[type]}:`, {
    selectedValues: values,
    cleanedValues: cleanValues,
    fullOptions: {
      areas: originalAreas.value,
      tipos: originalTipos.value,
      municipios: originalMunicipios.value
    }
  })
}
</script>

<template>
  <div v-if="modelValueShow" class="p-6 bg-white rounded-lg shadow-md flex flex-col gap-4">
    <div class="flex justify-between items-center mb-2">
      <h2 class="text-xl font-semibold">{{ t('filters.title') }}</h2>
      <button
        @click="$emit('update:modelValueShow', false)"
        class="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
        :aria-label="t('filters.close')"
      >
        ×
      </button>
    </div>

    <!-- Área de Salud -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium">{{ t('filters.health_area') }}</label>
      <MultiSelect
        :modelValue="displayAreas"
        :options="areasOptions"
        optionLabel="label"
        optionValue="uniqueValue"
        :placeholder="t('filters.all_areas')"
        filter
        display="chip"
        class="w-full"
        @update:modelValue="val => handleUpdate('area', val)"
      />
    </div>

    <!-- Tipo de Centro -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium">{{ t('filters.tipoCentro') }}</label>
      <MultiSelect
        :modelValue="displayTipos"
        :options="tiposOptions"
        optionLabel="label"
        optionValue="uniqueValue"
        :placeholder="t('filters.all_tipos')"
        filter
        display="chip"
        class="w-full"
        @update:modelValue="val => handleUpdate('tipo', val)"
      />
    </div>

    <!-- Municipios -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium">{{ t('filters.municipio') }}</label>
      <MultiSelect
        :modelValue="displayMunicipios"
        :options="municipiosOptions"
        optionLabel="label"
        optionValue="uniqueValue"
        :placeholder="t('filters.all_municipios')"
        filter
        display="chip"
        class="w-full"
        @update:modelValue="val => handleUpdate('mun', val)" 
      />
    </div>
 
  

  <!-- Mostrar solo centros con personas -->
  <div class="field-checkbox">
    <label class="text-sm text-gray-700 font-semibold">Mostrar solo centros con personas</label>
  <div>
  <InputSwitch
    :modelValue="modelValueShowWithPeople"
    @update:modelValue="val => $emit('update:modelValueShowWithPeople', val)"
  />
  </div>
</div>
</div>
</template>
