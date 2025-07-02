/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { FibModule } from './modules/fib.module';
import { Line98Module } from './modules/line98.module';
import { CaroModule } from './modules/caro.module';

@Module({
  imports: [
    FibModule,
    Line98Module,
    CaroModule
  ],
})
export class AppModule {}
