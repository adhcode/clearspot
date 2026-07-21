import { HttpException, HttpStatus } from '@nestjs/common';

export class StorageException extends HttpException {
  constructor(message: string, cause?: Error) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Storage operation failed: ${message}`,
        error: 'StorageError',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    if (cause) {
      this.cause = cause;
    }
  }
}

export class InvalidFileException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Invalid file: ${message}`,
        error: 'InvalidFile',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
