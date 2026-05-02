import type Phaser from 'phaser'
import type { GameWorld } from './World'
import { ComponentSystem } from './ComponentSystem'

// --- System class ---

type PhaserCamera = Phaser.Cameras.Scene2D.Camera

export class CameraSystem extends ComponentSystem<object> {
  private _cameras: Map<number, PhaserCamera> = new Map()

  acquireCamera(world: GameWorld, eid: number): PhaserCamera {
    const cam = world.scene.cameras.main as PhaserCamera
    this._cameras.set(eid, cam)
    return cam
  }

  releaseCamera(_world: GameWorld, eid: number): void {
    this._cameras.delete(eid)
  }

  getCamera(eid: number): PhaserCamera | undefined {
    return this._cameras.get(eid)
  }
}
