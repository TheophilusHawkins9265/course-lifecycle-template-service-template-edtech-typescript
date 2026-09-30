import { createServer } from "node:http";
import { ZodError } from "zod";
import { buildTemplateVars, chooseLifecycleTemplate, lifecyclePreviewRequest } from "./course_lifecycle_templates.js";
import { InfraiError, infrai } from "./infrai_email_templates.js";

const port = Number(process.env.PORT ?? 3000);

function json(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/templates/preview") {
    json(response, 404, { error: "route not found" });
    return;
  }

  try {
    const input = lifecyclePreviewRequest.parse(await readJson(request));
    const templateKind = chooseLifecycleTemplate(input, new Date());
    const templateId = input.templateIds[templateKind];
    const preview = await infrai.email.template.preview(templateId, buildTemplateVars(input));
    json(response, 200, { templateKind, templateId, preview });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      json(response, 400, { error: "invalid request body" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      json(response, status, { error: error.code, message: error.message });
      return;
    }
    json(response, 500, { error: "request could not be completed" });
  }
});

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => console.log(`Lifecycle template service listening on http://localhost:${port}`));
}
