import type { Application } from 'pixi.js'
import type { Unit } from '../../simulation/unit'

import { describe, expect, it, vi } from 'vitest'
import { Grid } from '../../simulation/grid'
import { World } from '../../simulation/world'
import { CameraController } from '../camera-controller'

const GRID_W = Grid.COLS * Grid.TILE_SIZE // 6400
const GRID_H = Grid.ROWS * Grid.TILE_SIZE // 6400

function makeApp(screenWidth: number, screenHeight: number, initialScale = 1) {
  const scaleRef = { current: initialScale }
  const stage = {
    x: 0,
    y: 0,
    scale: {
      get x() {
        return scaleRef.current
      },
      set: (v: number) => {
        scaleRef.current = v
      },
    },
  }
  return {
    app: {
      stage,
      renderer: { screen: { width: screenWidth, height: screenHeight } },
      canvas: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    } as unknown as Application,
    stage,
  }
}

function makeWorld(pixelX: number, pixelY: number): World {
  const grid = new Grid()
  const ts = Grid.TILE_SIZE
  const col = Math.floor(pixelX / ts)
  const row = Math.floor(pixelY / ts)
  const player: Unit = { id: 'p1', type: 'player', col, row, pixelX, pixelY, speed: 2 }
  return new World(grid, [player], 'p1')
}

function captureWheelHandler(app: Application, camera: CameraController): (e: WheelEvent) => void {
  let handler: ((e: WheelEvent) => void) | undefined
  ;(app.canvas.addEventListener as ReturnType<typeof vi.fn>).mockImplementation(
    (event: string, fn: EventListenerOrEventListenerObject) => {
      if (event === 'wheel')
        handler = fn as (e: WheelEvent) => void
    },
  )
  camera.attachEvents()
  return (e: WheelEvent) => {
    if (!handler)
      throw new Error('wheel handler was not captured')
    handler(e)
  }
}

function fakeWheel(deltaY: number): WheelEvent {
  return { deltaY, preventDefault: vi.fn() } as unknown as WheelEvent
}

describe('cameraController.centerOnPlayer', () => {
  it('places the player pixel position at screen center (unclamped case)', () => {
    // Player at center of grid: tile (100,100) → pixelX = 100*32+16 = 3216
    const { app, stage } = makeApp(800, 600, 1)
    const world = makeWorld(3216, 3216)
    const camera = new CameraController(app, world)

    camera.centerOnPlayer()

    // Ideal: stage.x = 400 - 3216 = -2816; clamped: max(-5600, min(0, -2816)) = -2816
    expect(stage.x).toBe(800 / 2 - 3216)
    expect(stage.y).toBe(600 / 2 - 3216)
  })

  it('clamps to 0 when player is near the top-left edge', () => {
    // Player at tile (0,0), pixelX = 16
    const { app, stage } = makeApp(800, 600, 1)
    const world = makeWorld(16, 16)
    const camera = new CameraController(app, world)

    camera.centerOnPlayer()

    // Ideal: stage.x = 400 - 16 = 384; clamped to min(0, 384) = 0
    expect(stage.x).toBe(0)
    expect(stage.y).toBe(0)
  })

  it('centers the grid in the viewport when the grid is smaller than the screen', () => {
    // Large viewport so the grid (6400×6400) fits at scale=1
    const { app, stage } = makeApp(8000, 8000, 1)
    const world = makeWorld(3216, 3216)
    const camera = new CameraController(app, world)

    camera.centerOnPlayer()

    // Grid smaller than screen → grid is centered, not player
    expect(stage.x).toBe((8000 - GRID_W) / 2)
    expect(stage.y).toBe((8000 - GRID_H) / 2)
  })
})

describe('cameraController zoom', () => {
  it('zoom out is clamped to MIN_ZOOM (0.25)', () => {
    const { app, stage } = makeApp(800, 600, 0.3)
    const world = makeWorld(3216, 3216)
    const camera = new CameraController(app, world)
    const triggerWheel = captureWheelHandler(app, camera)

    triggerWheel(fakeWheel(10000)) // large zoom-out delta

    expect(stage.scale.x).toBe(0.25)
  })

  it('zoom in is clamped to MAX_ZOOM (2)', () => {
    const { app, stage } = makeApp(800, 600, 1.9)
    const world = makeWorld(3216, 3216)
    const camera = new CameraController(app, world)
    const triggerWheel = captureWheelHandler(app, camera)

    triggerWheel(fakeWheel(-10000)) // large zoom-in delta

    expect(stage.scale.x).toBe(2)
  })

  it('zooming re-centers on the player', () => {
    const { app, stage } = makeApp(800, 600, 1)
    const world = makeWorld(3216, 3216)
    const camera = new CameraController(app, world)
    const triggerWheel = captureWheelHandler(app, camera)

    // Move stage away from player to simulate free-roaming
    stage.x = 0
    stage.y = 0

    triggerWheel(fakeWheel(-100)) // zoom in slightly

    const newScale = stage.scale.x
    // After zoom, stage should be re-centered on the player
    expect(stage.x).toBeCloseTo(800 / 2 - 3216 * newScale)
    expect(stage.y).toBeCloseTo(600 / 2 - 3216 * newScale)
  })
})
