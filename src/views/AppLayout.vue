<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import { destroyApp, initApp } from '@/game/app'

const canvasContainer = useTemplateRef<HTMLElement>('canvas-container')

onMounted(async () => {
  await initApp(canvasContainer.value!)
})

onUnmounted(() => {
  destroyApp()
})
</script>

<template>
  <div ref="canvas-container" class="canvas-container" />
  <div class="ui-overlay">
    <RouterView />
  </div>
</template>

<style scoped>
.canvas-container {
  position: fixed;
  inset: 0;
}

.ui-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}
</style>
