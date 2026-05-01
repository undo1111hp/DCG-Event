export function TetrisBackground() {
  // Various Tetris piece shapes (each is an array of [row, col] offsets)
  const shapes = [
    // L-piece
    [
      { r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 2, c: 1 }
    ],
    // T-piece
    [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 1 }
    ],
    // S-piece
    [
      { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 1 }
    ],
    // Square
    [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }
    ],
    // I-piece
    [
      { r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }
    ],
    // J-piece
    [
      { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }, { r: 2, c: 0 }
    ],
    // Z-piece
    [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }
    ],
  ];

  const pieces = Array.from({ length: 14 }, (_, i) => ({
    shape: shapes[i % shapes.length],
    style: {
      '--delay': `${(i * 1.3) % 12}s`,
      '--duration': `${8 + (i % 5) * 2.5}s`,
      '--left': `${(i * 7.7) % 100}%`,
      '--piece-opacity': `${0.06 + (i % 4) * 0.03}`,
    },
  }));

  const blockSize = 16;
  const gridGap = 2;

  return (
    <div className="tetris-background">
      {pieces.map((piece, i) => {
        // Calculate bounding box
        const maxRow = Math.max(...piece.shape.map((b) => b.r));
        const maxCol = Math.max(...piece.shape.map((b) => b.c));
        const cols = maxCol + 1;
        const rows = maxRow + 1;
        const width = cols * blockSize + (cols - 1) * gridGap;
        const height = rows * blockSize + (rows - 1) * gridGap;

        return (
          <div
            key={i}
            className="tetris-piece"
            style={{
              ...piece.style,
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${blockSize}px)`,
              gridTemplateRows: `repeat(${rows}, ${blockSize}px)`,
              gridGap: `${gridGap}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
          >
            {/* Render blocks at their grid positions */}
            {Array.from({ length: rows * cols }, (_, idx) => {
              const row = Math.floor(idx / cols);
              const col = idx % cols;
              const isBlock = piece.shape.some((b) => b.r === row && b.c === col);
              return isBlock ? (
                <div key={idx} className="tetris-block" />
              ) : (
                <div key={idx} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
