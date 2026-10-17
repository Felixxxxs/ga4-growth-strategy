# ga4-growth-strategy

**A Claude skill that turns your Google Analytics 4 data into an honest picture of which channels, campaigns and conversion paths actually bring customers, and into a prioritised marketing and sales strategy.**

It pulls your GA4 data (read only), cleans it first (test hosts, bots, fake key events, broken UTMs), reconciles it with your real orders where you have them, and writes:

- a **channel audit** ranked by value (purchase rate, revenue per session, first touch vs last click), not by traffic;
- the **conversion paths**: funnel steps, lead trends, device and landing-page leaks;
- a **channel scorecard** with a verdict per channel (keep, build, repurpose, stop) and its role in the funnel;
- a **marketing and sales strategy**: diagnosis, gap analysis, tiered roadmap (this week, this month, this quarter), budget logic, sales-side actions, KPIs with 90-day targets;
- a **to-do checklist** and a **tracking fix list**.

> Status: **v0.1, early.** The method comes from a real 12-month channel audit with backend reconciliation; the generic version is new. Feedback and pull requests welcome.

## Quick start

```text
/ga4-growth-strategy setup      connect your data once
/ga4-growth-strategy            full audit and strategy (30 to 60 minutes)
/ga4-growth-strategy monthly    monthly review against the KPI targets
/ga4-growth-strategy tracking   tracking and data-quality audit only
```

Or just ask: "which of my channels bring customers?" or "build a marketing strategy from my analytics".

## Install

**Option 1: Claude Code plugin (recommended)**

```text
/plugin marketplace add Felixxxxs/ga4-growth-strategy
/plugin install ga4-growth-strategy@ga4-growth-strategy
```

**Option 2: copy the skill folder**

```bash
git clone https://github.com/Felixxxxs/ga4-growth-strategy
cp -r ga4-growth-strategy/skills/ga4-growth-strategy <your-project>/.claude/skills/   # one project
cp -r ga4-growth-strategy/skills/ga4-growth-strategy ~/.claude/skills/               # every project
```

**Option 3: Claude.ai or Claude Desktop.** Zip `skills/ga4-growth-strategy` and upload it under Settings > Capabilities > Skills. Use CSV exports from GA4 there, since the script cannot reach the API from the sandbox.

## Getting your data in

| Path | Needs | Best for |
|---|---|---|
| **GA4 Data API** (`ga4-pull.mjs`) | A Google Cloud service account with Viewer access, Node 18+, about 15 minutes once | Regular use; Claude pulls fresh data on its own |
| **CSV exports** from GA4 reports and explorations | Access to the property | Anyone, any environment |
| **Ground truth** (optional, strongly recommended) | Order export aggregated by month, product, country; CRM lead counts | Knowing how much GA4 misses |

Step-by-step: [skills/ga4-growth-strategy/references/data-access.md](skills/ga4-growth-strategy/references/data-access.md).

The script has no dependencies, uses the `analytics.readonly` scope only, keeps the key outside every repository (`~/.config/ga4-growth-strategy/`), and pulls 23 reports per run, including hostnames, first-user vs session channels, key events by channel, campaign, device and month, revenue per channel and items.

## With or without business-ai-os

Standalone, the first run asks six questions (what you sell, your north-star KPI, sales paths, channels you run, where the truth about sales lives, recent site or tracking changes) and saves the answers.

Inside **[business-ai-os](https://github.com/Felixxxxs/business-ai-os)**, the open-source AI Business Operating System for Claude Code, it:

- reads products, prices, personas, funnel, competitors and sales cycle from the knowledge base;
- takes lead and customer truth from the CRM;
- files reports under `marketing-sales/inbound/analytics/ga4/`;
- writes channel rows into the inbound overview and urgent to-dos into the owner's weekly briefing, and proposes funnel updates to the knowledge base for your approval.

Pairs with **[google-ads-audit](https://github.com/Felixxxxs/google-ads-audit)**: the strategy uses its spend and query data to judge paid search, and the Ads audit uses this skill's attribution view.

## What is inside

```
skills/ga4-growth-strategy/
  SKILL.md                                the procedure Claude follows
  scripts/ga4-pull.mjs                    read-only GA4 Data API export (Markdown + JSON)
  references/methodology.md               checks and decision rules
  references/tracking-audit-checklist.md
  references/strategy-framework.md        from data to marketing and sales strategy
  references/data-access.md
  references/business-ai-os.md            integration contract
  templates/strategy-report.md
```

## Maintainer

- **Felix Zeeb** ([@Felixxxxs](https://github.com/Felixxxxs))

## License

[MIT](LICENSE). Not affiliated with or endorsed by Google. Google Analytics is a trademark of Google LLC.
