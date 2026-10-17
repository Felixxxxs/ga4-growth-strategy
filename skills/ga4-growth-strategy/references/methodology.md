# Analysis methodology: checks and decision rules

Work through the sections in order. Each check names the section of the `ga4-pull` report (or an ad hoc `--dims/--metrics` query) and the decision rule.

## 0. Frame

- Write down the north-star KPI, its leading indicator, the sales paths and the primary market before reading any number.
- Ask which revenue never touches GA4 (offline invoices, upgrades, deals closed by phone). The accounting system is the only complete revenue source, the shop backend the source for online orders, GA4 a floor.
- Two windows, both ending yesterday: **28 days** for the current state, **12 months** for low-volume events. A 28-day window can turn a 3x channel gap into 12x, or show a converting channel as zero.
- Mark every site relaunch, tracking change and campaign start as a boundary. Never compare across one without saying so; a clean baseline starts at the boundary.

## 1. Data hygiene

| Check | Data | Decision rule |
|---|---|---|
| Hostnames | Hostnames, Events x hostname | First question on every property. Staging, localhost, 127.0.0.1, tag-manager preview hosts: exclude from every conclusion, recommend a data filter and internal-traffic rule. Several real hosts (site, checkout, app): confirm cross-domain tracking by checking that purchases on the checkout host still carry marketing channels. An event that fires on one host but not another points to a dead trigger. |
| Bot cluster | Country x channel, engagement rate, users vs sessions | Mostly one country + Direct + engagement under about 10 % + users close to sessions = bots. Exclude and report the clean-segment baseline. Engagement rate dropping about 30 % year over year while sessions rise is a fleet-level bot signal. |
| Referral spam and tools | Source and medium | Engagement near 100 % with users = sessions, or sessions far above users: spam, internal or tool traffic, exclude. Translate proxies (`*.translate.goog`) and webmail referrers are real people: reclassify, do not exclude. |
| Key events that are not conversions | Events, key events config | Timers, scroll, page views of product pages, video progress: measurement, not conversions. Only purchase and real lead events are key events worth steering on. If one funnel step (begin_checkout) is most of the key events, the lead signals drown: demote it and read it in funnel reports. |
| Lead events not marked | Events | generate_lead, sign_up, form submit firing with zero key events: mark them. GA4 lists an event only after it fired once. |
| (not set) and Unassigned | Channels, Source and medium | More than about 5 % of purchases or key events unattributed = attribution loss (redirects stripping parameters, SPA router dropping the query string, missing session on the checkout domain). Rising after a relaunch points to the relaunch. |
| UTM hygiene | Source and medium, Campaigns | Unresolved macros (`{{placement}}`, `{{campaign.name}}`) = broken ad templates. Mixed case and duplicates (facebook / Facebook / fb) split channels. One campaign per e-mail step instead of utm_content: normalise. |
| Paid social placements | Source and medium | Group placement mediums (feed, reels, stories, audience network) under paid social, then compare engagement per placement. Placements at 15 to 35 % engagement with no key events are cut candidates. |
| AI assistants | "AI assistants detected by source" | One assistant appears under several mediums and channels. Sum by source for the real size. Usually high revenue per session: treat it as a real channel. |

## 2. Internal consistency

Sum purchases (and revenue) over channel, country, device, hostname and month. Every cut must give the same total; item revenue must match monthly revenue. If not, the data is not complete-population (row limits, thresholding): flag it and use the most aggregated cut.

## 3. Ground truth reconciliation

- Backend paid orders (paid statuses only; watch for shops that never mark orders "completed") vs GA4 purchases per month and per product: **capture rate** and correction factor. Report history and future separately.
- Where the gap sits: front-loaded by month means tracking improved, concentrated on one product means a broken path. Apparent growth can be better tracking, not more sales.
- Backend-only findings, ranked by value: failed or cancelled payments (the payment-stage leak), payment method vs failure rate, repeat-purchase rate, refunds, billing country vs GA4 country, revenue that never passes the shop.
- CRM: leads and booked calls by source vs GA4 lead events.

## 4. Channel performance

| Check | Data | Decision rule |
|---|---|---|
| Value, not traffic | Channels by business value | Rank by revenue per session and purchase rate on 12 months. Traffic share alone decides nothing. |
| Last click vs first touch | Channels vs First-user channels | Channels that start journeys (organic, social, AI, paid, referral) lose credit under last click; Direct gains it. A channel with many first users and few last-click purchases is a starter, not a dead channel. |
| Dead channel | 12 months, channel and campaign rows | Material sessions and zero purchases and zero leads in 12 months: stop funding it as a revenue channel; keep only as a trust or awareness asset if it has a job. |
| Dead paid campaign | Key events x campaign, 12 months | No lead or purchase in 12 months: pause or decide consciously, never keep as leftover. |
| Direct | Channels | Polluted by bots and misattributed redirects. Never read Direct as a channel on its own. |
| Geo | Countries, Country x channel | IP country is not residence (expats, VPN, buying before moving). Treat non-home shares as upper bounds; the fix is asking for residence at checkout. |
| Organic search | Search Console if available | Flat impressions with CTR halving = zero-click / AI answers. Impressions and position falling = ranking loss. Value organic by leads in the clean market, not by clicks: lost informational traffic may never have bought. |
| Paid search economics | Ads skill pull or owner | Cost per purchase vs the price ladder: paid only pays when the average order clears the break-even CPA. Brand spend share vs organic brand position. |

## 5. Conversion paths

- **Funnel volumes** over 12 months: sessions, engaged sessions, lead-magnet or download, lead, inquiry, begin_checkout, purchase. Users per stage and step rate. The weakest step relative to good practice is the first CRO target.
- **Lead decay:** Key events x month. A lead event falling more than 50 % year over year while purchases stay flat is a silent pipeline emergency: top priority.
- **New vs returning:** a high returning share of purchases means a multi-session journey, which justifies nurture and retargeting.
- **Device:** device share of purchases vs share of traffic. Mobile far below its traffic share = mobile checkout problem.
- **Landing pages:** entry pages with traffic and no key events; money pages ranked by key event rate. Long-tail rows fall below the row limit: say so.
- **Items:** concentration on one product, entry-product share, tiers nobody buys.
- **Spikes:** investigate one-off spikes (a viral post), never extrapolate them.

## 6. Interpretation pitfalls (state the relevant ones in the report)

- Key events are not conversions are not customers.
- GA4 purchases are a floor; short windows mislead on low volume.
- Last click undervalues awareness and nurture; deep e-mail steps close occasionally.
- GA4 sessions never match Search Console clicks or Ads clicks: compare trends.
- A changed event definition in the middle of a comparison breaks it.
- Revenue invisible to GA4 and the shop biases channel ROI against the sales-call path.
- Vendor benchmarks are orderings, not forecasts.
