import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from 'src/layout/auth/auth.service';

@Injectable()
export class SocketGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService
  ) { }
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const messageBody = context.switchToWs().getData(),
      body = messageBody.data
    console.log('body', body)
    const token = true//this.authService.verifyToken(body.token)
    if (!token) {
      return false
    }
    return true;
  }
}
