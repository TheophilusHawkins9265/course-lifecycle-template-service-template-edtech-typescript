import { z } from "zod";

export const lifecyclePreviewRequest = z.object({
  learnerName: z.string().min(1).max(80),
  courseTitle: z.string().min(1).max(160),
  educatorName: z.string().min(1).max(80),
  deadline: z.string().datetime(),
  completedLessons: z.number().int().nonnegative(),
  totalLessons: z.number().int().positive(),
  audience: z.enum(["learner", "educator"]),
  templateIds: z.object({
    courseDelivery: z.string().min(1),
    learnerDeadline: z.string().min(1),
    educatorReport: z.string().min(1),
  }),
}).refine((value) => value.completedLessons <= value.totalLessons, {
  message: "completedLessons cannot exceed totalLessons",
  path: ["completedLessons"],
});

export type LifecyclePreviewInput = z.infer<typeof lifecyclePreviewRequest>;
export type TemplateKind = "courseDelivery" | "learnerDeadline" | "educatorReport";

export function chooseLifecycleTemplate(input: LifecyclePreviewInput, now: Date): TemplateKind {
  if (input.audience === "educator") return "educatorReport";
  const hoursUntilDeadline = (Date.parse(input.deadline) - now.getTime()) / 3_600_000;
  const unfinished = input.completedLessons < input.totalLessons;
  return unfinished && hoursUntilDeadline <= 48 ? "learnerDeadline" : "courseDelivery";
}

export function buildTemplateVars(input: LifecyclePreviewInput): Record<string, string> {
  return {
    learner_name: input.learnerName,
    course_title: input.courseTitle,
    educator_name: input.educatorName,
    deadline: input.deadline,
    completed_lessons: String(input.completedLessons),
    total_lessons: String(input.totalLessons),
  };
}

export const templateDefinitions: Record<TemplateKind, { subject: string; html: string }> = {
  courseDelivery: {
    subject: "Your {{course_title}} course is ready",
    html: "<h1>Welcome, {{learner_name}}</h1><p>{{course_title}} is ready. Your deadline is {{deadline}}.</p>",
  },
  learnerDeadline: {
    subject: "48 hours left for {{course_title}}",
    html: "<h1>Keep going, {{learner_name}}</h1><p>You have completed {{completed_lessons}} of {{total_lessons}} lessons. The deadline is {{deadline}}.</p>",
  },
  educatorReport: {
    subject: "Progress report for {{course_title}}",
    html: "<h1>Course report</h1><p>{{learner_name}} has completed {{completed_lessons}} of {{total_lessons}} lessons for {{course_title}}.</p>",
  },
};
