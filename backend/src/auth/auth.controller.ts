import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';
import { TokenResponse } from './interfaces/auth.interface';

/**
 * 认证控制器 - RESTful API端点
 *
 * 路由:
 * POST /api/auth/register - 用户注册
 * POST /api/auth/login    - 用户登录
 * POST /api/auth/refresh  - 刷新token
 * POST /api/auth/logout   - 用户登出 (前端处理)
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户注册
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '用户注册',
    description: '使用邮箱和密码创建新用户账户',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: '注册成功，返回JWT token',
    type: TokenResponse,
  })
  @ApiResponse({
    status: 409,
    description: '用户已存在',
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  async register(@Body() registerDto: RegisterDto): Promise<TokenResponse> {
    return this.authService.register(registerDto);
  }

  /**
   * 用户登录
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '用户登录',
    description: '使用邮箱和密码登录获取JWT token',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: '登录成功，返回JWT token',
    type: TokenResponse,
  })
  @ApiResponse({
    status: 401,
    description: '邮箱或密码错误',
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  async login(@Request() req: any): Promise<TokenResponse> {
    return this.authService.login(req.user);
  }

  /**
   * 刷新访问token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '刷新Token',
    description: '使用refresh token获取新的access token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: '刷新成功，返回新的JWT token',
    type: TokenResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token无效或过期',
  })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<TokenResponse> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * 获取当前用户信息 (需要认证)
   */
  @UseGuards(JwtAuthGuard)
  @Post('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '获取用户信息',
    description: '获取当前认证用户的详细信息',
  })
  @ApiResponse({
    status: 200,
    description: '用户信息获取成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权访问',
  })
  async getProfile(@Request() req: any) {
    return {
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }
}
