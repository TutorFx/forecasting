<script setup lang="ts">
/* Sync props with client component to ensure type compatibility */
defineProps<{
  data: DataSegment[]
}>()
</script>

<template>
  <UCard class="shrink-0" :ui="{ body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <slot name="header" />
    </template>

    <div class="h-96" />
  </UCard>
</template>
