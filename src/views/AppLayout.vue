<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import PhaserGame from '@/components/PhaserGame.vue'
import { EventBus } from '@/game/EventBus'

const router = useRouter()

function onNavigate(path: string): void {
  router.push(path)
}

onMounted(() => {
  EventBus.on('navigate', onNavigate)
})

onUnmounted(() => {
  EventBus.off('navigate', onNavigate)
})
</script>

<template>
  <PhaserGame class="canvas-container" />
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
