// ============================================================
// Mini Sudoku 6×6 — Puzzle Generator & Validator
// ============================================================
//
// Generates valid 6×6 Sudoku puzzles with digits 1-6.
// The grid is divided into six 2×3 subgrids:
//
//   ┌───────┬───────┬───────┐
//   │ (0,0) │ (0,3) │       │   rows 0-1
//   │       │       │       │
//   ├───────┼───────┼───────┤
//   │       │       │       │   rows 2-3
//   │       │       │       │
//   ├───────┼───────┼───────┤
//   │       │       │       │   rows 4-5
//   │       │       │       │
//   └───────┴───────┴───────┘
//     c0-2    c3-5

const SIZE = 6;
const BOX_ROWS = 2;
const BOX_COLS = 3;
const DIGITS = [1, 2, 3, 4, 5, 6];

// ---- Seeded PRNG (mulberry32) ----

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle in place using the provided RNG */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---- Constraint helpers ----

function getBoxIndex(row: number, col: number): number {
  return Math.floor(row / BOX_ROWS) * (SIZE / BOX_COLS) + Math.floor(col / BOX_COLS);
}

function isValid(grid: number[][], row: number, col: number, num: number): boolean {
  // Check row
  for (let c = 0; c < SIZE; c++) {
    if (grid[row][c] === num) return false;
  }
  // Check column
  for (let r = 0; r < SIZE; r++) {
    if (grid[r][col] === num) return false;
  }
  // Check 2×3 box
  const boxRowStart = Math.floor(row / BOX_ROWS) * BOX_ROWS;
  const boxColStart = Math.floor(col / BOX_COLS) * BOX_COLS;
  for (let r = boxRowStart; r < boxRowStart + BOX_ROWS; r++) {
    for (let c = boxColStart; c < boxColStart + BOX_COLS; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

// ---- Grid solver / generator ----

function emptyGrid(): number[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row) => [...row]);
}

/** Fill a grid completely using backtracking with randomised digit order */
function fillGrid(grid: number[][], rng: () => number): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) {
        const digits = shuffle([...DIGITS], rng);
        for (const d of digits) {
          if (isValid(grid, r, c, d)) {
            grid[r][c] = d;
            if (fillGrid(grid, rng)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true; // fully filled
}

/** Count solutions (up to limit). Used to verify uniqueness. */
function countSolutions(grid: number[][], limit: number): number {
  let count = 0;

  function solve(): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) {
          for (const d of DIGITS) {
            if (isValid(grid, r, c, d)) {
              grid[r][c] = d;
              if (solve()) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    // Reached a complete solution
    count++;
    return count >= limit; // stop early when limit reached
  }

  solve();
  return count;
}

/**
 * Create a puzzle by removing cells from a filled grid,
 * ensuring a unique solution. Targets ~14-18 given cells.
 */
function createPuzzle(solution: number[][], rng: () => number): number[][] {
  const puzzle = cloneGrid(solution);
  const totalCells = SIZE * SIZE; // 36
  const targetGivens = 14 + Math.floor(rng() * 5); // 14-18 givens
  const targetRemovals = totalCells - targetGivens;

  // Build randomised list of all cell positions
  const positions: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      positions.push([r, c]);
    }
  }
  shuffle(positions, rng);

  let removals = 0;
  for (const [r, c] of positions) {
    if (removals >= targetRemovals) break;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    // Check uniqueness
    const test = cloneGrid(puzzle);
    if (countSolutions(test, 2) !== 1) {
      puzzle[r][c] = backup; // restore, removal would create ambiguity
    } else {
      removals++;
    }
  }

  return puzzle;
}

// ---- Public API ----

/**
 * Generate a random 6×6 Sudoku puzzle with a unique solution.
 * Uses Math.random for non-deterministic generation.
 */
export function generateSudoku6x6(): {
  puzzle: number[][];
  solution: number[][];
} {
  const rng = () => Math.random();
  const solution = emptyGrid();
  fillGrid(solution, rng);
  const puzzle = createPuzzle(solution, rng);
  return { puzzle, solution };
}

/**
 * Check a player's grid against the solution.
 * Returns whether the grid is fully correct, and how many cells are correct.
 */
export function validateSudoku(
  grid: number[][],
  solution: number[][]
): { correct: boolean; correctCells: number } {
  let correctCells = 0;
  let allCorrect = true;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === solution[r][c]) {
        correctCells++;
      } else {
        allCorrect = false;
      }
    }
  }

  return { correct: allCorrect, correctCells };
}

/**
 * Get a deterministic Sudoku puzzle for a given day number.
 * The same dayNumber always produces the same puzzle.
 */
export function getSudokuForDay(dayNumber: number): {
  puzzle: number[][];
  solution: number[][];
} {
  // Create a deterministic seed from the day number
  const seed = dayNumber * 2654435761; // Knuth's multiplicative hash
  const rng = mulberry32(seed);

  const solution = emptyGrid();
  fillGrid(solution, rng);
  const puzzle = createPuzzle(solution, rng);

  return { puzzle, solution };
}

/**
 * Find duplicate positions in the grid (for error highlighting).
 * Returns a Set of "r,c" strings that are involved in row/col/box conflicts.
 */
export function findDuplicates(grid: number[][]): Set<string> {
  const dupes = new Set<string>();

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const val = grid[r][c];
      if (val === 0) continue;

      // Check row
      for (let cc = 0; cc < SIZE; cc++) {
        if (cc !== c && grid[r][cc] === val) {
          dupes.add(`${r},${c}`);
          dupes.add(`${r},${cc}`);
        }
      }
      // Check column
      for (let rr = 0; rr < SIZE; rr++) {
        if (rr !== r && grid[rr][c] === val) {
          dupes.add(`${r},${c}`);
          dupes.add(`${rr},${c}`);
        }
      }
      // Check 2×3 box
      const br = Math.floor(r / BOX_ROWS) * BOX_ROWS;
      const bc = Math.floor(c / BOX_COLS) * BOX_COLS;
      for (let rr = br; rr < br + BOX_ROWS; rr++) {
        for (let cc = bc; cc < bc + BOX_COLS; cc++) {
          if ((rr !== r || cc !== c) && grid[rr][cc] === val) {
            dupes.add(`${r},${c}`);
            dupes.add(`${rr},${cc}`);
          }
        }
      }
    }
  }

  return dupes;
}
