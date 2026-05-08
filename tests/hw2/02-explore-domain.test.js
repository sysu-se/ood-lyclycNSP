import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 explore domain behavior', () => {
  it('enters explore mode using a copied working board', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    expect(game.startExplore()).toBe(true)
    expect(game.getState().mode).toBe('explore')

    game.guess({ row: 0, col: 2, value: 4 })

    expect(game.getState().grid[0][2]).toBe(4)
    expect(game.discardExplore()).toBe(true)
    expect(game.getState().mode).toBe('normal')
    expect(game.getState().grid[0][2]).toBe(0)
  })

  it('commits explore changes as one main-history step', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.startExplore()
    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    expect(game.commitExplore()).toBe(true)
    expect(game.getState().mode).toBe('normal')
    expect(game.getState().grid[0][2]).toBe(4)
    expect(game.getState().grid[1][1]).toBe(7)

    expect(game.undo()).toBe(true)
    expect(game.getState().grid[0][2]).toBe(0)
    expect(game.getState().grid[1][1]).toBe(0)
  })

  it('keeps undo and redo local while exploring', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.startExplore()
    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    expect(game.undo()).toBe(true)
    expect(game.getState().grid[0][2]).toBe(4)
    expect(game.getState().grid[1][1]).toBe(0)

    expect(game.redo()).toBe(true)
    expect(game.getState().grid[1][1]).toBe(7)

    game.discardExplore()
    expect(game.canUndo()).toBe(false)
  })

  it('remembers failed explore boards', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.startExplore()
    game.guess({ row: 0, col: 2, value: 5 })

    expect(game.getState().exploreFailed).toBe(true)
    expect(game.getState().failedExploreCount).toBe(1)

    game.undo()
    expect(game.getState().exploreFailed).toBe(false)

    game.redo()
    expect(game.getState().exploreFailed).toBe(true)
    expect(game.getState().failedExploreCount).toBe(1)
  })
})
