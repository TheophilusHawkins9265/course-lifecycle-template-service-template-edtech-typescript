import { randomUUID } from "node:crypto";
import { templateDefinitions } from "../src/course_lifecycle_templates.js";
import { infrai } from "../src/infrai_email_templates.js";

const release = new Date().toISOString().slice(0, 10);
const runId = randomUUID();

const created = await Promise.all(
  Object.entries(templateDefinitions).map(async ([kind, definition]) => {
    const name = `course-lifecycle-${release}-${kind}-${runId}`;
    const record = await infrai.email.template.create(
      { name, subject: definition.subject, html: definition.html },
      `course-template-${runId}-${kind}`,
    );
    return [kind, record.template_id ?? record.id] as const;
  }),
);

console.log(JSON.stringify({ templateIds: Object.fromEntries(created) }, null, 2));
