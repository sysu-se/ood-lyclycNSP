# Graph Report - .  (2026-04-27)

## Corpus Check
- Corpus is ~10,066 words - fits in a single context window. You may not need a graph.

## Summary
- 109 nodes · 110 edges · 4 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 8|Community 8]]

## God Nodes (most connected - your core abstractions)
1. `Game` - 9 edges
2. `Sudoku` - 8 edges
3. `Explore Mode` - 8 edges
4. `History Stores Sudoku Snapshots` - 7 edges
5. `Hint Feature` - 7 edges
6. `createSudokuFromJSON()` - 6 edges
7. `Homework 2 Hint and Explore Mode` - 6 edges
8. `Sudoku App Shell` - 6 edges
9. `createSudoku()` - 4 edges
10. `createGameCore()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Gray Svelte Logo 512px` --references--> `Svelte`  [INFERRED]
  static/logo-512.png → README.md
- `Gray Svelte Logo 192px` --references--> `Svelte`  [INFERRED]
  static/logo-192.png → README.md
- `Gray Svelte Favicon` --references--> `Svelte`  [INFERRED]
  static/favicon.png → README.md
- `Unfinished Undo Redo Warning` --conceptually_related_to--> `History Stores Sudoku Snapshots`  [INFERRED]
  README.md → DESIGN.md
- `Favicon Reference` --references--> `Gray Svelte Favicon`  [EXTRACTED]
  src/template.html → static/favicon.png

## Hyperedges (group relationships)
- **Domain Session State Model** — design_sudoku, design_game, design_history_snapshots [EXTRACTED 1.00]
- **Homework 2 Feature Evolution** — requirements_hint, requirements_explore_mode, requirements_evolution_md [EXTRACTED 1.00]
- **Web App Static Shell** — template_app_shell, static_404_page, favicon_svelte_logo [INFERRED 0.80]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (24): Deep Copy Strategy, Game, History Stores Sudoku Snapshots, Move Value Object, Adapter Boundary Rationale, Deep Copy Rationale, Snapshot History Rationale, Sudoku Rule Cohesion Rationale (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (17): assertCoordinate(), assertGrid(), assertPuzzleCompatibility(), assertSudokuLike(), cloneGrid(), cloneSnapshot(), collectInvalidCells(), createGame() (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (16): Gray Svelte Favicon, Gray Svelte Logo 192px, Gray Svelte Logo 512px, GitHub Classroom Assignment, Sudoku Game, Svelte, TailwindCSS, Homepage Link (+8 more)

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (1): invisible

## Knowledge Gaps
- **19 isolated node(s):** `invisible`, `Snapshot History Rationale`, `Adapter Boundary Rationale`, `Deep Copy Rationale`, `Sudoku Rule Cohesion Rationale` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 8`** (2 nodes): `invisible`, `Candidates.svelte`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `invisible`, `Snapshot History Rationale`, `Adapter Boundary Rationale` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._