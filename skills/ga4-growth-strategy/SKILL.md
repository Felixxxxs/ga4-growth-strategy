---
name: ga4-growth-strategy
description: Pull Google Analytics 4 data (Data API or exports), evaluate the performance of every channel, campaign and conversion path, audit the tracking, and turn it into a prioritised marketing and sales strategy with a channel scorecard, roadmap, KPIs and to-dos. Read only. Use when someone wants to understand where customers come from, which channels or ads work, why conversions dropped, or what the marketing and sales plan should be, e.g. "analyse my GA4", "which channels bring customers", "build a marketing strategy from my analytics", "is my tracking correct", "monthly analytics review".
argument-hint: "[strategy | monthly | tracking | setup] [--days N]"
---

# GA4 growth strategy

Input: $ARGUMENTS. Mode is the first word, default `strategy`:

| Mode | What it produces | Time |
|---|---|---|
| `strategy` | Full channel audit plus marketing and sales strategy: scorecard, gap analysis, tiered roadmap, KPIs, to-dos | 30 to 60 min |
| `monthly` | 28-day review against the strategy's KPI targets, what moved, what to do this month | 10 min |
| `tracking` | Tracking and data-quality audit only, with a fix list | 15 min |
| `setup` | Walks the user through data access and nothing else | 10 min |

This skill directory (shown as "Base directory" when the skill loads) contains `scripts/`, `references/` and `templates/`. Below, `<skill>` means that directory. Always double-quote paths.

## Hard rules

- **Read only.** Viewer access is enough and is all this skill asks for.
- The service-account key stays outside every repo (`~/.config/ga4-growth-strategy/`). Never print, paste or commit it.
- No personal data: only aggregated reports. Backend order exports are used as aggregates (counts, revenue, country, product), never names or e-mails.
- Every number traces to a pulled file. Estimates are tagged `[estimate]` with their formula; benchmarks are tagged `[benchmark]` and are directional, never forecasts.
- GA4 purchases and key events are a floor, not the truth. Say so wherever revenue is quoted.

## Step 1: Context

Detect the environment first:

- **Inside a business-ai-os brain** (`knowledge_base/company/business.md` and `marketing-sales/` exist): read on demand `business.md`, `products.md`, `pricing.md`, `target_groups.md`, `funnel.md`, `market/competitors.md`, `market/sales-cycle.md`, the CRM overviews, and the root `CLAUDE.md` for the north-star KPI. Output folder: `marketing-sales/inbound/analytics/ga4/`. Details: `<skill>/references/business-ai-os.md`.
- **Standalone:** look for `ga4-growth-strategy/context.md` in the working directory. If missing, ask in ONE message and save the answers there:
  1. What do you sell, to whom, in which markets? Which product is the core one, at what price?
  2. What is the north-star KPI (orders, paid customers, booked calls) and its leading indicator?
  3. Which sales paths exist: self-serve checkout, inquiry plus sales call, offline invoice, marketplace?
  4. Which channels do you run today, with roughly what budget or time? Which did you stop?
  5. Where is the ground truth: shop backend, CRM, accounting? Can you export orders by month, product and country?
  6. Any site relaunch, tracking change or campaign start in the last 12 months (dates)?
  Output folder: `ga4-growth-strategy/` in the working directory.

If an earlier strategy exists in the output folder, read its roadmap and KPI table first: the new run reports progress against it.

## Step 2: Data

Details for every path: `<skill>/references/data-access.md`.

1. **GA4 Data API (best):** `node "<skill>/scripts/ga4-pull.mjs" --days 28 --out "<output>/data"` and `--days 365` (12 months is the only honest window for purchases and other low-volume events). `--list` shows visible properties, `--property <id>` picks one. Ad hoc questions: `--dims ... --metrics ...` prints a table without writing files.
2. **Exports from the GA4 UI** (Reports and Explorations as CSV) when no service account is possible.
3. **Optional, strongly recommended:** backend orders as an aggregate export (month, product, country, status, amount), Search Console, CRM lead and deal counts by source, and the `google-ads-audit` skill's latest pull for paid search spend and query data.

Read the generated `.md`. The `.json` beside it is the raw archive: query it with `jq` or `grep`, never read it whole.

## Step 3: Analysis

Follow `<skill>/references/methodology.md` in order:

1. **Data hygiene first:** hostnames, bots and spam, internal traffic, key events that are not conversions, (not set) and Unassigned, UTM hygiene, migration boundaries. Define the clean segment (for example the home market without bot clusters) and use it as the honest baseline.
2. **Internal consistency:** purchases summed over channel, country, device, hostname and month must match.
3. **Ground truth reconciliation** against backend orders: capture rate per month and product; backend-only findings (failed payments, repeat rate, refunds).
4. **Channel performance** on value, not traffic: purchase rate, revenue per session, key events by channel, first-user vs session attribution, AI assistants summed by source.
5. **Conversion paths:** funnel stage volumes and step rates, new vs returning, device, landing pages, lead-event trends by month.
6. **Campaigns and ads:** campaign-level key events and revenue; paid channels judged against spend (from the Ads skill or the owner).

Then `tracking` mode stops and writes the fix list from `<skill>/references/tracking-audit-checklist.md`.

## Step 4: Strategy

Build it with `<skill>/references/strategy-framework.md`:

- One-sentence **diagnosis**: traffic problem, conversion-infrastructure problem, or follow-through problem.
- **Channel scorecard**: every channel used and unused, status, evidence, verdict.
- **Funnel role** of each channel (awareness, consideration, decision, retention) and the measurement chain.
- **Gap analysis** against a good-practice funnel for this business type, rated CRITICAL / HIGH / MEDIUM.
- **Tiered roadmap**: Tier 1 this week (fix leaks, measurement, no budget) · Tier 2 this month · Tier 3 this quarter. Each item with why now, owner, effort, measure, value in units of the core product.
- **Budget logic** and **sales-side actions** (lead handling, booking, follow-up, recovery, referral, reviews).
- **What not to do**, KPI table with today's baseline and 90-day targets, review cadence.

Verify before you write: for each Tier 1 item and each "kill" verdict, check it once against the data (recompute), the business context (does it fit the offer and sales path) and the attribution caveat (could last click hide its value). Weaken or drop what does not hold.

## Step 5: Deliverables

Write `<output>/YYYY-MM-DD-channel-audit-and-strategy.md` from `<skill>/templates/strategy-report.md`. It ends with a **to-do checklist** (`- [ ]`, owner, due date) grouped 🔴 today · 🟡 this week · 📅 next 14 days, and the **open questions** only the owner can answer.

`tracking` mode writes `<output>/YYYY-MM-DD-tracking-audit.md`. `monthly` writes `<output>/monthly/YYYY-MM.md` (KPI table vs targets, five bullets, this month's actions).

## Step 6: Close

- **business-ai-os:** waterfall in the same response: channel rows in `marketing-sales/inbound/README.md` (or `sources.md`) with sessions, conversions to the north-star event and verdict; 🔴 and 🟡 to-dos into the owner's master weekly briefing; strategy changes that affect positioning or the funnel are proposed as edits to `knowledge_base/company/funnel.md`, not made silently. Details in `references/business-ai-os.md`.
- **Standalone:** the five most important to-dos in chat plus the report path.
- Suggest the cadence: `monthly` on the first working day of each month, `tracking` after every site or tag change, `strategy` every quarter.
