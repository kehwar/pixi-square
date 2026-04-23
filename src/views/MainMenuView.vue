<script setup lang="ts">
import { EventBus } from '@/game/EventBus'

function onPlay(): void {
  EventBus.emit('start-game')
}
</script>

<template>
  <div class="main-menu-view">
    <h1>Main Menu</h1>
    <button style="pointer-events: auto" @click="onPlay">
      Play
    </button>
  </div>
</template>
