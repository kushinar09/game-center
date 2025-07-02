/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from 'src/controllers/app.controller';
import { AppService } from 'src/services/app.service';
@Module({
  controllers: [AppController],
  providers: [AppService],
})
export class FibModule {}
