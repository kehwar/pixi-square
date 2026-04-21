import type { Application } from 'pixi.js'

import type { World } from '../simulation/world'
import { Grid } from '../simulation/grid'

const GRID_W = Grid.COLS * Grid.TILE_SIZE // 6400
const GRID_H = Grid.ROWS * Grid.TILE_SIZE // 6400
const MIN_ZOOM = 0.25
const MAX_ZOOM = 2
const ZOOM_SENSITIVITY = 0.001

// Camera follow tuning.
// Exponential-lerp decay: each frame closes (1 - e^(-k·dt)) of the remaining gap.
// Higher k = snappier. At k=6, ~115 ms halves the gap; at k=3, ~230 ms.
const CAMERA_DECAY = 6

export class CameraController {
  private readonly app: Application
  private readonly world: World
  private readonly onWheelBound: (e: WheelEvent) => void

  constructor(app: Application, world: World) {
    this.app = app
    this.world = world
    this.onWheelBound = this.onWheel.bind(this)
  }

  /** Instantly snap the camera to the player. Used at startup and after zoom. */
  centerOnPlayer(): void {
    const state = this.world.getState()
    const player = state.units.find(u => u.id === state.playerUnitId)
    if (player === undefined)
      return

    const screen = this.app.renderer.screen
    const scale = this.app.stage.scale.x

    this.app.stage.x = screen.width / 2 - player.pixelX * scale
    this.app.stage.y = screen.height / 2 - player.pixelY * scale
    this.clampPosition()
  }

  /**
   * Smoothly follow the player using an exponential lerp.
   * Speed is proportional to distance — fast when far, slow when close.
   */
  followPlayer(deltaMs: number): void {
    const state = this.world.getState()
    const player = state.units.find(u => u.id === state.playerUnitId)
    if (player === undefined)
      return

    const screen = this.app.renderer.screen
    const scale = this.app.stage.scale.x

    const targetX = screen.width / 2 - player.pixelX * scale
    const targetY = screen.height / 2 - player.pixelY * scale

    const factor = 1 - Math.exp(-CAMERA_DECAY * deltaMs / 1000)
    this.app.stage.x += (targetX - this.app.stage.x) * factor
    this.app.stage.y += (targetY - this.app.stage.y) * factor
    this.clampPosition()
  }

  attachEvents(): void {
    this.app.canvas.addEventListener('wheel', this.onWheelBound, { passive: false })
  }

  detachEvents(): void {
    this.app.canvas.removeEventListener('wheel', this.onWheelBound)
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault()

    const stage = this.app.stage
    const currentScale = stage.scale.x
    const factor = event.deltaY < 0 ? 1 + ZOOM_SENSITIVITY * Math.abs(event.deltaY) : 1 - ZOOM_SENSITIVITY * Math.abs(event.deltaY)
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentScale * factor))

    if (newScale === currentScale)
      return

    stage.scale.set(newScale)

    // After every zoom, re-center on the player and let clampPosition handle bounds
    this.centerOnPlayer()
  }

  private clampPosition(): void {
    const screen = this.app.renderer.screen
    const scale = this.app.stage.scale.x

    const scaledW = GRID_W * scale
    const scaledH = GRID_H * scale

    // Horizontal clamp
    if (scaledW <= screen.width) {
      // Grid narrower than viewport — center it
      this.app.stage.x = (screen.width - scaledW) / 2
    }
    else {
      this.app.stage.x = Math.max(screen.width - scaledW, Math.min(0, this.app.stage.x))
    }

    // Vertical clamp
    if (scaledH <= screen.height) {
      // Grid shorter than viewport — center it
      this.app.stage.y = (screen.height - scaledH) / 2
    }
    else {
      this.app.stage.y = Math.max(screen.height - scaledH, Math.min(0, this.app.stage.y))
    }
  }
}
