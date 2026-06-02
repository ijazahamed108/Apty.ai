export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function assertOwner(resourceUserId: string, requestUserId: string): void {
  if (resourceUserId !== requestUserId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this resource');
  }
}
