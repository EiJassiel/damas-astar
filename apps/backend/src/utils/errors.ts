export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details?: unknown
  ) {
    super(message);
  }
}

export const assertFound = <T>(value: T | null | undefined, message = 'Not found'): T => {
  if (!value) throw new AppError(message, 404);
  return value;
};
