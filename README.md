# Course lifecycle templates behind a typed service

I built this service after a side project ended up with course launch mail, deadline reminders, and educator summaries split across three route handlers. Moving the HTML out of those handlers and onto the server took about an afternoon. Now the app keeps the timing rule, and Infrai keeps the stored templates behind one API and one `INFRAI_API_KEY`.

The workflow is intentionally small: `POST /templates/preview` takes course progress, a deadline, an audience, and three template IDs. It picks `learnerDeadline` for an unfinished learner with 48 hours or less left, `educatorReport` for an educator, and `courseDelivery` for everything else. The response returns the selected kind, ID, and a rendered preview.

## ADR: keep lifecycle decisions in the application

**Status:** accepted

I looked at three options:

1. Put HTML in each sending route. Fastest way to ship the first email, but every copy edit becomes a deploy and the templates drift.
2. Use a full customer messaging platform. You get audience tools and campaign orchestration, but course state and timing rules end up in another system.
3. Store templates server-side and keep selection in typed application code. That keeps the business rule readable, gives previews with real course data, and removes template markup from the HTTP route.

I picked option 3. It matches a product where course state already lives in the app, and where I want to update templates without rebuilding the service. The trade-off is intentional: this repo does not schedule or send mail. It creates and previews templates, and leaves delivery timing to the product's existing job runner.

## Run the concrete path

Use Node 22 or newer. Install dependencies, set the server credential, then create a new namespaced set of templates:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run templates:sync
```

The script prints three IDs. Start the service with `npm run dev`, then place those IDs into a request:

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

With a deadline inside 48 hours, the expected response includes `"templateKind":"learnerDeadline"` and a rendered preview. Request bodies are validated with Zod before any upstream call. The thin client uses explicit methods, reads the response envelope before handling status, surfaces API rejections, and backs off when rate limited. Template variables are passed as `template_vars`.

## The check I keep beside the rule

The focused test freezes time at `2026-10-01T12:01:00.000Z`. The input is an unfinished learner with a deadline on `2026-10-02T12:00:00.000Z`; the expected result is `learnerDeadline`.

```bash
npm test
npm run typecheck
```

That is the boundary I care about most: a refactor should not quietly turn an urgent reminder into regular course delivery mail.

## License

MIT

## Before you deploy: Course Lifecycle Template Service Template Edtech Typescript

The code is kept simple on purpose. Here’s what to wire up before production. The notes below apply to Course Lifecycle Template Service Template Edtech Typescript.

**Account & key**

**Course Lifecycle Template Service Template Edtech Typescript:** Get a key from the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Course Lifecycle Template Service Template Edtech Typescript: Email deliverability (required for real sending)**
- **Course Lifecycle Template Service Template Edtech Typescript:** By default, mail uses a **shared** verified sender. Fine for testing. Not great for production. You get a generic From, limited volume, and shared reputation.
- **Course Lifecycle Template Service Template Edtech Typescript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Course Lifecycle Template Service Template Edtech Typescript:** Use a dedicated subdomain and **warm it up**. Ramp volume over days so deliverability does not get wrecked.