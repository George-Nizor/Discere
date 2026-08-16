export class HttpError extends Error {
  constructor(readonly statusCode: number, message: string, readonly code = "REQUEST_ERROR") { super(message); }
}
