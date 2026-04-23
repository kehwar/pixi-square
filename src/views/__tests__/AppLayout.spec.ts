import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppLayout from '../AppLayout.vue'

vi.mock('@/components/PhaserGame.vue', () => ({
  default: defineComponent({ template: '<div id="game-container" />' }),
}))

const DummyView = defineComponent({ template: '<div class="dummy-view" />' })

describe('appLayout', () => {
  function createTestRouter() {
    return createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: DummyView }],
    })
  }

  it('renders the ui-overlay with RouterView above the game container', async () => {
    const router = createTestRouter()
    await router.push('/')
    const wrapper = mount(AppLayout, { global: { plugins: [router] } })

    expect(wrapper.find('#game-container').exists()).toBe(true)
    expect(wrapper.find('.ui-overlay').exists()).toBe(true)
    expect(wrapper.find('.dummy-view').exists()).toBe(true)
  })
})
