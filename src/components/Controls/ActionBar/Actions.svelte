<script>
	import game from '@sudoku/game';
	import { candidates } from '@sudoku/stores/candidates';
	import { currentExploreNodeId, exploreFailed, exploreTree, gameMode, userGrid } from '@sudoku/stores/grid';
	import { cursor } from '@sudoku/stores/cursor';
	import { hints } from '@sudoku/stores/hints';
	import { notes } from '@sudoku/stores/notes';
	import { settings } from '@sudoku/stores/settings';
	import { keyboardDisabled } from '@sudoku/stores/keyboard';
	import { gameCanRedo, gameCanUndo, gamePaused } from '@sudoku/stores/game';

	$: hintsAvailable = $hints > 0;
	$: hasSelection = $cursor.x !== null && $cursor.y !== null;
	$: selectedEmpty = hasSelection && $userGrid[$cursor.y] && $userGrid[$cursor.y][$cursor.x] === 0;
	$: currentExploreNode = findExploreNode($exploreTree, $currentExploreNodeId);
	$: parentExploreNodeId = currentExploreNode && currentExploreNode.parentId;

	function findExploreNode(node, nodeId) {
		if (!node || !nodeId) {
			return null;
		}

		if (node.id === nodeId) {
			return node;
		}

		for (const child of node.children) {
			const match = findExploreNode(child, nodeId);
			if (match) {
				return match;
			}
		}

		return null;
	}

	function handleHint() {
		if (hintsAvailable && selectedEmpty) {
			if ($candidates.hasOwnProperty($cursor.x + ',' + $cursor.y)) {
				candidates.clear($cursor);
			}

			const values = userGrid.hintCandidates($cursor);
			if (values.length > 0) {
				candidates.set($cursor, values);
			}
		}
	}

	function handleNextHint() {
		if (!hintsAvailable) {
			return;
		}

		const hint = userGrid.hintNextMove();
		if (!hint) {
			return;
		}

		if (hint.type === 'blocked' || hint.row === undefined || hint.col === undefined) {
			return;
		}

		const pos = { x: hint.col, y: hint.row };
		cursor.set(pos.x, pos.y);
		candidates.set(pos, hint.candidates || [hint.value]);
	}

	function handleUndo() {
		game.undo();
	}

	function handleRedo() {
		game.redo();
	}

	function handleStartExplore() {
		userGrid.startExplore();
	}

	function handleCommitExplore() {
		userGrid.commitExplore();
	}

	function handleDiscardExplore() {
		userGrid.discardExplore();
	}

	function handleBackToParentExploreNode() {
		if (parentExploreNodeId) {
			userGrid.switchExploreNode(parentExploreNodeId);
		}
	}
</script>

<div class="action-buttons space-x-3">

	<button class="btn btn-round" disabled={$gamePaused || !$gameCanUndo} on:click={handleUndo} title="Undo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
		</svg>
	</button>

	<button class="btn btn-round" disabled={$gamePaused || !$gameCanRedo} on:click={handleRedo} title="Redo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 90 00-8 8v2M21 10l-6 6m6-6l-6-6" />
		</svg>
	</button>

	<button class="btn btn-round btn-badge" disabled={$keyboardDisabled || !hintsAvailable || !selectedEmpty} on:click={handleHint} title="Candidate hint ({$hints})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
		</svg>

		{#if $settings.hintsLimited}
			<span class="badge" class:badge-primary={hintsAvailable}>{$hints}</span>
		{/if}
	</button>

	<button class="btn btn-round btn-badge" disabled={$keyboardDisabled || !hintsAvailable} on:click={handleNextHint} title="Next-step hint ({$hints})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>

		{#if $settings.hintsLimited}
			<span class="badge" class:badge-primary={hintsAvailable}>{$hints}</span>
		{/if}
	</button>

	<button class="btn btn-round btn-badge" on:click={notes.toggle} title="Notes ({$notes ? 'ON' : 'OFF'})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
		</svg>

		<span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
	</button>

	{#if $gameMode === 'normal'}
		<button class="btn btn-round" disabled={$gamePaused} on:click={handleStartExplore} title="Start explore mode">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
			</svg>
		</button>
	{:else}
		<button class="btn btn-round" disabled={!parentExploreNodeId} on:click={handleBackToParentExploreNode} title="Back to parent explore branch">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
			</svg>
		</button>

		<button class="btn btn-round btn-badge" on:click={handleCommitExplore} title="Commit explore result">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>

			{#if $exploreFailed}
				<span class="badge bg-red-600">!</span>
			{/if}
		</button>

		<button class="btn btn-round" on:click={handleDiscardExplore} title="Discard explore result">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	{/if}

</div>


<style>
	.action-buttons {
		@apply flex flex-wrap justify-evenly self-end;
	}

	.btn-badge {
		@apply relative;
	}

	.badge {
		min-height: 20px;
		min-width:  20px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}

	.badge-primary {
		@apply bg-primary;
	}
</style>
