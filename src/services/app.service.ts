/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from 'src/models/user';

@Injectable()
export class AppService {
  private db: number[] = [];
  private users: User[] = [];
  private idCounter = 1;

  fib(n: number): number {
    if (n <= 1) return n;
    if (this.db[n]) return this.db[n];
    this.db[n] = this.fib(n - 1) + this.fib(n - 2);
    return this.db[n];
  }

  async createUser(data: Partial<User>): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const hashed = await bcrypt.hash(data.password, 10);
    const user: User = {
      id: this.idCounter++,
      username: data.username || "",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      password: hashed,
      email: data.email ?? '',
      name: data.name ?? '',
      age: data.age ?? 0,
      nickname: data.nickname ?? '',
    };
    this.users.push(user);
    return user;
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = this.users.find(u => u.username === username);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  updateUser(id: number, data: Partial<User>): User {
    const user = this.users.find(u => u.id === id);
    if (!user) throw new Error('User not found');

    Object.assign(user, data);
    return user;
  }

  findById(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
}
