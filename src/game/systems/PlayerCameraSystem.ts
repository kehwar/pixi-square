import type Phaser from 'phaser'
import type { GameWorld } from './World'
import { CameraSystem } from './CameraSystem'
import { ComponentSystem } from './ComponentSystem'
import { PositionSystem } from './PositionSystem'

// --- Constants ---

export const CAMERA_LERP = 0.05

// --- Types ---

export type PlayerSlot = 'p1' | 'p2'

export interface PlayerCameraData {
  controller: PlayerSlot
  camera: Phaser.Cameras.Scene2D.Camera
}

// --- System class ---

export class PlayerCameraSystem extends ComponentSystem<PlayerCameraData> {
  override install(world: GameWorld): void {
    const storage: PlayerCameraData[] = []
    world.setupComponentStorage(PlayerCameraSystem, storage)
  }

  override create(world: GameWorld, eid: number): void {
    const cameraSystem = world.systems.get(CameraSystem) as CameraSystem
    const camera = cameraSystem.acquireCamera(world, eid)
    // controller is set by InputSystem.claimUnit immediately after addComponent
    this.setComponent(world, eid, { controller: 'p1', camera })
  }

  override update(world: GameWorld, eid: number, delta: number): void {
    const data = this.getComponent(world, eid)
    if (!data)
      return

    // Smooth camera follow via exponential lerp
    const posStorage = world.getComponentStorage(PositionSystem)
    const targetX = posStorage.pixelX[eid]!
    const targetY = posStorage.pixelY[eid]!
    const lerpFactor = 1 - (1 - CAMERA_LERP) ** (delta / 16.67)
    const cam = data.camera as Phaser.Cameras.Scene2D.Camera & { scrollX: number, scrollY: number, width: number, height: number }
    cam.scrollX += (targetX - cam.width / 2 - cam.scrollX) * lerpFactor
    cam.scrollY += (targetY - cam.height / 2 - cam.scrollY) * lerpFactor
  }

  override destroy(world: GameWorld, eid: number): void {
    const cameraSystem = world.systems.get(CameraSystem) as CameraSystem
    cameraSystem.releaseCamera(world, eid)
    super.destroy(world, eid)
  }
}
