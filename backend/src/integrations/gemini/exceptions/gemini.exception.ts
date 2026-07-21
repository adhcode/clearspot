import { HttpException, HttpStatus } from '@nestjs/common';

export class GeminiAnalysisException extends HttpException {
  constructor(message: string, cause?: Error) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Gemini analysis failed: ${message}`,
        error: 'GeminiAnalysisError',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    if (cause) {
      this.cause = cause;
    }
  }
}

export class GeminiInvalidResponseException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Invalid Gemini response: ${message}`,
        error: 'GeminiInvalidResponse',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
