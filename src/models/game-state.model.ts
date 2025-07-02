/* eslint-disable prettier/prettier */
export interface Position {
  x: number;
  y: number;
}

export interface Ball {
  color: string;
  position: Position;
  status: 'normal' | 'small'
}

export class GameState {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return
  board: (Ball | null)[][] = Array(9).fill(null).map(() => Array(9).fill(null));
  score = 0;
  nextBalls: Ball[] = [];
  gameOver = false;
}

