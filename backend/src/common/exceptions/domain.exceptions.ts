import { HttpException, HttpStatus } from '@nestjs/common';

export class UserNotFoundException extends HttpException {
  constructor(userId: string) {
    super(`User with id ${userId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class UserAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(`User with email ${email} already exists`, HttpStatus.CONFLICT);
  }
}

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super('Invalid email or password', HttpStatus.UNAUTHORIZED);
  }
}

export class IncidentNotFoundException extends HttpException {
  constructor(incidentId: string) {
    super(`Incident with id ${incidentId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class UnauthorizedAccessException extends HttpException {
  constructor(resource: string) {
    super(`Unauthorized access to ${resource}`, HttpStatus.FORBIDDEN);
  }
}

export class PaymentFailedException extends HttpException {
  constructor(reason: string) {
    super(`Payment failed: ${reason}`, HttpStatus.BAD_REQUEST);
  }
}

export class VendorNotFoundException extends HttpException {
  constructor(vendorId: string) {
    super(`Vendor with id ${vendorId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class InvalidWebhookSignatureException extends HttpException {
  constructor() {
    super('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
  }
}
