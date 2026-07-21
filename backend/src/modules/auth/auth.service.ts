import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { hashPassword, comparePassword } from '@common/utils/hash.util';
import {
  InvalidCredentialsException,
  UserAlreadyExistsException,
} from '@common/exceptions/domain.exceptions';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ClaimGuestAccountDto } from './dto/claim-guest-account.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new UserAlreadyExistsException(dto.email);
    }

    const passwordHash = await hashPassword(dto.password);

    const role = dto.role || Role.CITIZEN;

    if (role !== Role.CITIZEN && role !== Role.OFFICER && role !== Role.VENDOR) {
      throw new ConflictException('Invalid role for registration');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        role,
        isGuest: false,
      },
    });

    this.logger.log(`User registered: ${user.email} with role ${user.role}`);

    const accessToken = this.generateToken(user.id, user.email, user.role);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    if (!user.isActive) {
      throw new InvalidCredentialsException();
    }

    this.logger.log(`User logged in: ${user.email}`);

    const accessToken = this.generateToken(user.id, user.email, user.role);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async claimGuestAccount(email: string, dto: ClaimGuestAccountDto): Promise<AuthResponseDto> {
    const incidents = await this.prisma.incident.findMany({
      where: { guestEmail: email },
    });

    if (incidents.length === 0) {
      throw new ConflictException('No incidents found for this email');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new UserAlreadyExistsException(dto.email);
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber || incidents[0].guestPhone,
        role: Role.CITIZEN,
        isGuest: false,
      },
    });

    await this.prisma.incident.updateMany({
      where: { guestEmail: email },
      data: { reporterId: user.id, guestEmail: null },
    });

    this.logger.log(`Guest account claimed: ${email} -> ${user.email}, ${incidents.length} incidents linked`);

    const accessToken = this.generateToken(user.id, user.email, user.role);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  private generateToken(userId: string, email: string, role: Role): string {
    const payload = {
      sub: userId,
      email,
      role,
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '7d'),
    });
  }
}
