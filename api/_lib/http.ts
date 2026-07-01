type HeaderValue = string | string[] | undefined;

export interface ServerlessRequest {
  method?: string;
  url?: string;
  body?: unknown;
  headers: Record<string, HeaderValue>;
  on?: (event: 'data' | 'end' | 'error', handler: (chunk?: Buffer | Error) => void) => void;
}

export interface ServerlessResponse {
  statusCode?: number;
  setHeader: (name: string, value: string | string[]) => void;
  end: (body?: string | Buffer) => void;
}

const normalizeHeader = (value: HeaderValue): string | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === 'string' ? value : null;
};

export const sendJson = (response: ServerlessResponse, status: number, payload: unknown) => {
  response.statusCode = status;
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Frame-Options', 'DENY');
  response.end(JSON.stringify(payload));
};

export const sendMethodNotAllowed = (
  response: ServerlessResponse,
  allow: string,
  payload: unknown,
) => {
  response.statusCode = 405;
  response.setHeader('Allow', allow);
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Frame-Options', 'DENY');
  response.end(JSON.stringify(payload));
};

export const readJsonBody = async <T>(request: ServerlessRequest): Promise<T> => {
  if (request.body !== undefined && request.body !== null) {
    if (typeof request.body === 'string') {
      return (request.body ? JSON.parse(request.body) : {}) as T;
    }

    if (Buffer.isBuffer(request.body)) {
      const text = request.body.toString('utf8');
      return (text ? JSON.parse(text) : {}) as T;
    }

    return request.body as T;
  }

  if (!request.on) {
    return {} as T;
  }

  const text = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on?.('data', (chunk) => {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
        return;
      }

      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      }
    });
    request.on?.('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on?.('error', (error) => reject(error instanceof Error ? error : new Error('Body read failed')));
  });

  return (text ? JSON.parse(text) : {}) as T;
};

export const getBearerToken = (request: ServerlessRequest): string | null => {
  const authHeader = normalizeHeader(request.headers.authorization ?? request.headers.Authorization);
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim() || null;
};

/** Set a hardened cookie — HttpOnly + Secure + SameSite=Strict */
export const setSecureCookie = (
  response: ServerlessResponse,
  name: string,
  value: string,
  maxAgeSeconds = 86400,
) => {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=/`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Strict`,
    `Max-Age=${maxAgeSeconds}`,
  ];
  response.setHeader('Set-Cookie', parts.join('; '));
};
