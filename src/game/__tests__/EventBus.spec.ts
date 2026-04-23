// Phaser's bundled ESM runs canvas detection at module load, which crashes in
// happy-dom. Replace the Events namespace with a compatible in-process emitter
// so we can test the EventBus contract without a real browser environment.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventBus } from '../EventBus'

vi.mock('phaser', () => {
  class EventEmitter {
    private readonly map = new Map<string, Array<{ fn: (...args: unknown[]) => void, once: boolean }>>()

    on(event: string, fn: (...args: unknown[]) => void): this {
      const list = this.map.get(event) ?? []
      list.push({ fn, once: false })
      this.map.set(event, list)
      return this
    }

    once(event: string, fn: (...args: unknown[]) => void): this {
      const list = this.map.get(event) ?? []
      list.push({ fn, once: true })
      this.map.set(event, list)
      return this
    }

    off(event: string, fn: (...args: unknown[]) => void): this {
      const list = this.map.get(event)
      if (list)
        this.map.set(event, list.filter(h => h.fn !== fn))
      return this
    }

    emit(event: string, ...args: unknown[]): boolean {
      const list = this.map.get(event)
      if (!list)
        return false
      const snapshot = [...list]
      this.map.set(event, list.filter(h => !h.once))
      for (const { fn } of snapshot)
        fn(...args)
      return true
    }

    removeAllListeners(event?: string): this {
      if (event !== undefined)
        this.map.delete(event)
      else
        this.map.clear()
      return this
    }
  }

  return { Events: { EventEmitter } }
})

describe('eventBus', () => {
  afterEach(() => {
    EventBus.removeAllListeners()
  })

  it('delivers the payload to a registered listener', () => {
    const handler = vi.fn()
    EventBus.on('test-event', handler)
    EventBus.emit('test-event', 'hello')
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith('hello')
  })

  it('delivers multiple emissions to the same listener', () => {
    const handler = vi.fn()
    EventBus.on('test-event', handler)
    EventBus.emit('test-event', 1)
    EventBus.emit('test-event', 2)
    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler).toHaveBeenNthCalledWith(1, 1)
    expect(handler).toHaveBeenNthCalledWith(2, 2)
  })

  it('does not call the listener after off()', () => {
    const handler = vi.fn()
    EventBus.on('test-event', handler)
    EventBus.off('test-event', handler)
    EventBus.emit('test-event', 'ignored')
    expect(handler).not.toHaveBeenCalled()
  })

  it('once() fires exactly once then stops', () => {
    const handler = vi.fn()
    EventBus.once('once-event', handler)
    EventBus.emit('once-event', 'first')
    EventBus.emit('once-event', 'second')
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith('first')
  })

  it('does not deliver to listeners of a different event', () => {
    const handler = vi.fn()
    EventBus.on('event-a', handler)
    EventBus.emit('event-b', 'payload')
    expect(handler).not.toHaveBeenCalled()
  })

  it('removeAllListeners() silences all listeners', () => {
    const handler = vi.fn()
    EventBus.on('event-a', handler)
    EventBus.on('event-b', handler)
    EventBus.removeAllListeners()
    EventBus.emit('event-a')
    EventBus.emit('event-b')
    expect(handler).not.toHaveBeenCalled()
  })
})
