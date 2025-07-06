/* eslint-disable prettier/prettier */
import { Controller, Post, Body, Get, Render } from '@nestjs/common';
import { MoveBallDto } from 'src/dtos/move-ball.dto';
import { Line98Service } from 'src/services/line98.service';

@Controller('line98')
export class Line98Controller {
  constructor(private readonly line98Service: Line98Service) { }

  @Get()
  @Render('line98/index')
  getHomePage() {
    return { title: 'Line98' };
  }

  @Post('start')
  @Render('line98/game')
  startGame() {
    const state = this.line98Service.startGame();
    return { gameState: state };
  }

  @Post('move')
  moveBall(@Body() body: any) {
    const move: MoveBallDto = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      from: { x: parseInt(body.fromX), y: parseInt(body.fromY) },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      to: { x: parseInt(body.toX), y: parseInt(body.toY) },
    };

    const response = this.line98Service.moveBall(move.from, move.to);

    return {
      success: true,
      gameState: response.state,
      path: response.path
    };
  }


  @Post('suggest')
  getSuggestMove() {
    const path = this.line98Service.suggestMovement();
    return { path: path };
  }

  @Post('undo')
  undoMove() {
    const state = this.line98Service.undo();
    return { gameState: state };
  }

  @Post('redo')
  redoMove() {
    const state = this.line98Service.redo();
    return { gameState: state };
  }
}
