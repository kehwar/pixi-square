<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { EventBus, pendingGameStart } from '@/game/EventBus'

onMounted(() => {
  pendingGameStart.value = true
  EventBus.emit('start-game')
})

onUnmounted(() => {
  pendingGameStart.value = false
})
</script>

<template>
  <div class="game-view">
    <h1>Game</h1>
  </div>
</template>
