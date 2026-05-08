import { describe, expect, it } from 'vitest'
import { loadDomainApi } from '../hw1/helpers/domain-api.js'

const hiddenSinglePuzzle = [
  [5, 0, 0, 6, 7, 0, 9, 0, 0],
  [6, 7, 0, 0, 9, 5, 3, 0, 0],
  [0, 0, 0, 3, 0, 0, 5, 0, 0],
  [0, 5, 0, 0, 6, 0, 4, 0, 3],
  [0, 0, 0, 0, 5, 0, 0, 0, 0],
  [0, 0, 3, 9, 0, 4, 0, 0, 6],
  [0, 6, 0, 0, 3, 7, 0, 0, 0],
  [0, 8, 0, 0, 0, 9, 0, 3, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0],
]

const exploreRecommendationPuzzle = [
  [0, 0, 0, 0, 7, 0, 0, 0, 0],
  [0, 0, 2, 0, 0, 0, 0, 0, 0],
  [0, 9, 0, 0, 0, 2, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 4, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 9, 0],
  [0, 1, 3, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 8, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 2, 0, 0, 0, 0, 0],
]

describe('HW2 advanced hint strategy', () => {
  it('returns a structured single-candidate hint first', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku([
      [5, 3, 4, 6, 7, 8, 9, 1, 0],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ])

    expect(sudoku.getHint()).toEqual({
      type: 'deduced',
      strategy: 'single-candidate',
      row: 0,
      col: 8,
      value: 2,
      candidates: [2],
      reason: 'This cell has only one possible value.',
    })
  })

  it('finds hidden singles when no cell has one candidate', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(hiddenSinglePuzzle)

    expect(sudoku.getHint()).toEqual({
      type: 'deduced',
      strategy: 'hidden-single',
      unit: 'row',
      unitIndex: 0,
      row: 0,
      col: 1,
      value: 3,
      candidates: [1, 2, 3, 4],
      reason: 'In this row, 3 can only go in this cell.',
    })
  })

  it('recommends exploration when no deterministic hint exists', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(exploreRecommendationPuzzle)

    expect(sudoku.getHint()).toEqual({
      type: 'explore',
      strategy: 'minimum-candidates',
      row: 0,
      col: 1,
      candidates: [3, 4, 5, 6],
      reason: 'No deterministic move found. Explore the cell with the fewest candidates.',
    })
  })

  it('blocks hints for conflicting boards', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(hiddenSinglePuzzle) })

    game.guess({ row: 0, col: 1, value: 5 })

    expect(game.getHint()).toEqual({
      type: 'blocked',
      reason: 'Resolve current conflicts before asking for a hint.',
    })
  })
})
