# DESIGN

## 领域对象边界

`Sudoku` 表示当前数独局面，持有 `puzzleGrid` 和 `grid`。`puzzleGrid` 是题面固定格，`grid` 是当前盘面。它负责固定格保护、用户输入、冲突检测、完成判断、复制、序列化和调试外表化。

`Game` 表示一局游戏会话，持有当前 `Sudoku`，管理 `undoStack` / `redoStack`，并提供 `guess()`、`undo()`、`redo()`、`canUndo()`、`canRedo()` 和 `getState()`。UI 不直接修改二维数组，而是通过 `Game` 入口改变局面。

`Move` 是值对象：`{ row, col, value }` 没有独立身份，也没有生命周期。两个字段相同的输入在业务上就是同一次输入语义。

## History 与复制策略

history 存储 `Sudoku` 快照：

```js
{
  grid: number[][],
  puzzleGrid: number[][]
}
```

选择快照是为了让 Undo/Redo 和序列化恢复更直接，不依赖反推旧值。代价是比只存 `Move` 更占内存，但 9x9 棋盘规模很小，可以接受。

二维数组跨对象边界时都做深拷贝：构造 `Sudoku`、`getGrid()` / `getPuzzleGrid()`、`toJSON()`、`clone()`、history 入栈和出栈都会复制。这样避免外部代码、clone、history 共享同一行数组导致状态污染。

## 序列化与外表化

`Sudoku.toJSON()` 输出：

```js
{
  grid: number[][],
  puzzleGrid: number[][]
}
```

`Game.toJSON()` 输出当前 `sudoku`、`undoStack` 和 `redoStack`。恢复时 `createSudokuFromJSON(...)` 会校验 9x9、`0..9` 整数值域，并检查当前盘面保留题面 givens；`createGameFromJSON(...)` 复用统一的 `createGameCore(...)` 恢复会话。

`Sudoku.toString()` 用 9 行文本展示盘面，空格显示为 `.`。`Game.toString()` 额外输出 undo/redo 数量和冲突数量，便于调试。

## Svelte 接入方式

View 层消费 `src/node_modules/@sudoku/stores/grid.js` 中的 store adapter，而不是直接持有领域对象。adapter 内部闭包持有 `currentGame`，对外暴露：

- 响应式状态：`grid`、`userGrid`、`invalidCells`、`canUndo`、`canRedo`、`won`
- 命令：`generate(...)`、`decodeSencode(...)`、`set(...)`、`applyHint(...)`、`undo()`、`redo()`

用户输入走 `userGrid.set(...) -> currentGame.guess(...)`。撤销/重做走 `game.undo()` / `game.redo()`，再进入 `grid.undo()` / `grid.redo()`，最终调用领域对象。

领域对象变化后，adapter 会调用 `state.set(currentGame.getState())`，把领域状态重新投影成 Svelte store 数据。Svelte 3 不会自动追踪普通对象内部字段变化，UI 刷新的关键是 store `set(...)`，不是直接 mutate 对象。

## HW1.1 改进

相比 HW1，`Sudoku` 不再只是 9x9 数字矩阵包装器，而是建模了固定题面格、可编辑性、冲突格和完成状态。`Game` 通过 `getState()` 统一导出 UI 需要的纯数据，避免组件重写规则。

新开局流程现在会重置完整会话状态：`startNew(...)` / `startCustom(...)` 除了替换 `Game`、重置光标、计时器和提示次数，也会清空候选数并关闭 notes 模式，避免上一局状态泄漏。

`applyHint(...)` 不再假设当前盘面一定可解。若领域状态已有冲突，或 solver 抛出无解异常，则返回 `false`，不写入棋盘，也不消耗提示次数。

根组件通过 `$gameWon` reactive statement 触发胜利弹窗，避免手写顶层订阅缺少取消订阅的问题。
