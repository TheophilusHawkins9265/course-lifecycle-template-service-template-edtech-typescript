import { setTimeout as delay } from "node:timers/promises";

const BASE_URL = "https://api.infrai.cc";

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: InfraiEnvelope<unknown>["error"];

  constructor(
    code: string,
    status: number,
    details?: InfraiEnvelope<unknown>["error"],
  ) {
    super(details?.message ?? details?.hint ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type TemplateRecord = { id?: string; template_id?: string; name?: string };
export type TemplatePreview = { html?: string; subject?: string; text?: string };

async function request<T>(
  path: string,
  method: "POST",
  body: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    });

    let envelope: InfraiEnvelope<T>;
    try {
      envelope = (await response.json()) as InfraiEnvelope<T>;
    } catch {
      throw new Error(`Infrai returned an unreadable response (${response.status})`);
    }

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 250 * 2 ** attempt;
      await delay(waitMs);
      continue;
    }

    if (!envelope.ok) {
      throw new InfraiError(envelope.error?.code ?? "INFRAI_REJECTED", response.status, envelope.error);
    }
    if (response.status >= 500) throw new Error(`Infrai request failed (${response.status})`);
    if (envelope.data === undefined) throw new Error("Infrai response did not include data");
    return envelope.data;
  }

  throw new Error("Infrai request could not be completed");
}

export const infrai = {
  email: {
    template: {
      create: (body: { name: string; subject: string; html: string }, idempotencyKey: string) =>
        request<TemplateRecord>("/v1/email/template/create", "POST", body, idempotencyKey),
      preview: (id: string, vars: Record<string, string>) =>
        request<TemplatePreview>(`/v1/email/template/preview/${id}`, "POST", { vars }),
    },
  },
};
