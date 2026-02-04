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
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    const payload = (await verifyToken(token)) as GatewayTokenPayload;
    validateServiceAccess(payload);
    next();
  } catch (error) {
    const handledError = handleError(error);
    next(handledError);
  }
}

function extractToken(req: Request): string {
  // Express normalizes headers to lowercase, so check lowercase version
  const headerValue = req.headers?.[GATEWAY_TOKEN_HEADER.toLowerCase()] || 
                      req.headers?.[GATEWAY_TOKEN_HEADER] ||
                      req.headers?.['gatewaytoken'] ||
                      req.headers?.['gateway-token'];
  
  if (!headerValue) {
    const headerKeys = Object.keys(req.headers || {});
    const relevantHeaders = headerKeys.filter(key => 
      key.toLowerCase().includes('gateway') || key.toLowerCase().includes('token')
    );
    console.log('Request headers:', req.headers);
    console.log('Looking for header:', GATEWAY_TOKEN_HEADER);
    console.log('Available headers:', headerKeys);
    console.log('Relevant headers:', relevantHeaders);
    throw new NotAuthorizedError(
      'Invalid request',
      `verifyGatewayRequest() method: Request not coming from api gateway without gateway token header. Looking for: ${GATEWAY_TOKEN_HEADER}. Available headers: ${headerKeys.join(', ')}`
    );
  }

  const token: string = (typeof headerValue === 'string' ? headerValue : Array.isArray(headerValue) ? headerValue[0] : String(headerValue)) as string;

  if (!token || token.trim() === '') {
    throw new NotAuthorizedError(
      'Invalid request',
      'verifyGatewayRequest() method: Request not coming from api gateway without gateway token'
    );
  }

  return token;
}

async function verifyToken(token: string): Promise<string | JWT.JwtPayload> {
  try {
    const payload: GatewayTokenPayload = (await JWT.verify(
      token,
      '942421d626948ab10f6809824d95020d'
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
      'verifyGatewayRequest() method: Request not coming from api gateway without valid gateway token'
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

function handleError(error: unknown): CustomError {
  if (error instanceof CustomError) {
    return error;
  }

  const errorMessage =
    error instanceof Error ? error.message : 'Unknown error';
  
  return new NotAuthorizedError(errorMessage, 'verifyGatewayRequest() method: Unknown error');
}
