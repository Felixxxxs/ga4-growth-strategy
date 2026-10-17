# Running inside a business-ai-os brain

[business-ai-os](https://github.com/Felixxxxs/business-ai-os) is a markdown operating system for a company in Claude Code. Inside one, this skill grounds the strategy in the company's personas, offers and funnel, takes lead truth from the CRM, and pushes its to-dos into the weekly briefings.

## Detection

`knowledge_base/company/business.md` and `marketing-sales/` exist in the repo root. If the root `CLAUDE.md` still says "NOT ONBOARDED", ask the user to run `/onboard` first and fall back to standalone mode.

## Pre-reads (on demand)

| File | Used for |
|---|---|
| root `CLAUDE.md` | north-star KPI, currency, time zone, team and owners |
| `knowledge_base/company/business.md` | markets, what the company is |
| `knowledge_base/company/products.md`, `pricing.md` | core product, price ladder, value of one extra sale |
| `knowledge_base/company/target_groups.md` | personas: which traffic is the clean segment |
| `knowledge_base/company/funnel.md` | the stages and conversion assumptions this strategy updates |
| `knowledge_base/market/competitors.md` | openings competitors leave, comparison pages |
| `knowledge_base/market/sales-cycle.md` | length and steps of the sales path |
| `marketing-sales/crm/leads/lead-pipeline-overview.md`, `customers/customer-overview.md` | leads and customers by source: lead truth |
| `marketing-sales/inbound/README.md`, `outbound/README.md`, `content/content-overview.md` | channels the company already runs |

## Output location

```
marketing-sales/inbound/analytics/ga4/
  data/                                      dated pull files (.md + .json)
  YYYY-MM-DD-channel-audit-and-strategy.md
  YYYY-MM-DD-tracking-audit.md
  monthly/YYYY-MM.md
  README.md                                  property, access, current strategy, next review
```

## Waterfall (same response as the report)

1. `marketing-sales/inbound/README.md` (or `sources.md`): one row per channel with sessions, conversions to the north-star event, verdict and a link to the strategy.
2. Owner's master weekly briefing: every 🔴 and 🟡 to-do as a manual to-do with link.
3. `knowledge_base/company/funnel.md`: propose the updated conversion rates and channel roles as a diff in the report and ask the owner before editing; the knowledge base changes only with consent.
4. Outbound or content actions from the roadmap: add them to `marketing-sales/outbound/README.md` or `content/content-overview.md` as proposed items with owner and date.

## Conventions

- Dates `YYYY-MM-DD`, the brain's language and currency format.
- Claims in any customer-facing text the strategy proposes come only from `products.md` and `pricing.md`, and pass `brand_guidelines.md`.
- If the `google-ads-audit` skill runs in the same brain, link both reports and use the same date windows.
