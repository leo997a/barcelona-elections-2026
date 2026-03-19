export const sendJson = (status: number, payload: unknown): Response =>
  Response.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });

export const readJsonBody = async <T>(request: Request): Promise<T> => {
  const text = await request.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
};

export const getBearerToken = (request: Request): string | null => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim() || null;
};
