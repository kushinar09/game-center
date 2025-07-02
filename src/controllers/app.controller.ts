/* eslint-disable prettier/prettier */
import { Controller, Get } from '@nestjs/common';
import { AppService } from 'src/services/app.service';

@Controller('fib100')
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    console.time('Time to calculate Fibonacci');
    const result = this.appService.fib(99); // 99 because fib(0) is the first number in the sequence
    console.timeEnd('Time to calculate Fibonacci');
    console.log('Fibonacci result:', result);
    return 'The 100th Fibonacci number is ' + result.toString();
  }
}
