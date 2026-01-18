import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { PinoLogger } from 'nestjs-pino';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthController.name);
  }

  private cookieName() {
    return this.config.get<string>('AUTH_REFRESH_COOKIE_NAME') ?? 'rt';
  }

  private setRefreshCookie(res: Response, token: string) {
    const secure =
      (this.config.get<string>('AUTH_COOKIE_SECURE') ?? 'false') === 'true';
    const sameSite = (this.config.get<string>('AUTH_COOKIE_SAMESITE') ??
      'lax') as 'lax' | 'strict' | 'none';

    res.cookie(this.cookieName(), token, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/api/v1/auth/refresh', // cookie solo viaja al refresh endpoint
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(this.cookieName(), { path: '/api/v1/auth/refresh' });
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login → devuelve accessToken y setea refresh cookie (rt)',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true })
    res: Response,
  ) {
    const tenantId = req.tenant?.id;
    if (!tenantId)
      throw new BadRequestException('Tenant not resolved from host');

    this.logger.info({ tenantId, email: dto.email }, 'auth.login requested');
    // pro: el tenantId debería venir de resolver tenantSlug o de un guard.
    if (!tenantId) {
      return { error: 'Missing x-tenant-id header' };
    }

    const { accessToken, refreshToken } = await this.auth.login({
      tenantId,
      email: dto.email,
      password: dto.password,
    });

    this.setRefreshCookie(res, refreshToken);

    // access token va en response (swagger-friendly)
    return { accessToken };
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh → rota refresh y devuelve nuevo accessToken',
  })
  @ApiCookieAuth('refresh-cookie')
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken = req.cookies?.[this.cookieName()] as string | undefined;
    const refreshToken = dto.refreshToken ?? cookieToken;

    this.logger.info(
      {
        cookieToken,
        refreshToken,
      },
      'auth.refresh requested',
    );

    if (!refreshToken) {
      return { error: 'Missing refresh token (cookie or body)' };
    }

    const out = await this.auth.refresh({ refreshToken });
    this.setRefreshCookie(res, out.refreshToken);
    return { accessToken: out.accessToken };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout → revoca refresh actual y limpia cookie' })
  @ApiCookieAuth('refresh-cookie')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const hasCookie = req.cookies?.[this.cookieName()] as string | undefined;

    this.logger.info(
      {
        hasCookie,
      },
      'auth.logout requested',
    );
    if (hasCookie) await this.auth.logout({ refreshToken: hasCookie });
    this.clearRefreshCookie(res);
    return { ok: true };
  }
}
