import { get } from 'svelte/store'
import { describe, expect, it } from 'vitest'
import { makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 Svelte adapter behavior', () => {
  const storage = new Map()

  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    clear: () => storage.clear(),
  }

  it('exposes candidate and next-step hints through the grid adapter', async () => {
    const { encodeSudoku } = await import('../../src/node_modules/@sudoku/sencode/index.js')
    const { grid, userGrid } = await import('../../src/node_modules/@sudoku/stores/grid.js')

    grid.decodeSencode(encodeSudoku(makePuzzle()))

    expect(userGrid.hintCandidates({ x: 2, y: 0 })).toEqual([1, 2, 4])
    expect(userGrid.hintNextMove()).toEqual(expect.objectContaining({
      type: 'deduced',
      row: expect.any(Number),
      col: expect.any(Number),
      value: expect.any(Number),
    }))
  })

  it('exposes explore mode state and commands through the grid adapter', async () => {
    const { encodeSudoku } = await import('../../src/node_modules/@sudoku/sencode/index.js')
    const {
      exploreFailed,
      exploreTree,
      gameMode,
      currentExploreNodeId,
      grid,
      userGrid,
    } = await import('../../src/node_modules/@sudoku/stores/grid.js')

    grid.decodeSencode(encodeSudoku(makePuzzle()))

    expect(get(gameMode)).toBe('normal')
    expect(userGrid.startExplore()).toBe(true)
    expect(get(gameMode)).toBe('explore')
    const rootId = get(currentExploreNodeId)

    userGrid.set({ x: 2, y: 0 }, 5)
    expect(get(exploreTree).children).toHaveLength(1)
    expect(get(exploreFailed)).toBe(true)
    expect(userGrid.switchExploreNode(rootId)).toBe(true)
    expect(get(currentExploreNodeId)).toBe(rootId)

    expect(userGrid.discardExplore()).toBe(true)
    expect(get(gameMode)).toBe('normal')
    expect(get(userGrid)[0][2]).toBe(0)
  })
})
