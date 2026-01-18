import JWT, { TokenExpiredError } from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import { CustomError, NotAuthorizedError } from './error-handler';

const ALLOWED_SERVICES: string[] = [
  'auth',
  'seller',
  'gig',
  'search',
  'buyer',
  'message',
  'order',
  'review',
];

const GATEWAY_TOKEN_HEADER = 'x-gateway-token';

export interface GatewayTokenPayload {
  id: string;
  iat: number;
}

export async function verifyGatewayRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);

  try {
    const payload = (await verifyToken(token)) as GatewayTokenPayload;
    validateServiceAccess(payload);

    next();
  } catch (error) {
    handleError(error);
  }
}

function extractToken(req: Request): string {
  if (!req.headers?.[GATEWAY_TOKEN_HEADER]) {
    throw new NotAuthorizedError(
      'Invalid request',
      'verifyGatewayRequest() method: Request not coming from api gateway'
    );
  }

  const token: string = req.headers?.[GATEWAY_TOKEN_HEADER] as string;

  if (!token) {
    throw new NotAuthorizedError(
      'Invalid request',
      'verifyGatewayRequest() method: Request not coming from api gateway'
    );
  }

  return token;
}

async function verifyToken(token: string): Promise<string | JWT.JwtPayload> {
  try {
    const payload: GatewayTokenPayload = (await JWT.verify(
      token,
      ''
    )) as GatewayTokenPayload;
    return payload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new NotAuthorizedError(
        'Token expired',
        'verifyGatewayRequest() method: Gateway token has expired'
      );
    }

    throw new NotAuthorizedError(
      'Invalid request',
      'verifyGatewayRequest() method: Request not coming from api gateway'
    );
  }
}

function validateServiceAccess(payload: GatewayTokenPayload): void {
  if (!payload.id || !ALLOWED_SERVICES.includes(payload.id)) {
    throw new NotAuthorizedError(
      'Unauthorized service',
      `verifyGatewayRequest() method: Service '${payload.id}' is not authorized`
    );
  }
}

function handleError(error: unknown): never {
  const errorMessage =
    error instanceof CustomError ? error.message : 'Unknown error';
  const comingFrom = error instanceof CustomError ? error.comingFrom || '' : '';

  if (error instanceof NotAuthorizedError) {
    throw error;
  }

  throw new NotAuthorizedError(errorMessage, comingFrom);
}
