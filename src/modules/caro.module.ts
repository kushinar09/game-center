/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { GameGateway } from 'src/controllers/caro.gateway';
import { CaroService } from 'src/services/caro.service';
@Module({
  providers: [GameGateway, CaroService],
})
export class CaroModule {}
