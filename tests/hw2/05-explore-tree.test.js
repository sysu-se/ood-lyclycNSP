import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 tree-shaped explore branches', () => {
  it('creates a root node and child nodes for explore moves', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.startExplore()
    const rootId = game.getState().currentExploreNodeId

    game.guess({ row: 0, col: 2, value: 4 })

    const state = game.getState()
    expect(state.currentExploreNodeId).not.toBe(rootId)
    expect(state.exploreTree.id).toBe(rootId)
    expect(state.exploreTree.children).toHaveLength(1)
    expect(state.exploreTree.children[0].move).toEqual({ row: 0, col: 2, value: 4 })
    expect(state.exploreTree.children[0].status).toBe('active')
  })

  it('can switch back to a parent and create a sibling branch', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.startExplore()
    const rootId = game.getState().currentExploreNodeId
    game.guess({ row: 0, col: 2, value: 4 })
    const firstChildId = game.getState().currentExploreNodeId

    expect(game.switchExploreNode(rootId)).toBe(true)
    game.guess({ row: 0, col: 2, value: 5 })

    const tree = game.getState().exploreTree
    expect(tree.children.map(child => child.id)).toContain(firstChildId)
    expect(tree.children).toHaveLength(2)
    expect(tree.children[1].move).toEqual({ row: 0, col: 2, value: 5 })
  })

  it('marks failed nodes and keeps a signature index for repeated failures', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.startExplore()
    game.guess({ row: 0, col: 2, value: 5 })
    const failedId = game.getState().currentExploreNodeId

    expect(game.getState().exploreFailed).toBe(true)
    expect(game.getState().exploreTree.children[0]).toEqual(expect.objectContaining({
      id: failedId,
      status: 'failed',
      reason: 'conflict',
    }))
    expect(game.getState().failedExploreCount).toBe(1)

    game.switchExploreNode(game.getState().exploreTree.id)
    game.switchExploreNode(failedId)

    expect(game.getState().exploreFailed).toBe(true)
    expect(game.getState().failedExploreCount).toBe(1)
  })

  it('commits the current branch as one main history entry', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.startExplore()
    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    expect(game.commitExplore()).toBe(true)
    expect(game.getState().mode).toBe('normal')
    expect(game.getState().grid[0][2]).toBe(4)
    expect(game.getState().grid[1][1]).toBe(7)

    game.undo()
    expect(game.getState().grid[0][2]).toBe(0)
    expect(game.getState().grid[1][1]).toBe(0)
  })
})
