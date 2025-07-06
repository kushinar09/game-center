/* eslint-disable prettier/prettier */
export interface Position {
  x: number;
  y: number;
}

export interface Ball {
  color: string;
  position: Position;
  status: 'cur' | 'next'
}

export class GameState {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return
  board: (Ball | null)[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null)
  );
  score = 0;
  gameOver = false;
  undo = false;
  redo = false;
}

