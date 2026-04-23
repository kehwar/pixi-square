import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { initApp } from '@/game/app'
import { routes } from '@/router'
import GameView from '@/views/GameView.vue'
import MainMenuView from '@/views/MainMenuView.vue'
import SettingsView from '@/views/SettingsView.vue'

vi.mock('@/game/app')

const TestApp = defineComponent({ template: '<RouterView />' })

describe('router', () => {
  beforeEach(() => {
    vi.mocked(initApp).mockResolvedValue(undefined)
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
