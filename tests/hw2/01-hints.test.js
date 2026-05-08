import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

function makeAlmostSolvedPuzzle() {
  return [
    [5, 3, 4, 6, 7, 8, 9, 1, 0],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ]
}

describe('HW2 hint domain behavior', () => {
  it('returns candidates for an editable empty cell', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    expect(sudoku.getCandidates(0, 2)).toEqual([1, 2, 4])
  })

  it('returns no candidates for fixed or already-filled cells', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    expect(sudoku.getCandidates(0, 0)).toEqual([])
    sudoku.guess({ row: 0, col: 2, value: 4 })
    expect(sudoku.getCandidates(0, 2)).toEqual([])
  })

  it('finds the next deducible move when a cell has a single candidate', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makeAlmostSolvedPuzzle()) })

    expect(game.getNextHint()).toEqual({ row: 0, col: 8, value: 2, candidates: [2] })
  })

  it('exposes selected-cell candidates through Game', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    expect(game.getCandidates({ row: 0, col: 2 })).toEqual([1, 2, 4])
  })
})
