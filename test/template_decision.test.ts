import assert from "node:assert/strict";
import test from "node:test";
import { chooseLifecycleTemplate, lifecyclePreviewRequest } from "../src/course_lifecycle_templates.js";

test("an unfinished learner inside the 48-hour window gets the deadline template", () => {
  const input = lifecyclePreviewRequest.parse({
    learnerName: "Mina",
    courseTitle: "Practical Algebra",
    educatorName: "Dr. Chen",
    deadline: "2026-10-02T12:00:00.000Z",
    completedLessons: 6,
    totalLessons: 10,
    audience: "learner",
    templateIds: {
      courseDelivery: "tmpl_delivery",
      learnerDeadline: "tmpl_deadline",
      educatorReport: "tmpl_report",
    },
  });

  const result = chooseLifecycleTemplate(input, new Date("2026-10-01T12:01:00.000Z"));
  assert.equal(result, "learnerDeadline");
});
