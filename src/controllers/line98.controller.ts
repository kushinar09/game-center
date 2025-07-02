/* eslint-disable prettier/prettier */
import { Controller, Post, Body, Get } from '@nestjs/common';
import { MoveBallDto } from 'src/dtos/move-ball.dto';
import { Line98Service } from 'src/services/line98.service';

@Controller('line98')
export class Line98Controller {
  constructor(private readonly line98Service: Line98Service) { }

  @Post('start')
  startGame() {
    return this.line98Service.startGame();
  }

  @Post('move')
  moveBall(@Body() move: MoveBallDto) {
    return this.line98Service.moveBall(move.from, move.to);
  }

  @Get('suggest')
  getSuggestMove() {
    return this.line98Service.suggestMovement();
  }

  @Post('undo')
  undoMove() {
    return this.line98Service.undo();
  }

  @Post('redo')
  redoMove() {
    return this.line98Service.redo();
  }

}
