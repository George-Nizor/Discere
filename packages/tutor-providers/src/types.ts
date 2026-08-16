import type { TutorOperation } from "@discere/contracts";
export interface TutorRequest<TPayload = unknown> { operation: TutorOperation; requestId: string; payload: TPayload; }
export interface TutorResponse<TPayload = unknown> { protocolVersion: "0.2"; operation: TutorOperation; requestId: string; generatedAt: string; payload: TPayload; modelNotes?: string[]; }
export interface TutorProvider { readonly id: string; readonly label: string; generate<TRequest, TResponse>(request: TutorRequest<TRequest>): Promise<TutorResponse<TResponse>>; }
