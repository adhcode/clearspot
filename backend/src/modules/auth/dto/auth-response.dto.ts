import { Role } from '@prisma/client';

export class AuthResponseDto {
  accessToken!: string;
  user!: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: Role;
  };
}
