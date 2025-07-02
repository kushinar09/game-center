/* eslint-disable prettier/prettier */
import { Server, Socket } from 'socket.io';

import { Injectable } from '@nestjs/common';

@Injectable()
export class CaroService {
  private players: Socket[] = [];
  private board: string[][] = this.createEmptyBoard();
  private currentPlayerSymbol: 'X' | 'O' = 'X';
  private rematchRequests: Set<string> = new Set();

  addPlayer(client: Socket, server: Server) {
    if (this.players.length < 2) {
      this.players.push(client);
      const playerNumber = this.players.length;
      client.emit('joined', { player: playerNumber });

      client.on('disconnect', () => this.handleDisconnect(client, server));

      if (this.players.length === 2) this.startGame(server);
    } else {
      client.emit('full', 'Game is full.');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket, server: Server) {
    this.players = this.players.filter(p => p.id !== client.id);
    this.resetGame(server);
    if (this.players.length === 1) {
      this.players[0].emit('waiting', 'Opponent disconnected. You are now Player 1.');
    }
  }

  processMove(client: Socket, { x, y }: { x: number; y: number }, server: Server) {
    const playerIndex = this.players.findIndex(p => p.id === client.id);
    if (playerIndex === -1 || this.players.length < 2) return;

    const expectedSymbol = playerIndex === 0 ? 'X' : 'O';
    if (this.currentPlayerSymbol !== expectedSymbol) {
      client.emit('not-your-turn', 'Wait for your turn.');
      return;
    }

    if (this.board[x][y] !== '') {
      client.emit('invalid', 'Cell already taken.');
      return;
    }

    this.board[x][y] = this.currentPlayerSymbol;
    server.emit('update', { board: this.board });

    if (this.checkWin(x, y, this.currentPlayerSymbol)) {
      server.emit('end', `${this.currentPlayerSymbol} wins!`);
    } else {
      this.currentPlayerSymbol = this.currentPlayerSymbol === 'X' ? 'O' : 'X';
      server.emit('turn', this.currentPlayerSymbol === 'X' ? 1 : 2);
    }
  }

  requestRematch(client: Socket, server: Server) {
    if (!this.players.some(p => p.id === client.id)) return;

    this.rematchRequests.add(client.id);
    server.emit('rematch-status', {
      requester: client.id,
      count: this.rematchRequests.size,
    });

    if (this.rematchRequests.size === 2) {
      this.rematchRequests.clear();
      this.startGame(server);
    }
  }

  private startGame(server: Server) {
    this.board = this.createEmptyBoard();
    this.currentPlayerSymbol = 'X';
    server.emit('start', {
      message: 'Game started!',
      turn: 1,
      board: this.board,
    });
  }

  private resetGame(server: Server) {
    this.board = this.createEmptyBoard();
    this.currentPlayerSymbol = 'X';
    server.emit('reset', { board: this.board });
  }

  private createEmptyBoard(): string[][] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return Array.from({ length: 20 }, () => Array(20).fill(''));
  }

  private checkWin(x: number, y: number, player: string): boolean {
    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (const [dx, dy] of directions) {
      let count = 1;
      count += this.countInDirection(x, y, dx, dy, player);
      count += this.countInDirection(x, y, -dx, -dy, player);
      if (count >= 5) return true;
    }
    return false;
  }

  private countInDirection(x: number, y: number, dx: number, dy: number, player: string): number {
    let count = 0;
    let i = x + dx;
    let j = y + dy;
    while (
      i >= 0 &&
      j >= 0 &&
      i < 20 &&
      j < 20 &&
      this.board[i][j] === player
    ) {
      count++;
      i += dx;
      j += dy;
    }
    return count;
  }
}
