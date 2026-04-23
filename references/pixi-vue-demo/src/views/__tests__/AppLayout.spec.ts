import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { destroyApp, initApp } from '@/game/app'
import AppLayout from '../AppLayout.vue'

vi.mock('@/game/app')

const DummyView = defineComponent({ template: '<div />' })

describe('appLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(initApp).mockResolvedValue(undefined)
    vi.mocked(destroyApp).mockReturnValue(undefined)
  })

  function createTestRouter() {
    return createRouter({
      history: createMemoryHistory(),
      // Use a dummy component so <RouterView> inside AppLayout doesn't
      // recurse back into AppLayout.
      routes: [{ path: '/', component: DummyView }],
    })
  }

  it('calls initApp with an HTMLElement on mount', async () => {
    const router = createTestRouter()
    await router.push('/')
    mount(AppLayout, { global: { plugins: [router] } })
    await flushPromises()
    expect(initApp).toHaveBeenCalledOnce()
    expect(initApp).toHaveBeenCalledWith(expect.any(HTMLElement))
  })

  it('calls destroyApp on unmount', async () => {
    const router = createTestRouter()
    await router.push('/')
    const wrapper = mount(AppLayout, { global: { plugins: [router] } })
    await flushPromises()
    wrapper.unmount()
    expect(destroyApp).toHaveBeenCalledOnce()
  })
})
