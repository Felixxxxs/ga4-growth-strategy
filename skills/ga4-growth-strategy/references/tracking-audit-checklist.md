# Tracking and data-quality checklist

Tick only with evidence (report section, ad hoc query, or the owner's confirmation with date). Each failed item becomes a row in the fix list: item, evidence, fix, owner, effort, how to verify.

## Property and stream

- [ ] One property per business; all real hostnames listed; test hosts excluded by data filter
- [ ] Internal traffic rule defined and active (office IPs, team devices)
- [ ] Data retention set to 14 months
- [ ] Enhanced measurement: page changes on browser history events ON for single-page apps
- [ ] Unwanted referrals list contains payment providers and the own checkout domain
- [ ] Cross-domain measurement configured for site, checkout, booking tool; verified by purchases carrying channels
- [ ] Google Ads and Search Console linked

## Events and key events

- [ ] Event inventory: every event with status works / degraded / dead / never existed, verified by event x day x hostname
- [ ] Key events = purchase plus real lead events only; timers, scroll, video and page views are not key events
- [ ] Lead events (generate_lead, sign_up, form submit, booking) fire and are marked
- [ ] Ecommerce events with `transaction_id`, `value`, `currency`, `items`; no duplicate purchases (app and tag manager both sending)
- [ ] Custom dimensions registered for every parameter that should be reportable
- [ ] Event catalogue documented: name, trigger, parameters, source (code or tag manager), key event yes/no

## Tag manager

- [ ] No triggers bound to old URLs, old DOM elements or old phone numbers after a relaunch
- [ ] Element visibility triggers observe DOM changes on single-page apps
- [ ] Embedded video listeners not blocked by the content security policy
- [ ] No paused legacy tags, orphan variables or placeholder IDs
- [ ] Changes shipped as one validated version, verified in preview and again in reports three days later

## Attribution plumbing

- [ ] gclid and UTM parameters survive redirects, canonicalisation and SPA navigation
- [ ] Links into the checkout carry the current visit's parameters; stored click IDs are never replayed on later visits
- [ ] UTM convention written down (lowercase, source = platform, medium = cpc / paid_social / email / referral, campaign = name, content = variant)
- [ ] Unresolved ad-platform macros absent from campaign and medium values

## Consent and privacy

- [ ] Consent Mode v2 state known for analytics_storage, ad_storage, ad_user_data, ad_personalization
- [ ] Custom HTML tags (pixels, e-mail SDKs) wait for the right consent, they ignore Consent Mode by themselves
- [ ] Privacy policy lists what is actually loaded
- [ ] Size of the consent gap estimated (backend orders vs GA4) and stated in reports

## Ground truth

- [ ] Monthly reconciliation of backend paid orders vs GA4 purchases (capture rate trend)
- [ ] CRM records the source of every lead and deal
- [ ] Offline revenue (invoices, upgrades) known per month
- [ ] Re-run reconciliation after every tracking fix

## Experiments

- [ ] A/B tests decide on a high-volume step (next-step click), with lead and checkout as guardrails
- [ ] Minimum 14 days, 300 exposures and 30 conversions per variant; looks only at pre-set milestones
