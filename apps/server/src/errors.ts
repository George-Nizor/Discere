export interface HttpErrorOptions {
  /** Machine-readable code the interface maps to a sentence. */
  code?: string;
  /**
   * One short line explaining the cause, safe to show under the generic notice. Provider
   * stderr is trimmed to its first line before it lands here; the full text stays in the log.
   */
  detail?: string;
}

export class HttpError extends Error {
  readonly code: string;
  readonly detail: string | undefined;

  constructor(readonly statusCode: number, message: string, options: string | HttpErrorOptions = {}) {
    super(message);
    const resolved = typeof options === "string" ? { code: options } : options;
    this.code = resolved.code ?? "REQUEST_ERROR";
    this.detail = resolved.detail;
  }
}
