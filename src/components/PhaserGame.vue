<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { StartGame } from '@/game/main'

type GameInstance = ReturnType<typeof StartGame>

let game: GameInstance | null = null

onMounted(() => {
  game = StartGame('game-container')
})

onUnmounted(() => {
  if (game !== null) {
    game.destroy(true)
    game = null
  }
})
</script>

<template>
  <div id="game-container" />
</template>
