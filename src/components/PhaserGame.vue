<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { EventBus } from '@/game/EventBus'
import { StartGame } from '@/game/main'

type GameInstance = ReturnType<typeof StartGame>

const scene = ref<Phaser.Scene | null>(null)
let game: GameInstance | null = null

onMounted(() => {
  game = StartGame('game-container')
  EventBus.on('current-scene-ready', (s: Phaser.Scene) => {
    scene.value = s
  })
})

onUnmounted(() => {
  EventBus.removeAllListeners('current-scene-ready')
  if (game !== null) {
    game.destroy(true)
    game = null
  }
})

defineExpose({ scene, game: ref(game) })
</script>

<template>
  <div id="game-container" />
</template>
