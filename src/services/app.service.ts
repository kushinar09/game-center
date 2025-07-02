/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private db: number[] = [];

  fib(n: number): number {
    if (n <= 1) return n;
    if (this.db[n]) return this.db[n];
    this.db[n] = this.fib(n - 1) + this.fib(n - 2);
    return this.db[n];
  }
}
