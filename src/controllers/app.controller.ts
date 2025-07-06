/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Post, Render, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppService } from 'src/services/app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @Render('index')
  index(@Req() req: Request) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = this.appService.findById(Number(req.cookies?.userId));
    return { user: user || null };
  }

  @Get('fib100')
  getHello(): string {
    console.time('Time to calculate Fibonacci');
    const result = this.appService.fib(99); // 99 because fib(0) is the first number in the sequence
    console.timeEnd('Time to calculate Fibonacci');
    console.log('Fibonacci result:', result);
    return 'The 100th Fibonacci number is ' + result.toString();
  }

  @Get('sign-in')
  @Render('user/sign-in')
  signIn() {
    return {};
  }

  @Post('sign-in')
  async handleSignIn(@Body() body, @Res() res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const user = await this.appService.validateUser(body.username, body.password);
    if (!user) {
      return res.render('user/sign-in', { error: 'Invalid credentials' });
    }

    // Simplified session (replace with Passport for production)
    res.cookie('userId', user.id);
    return res.redirect('/profile');
  }

  @Get('sign-up')
  @Render('user/sign-up')
  signUp() {
    return {};
  }

  @Post('sign-up')
  async handleSignUp(@Body() body, @Res() res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const user = await this.appService.createUser(body);
    res.cookie('userId', user.id);
    return res.redirect('/profile');
  }

  @Get('profile')
  @Render('user/profile')
  profile(@Req() req: Request) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = this.appService.findById(Number(req.cookies?.userId));
    return { user };
  }

  @Post('profile')
  updateProfile(@Body() body, @Req() req: Request, @Res() res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = Number(req.cookies?.userId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.appService.updateUser(userId, body);
    return res.redirect('/profile');
  }
}
