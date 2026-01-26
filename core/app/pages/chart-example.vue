<script setup lang="ts">
import type { Range } from '~/types'

import { sub } from 'date-fns'
import ChartPeriodSelect from '~/components/chart/ChartPeriodSelect.vue'

const { data } = useFetch('/api/time-series/e2396074-11bc-4b63-93cd-97e6e96d8399')

const mappedSeries = computed(() => {
  if (!data.value) return []

  return data.value.jobs.map((job) => {
    if (!data.value) return []
    return [
      ...data.value.observations.map(f => ({ amount: f.y, date: new Date(f.ds) })),
      ...job.forecast.map(f => ({ amount: f.yhat, date: new Date(f.ds) }))
    ].flat()
  })
})
const period = ref<'monthly' | 'weekly' | 'daily'>('monthly')
const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
</script>

<template>
  <div class="p-6">
    <ChartDateRangePicker v-model="range" class="-ms-1" />

    <ChartPeriodSelect v-model="period" :range="range" />
    <ChartForecast :period="period" :range="{ start: new Date(2025, 0, 1), end: new Date(2027, 11, 31) }" :data="mappedSeries[0] || []">
      <template #header />
    </ChartForecast>
  </div>
</template>
