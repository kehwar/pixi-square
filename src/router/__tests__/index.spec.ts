import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import GameView from '@/views/GameView.vue'
import MainMenuView from '@/views/MainMenuView.vue'
import SettingsView from '@/views/SettingsView.vue'

// Prevent Phaser from running canvas detection during module load in happy-dom.
vi.mock('@/game/main', () => ({
  StartGame: vi.fn(() => ({ destroy: vi.fn() })),
}))

const TestApp = defineComponent({ template: '<RouterView />' })

describe('router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders MainMenuView at /', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/')
    const wrapper = mount(TestApp, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.findComponent(MainMenuView).exists()).toBe(true)
  })

  it('renders GameView at /game', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/game')
    const wrapper = mount(TestApp, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.findComponent(GameView).exists()).toBe(true)
  })

  it('renders SettingsView at /settings', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/settings')
    const wrapper = mount(TestApp, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.findComponent(SettingsView).exists()).toBe(true)
  })
})
