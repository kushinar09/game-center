/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { GameState, Ball, Position } from '../models/game-state.model';
import { MoveBallResponse } from 'src/dtos/move-ball-response.dto';

const BOARD_SIZE = 9;
const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#800080', '#00FFFF', '#FFA500'];
const LINE_LENGTH = 5;

@Injectable()
export class Line98Service {
  private state: GameState = new GameState();
  private previousState: GameState | null = null;
  private futureState: GameState | null = null;


  startGame(): GameState {
    this.state = new GameState();
    this.generateNextBalls();
    this.placeNextBalls();
    this.generateNextBalls();
    this.placeNextBalls();
    this.generateNextBalls();
    return this.state;
  }

  moveBall(from: Position, to: Position): MoveBallResponse {
    const ball = this.getBall(from);
    if (!ball || ball.status !== 'cur') return {
      state: this.state,
      path: []
    }

    const path = this.findShortestPath(from, to);
    if (!path) return {
      state: this.state,
      path: []
    }

    this.previousState = this.cloneGameState(this.state);
    this.futureState = null; // clear redo history

    this.setBall(to, { ...ball, position: to });
    this.setBall(from, null);

    const cleared = this.clearMatchingLines(to);
    if (cleared.length === 0) {
      this.placeNextBalls();
      this.generateNextBalls();
    }

    this.state.undo = true;
    this.state.redo = false;

    return {
      state: this.state,
      path,
    };
  }

  undo(): GameState {
    if (!this.previousState) throw new BadRequestException('No undo available');
    this.futureState = this.cloneGameState(this.state);
    this.state = this.cloneGameState(this.previousState);
    this.previousState = null;

    this.state.undo = false;
    this.state.redo = true;

    return this.state;
  }

  redo(): GameState {
    if (!this.futureState) throw new BadRequestException('No redo available');
    this.previousState = this.cloneGameState(this.state);
    this.state = this.cloneGameState(this.futureState);
    this.futureState = null;

    this.state.undo = true;
    this.state.redo = false;

    return this.state;
  }

  suggestMovement() {
    if (this.getEmptyPositions().length < 3) {
      this.state.gameOver = true;
      return;
    }
    const bestMove = this.suggestBestMove();
    if (bestMove) {
      // return this.moveBall(bestMove.from, bestMove.to);
      return bestMove.path;
    }
  }

  private suggestBestMove(): { from: Position, to: Position, path: Position[] } | null {
    const balls: Position[] = [];
    const emptyPositions = this.getEmptyPositions();

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const ball = this.state.board[y][x];
        if (ball && ball.status === 'cur') {
          balls.push({ x, y });
        }
      }
    }

    let bestMove: {
      from: Position;
      to: Position;
      path: Position[];
      priority: number;
      matchLength: number;
    } | null = null;

    for (const from of balls) {
      const ball = this.getBall(from);
      if (!ball || ball.status !== 'cur') continue;

      for (const to of emptyPositions) {
        const path = this.findShortestPath(from, to);
        if (!path) continue;

        // Simulate move
        this.setBall(to, { ...ball, position: { ...to } });
        this.setBall(from, null);

        // 1. Immediate explosion?
        const matchNow = this.getMatchedLine(to);
        if (matchNow.length >= LINE_LENGTH) {
          this.setBall(from, ball);
          this.setBall(to, null);
          return { from, to, path }; // priority 4
        }

        // 2. Simulate nextBalls placement
        const backupBoard = this.cloneBoard();
        const fakeNextBalls: Ball[] = [];
        for (const b of this.state.board) {
          for (const bs of b) {
            if (bs && bs.status === 'next')
              fakeNextBalls.push(bs);
          }
        }
        this.simulateNextBalls(fakeNextBalls);

        const matchAfterNext = this.getMatchedLine(to);

        this.state.board = backupBoard; // restore board

        // 3. Check match length for potential
        const matchLen = matchNow.length;

        let priority = 1;
        if (matchAfterNext.length >= LINE_LENGTH) priority = 3;
        else if (matchLen >= 3) priority = 2;

        if (
          !bestMove ||
          priority > bestMove.priority ||
          (priority === bestMove.priority && matchLen > bestMove.matchLength)
        ) {
          bestMove = { from, to, path, priority, matchLength: matchLen };
        }

        // Revert board
        this.setBall(from, ball);
        this.setBall(to, null);
      }
    }

    return bestMove ? { from: bestMove.from, to: bestMove.to, path: bestMove.path } : null;
  }

  private simulateNextBalls(fakeNextBalls: Ball[]) {
    const empty = this.getEmptyPositions();

    for (const ball of fakeNextBalls) {
      if (empty.length === 0) break;
      ball.status = 'cur';
      this.setBall(ball.position, ball);
    }
  }

  private cloneBoard(): (Ball | null)[][] {
    return this.state.board.map(row =>
      row.map(ball =>
        ball ? { ...ball, position: { ...ball.position }, status: ball.status } : null
      )
    );
  }

  private findShortestPath(from: Position, to: Position): Position[] | null {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const visited = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
    const prev = Array(BOARD_SIZE).fill(null).map(() => Array<Position | null>(BOARD_SIZE).fill(null));

    const queue: Position[] = [from];
    visited[from.y][from.x] = true;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const { x, y } = current;

      if (x === to.x && y === to.y) {
        const path: Position[] = [];
        let p: Position | null = to;
        while (p) {
          path.unshift(p);
          p = prev[p.y][p.x];
        }
        return path;
      }

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;

        const b = this.getBall({ x: nx, y: ny });

        if (
          this.isInBounds(nx, ny) &&
          !visited[ny][nx] &&
          (!b || b.status !== 'cur')
        ) {
          visited[ny][nx] = true;
          prev[ny][nx] = current;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    return null;
  }

  private cloneGameState(state: GameState): GameState {
    const clone = new GameState();
    clone.board = state.board.map(row =>
      row.map(ball => ball ? { ...ball, position: { ...ball.position } } : null)
    );
    clone.score = state.score;
    clone.gameOver = state.gameOver;
    return clone;
  }

  private getMatchedLine(pos: Position): Position[] {
    const ball = this.getBall(pos);
    if (!ball) return [];

    const directions = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 1 },
      { dx: 1, dy: -1 },
    ];

    // eslint-disable-next-line prefer-const
    let matched: Position[] = [];

    for (const { dx, dy } of directions) {
      const line = [pos];

      for (const dir of [-1, 1]) {
        let x = pos.x + dir * dx;
        let y = pos.y + dir * dy;

        while (
          this.isInBounds(x, y) &&
          this.getBall({ x, y })?.status === 'cur' &&
          this.getBall({ x, y })?.color === ball.color
        ) {
          line.push({ x, y });
          x += dir * dx;
          y += dir * dy;
        }
      }

      if (line.length >= 2) {
        matched.push(...line);
      }
    }

    return this.deduplicatePositions(matched);
  }

  private generateNextBalls() {
    const emptyPositions = this.getEmptyPositions();

    if (emptyPositions.length < 3) {
      this.state.gameOver = true;
      return;
    }

    for (let i = 0; i < 3; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      const index = Math.floor(Math.random() * emptyPositions.length);
      const position = emptyPositions.splice(index, 1)[0];

      this.setBall(position, { color, position, status: 'next' });
    }
  }

  private placeNextBalls() {
    let anyCleared = false;

    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const ball = this.state.board[y][x];
        if (ball && ball.status === 'next') {
          ball.status = 'cur';

          const cleared = this.clearMatchingLines({ x, y });
          if (cleared) {
            anyCleared = true;
          }
        }
      }
    }

    if (this.getEmptyPositions().length === 0 && !anyCleared) {
      this.state.gameOver = true;
    }
  }


  private clearMatchingLines(pos: Position): Position[] {
    const ball = this.getBall(pos);
    if (!ball || ball.status !== 'cur') return [];

    const directions = [
      { dx: 1, dy: 0 },   // horizontal
      { dx: 0, dy: 1 },   // vertical
      { dx: 1, dy: 1 },   // diagonal \
      { dx: 1, dy: -1 },  // diagonal /
    ];

    const allMatched: Position[] = [];

    for (const { dx, dy } of directions) {
      const line: Position[] = [pos];

      for (const dir of [-1, 1]) {
        let x = pos.x + dir * dx;
        let y = pos.y + dir * dy;

        while (
          this.isInBounds(x, y)
        ) {
          const current = this.getBall({ x, y });
          if (!current || current.color !== ball.color || current.status !== 'cur') break;

          line.push({ x, y });
          x += dir * dx;
          y += dir * dy;
        }
      }

      if (line.length >= LINE_LENGTH) {
        allMatched.push(...line);
      }
    }

    if (allMatched.length > 0) {
      const unique = this.deduplicatePositions(allMatched);
      for (const pos of unique) {
        this.setBall(pos, null);
      }
      this.state.score += unique.length;
    }

    return allMatched;
  }


  private getBall(pos: Position): Ball | null {
    const row = this.state.board[pos.y];
    if (!row) return null;

    return row[pos.x] ?? null;
  }

  private setBall(pos: Position, ball: Ball | null) {
    this.state.board[pos.y][pos.x] = ball;
  }

  private getEmptyPositions(): Position[] {
    const result: Position[] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (!this.state.board[y][x] || (this.state.board[y][x] && this.state.board[y][x]?.status !== 'cur')) {
          result.push({ x, y });
        }
      }
    }
    return result;
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
  }

  private deduplicatePositions(posArr: Position[]): Position[] {
    const seen = new Set<string>();
    const result: Position[] = [];

    for (const pos of posArr) {
      const key = `${pos.x},${pos.y}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(pos);
      }
    }

    return result;
  }
}
