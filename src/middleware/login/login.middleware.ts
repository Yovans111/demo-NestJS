import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/layout/auth/auth.service';

@Injectable()
export class LoginMiddleware implements NestMiddleware {
  constructor(
    private readonly authService: AuthService
  ) { }

  use(req: any, res: any, next: () => void) {
    return next()
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    const verify = this.authService.verifyToken(token);
    if (!verify) {
      throw new UnauthorizedException('Invalid token');
    }
    next();
  }
}
