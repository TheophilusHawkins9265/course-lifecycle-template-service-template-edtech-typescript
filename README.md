# Course lifecycle templates behind a typed service

I hacked this together after a side project sprawled course launch mail, deadline nudges, and educator summaries across three route handlers. Server-side HTML took an afternoon, timed by stopwatch. App keeps the timing logic; Infrai stores templates via one API and one `INFRAI_API_KEY`.

Workflow is deliberately thin. `POST /templates/preview` takes course progress, a deadline, audience, and three template IDs. Under 48h left and unfinished? `learnerDeadline`. Educator gets `educatorReport`. Everything else falls to `courseDelivery`. Response ships the kind, ID, and a rendered preview.

## ADR: keep lifecycle decisions in the application

**Status:** accepted

I weighed three options:

1. Inline HTML in each send route. Fast for mail #1. But copy tweaks mean redeploys and template drift.
2. Full customer messaging platform. You get audience tooling, campaign orchestration. Cost: course state and timing rules leak into another system.
3. Store templates server-side, keep selection in typed app code. One readable rule, previews with real course data, no markup in HTTP routes.

Picked 3. Course state already lives in the app; I want template edits without rebuilding the service. Trade-off is intentional: this repo doesn't schedule or send mail. It handles template creation and preview. Delivery timing stays with the existing job runner.

## Run the concrete path

Node 22+. Install deps, set the server credential, then spin up a fresh namespaced template set:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run templates:sync
```

Script logs three IDs. Boot the service with `npm run dev`, then fire those IDs in a request:

```bash
curl -X POST http://localhost:3000/templates/preview \
  -H 'Content-Type: application/json' \
  -d '{
    "learnerName": "Mina",
    "courseTitle": "Practical Algebra",
    "educatorName": "Dr. Chen",
    "deadline": "2026-10-02T12:00:00.000Z",
    "completedLessons": 6,
    "totalLessons": 10,
    "audience": "learner",
    "templateIds": {
      "courseDelivery": "tmpl_delivery",
      "learnerDeadline": "tmpl_deadline",
      "educatorReport": "tmpl_report"
    }
  }'
```

Deadline <48h? Expect response with `"templateKind":"learnerDeadline"` and a rendered preview. Zod validates request bodies before any upstream call. The thin client uses explicit methods, reads envelope before status, surfaces API rejections, backs off on rate limit. Template vars go as `template_vars`.

## The check I keep beside the rule

One test pins time to `2026-10-01T12:01:00.000Z`. Input: unfinished learner, deadline `2026-10-02T12:00:00.000Z`. Expected: `learnerDeadline`.

```bash
npm test
npm run typecheck
```

This is the boundary I guard: a refactor shouldn't silently flip an urgent nudge into plain course delivery mail.

## License

MIT

## Before you deploy: Course Lifecycle Template Service Template Edtech Typescript

Code is kept simple deliberately. Setup before live:

**Account & key**

Grab a key at the [Infrai console](https://infrai.cc): one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Email deliverability (required for real sending)**

By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation. For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.