# EVOLUTION

## 1. 如何实现提示功能

提示功能分成三层，由 `Sudoku.getHint()` 统一调度：

1. `single-candidate`：某个空格只有一个候选数，直接返回确定值。
2. `hidden-single`：某一行、列或宫中，某个数字只可能出现在一个格子。
3. `minimum-candidates`：如果没有确定推断，返回候选数最少的格子，建议进入探索模式。

如果当前局面已经有冲突，`getHint()` 返回：

```js
{
  type: 'blocked',
  reason: 'Resolve current conflicts before asking for a hint.'
}
```

`Game.getHint()` 转发当前可见局面的提示。普通模式下提示主局面；探索模式下提示当前探索节点的局面。Svelte adapter 通过 `userGrid.hintNextMove()` 暴露结构化提示，UI 根据返回类型移动光标并显示候选数。

## 2. 提示功能属于 `Sudoku` 还是 `Game`

候选数和推断策略属于 `Sudoku`，因为它们只依赖数独局面规则。

`Game` 负责选择提示作用在哪个局面上：

- 普通模式：主局面。
- 探索模式：当前探索节点局面。

hint 次数消耗和候选数展示仍在 Svelte adapter / store 层处理。这样 `Sudoku` 不依赖 UI，`Game` 不重复实现数独推理规则。

## 3. 如何实现探索模式

探索模式现在是 `Game` 内部的一棵探索树。

进入探索时，`Game.startExplore()` 创建 root 节点：

```js
{
  id,
  parentId: null,
  move: null,
  sudokuSnapshot,
  status: 'active',
  reason: null,
  children: []
}
```

每次探索输入都会从当前节点创建一个 child node。节点保存输入 move 和输入后的 `Sudoku` 快照。`Game.switchExploreNode(nodeId)` 可以切换到任意已有节点，UI 目前提供“回到父节点”的最小交互。

`commitExplore()` 提交当前节点对应的局面，并把探索起点作为一次主 history 快照入栈。主 `undo()` 一次可以回到探索起点。`discardExplore()` 丢弃整棵探索树，主局面不变。

## 4. 主局面与探索局面的关系

主局面和探索节点局面不共享对象。

探索 root 节点保存进入探索时的主局面快照。每个 child 节点保存自己的 `sudokuSnapshot`。切换节点时通过快照恢复出新的 `Sudoku` 对象，因此不会共享二维数组引用，也不会让探索分支污染主局面。

提交时只提交当前节点；其他分支不会进入主局面。放弃时整棵探索树被丢弃。

## 5. history 结构是否变化

主 history 仍然是 HW1 的线性双栈：

- `undoStack`
- `redoStack`

探索内部从“单条临时 history”升级为树状节点：

- `nodesById`
- `rootId`
- `currentNodeId`
- 每个节点持有 `children`

为了兼容探索过程中的键盘 Undo/Redo，探索模式仍保留临时 `undoStack` / `redoStack`，但它们现在主要用于在当前分支上向父节点/子节点移动。分支结构由探索树保存。

## 6. HW1 设计在 HW2 中暴露出的局限

HW1 的 `Game` 只有一个当前局面和一组线性 history，无法表达“尚未提交的多个尝试分支”。

HW2 暴露出三个局限：

1. `Game` 需要 mode，否则无法区分主局面输入和探索输入。
2. `Sudoku` 需要候选数与推断接口，否则 hint 只能依赖外部 solver。
3. history 需要能表达分支，否则“多路径探索”和“失败分支记忆”只能靠 UI 临时状态拼接。

## 7. 如果重做 HW1，会如何修改原设计

如果重做 HW1，我会提前把 `Game` 设计成“主局面 + 可见局面”的结构：

- 主局面表示正式进度。
- 可见局面由 mode 决定，可以是主局面，也可以是探索节点局面。

我也会在 `Sudoku` 中提前放入 `getCandidates()` 和 `getHint()`。即使 HW1 不要求提示，候选数也是数独局面对象的自然能力。

## 交互总结

- 候选提示：选中空格后点击灯泡按钮，棋盘显示该格候选数。
- 下一步提示：点击时钟按钮，依次尝试唯一候选、隐性唯一；如果都没有，跳到候选数最少的格子，建议探索。
- 开始探索：点击地图按钮进入探索树 root。
- 创建分支：探索模式下填数会创建当前节点的 child 分支。
- 回到父节点：探索模式下点击左箭头回到父节点，可再尝试另一个候选值形成 sibling 分支。
- 提交探索：点击对勾按钮，把当前分支提交为主局面。
- 放弃探索：点击叉号按钮，丢弃整棵探索树。
- 探索失败：冲突节点标记为 `failed`，并通过 signature 索引记忆；再次切换到同一失败盘面仍显示失败。
