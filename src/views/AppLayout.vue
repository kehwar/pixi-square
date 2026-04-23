<script setup lang="ts">
import PhaserGame from '@/components/PhaserGame.vue'
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
