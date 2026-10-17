# Getting the data

## A. GA4 Data API with a service account (recommended, about 15 minutes once)

1. <https://console.cloud.google.com/> > create or pick a project.
2. APIs and Services > Library: enable **Google Analytics Data API** and **Google Analytics Admin API**.
3. IAM and Admin > Service accounts > Create (for example `ga4-reader`). No project role needed.
4. On the service account: Keys > Add key > JSON. Save the file in `~/.config/ga4-growth-strategy/` (Windows: `C:\Users\<you>\.config\ga4-growth-strategy\`). Never inside a repository.
5. In GA4: Admin > Property access management > Add users > the service account e-mail (`node "<skill>/scripts/ga4-pull.mjs" --whoami` prints it) with role **Viewer**.
6. Test: `node "<skill>/scripts/ga4-pull.mjs" --list`, then a standard pull.

If the organisation blocks service-account key creation (policy `iam.disableServiceAccountKeyCreation`), ask the Workspace admin for an exception for this project, or use path B.

Options: `--key <file>` or `GA4_KEY_FILE` for another key location, `--property <id>` or `GA4_PROPERTY_ID` when several properties are visible, `--start/--end` for exact windows.

Useful ad hoc dimensions: `hostName`, `sessionDefaultChannelGroup`, `firstUserDefaultChannelGroup`, `sessionSource`, `sessionMedium`, `sessionCampaignName`, `landingPagePlusQueryString`, `pagePath`, `country`, `deviceCategory`, `eventName`, `yearMonth`, `date`, `newVsReturning`, `itemName`.
Useful metrics: `sessions`, `totalUsers`, `newUsers`, `engagementRate`, `keyEvents`, `sessionKeyEventRate`, `eventCount`, `ecommercePurchases`, `purchaseRevenue`, `totalRevenue`, `itemsPurchased`, `itemRevenue`.

## B. Exports from the GA4 interface

Set the range (last 28 days ending yesterday, then the last 12 months), then Share > Download file > CSV, into `<output>/data/YYYY-MM-DD-<report>.csv`:

| Report | Where |
|---|---|
| Traffic acquisition (session channel) | Reports > Acquisition > Traffic acquisition |
| User acquisition (first-user channel) | Reports > Acquisition > User acquisition |
| Source / medium | Traffic acquisition, primary dimension Session source / medium |
| Campaigns | Traffic acquisition, Session campaign |
| Landing pages | Reports > Engagement > Landing page |
| Events and key events | Reports > Engagement > Events, Key events |
| Ecommerce purchases | Reports > Monetisation > Ecommerce purchases |
| Country x channel, hostname, month x event | Explore > Free form with those dimensions |
| Funnel | Explore > Funnel exploration with your steps |

Some checks (event x hostname, first-user vs session per event) need an exploration; if the user cannot build it, list the check as an open question.

## C. Ground truth and other sources

| Source | What to export | Used for |
|---|---|---|
| Shop backend (WooCommerce, Shopify, Stripe) | Paid orders aggregated by month, product, billing country, status, payment method, amount. No names, no e-mails. | Capture rate, payment leak, repeat rate |
| CRM | Leads, calls booked and held, deals won, by source and month | Lead truth, sales path |
| Accounting | Revenue by month outside the shop | Complete revenue |
| Search Console | 16 months by month; queries and pages | Organic diagnosis |
| google-ads-audit skill | Latest `data/YYYY-MM-DD.md` | Spend, cost per conversion, query intent |
