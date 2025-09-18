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
import { TokenResponse, AuthenticatedUser } from './interfaces/auth.interface';

/**
 * 认证请求接口 - 定义请求对象中的用户类型
 */
interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

/**
 * 用户信息响应接口
 */
interface ProfileResponse {
  user: AuthenticatedUser;
  timestamp: string;
}

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
   * 用户注册接口，创建新用户账户并返回JWT token
   *
   * @description 使用邮箱和密码创建新用户账户，验证数据格式并生成访问令牌
   * @param registerDto 用户注册数据，包含邮箱和密码信息
   * @returns Promise<TokenResponse> 包含访问令牌、刷新令牌和用户信息的完整响应对象
   * @throws ConflictException 当邮箱地址已被注册时抛出409错误
   * @throws BadRequestException 当请求参数格式不正确时抛出400错误
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
   * 用户登录接口，验证凭据并返回JWT token
   *
   * @description 验证用户邮箱和密码，成功后生成访问令牌和刷新令牌
   * @param req 经过LocalAuthGuard验证后的请求对象，包含已认证的用户信息
   * @returns Promise<TokenResponse> 包含访问令牌、刷新令牌和用户信息的完整响应对象
   * @throws UnauthorizedException 当邮箱或密码错误时抛出401错误
   * @throws BadRequestException 当请求参数格式不正确时抛出400错误
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
  async login(@Request() req: AuthenticatedRequest): Promise<TokenResponse> {
    return this.authService.login(req.user);
  }

  /**
   * 刷新访问令牌接口，使用refresh token获取新的access token
   *
   * @description 验证refresh token的有效性，并生成新的访问令牌和刷新令牌对
   * @param refreshTokenDto 包含refresh token的请求数据对象
   * @returns Promise<TokenResponse> 包含新的访问令牌、刷新令牌和用户信息的完整响应对象
   * @throws UnauthorizedException 当refresh token无效、过期或格式错误时抛出401错误
   * @throws BadRequestException 当请求参数格式不正确时抛出400错误
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
   * 获取当前用户信息接口，需要有效的JWT token认证
   *
   * @description 返回当前认证用户的详细信息和请求时间戳，用于用户资料展示
   * @param req 经过JwtAuthGuard验证后的请求对象，包含已认证的用户信息
   * @returns ProfileResponse 包含用户信息和当前时间戳的响应对象
   * @throws UnauthorizedException 当JWT token无效、过期或缺失时抛出401错误
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
  getProfile(@Request() req: AuthenticatedRequest): ProfileResponse {
    return {
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }
}
