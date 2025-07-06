/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CaroController } from 'src/controllers/caro.controller';
import { GameGateway } from 'src/controllers/caro.gateway';
import { CaroService } from 'src/services/caro.service';
@Module({
  controllers: [CaroController],
  providers: [GameGateway, CaroService],
})
export class CaroModule {}
