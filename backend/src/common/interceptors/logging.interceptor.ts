import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

/**
 * HTTP错误接口定义
 */
interface HttpError extends Error {
  status?: number;
}

/**
 * 扩展Request接口以包含用户信息
 */
interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * 日志拦截器 - 记录请求和响应
 *
 * 功能:
 * - 记录请求开始时间
 * - 计算请求处理时间
 * - 记录请求路径和方法
 * - 过滤敏感信息
 * - 错误请求特殊标记
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor<unknown, unknown> {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = request.user?.id || 'anonymous';

    const startTime = Date.now();

    // 过滤敏感路径的详细日志
    const isSensitive = this.isSensitivePath(url);

    if (!isSensitive) {
      this.logger.log(
        `${method} ${url} - ${ip} - ${userAgent} - User: ${userId} - START`,
      );
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          if (!isSensitive) {
            this.logger.log(
              `${method} ${url} - ${statusCode} - ${duration}ms - User: ${userId} - SUCCESS`,
            );
          }
        },
        error: (error: HttpError) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `${method} ${url} - ${statusCode} - ${duration}ms - User: ${userId} - ERROR: ${error.message}`,
          );
        },
      }),
    );
  }

  /**
   * 检查是否为敏感路径
   */
  private isSensitivePath(url: string): boolean {
    const sensitivePaths = [
      '/auth/login',
      '/auth/register',
      '/config/douban',
      '/config/feishu',
    ];

    return sensitivePaths.some((path) => url.includes(path));
  }
}
