import type { Unit } from '../unit'

import { describe, expect, it } from 'vitest'
import { Grid } from '../grid'
import { World, WorldFactory } from '../world'

describe('worldFactory', () => {
  it('creates exactly one unit', () => {
    const world = WorldFactory.create()
    expect(world.getState().units).toHaveLength(1)
  })

  it('the only unit is the player', () => {
    const world = WorldFactory.create()
    const { units } = world.getState()
    expect(units[0]!.type).toBe('player')
  })

  it('playerUnitId matches the player unit id', () => {
    const world = WorldFactory.create()
    const { units, playerUnitId } = world.getState()
    expect(units[0]!.id).toBe(playerUnitId)
  })

  it('player unit spawns on a passable tile', () => {
    const world = WorldFactory.create()
    const { units } = world.getState()
    const player = units[0]!
    expect(world.getGrid().isPassable(player.col, player.row)).toBe(true)
  })

  it('player pixel position is at tile center', () => {
    const world = WorldFactory.create()
    const player = world.getState().units[0]!
    const ts = Grid.TILE_SIZE
    expect(player.pixelX).toBe(player.col * ts + ts / 2)
    expect(player.pixelY).toBe(player.row * ts + ts / 2)
  })
})

describe('world', () => {
  function makeWorld(): { world: World, player: Unit } {
    const grid = new Grid()
    const player: Unit = { id: 'p1', type: 'player', col: 5, row: 5, pixelX: 176, pixelY: 176, speed: 2 }
    const world = new World(grid, [player], 'p1')
    return { world, player }
  }

  it('getGrid returns the grid', () => {
    const { world } = makeWorld()
    expect(world.getGrid()).toBeInstanceOf(Grid)
  })

  it('getState returns the expected playerUnitId', () => {
    const { world } = makeWorld()
    expect(world.getState().playerUnitId).toBe('p1')
  })

  it('getState returns the units array', () => {
    const { world, player } = makeWorld()
    expect(world.getState().units).toContain(player)
  })
})
