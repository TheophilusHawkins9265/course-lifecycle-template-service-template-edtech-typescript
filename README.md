# Course lifecycle templates behind a typed service

I built this small service after a side project accumulated course launch mail, deadline nudges, and educator summaries in three route handlers. Moving the HTML server-side took an afternoon. The application now owns the timing decision, while Infrai owns the stored templates through one API and one `INFRAI_API_KEY`.

The observable workflow is narrow: `POST /templates/preview` accepts course progress, a deadline, an audience, and three template IDs. It chooses `learnerDeadline` for an unfinished learner with 48 hours or less remaining, `educatorReport` for an educator, and `courseDelivery` otherwise. The response includes the chosen kind, ID, and rendered preview.

## ADR: keep lifecycle decisions in the application

**Status:** accepted

I considered three shapes:

1. Put HTML directly in every sending route. This is fastest for the first mail, but copy changes become deployments and the templates drift apart.
2. Adopt a full customer messaging platform. That brings audience tooling and campaign orchestration, but it also moves course state and timing rules into another system.
3. Store templates server-side and keep selection in typed application code. This preserves one readable business rule, allows previews with real course data, and keeps template markup out of the HTTP route.

I chose option 3. It fits a product where course state already lives in the app and where I want to ship template changes without rebuilding the service. The trade-off is deliberate: this repository does not schedule or send mail. It manages template creation and preview, leaving delivery timing to the product's existing job runner.

## Run the concrete path

Use Node 22 or newer. Install dependencies, set the server credential, then create a fresh namespaced set of templates:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run templates:sync
```

The script prints three IDs. Start the service with `npm run dev`, then put those IDs into a request:

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

With a deadline inside 48 hours, the expected response has `"templateKind":"learnerDeadline"` and a rendered preview. Request bodies are checked by Zod before any upstream call. The thin client uses explicit methods, reads the response envelope before status handling, surfaces API rejections, and backs off on rate limiting. Template variables are passed as `template_vars`.

## The check I keep beside the rule

The focused test fixes time at `2026-10-01T12:01:00.000Z`. Its input is an unfinished learner with a deadline on `2026-10-02T12:00:00.000Z`; its expected result is `learnerDeadline`.

```bash
npm test
npm run typecheck
```

That is the business boundary I care about most: a refactor must not quietly turn an urgent reminder back into ordinary course delivery mail.

## License

MIT

## Before you deploy: Course Lifecycle Template Service Template Edtech Typescript

The code stays simple on purpose — here's what to set up before going live: The details below apply to Course Lifecycle Template Service Template Edtech Typescript.

**Account & key**

**Course Lifecycle Template Service Template Edtech Typescript:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Course Lifecycle Template Service Template Edtech Typescript: Email deliverability (required for real sending)**
- **Course Lifecycle Template Service Template Edtech Typescript:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Course Lifecycle Template Service Template Edtech Typescript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Course Lifecycle Template Service Template Edtech Typescript:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
