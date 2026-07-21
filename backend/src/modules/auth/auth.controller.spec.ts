import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    claimGuestAccount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
        role: Role.CITIZEN,
      };

      const expectedResult = {
        accessToken: 'jwt-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: Role.CITIZEN,
        },
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const expectedResult = {
        accessToken: 'jwt-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: Role.CITIZEN,
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('claimGuestAccount', () => {
    it('should claim guest account', async () => {
      const claimDto = {
        email: 'guest@example.com',
        password: 'Password123',
        firstName: 'Guest',
        lastName: 'User',
      };

      const expectedResult = {
        accessToken: 'jwt-token',
        user: {
          id: 'user-id',
          email: 'guest@example.com',
          firstName: 'Guest',
          lastName: 'User',
          role: Role.CITIZEN,
        },
      };

      mockAuthService.claimGuestAccount.mockResolvedValue(expectedResult);

      const result = await controller.claimGuestAccount(claimDto);

      expect(result).toEqual(expectedResult);
      expect(service.claimGuestAccount).toHaveBeenCalledWith(claimDto.email, claimDto);
    });
  });
});
