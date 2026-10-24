import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '@/prisma/prisma.service';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-32-chars-min';

export interface JwtPayload {
  userId: string;
  email: string;
  isSuperAdmin?: boolean;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized: Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Unauthorized: Invalid or expired token');
    }

    if (!payload || !payload.userId) {
      throw new UnauthorizedException('Unauthorized: Invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new UnauthorizedException('Unauthorized: User not found');
    }

    request.user = user;
    return true;
  }
}
