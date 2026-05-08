/**
 * 深拷贝 9x9 棋盘，避免调用方和领域对象共享二维数组引用。
 *
 * @param {number[][]} grid
 * @returns {number[][]}
 */
function cloneGrid(grid) {
	return grid.map(row => row.slice());
}

/**
 * 校验单个坐标是否落在数独棋盘范围内。
 *
 * @param {number} value
 * @param {string} name
 */
function assertCoordinate(value, name) {
	if (!Number.isInteger(value) || value < 0 || value > 8) {
		throw new Error(`${name} must be an integer between 0 and 8.`);
	}
}

/**
 * 校验输入是否为合法的 9x9 数独棋盘。
 *
 * @param {number[][]} grid
 * @param {string} [label]
 */
function assertGrid(grid, label = 'Sudoku grid') {
	if (!Array.isArray(grid) || grid.length !== 9) {
		throw new Error(`${label} must be a 9x9 array.`);
	}

	for (const row of grid) {
		if (!Array.isArray(row) || row.length !== 9) {
			throw new Error(`${label} must be a 9x9 array.`);
		}

		for (const cell of row) {
			if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
				throw new Error(`${label} cells must be integers between 0 and 9.`);
			}
		}
	}
}

/**
 * 规范化用户输入的移动对象。
 *
 * @param {{ row: number, col: number, value: number }} move
 * @returns {{ row: number, col: number, value: number }}
 */
function normalizeMove(move) {
	if (!move || typeof move !== 'object') {
		throw new Error('Move must be an object.');
	}

	const { row, col, value } = move;
	assertCoordinate(row, 'Move row');
	assertCoordinate(col, 'Move col');

	if (!Number.isInteger(value) || value < 0 || value > 9) {
		throw new Error('Move value must be an integer between 0 and 9.');
	}

	return { row, col, value };
}

/**
 * 校验当前盘面是否仍然保留题面固定格。
 *
 * @param {number[][]} puzzleGrid
 * @param {number[][]} grid
 */
function assertPuzzleCompatibility(puzzleGrid, grid) {
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const fixedValue = puzzleGrid[row][col];
			if (fixedValue !== 0 && grid[row][col] !== fixedValue) {
				throw new Error('Sudoku grid must preserve puzzle givens.');
			}
		}
	}
}

/**
 * 收集一个行/列/宫内的重复数字坐标。
 *
 * @param {number[][]} grid
 * @param {{ row: number, col: number }[]} cells
 * @param {Set<string>} invalid
 */
function scanUnit(grid, cells, invalid) {
	const grouped = new Map();

	for (const cell of cells) {
		const value = grid[cell.row][cell.col];
		if (value === 0) {
			continue;
		}

		if (!grouped.has(value)) {
			grouped.set(value, []);
		}
		grouped.get(value).push(cell);
	}

	for (const duplicates of grouped.values()) {
		if (duplicates.length < 2) {
			continue;
		}

		for (const cell of duplicates) {
			invalid.add(`${cell.col},${cell.row}`);
		}
	}
}

/**
 * 返回当前棋盘中所有冲突格的坐标列表，格式为 `x,y`。
 *
 * @param {number[][]} grid
 * @returns {string[]}
 */
function collectInvalidCells(grid) {
	const invalid = new Set();

	for (let row = 0; row < 9; row++) {
		scanUnit(
			grid,
			Array.from({ length: 9 }, (_, col) => ({ row, col })),
			invalid,
		);
	}

	for (let col = 0; col < 9; col++) {
		scanUnit(
			grid,
			Array.from({ length: 9 }, (_, row) => ({ row, col })),
			invalid,
		);
	}

	for (let boxRow = 0; boxRow < 3; boxRow++) {
		for (let boxCol = 0; boxCol < 3; boxCol++) {
			const cells = [];
			for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
				for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
					cells.push({ row, col });
				}
			}

			scanUnit(grid, cells, invalid);
		}
	}

	return Array.from(invalid);
}

/**
 * 判断把某个值放入指定位置后，是否会与同行、同列或同宫冲突。
 *
 * @param {number[][]} grid
 * @param {number} row
 * @param {number} col
 * @param {number} value
 * @returns {boolean}
 */
function wouldConflict(grid, row, col, value) {
	if (value === 0) {
		return false;
	}

	for (let index = 0; index < 9; index++) {
		if (index !== col && grid[row][index] === value) {
			return true;
		}

		if (index !== row && grid[index][col] === value) {
			return true;
		}
	}

	const startRow = Math.floor(row / 3) * 3;
	const startCol = Math.floor(col / 3) * 3;
	for (let nextRow = startRow; nextRow < startRow + 3; nextRow++) {
		for (let nextCol = startCol; nextCol < startCol + 3; nextCol++) {
			if ((nextRow !== row || nextCol !== col) && grid[nextRow][nextCol] === value) {
				return true;
			}
		}
	}

	return false;
}

/**
 * 判断棋盘是否已经填满。
 *
 * @param {number[][]} grid
 * @returns {boolean}
 */
function isComplete(grid) {
	return grid.every(row => row.every(cell => cell !== 0));
}

/**
 * 为当前盘面生成稳定签名，用于探索失败记忆。
 *
 * @param {number[][]} grid
 * @returns {string}
 */
function createGridSignature(grid) {
	return grid.map(row => row.join('')).join('/');
}

/**
 * 计算指定空格在当前盘面下的候选值。
 *
 * @param {number[][]} grid
 * @param {number[][]} puzzleGrid
 * @param {number} row
 * @param {number} col
 * @returns {number[]}
 */
function collectCandidates(grid, puzzleGrid, row, col) {
	assertCoordinate(row, 'Row');
	assertCoordinate(col, 'Col');

	if (puzzleGrid[row][col] !== 0 || grid[row][col] !== 0) {
		return [];
	}

	return Array.from({ length: 9 }, (_, index) => index + 1)
		.filter(value => !wouldConflict(grid, row, col, value));
}

/**
 * 找到第一个只有唯一候选值的格子。
 *
 * @param {number[][]} grid
 * @param {number[][]} puzzleGrid
 * @returns {{ row: number, col: number, value: number, candidates: number[] } | null}
 */
function findDeducibleMove(grid, puzzleGrid) {
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const candidates = collectCandidates(grid, puzzleGrid, row, col);
			if (candidates.length === 1) {
				return { row, col, value: candidates[0], candidates };
			}
		}
	}

	return null;
}

/**
 * 返回数独的所有行、列、宫单元。
 *
 * @returns {Array<{ type: 'row' | 'col' | 'box', index: number, cells: Array<{ row: number, col: number }> }>}
 */
function getUnits() {
	const units = [];

	for (let row = 0; row < 9; row++) {
		units.push({
			type: 'row',
			index: row,
			cells: Array.from({ length: 9 }, (_, col) => ({ row, col })),
		});
	}

	for (let col = 0; col < 9; col++) {
		units.push({
			type: 'col',
			index: col,
			cells: Array.from({ length: 9 }, (_, row) => ({ row, col })),
		});
	}

	for (let boxRow = 0; boxRow < 3; boxRow++) {
		for (let boxCol = 0; boxCol < 3; boxCol++) {
			const cells = [];
			for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
				for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
					cells.push({ row, col });
				}
			}

			units.push({
				type: 'box',
				index: boxRow * 3 + boxCol,
				cells,
			});
		}
	}

	return units;
}

/**
 * 找到隐性唯一候选。
 *
 * @param {number[][]} grid
 * @param {number[][]} puzzleGrid
 * @returns {{ type: 'deduced', strategy: 'hidden-single', unit: 'row' | 'col' | 'box', unitIndex: number, row: number, col: number, value: number, candidates: number[], reason: string } | null}
 */
function findHiddenSingleMove(grid, puzzleGrid) {
	for (const unit of getUnits()) {
		for (let value = 1; value <= 9; value++) {
			const places = [];
			for (const cell of unit.cells) {
				const candidates = collectCandidates(grid, puzzleGrid, cell.row, cell.col);
				if (candidates.includes(value)) {
					places.push({ ...cell, candidates });
				}
			}

			if (places.length === 1) {
				const place = places[0];
				return {
					type: 'deduced',
					strategy: 'hidden-single',
					unit: unit.type,
					unitIndex: unit.index,
					row: place.row,
					col: place.col,
					value,
					candidates: place.candidates,
					reason: `In this ${unit.type}, ${value} can only go in this cell.`,
				};
			}
		}
	}

	return null;
}

/**
 * 找到候选数最少的探索建议。
 *
 * @param {number[][]} grid
 * @param {number[][]} puzzleGrid
 * @returns {{ type: 'explore', strategy: 'minimum-candidates', row: number, col: number, candidates: number[], reason: string } | null}
 */
function findExploreRecommendation(grid, puzzleGrid) {
	let best = null;

	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const candidates = collectCandidates(grid, puzzleGrid, row, col);
			if (candidates.length === 0) {
				continue;
			}

			if (!best || candidates.length < best.candidates.length) {
				best = { row, col, candidates };
			}
		}
	}

	if (!best) {
		return null;
	}

	return {
		type: 'explore',
		strategy: 'minimum-candidates',
		...best,
		reason: 'No deterministic move found. Explore the cell with the fewest candidates.',
	};
}

/**
 * 生成分层提示。
 *
 * @param {number[][]} grid
 * @param {number[][]} puzzleGrid
 * @returns {{ type: string, strategy?: string, row?: number, col?: number, value?: number, candidates?: number[], reason: string, unit?: string, unitIndex?: number } | null}
 */
function createHint(grid, puzzleGrid) {
	if (collectInvalidCells(grid).length > 0) {
		return {
			type: 'blocked',
			reason: 'Resolve current conflicts before asking for a hint.',
		};
	}

	const single = findDeducibleMove(grid, puzzleGrid);
	if (single) {
		return {
			type: 'deduced',
			strategy: 'single-candidate',
			...single,
			reason: 'This cell has only one possible value.',
		};
	}

	return findHiddenSingleMove(grid, puzzleGrid)
		?? findExploreRecommendation(grid, puzzleGrid);
}

/**
 * 深拷贝历史快照，避免 undo/redo 栈共享内部引用。
 *
 * @param {{ grid: number[][], puzzleGrid: number[][] }} snapshot
 * @returns {{ grid: number[][], puzzleGrid: number[][] }}
 */
function cloneSnapshot(snapshot) {
	return {
		grid: cloneGrid(snapshot.grid),
		puzzleGrid: cloneGrid(snapshot.puzzleGrid),
	};
}

/**
 * 将当前 `Sudoku` 实例转成可存入历史栈的纯数据快照。
 *
 * @param {{ toJSON: () => { grid: number[][], puzzleGrid: number[][] } }} sudoku
 * @returns {{ grid: number[][], puzzleGrid: number[][] }}
 */
function snapshotSudoku(sudoku) {
	return cloneSnapshot(sudoku.toJSON());
}

/**
 * 从纯数据快照恢复出新的 `Sudoku` 实例。
 *
 * @param {{ grid: number[][], puzzleGrid: number[][] }} snapshot
 * @returns {ReturnType<typeof createSudoku>}
 */
function restoreSudoku(snapshot) {
	return createSudokuFromJSON(snapshot);
}

/**
 * 标准化序列化后的历史快照列表，兼容旧格式并重新执行领域校验。
 *
 * @param {Array<{ grid: number[][], puzzleGrid?: number[][] }>} snapshots
 * @param {number[][]} fallbackPuzzleGrid
 * @returns {Array<{ grid: number[][], puzzleGrid: number[][] }>}
 */
function normalizeSnapshotList(snapshots, fallbackPuzzleGrid) {
	if (!Array.isArray(snapshots)) {
		return [];
	}

	return snapshots.map(snapshot =>
		createSudokuFromJSON({
			grid: snapshot.grid,
			puzzleGrid: snapshot.puzzleGrid ?? fallbackPuzzleGrid,
		}).toJSON(),
	);
}

/**
 * 创建一个 `Sudoku` 领域对象。
 *
 * @param {number[][]} input
 * @returns {{
 *   getGrid: () => number[][],
 *   getPuzzleGrid: () => number[][],
 *   isEditable: (row: number, col: number) => boolean,
 *   canGuess: (move: { row: number, col: number, value: number }) => boolean,
 *   isValidMove: (move: { row: number, col: number, value: number }) => boolean,
 *   getCandidates: (row: number, col: number) => number[],
 *   getCandidateMap: () => Array<{ row: number, col: number, candidates: number[] }>,
 *   findDeducibleMove: () => { row: number, col: number, value: number, candidates: number[] } | null,
 *   getHint: () => ({ type: string, strategy?: string, row?: number, col?: number, value?: number, candidates?: number[], reason: string } | null),
 *   getSignature: () => string,
 *   getInvalidCells: () => string[],
 *   isSolved: () => boolean,
 *   getState: () => { puzzleGrid: number[][], grid: number[][], invalidCells: string[], won: boolean },
 *   guess: (move: { row: number, col: number, value: number }) => boolean,
 *   clone: () => ReturnType<typeof createSudoku>,
 *   toJSON: () => { grid: number[][], puzzleGrid: number[][] },
 *   toString: () => string
 * }}
 */
export function createSudoku(input) {
	assertGrid(input);

	const puzzleGrid = cloneGrid(input);
	let grid = cloneGrid(input);

	/**
	 * 判断某个格子是否允许玩家输入。
	 *
	 * @param {number} row
	 * @param {number} col
	 * @returns {boolean}
	 */
	function isEditable(row, col) {
		assertCoordinate(row, 'Row');
		assertCoordinate(col, 'Col');
		return puzzleGrid[row][col] === 0;
	}

	/**
	 * 计算当前棋盘中的所有冲突格。
	 *
	 * @returns {string[]}
	 */
	function getInvalidCells() {
		return collectInvalidCells(grid);
	}

	/**
	 * 判断当前棋盘是否已经填满且没有冲突。
	 *
	 * @returns {boolean}
	 */
	function isSolved() {
		return isComplete(grid) && getInvalidCells().length === 0;
	}

	/**
	 * 将当前对象外表化为可序列化的纯数据。
	 *
	 * @returns {{ grid: number[][], puzzleGrid: number[][] }}
	 */
	function toJSON() {
		return {
			grid: cloneGrid(grid),
			puzzleGrid: cloneGrid(puzzleGrid),
		};
	}

	return {
		/**
		 * 返回当前盘面的深拷贝，供 UI 或测试安全读取。
		 *
		 * @returns {number[][]}
		 */
		getGrid() {
			return cloneGrid(grid);
		},

		/**
		 * 返回题面固定格的深拷贝。
		 *
		 * @returns {number[][]}
		 */
		getPuzzleGrid() {
			return cloneGrid(puzzleGrid);
		},

		isEditable,

		/**
		 * 判断一次输入是否落在可编辑格。
		 *
		 * @param {{ row: number, col: number, value: number }} move
		 * @returns {boolean}
		 */
		canGuess(move) {
			const { row, col } = normalizeMove(move);
			return isEditable(row, col);
		},

		/**
		 * 判断一次输入在业务规则上是否有效。
		 *
		 * @param {{ row: number, col: number, value: number }} move
		 * @returns {boolean}
		 */
		isValidMove(move) {
			const { row, col, value } = normalizeMove(move);
			if (!isEditable(row, col)) {
				return value === grid[row][col];
			}

			return !wouldConflict(grid, row, col, value);
		},

		/**
		 * 返回某个空格的候选数集合。
		 *
		 * @param {number} row
		 * @param {number} col
		 * @returns {number[]}
		 */
		getCandidates(row, col) {
			return collectCandidates(grid, puzzleGrid, row, col);
		},

		/**
		 * 返回当前棋盘所有空格的候选数。
		 *
		 * @returns {Array<{ row: number, col: number, candidates: number[] }>}
		 */
		getCandidateMap() {
			const candidateMap = [];
			for (let row = 0; row < 9; row++) {
				for (let col = 0; col < 9; col++) {
					const candidates = collectCandidates(grid, puzzleGrid, row, col);
					if (candidates.length > 0) {
						candidateMap.push({ row, col, candidates });
					}
				}
			}

			return candidateMap;
		},

		/**
		 * 找到一个可直接推断的下一步。
		 *
		 * @returns {{ row: number, col: number, value: number, candidates: number[] } | null}
		 */
		findDeducibleMove() {
			return findDeducibleMove(grid, puzzleGrid);
		},

		/**
		 * 返回分层提示：唯一候选、隐性唯一或探索建议。
		 *
		 * @returns {{ type: string, strategy?: string, row?: number, col?: number, value?: number, candidates?: number[], reason: string } | null}
		 */
		getHint() {
			return createHint(grid, puzzleGrid);
		},

		/**
		 * 返回当前盘面的稳定签名。
		 *
		 * @returns {string}
		 */
		getSignature() {
			return createGridSignature(grid);
		},

		getInvalidCells,

		isSolved,

		/**
		 * 导出供 UI 直接消费的纯数据状态。
		 *
		 * @returns {{ puzzleGrid: number[][], grid: number[][], invalidCells: string[], won: boolean }}
		 */
		getState() {
			return {
				puzzleGrid: cloneGrid(puzzleGrid),
				grid: cloneGrid(grid),
				invalidCells: getInvalidCells(),
				won: isSolved(),
			};
		},

		/**
		 * 执行一次用户输入。
		 *
		 * 这里不会抛出“固定格不可编辑”这种业务错误，而是返回 `false`
		 * 告诉上层这次输入没有产生状态变化，便于 UI 流程直接消费。
		 *
		 * @param {{ row: number, col: number, value: number }} move
		 * @returns {boolean}
		 */
		guess(move) {
			const { row, col, value } = normalizeMove(move);
			if (!isEditable(row, col) || grid[row][col] === value) {
				return false;
			}

			grid[row][col] = value;
			return true;
		},

		/**
		 * 创建当前对象的独立副本。
		 *
		 * @returns {ReturnType<typeof createSudoku>}
		 */
		clone() {
			return createSudokuFromJSON(toJSON());
		},

		toJSON,

		/**
		 * 返回便于调试的文本棋盘，空格使用 `.` 表示。
		 *
		 * @returns {string}
		 */
		toString() {
			return grid
				.map(row => row.map(cell => (cell === 0 ? '.' : String(cell))).join(' '))
				.join('\n');
		},
	};
}

/**
 * 从 JSON 数据恢复 `Sudoku` 领域对象。
 *
 * @param {{ grid: number[][], puzzleGrid?: number[][], initialGrid?: number[][] }} json
 * @returns {ReturnType<typeof createSudoku>}
 */
export function createSudokuFromJSON(json) {
	if (!json || typeof json !== 'object') {
		throw new Error('Sudoku JSON must be an object.');
	}

	const grid = json.grid;
	const puzzleGrid = Array.isArray(json.puzzleGrid)
		? json.puzzleGrid
		: (Array.isArray(json.initialGrid) ? json.initialGrid : json.grid);

	assertGrid(grid);
	assertGrid(puzzleGrid, 'Sudoku puzzle grid');
	assertPuzzleCompatibility(puzzleGrid, grid);

	const sudoku = createSudoku(puzzleGrid);
	// 先从题面固定格创建对象，再把玩家输入逐个回放回去，
	// 这样恢复过程仍然经过领域规则，而不是直接篡改内部状态。
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			if (puzzleGrid[row][col] === 0 && grid[row][col] !== puzzleGrid[row][col]) {
				sudoku.guess({ row, col, value: grid[row][col] });
			}
		}
	}

	return sudoku;
}

/**
 * 校验传入对象是否满足 `Game` 所需的最小领域接口。
 *
 * @param {unknown} sudoku
 */
function assertSudokuLike(sudoku) {
	if (
		!sudoku
		|| typeof sudoku.clone !== 'function'
		|| typeof sudoku.guess !== 'function'
		|| typeof sudoku.toJSON !== 'function'
		|| typeof sudoku.getState !== 'function'
	) {
		throw new Error('createGame requires a sudoku domain object.');
	}
}

/**
 * `Game` 的统一构造入口。
 *
 * `createGame` 和 `createGameFromJSON` 都复用这里，避免两套
 * undo/redo 逻辑漂移。
 *
 * @param {{
 *   sudoku: ReturnType<typeof createSudoku>,
 *   undoStack?: Array<{ grid: number[][], puzzleGrid: number[][] }>,
 *   redoStack?: Array<{ grid: number[][], puzzleGrid: number[][] }>
 * }} options
 * @returns {{
 *   getSudoku: () => ReturnType<typeof createSudoku>,
 *   getState: () => { puzzleGrid: number[][], grid: number[][], invalidCells: string[], won: boolean, canUndo: boolean, canRedo: boolean },
 *   guess: (move: { row: number, col: number, value: number }) => boolean,
 *   undo: () => boolean,
 *   redo: () => boolean,
 *   canUndo: () => boolean,
 *   canRedo: () => boolean,
 *   toJSON: () => { sudoku: { grid: number[][], puzzleGrid: number[][] }, undoStack: Array<{ grid: number[][], puzzleGrid: number[][] }>, redoStack: Array<{ grid: number[][], puzzleGrid: number[][] }> },
 *   toString: () => string
 * }}
 */
function createGameCore({ sudoku, undoStack = [], redoStack = [] }) {
	assertSudokuLike(sudoku);

	let currentSudoku = sudoku.clone();
	let undoHistory = undoStack.map(cloneSnapshot);
	let redoHistory = redoStack.map(cloneSnapshot);
	let exploration = null;

	/**
	 * 当前是否处于探索模式。
	 *
	 * @returns {boolean}
	 */
	function isExploring() {
		return exploration !== null;
	}

	/**
	 * 返回当前可见局面。探索模式下 UI 消费探索局面，否则消费主局面。
	 *
	 * @returns {ReturnType<typeof createSudoku>}
	 */
	function getActiveSudoku() {
		return isExploring() ? exploration.sudoku : currentSudoku;
	}

	/**
	 * 创建探索树节点。
	 *
	 * @param {{ parentId: string | null, move: { row: number, col: number, value: number } | null, snapshot: { grid: number[][], puzzleGrid: number[][] } }} options
	 * @returns {{ id: string, parentId: string | null, move: { row: number, col: number, value: number } | null, sudokuSnapshot: { grid: number[][], puzzleGrid: number[][] }, status: 'open' | 'active' | 'failed' | 'committed', reason: string | null, children: string[] }}
	 */
	function createExploreNode({ parentId, move, snapshot }) {
		const id = `node-${exploration.nextNodeId}`;
		exploration.nextNodeId += 1;
		return {
			id,
			parentId,
			move,
			sudokuSnapshot: cloneSnapshot(snapshot),
			status: 'active',
			reason: null,
			children: [],
		};
	}

	/**
	 * 将节点状态改为 active，并把其他 active 节点降为 open。
	 *
	 * @param {string} nodeId
	 */
	function activateExploreNode(nodeId) {
		for (const node of exploration.nodesById.values()) {
			if (node.status === 'active') {
				node.status = 'open';
			}
		}

		const node = exploration.nodesById.get(nodeId);
		if (node.status !== 'failed') {
			node.status = 'active';
		}
		exploration.currentNodeId = nodeId;
		exploration.sudoku = restoreSudoku(node.sudokuSnapshot);
	}

	/**
	 * 当前探索节点。
	 *
	 * @returns {{ id: string, parentId: string | null, move: { row: number, col: number, value: number } | null, sudokuSnapshot: { grid: number[][], puzzleGrid: number[][] }, status: string, reason: string | null, children: string[] }}
	 */
	function getCurrentExploreNode() {
		return exploration.nodesById.get(exploration.currentNodeId);
	}

	/**
	 * 标记探索节点失败。
	 *
	 * @param {string} nodeId
	 * @param {string} reason
	 */
	function markExploreNodeFailed(nodeId, reason) {
		const node = exploration.nodesById.get(nodeId);
		node.status = 'failed';
		node.reason = reason;
		exploration.failedSignatures.set(
			createGridSignature(node.sudokuSnapshot.grid),
			nodeId,
		);
	}

	/**
	 * 构建供 UI 消费的纯数据探索树。
	 *
	 * @param {string} nodeId
	 * @returns {{ id: string, parentId: string | null, move: { row: number, col: number, value: number } | null, status: string, reason: string | null, children: object[] }}
	 */
	function serializeExploreNode(nodeId) {
		const node = exploration.nodesById.get(nodeId);
		return {
			id: node.id,
			parentId: node.parentId,
			move: node.move ? { ...node.move } : null,
			status: node.status,
			reason: node.reason,
			children: node.children.map(serializeExploreNode),
		};
	}

	/**
	 * 用新的 `Sudoku` 实例替换当前局面。
	 *
	 * @param {ReturnType<typeof createSudoku>} nextSudoku
	 */
	function replaceSudoku(nextSudoku) {
		currentSudoku = nextSudoku;
	}

	/**
	 * 替换探索局面。
	 *
	 * @param {ReturnType<typeof createSudoku>} nextSudoku
	 */
	function replaceExploreSudoku(nextSudoku) {
		exploration.sudoku = nextSudoku;
		getCurrentExploreNode().sudokuSnapshot = snapshotSudoku(nextSudoku);
	}

	/**
	 * 当前探索局面是否已经失败或命中过失败记忆。
	 *
	 * @returns {boolean}
	 */
	function isExploreFailed() {
		if (!isExploring()) {
			return false;
		}

		const signature = exploration.sudoku.getSignature();
		return exploration.sudoku.getInvalidCells().length > 0
			|| exploration.failedSignatures.has(signature);
	}

	/**
	 * 如果探索局面存在冲突，把它记入失败路径集合。
	 */
	function rememberExploreFailure() {
		if (!isExploring()) {
			return;
		}

		if (exploration.sudoku.getInvalidCells().length > 0) {
			markExploreNodeFailed(exploration.currentNodeId, 'conflict');
			return;
		}

		const failedNodeId = exploration.failedSignatures.get(exploration.sudoku.getSignature());
		if (failedNodeId) {
			markExploreNodeFailed(exploration.currentNodeId, 'known-failed-board');
		}
	}

	/**
	 * 导出供 UI 直接订阅的纯数据状态。
	 *
	 * @returns {{ puzzleGrid: number[][], grid: number[][], invalidCells: string[], won: boolean, canUndo: boolean, canRedo: boolean, mode: 'normal' | 'explore', exploreFailed: boolean, failedExploreCount: number }}
	 */
	function getState() {
		const sudokuState = getActiveSudoku().getState();
		return {
			...sudokuState,
			canUndo: isExploring() ? exploration.undoStack.length > 0 : undoHistory.length > 0,
			canRedo: isExploring() ? exploration.redoStack.length > 0 : redoHistory.length > 0,
			mode: isExploring() ? 'explore' : 'normal',
			exploreFailed: isExploreFailed(),
			failedExploreCount: isExploring() ? exploration.failedSignatures.size : 0,
			currentExploreNodeId: isExploring() ? exploration.currentNodeId : null,
			exploreTree: isExploring() ? serializeExploreNode(exploration.rootId) : null,
		};
	}

	return {
		/**
		 * 返回当前 `Sudoku` 的独立副本，避免外部直接拿到内部引用。
		 *
		 * @returns {ReturnType<typeof createSudoku>}
		 */
		getSudoku() {
			return getActiveSudoku().clone();
		},

		getState,

		/**
		 * 返回当前可见局面中某个格子的候选数。
		 *
		 * @param {{ row: number, col: number }} cell
		 * @returns {number[]}
		 */
		getCandidates(cell) {
			if (!cell || typeof cell !== 'object') {
				throw new Error('Cell must be an object.');
			}

			assertCoordinate(cell.row, 'Cell row');
			assertCoordinate(cell.col, 'Cell col');
			return getActiveSudoku().getCandidates(cell.row, cell.col);
		},

		/**
		 * 返回当前可见局面的下一步唯一候选提示。
		 *
		 * @returns {{ row: number, col: number, value: number, candidates: number[] } | null}
		 */
		getNextHint() {
			const hint = getActiveSudoku().getHint();
			if (!hint || hint.type !== 'deduced') {
				return null;
			}

			const { row, col, value, candidates } = hint;
			return { row, col, value, candidates };
		},

		/**
		 * 返回分层提示。
		 *
		 * @returns {{ type: string, strategy?: string, row?: number, col?: number, value?: number, candidates?: number[], reason: string } | null}
		 */
		getHint() {
			return getActiveSudoku().getHint();
		},

		/**
		 * 记录一次新的输入，并在成功后清空 redo 历史。
		 *
		 * @param {{ row: number, col: number, value: number }} move
		 * @returns {boolean}
		 */
		guess(move) {
			const activeSudoku = getActiveSudoku();
			const snapshot = snapshotSudoku(activeSudoku);
			const changed = activeSudoku.guess(move);
			if (!changed) {
				return false;
			}

			if (isExploring()) {
				const parentNode = getCurrentExploreNode();
				const normalizedMove = normalizeMove(move);
				exploration.undoStack.push(snapshot);
				exploration.redoStack = [];
				parentNode.status = parentNode.status === 'failed' ? 'failed' : 'open';
				const childNode = createExploreNode({
					parentId: parentNode.id,
					move: normalizedMove,
					snapshot: snapshotSudoku(exploration.sudoku),
				});
				exploration.nodesById.set(childNode.id, childNode);
				parentNode.children.push(childNode.id);
				exploration.currentNodeId = childNode.id;
				rememberExploreFailure();
				return true;
			}

			// 只有真正发生修改时才入栈，否则会污染历史记录。
			undoHistory.push(snapshot);
			redoHistory = [];
			return true;
		},

		/**
		 * 撤销最近一次成功输入。
		 *
		 * @returns {boolean}
		 */
		undo() {
			if (isExploring()) {
				if (exploration.undoStack.length === 0) {
					return false;
				}

				exploration.redoStack.push(snapshotSudoku(exploration.sudoku));
				const previousSnapshot = exploration.undoStack.pop();
				const currentNode = getCurrentExploreNode();
				if (currentNode.parentId) {
					activateExploreNode(currentNode.parentId);
				} else {
					replaceExploreSudoku(restoreSudoku(previousSnapshot));
				}
				return true;
			}

			if (undoHistory.length === 0) {
				return false;
			}

			// undo 的本质是：当前局面进入 redo，历史顶部快照恢复为当前局面。
			redoHistory.push(snapshotSudoku(currentSudoku));
			replaceSudoku(restoreSudoku(undoHistory.pop()));
			return true;
		},

		/**
		 * 重做最近一次被撤销的输入。
		 *
		 * @returns {boolean}
		 */
		redo() {
			if (isExploring()) {
				if (exploration.redoStack.length === 0) {
					return false;
				}

				exploration.undoStack.push(snapshotSudoku(exploration.sudoku));
				const redoSnapshot = exploration.redoStack.pop();
				const signature = createGridSignature(redoSnapshot.grid);
				const redoNode = Array.from(exploration.nodesById.values())
					.find(node => createGridSignature(node.sudokuSnapshot.grid) === signature);
				if (redoNode) {
					activateExploreNode(redoNode.id);
				} else {
					replaceExploreSudoku(restoreSudoku(redoSnapshot));
				}
				rememberExploreFailure();
				return true;
			}

			if (redoHistory.length === 0) {
				return false;
			}

			// redo 与 undo 对称：先保存当前局面，再恢复 redo 栈顶部快照。
			undoHistory.push(snapshotSudoku(currentSudoku));
			replaceSudoku(restoreSudoku(redoHistory.pop()));
			return true;
		},

		/**
		 * 当前是否仍有可撤销的历史。
		 *
		 * @returns {boolean}
		 */
		canUndo() {
			return isExploring() ? exploration.undoStack.length > 0 : undoHistory.length > 0;
		},

		/**
		 * 当前是否仍有可重做的历史。
		 *
		 * @returns {boolean}
		 */
		canRedo() {
			return isExploring() ? exploration.redoStack.length > 0 : redoHistory.length > 0;
		},

		/**
		 * 从主局面创建一个临时探索会话。
		 *
		 * @returns {boolean}
		 */
		startExplore() {
			if (isExploring()) {
				return false;
			}

			exploration = {
				baseSnapshot: snapshotSudoku(currentSudoku),
				sudoku: currentSudoku.clone(),
				undoStack: [],
				redoStack: [],
				failedSignatures: new Map(),
				nodesById: new Map(),
				rootId: null,
				currentNodeId: null,
				nextNodeId: 1,
			};
			const rootNode = createExploreNode({
				parentId: null,
				move: null,
				snapshot: snapshotSudoku(currentSudoku),
			});
			exploration.nodesById.set(rootNode.id, rootNode);
			exploration.rootId = rootNode.id;
			exploration.currentNodeId = rootNode.id;
			rememberExploreFailure();
			return true;
		},

		/**
		 * 切换到探索树中的指定节点。
		 *
		 * @param {string} nodeId
		 * @returns {boolean}
		 */
		switchExploreNode(nodeId) {
			if (!isExploring() || !exploration.nodesById.has(nodeId)) {
				return false;
			}

			activateExploreNode(nodeId);
			rememberExploreFailure();
			return true;
		},

		/**
		 * 返回当前探索树。
		 *
		 * @returns {object | null}
		 */
		getExploreTree() {
			return isExploring() ? serializeExploreNode(exploration.rootId) : null;
		},

		/**
		 * 放弃探索会话，恢复到主局面。
		 *
		 * @returns {boolean}
		 */
		discardExplore() {
			if (!isExploring()) {
				return false;
			}

			exploration = null;
			return true;
		},

		/**
		 * 将探索结果作为一次主历史变更提交。
		 *
		 * @returns {boolean}
		 */
		commitExplore() {
			if (!isExploring()) {
				return false;
			}

			const baseSnapshot = cloneSnapshot(exploration.baseSnapshot);
			const exploredSudoku = exploration.sudoku.clone();
			const changed = createGridSignature(baseSnapshot.grid) !== exploredSudoku.getSignature();
			exploration = null;

			if (!changed) {
				return false;
			}

			undoHistory.push(baseSnapshot);
			redoHistory = [];
			replaceSudoku(exploredSudoku);
			return true;
		},

		/**
		 * 将整局游戏序列化为纯数据。
		 *
		 * @returns {{ sudoku: { grid: number[][], puzzleGrid: number[][] }, undoStack: Array<{ grid: number[][], puzzleGrid: number[][] }>, redoStack: Array<{ grid: number[][], puzzleGrid: number[][] }> }}
		 */
		toJSON() {
			return {
				sudoku: snapshotSudoku(currentSudoku),
				undoStack: undoHistory.map(cloneSnapshot),
				redoStack: redoHistory.map(cloneSnapshot),
			};
		},

		/**
		 * 返回包含历史信息的调试字符串。
		 *
		 * @returns {string}
		 */
		toString() {
			return [
				'Game',
				`mode=${isExploring() ? 'explore' : 'normal'}`,
				`undo=${undoHistory.length}`,
				`redo=${redoHistory.length}`,
				`invalid=${getActiveSudoku().getInvalidCells().length}`,
				getActiveSudoku().toString(),
			].join('\n');
		},
	};
}

/**
 * 根据当前 `Sudoku` 创建一局新的游戏会话。
 *
 * @param {{ sudoku: ReturnType<typeof createSudoku> }} options
 * @returns {ReturnType<typeof createGameCore>}
 */
export function createGame({ sudoku }) {
	return createGameCore({ sudoku });
}

/**
 * 从 JSON 数据恢复整个游戏会话。
 *
 * @param {{
 *   sudoku: { grid: number[][], puzzleGrid?: number[][] },
 *   undoStack?: Array<{ grid: number[][], puzzleGrid?: number[][] }>,
 *   redoStack?: Array<{ grid: number[][], puzzleGrid?: number[][] }>
 * }} json
 * @returns {ReturnType<typeof createGameCore>}
 */
export function createGameFromJSON(json) {
	if (!json || typeof json !== 'object') {
		throw new Error('Game JSON must be an object.');
	}

	const currentSudoku = createSudokuFromJSON(json.sudoku);
	const fallbackPuzzleGrid = currentSudoku.getPuzzleGrid();

	return createGameCore({
		sudoku: currentSudoku,
		undoStack: normalizeSnapshotList(json.undoStack, fallbackPuzzleGrid),
		redoStack: normalizeSnapshotList(json.redoStack, fallbackPuzzleGrid),
	});
}
