import type { PlayerSlot } from './PlayerCameraSystem'
import type { GameWorld } from './World'
import { hasComponent, removeComponent } from 'bitecs'
import { ComponentSystem } from './ComponentSystem'
import { PlayerCameraSystem } from './PlayerCameraSystem'
import { PositionSystem } from './PositionSystem'
import { WanderingSystem } from './WanderingSystem'

// --- Constants ---

export const IDLE_RELEASE_MS = 10_000

// --- Types ---

interface ClaimRecord {
  eid: number
  idleMs: number
}

// --- System class ---

export class InputSystem extends ComponentSystem<object> {
  private _claimed: Map<PlayerSlot, ClaimRecord> = new Map()

  override install(world: GameWorld): void {
    world.scene.input?.keyboard?.on('keydown-SPACE', () => this._handleJoinKey(world, 'p1'))
  }

  override uninstall(world: GameWorld): void {
    world.scene.input?.keyboard?.off('keydown-SPACE')
    this._claimed.clear()
  }

  override update(world: GameWorld, _eid: number, delta: number): void {
    for (const [, record] of this._claimed) {
      record.idleMs += delta
    }
    // Auto-release any unit that has exceeded the idle threshold
    for (const [, record] of Array.from(this._claimed)) {
      if (record.idleMs >= IDLE_RELEASE_MS) {
        this.releaseUnit(world, record.eid)
      }
    }
  }

  // --- Public API ---

  nearestUnclaimedUnit(world: GameWorld, pixelX: number, pixelY: number): number | null {
    const posStorage = world.getComponentStorage(PositionSystem)
    let nearestEid: number | null = null
    let nearestDist = Infinity

    for (const eid of world.query([PositionSystem])) {
      if (hasComponent(world, eid, PlayerCameraSystem))
        continue
      const dx = posStorage.pixelX[eid]! - pixelX
      const dy = posStorage.pixelY[eid]! - pixelY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestEid = eid
      }
    }
    return nearestEid
  }

  claimUnit(world: GameWorld, eid: number, player: PlayerSlot): void {
    // Remove wandering behaviour
    if (hasComponent(world, eid, WanderingSystem)) {
      removeComponent(world, eid, WanderingSystem)
    }

    // Track the claim before adding component so getControllerForEid works in create()
    this._claimed.set(player, { eid, idleMs: 0 })

    // Add camera component; patch controller in init callback after create()
    world.addComponent(PlayerCameraSystem, eid, (w, sys, e) => {
      const data = sys.getComponent(w, e)
      if (data)
        data.controller = player
    })
  }

  releaseUnit(world: GameWorld, eid: number): void {
    // Find which player holds this unit
    let releasedPlayer: PlayerSlot | undefined
    for (const [player, record] of this._claimed) {
      if (record.eid === eid) {
        releasedPlayer = player
        break
      }
    }
    if (releasedPlayer !== undefined)
      this._claimed.delete(releasedPlayer)

    // Remove camera component immediately — unit is now claimable
    if (hasComponent(world, eid, PlayerCameraSystem)) {
      removeComponent(world, eid, PlayerCameraSystem)
    }

    // Re-add wandering immediately — WanderingSystem.create skips the initial path
    // request when a path is already active, so the unit coasts to completion first.
    world.addComponent(WanderingSystem, eid)
  }

  getClaimedUnits(): ReadonlyMap<PlayerSlot, ClaimRecord> {
    return this._claimed
  }

  getControllerForEid(eid: number): PlayerSlot | null {
    for (const [player, record] of this._claimed) {
      if (record.eid === eid)
        return player
    }
    return null
  }

  getIdleMsForEid(eid: number): number {
    for (const [, record] of this._claimed) {
      if (record.eid === eid)
        return record.idleMs
    }
    return 0
  }

  // --- Private ---

  private _handleJoinKey(world: GameWorld, player: PlayerSlot): void {
    const existing = this._claimed.get(player)
    if (existing !== undefined) {
      this.releaseUnit(world, existing.eid)
    }
    else {
      const cam = world.scene.cameras?.main
      const centerX = cam ? cam.scrollX + cam.width / 2 : 0
      const centerY = cam ? cam.scrollY + cam.height / 2 : 0
      const eid = this.nearestUnclaimedUnit(world, centerX, centerY)
      if (eid !== null) {
        this.claimUnit(world, eid, player)
      }
    }
  }
}
