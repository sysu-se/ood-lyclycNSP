import { get } from 'svelte/store'
import { describe, expect, it } from 'vitest'

describe('HW1.1 Svelte session adapter', () => {
  const storage = new Map()

  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    clear: () => storage.clear(),
  }

  it('resets per-game candidates and notes when a new game starts', async () => {
    globalThis.location = { hash: '#previous' }

    const { candidates } = await import('../../src/node_modules/@sudoku/stores/candidates.js')
    const { notes } = await import('../../src/node_modules/@sudoku/stores/notes.js')
    const game = await import('../../src/node_modules/@sudoku/game.js')

    candidates.add({ x: 1, y: 2 }, 4)
    notes.toggle()

    expect(get(candidates)).toEqual({ '1,2': [4] })
    expect(get(notes)).toBe(true)

    game.startNew('easy')

    expect(get(candidates)).toEqual({})
    expect(get(notes)).toBe(false)
  })

  it('does not ask the solver for a hint when the current board has conflicts', async () => {
    const { usedHints } = await import('../../src/node_modules/@sudoku/stores/hints.js')
    const { grid, userGrid } = await import('../../src/node_modules/@sudoku/stores/grid.js')

    grid.generate('easy')
    userGrid.set({ x: 0, y: 0 }, 1)
    userGrid.set({ x: 1, y: 0 }, 1)

    const usedBefore = get(usedHints)

    expect(userGrid.applyHint({ x: 2, y: 0 })).toBe(false)
    expect(get(usedHints)).toBe(usedBefore)
  })
})
