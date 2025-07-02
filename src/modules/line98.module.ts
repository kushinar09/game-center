/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { Line98Controller } from 'src/controllers/line98.controller';
import { Line98Service } from 'src/services/line98.service';
@Module({
  controllers: [Line98Controller],
  providers: [Line98Service],
})
export class Line98Module {}
