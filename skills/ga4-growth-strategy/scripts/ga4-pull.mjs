// Pulls traffic, channel, campaign and conversion data from one Google
// Analytics 4 property (Data API v1beta) and writes a dated Markdown report
// plus a raw JSON archive.
//
// Standard run (writes files):
//   node ga4-pull.mjs [--days 28] [--property 123456789] [--out <dir>] [--key <json>]
//   node ga4-pull.mjs --days 365           12 months: the only honest window for purchases
// Which properties can I see / who am I:
//   node ga4-pull.mjs --list               node ga4-pull.mjs --whoami
// Ad hoc query (prints a Markdown table, writes nothing):
//   node ga4-pull.mjs --dims sessionSource,sessionMedium --metrics sessions,keyEvents --days 7 --limit 30
//   node ga4-pull.mjs --dims hostName --metrics sessions,keyEvents --start 2026-07-01 --end 2026-07-31
//
// Access: a Google Cloud service account with the role "Viewer" on the GA4
// property (Admin > Property access management), and in its Cloud project
// both the Analytics Data API and the Analytics Admin API enabled. The key
// file lives OUTSIDE every repo:
//   1. --key <path>
//   2. GA4_KEY_FILE or GOOGLE_APPLICATION_CREDENTIALS
//   3. otherwise the first *.json in ~/.config/ga4-growth-strategy/ (also in
//      the Windows profile, so a run from WSL finds it)
// The key is only read to sign a JWT, never printed.
//
// Read only: scope analytics.readonly, runReport and accountSummaries.
// No dependencies: JWT with Node crypto, token exchange and API via fetch.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

// Errors without stack trace, with the checklist for the two steps that can
// only be done in the Google consoles.
function fail(err) {
  const msg = String(err && err.message ? err.message : err)
  console.error(`GA4 pull failed: ${msg}`)
  if (/has not been used in project|SERVICE_DISABLED|is disabled/i.test(msg)) {
    console.error('\nEnable once in the Google Cloud project of the service account:')
    console.error('  1. Analytics Data API:  https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com')
    console.error('  2. Analytics Admin API: https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com')
  }
  if (/PERMISSION_DENIED|sufficient permissions|no GA4 property|not have access/i.test(msg)) {
    console.error('\nOnce in GA4: Admin > Property access management > Add users,')
    console.error('add the service account e-mail (see --whoami) with the role "Viewer".')
  }
  process.exit(1)
}
process.on('uncaughtException', fail)
process.on('unhandledRejection', fail)

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const DATA_API = 'https://analyticsdata.googleapis.com/v1beta'
const ADMIN_API = 'https://analyticsadmin.googleapis.com/v1beta'

const args = process.argv.slice(2)
const opt = (name, dflt) => { const i = args.indexOf(name); return i > -1 && args[i + 1] ? args[i + 1] : dflt }
const flag = (name) => args.includes(name)
const DAYS = Number(opt('--days', 28))

// ---------------------------------------------------------------- auth

function keyFile() {
  const explicit = opt('--key', process.env.GA4_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS)
  if (explicit) return explicit
  const dirs = [path.join(os.homedir(), '.config', 'ga4-growth-strategy')]
  // Under WSL the Linux home is empty, the key sits in the Windows profile.
  dirs.push(path.join('/mnt/c/Users', os.userInfo().username, '.config', 'ga4-growth-strategy'))
  if (process.env.USERPROFILE) dirs.push(path.join(process.env.USERPROFILE, '.config', 'ga4-growth-strategy'))
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    const hit = fs.readdirSync(dir).find((f) => /\.json$/.test(f))
    if (hit) return path.join(dir, hit)
  }
  throw new Error('No key file: pass --key, set GA4_KEY_FILE, or put the service account JSON into ' + dirs[0])
}

async function accessToken() {
  const sa = JSON.parse(fs.readFileSync(keyFile(), 'utf8'))
  if (!sa.private_key || !sa.client_email) throw new Error('The key file is not a service account key (private_key or client_email missing).')
  const now = Math.floor(Date.now() / 1000)
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token'
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: sa.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600,
  })
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url')
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + sig }),
  })
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`)
  return { token: (await res.json()).access_token, account: sa.client_email }
}

async function call(url, token, body) {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    let msg = text
    try { msg = JSON.parse(text).error?.message || text } catch { /* raw text */ }
    throw new Error(`API ${res.status}: ${String(msg).slice(0, 500)}`)
  }
  return text ? JSON.parse(text) : {}
}

// ---------------------------------------------------------------- properties

async function listProperties(token) {
  const out = []
  let pageToken
  do {
    const url = `${ADMIN_API}/accountSummaries?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ''}`
    const json = await call(url, token)
    for (const acc of json.accountSummaries || []) {
      for (const p of acc.propertySummaries || []) {
        out.push({ id: String(p.property).split('/')[1], name: p.displayName, account: acc.displayName })
      }
    }
    pageToken = json.nextPageToken
  } while (pageToken)
  return out
}

async function resolveProperty(token) {
  const explicit = opt('--property', process.env.GA4_PROPERTY_ID)
  if (explicit) return { id: String(explicit).replace(/\D/g, ''), name: '' }
  const props = await listProperties(token)
  if (!props.length) throw new Error('The service account sees no GA4 property. Add it in GA4 under Admin > Property access management as Viewer.')
  if (props.length > 1) {
    const list = props.map((p) => `  ${p.id}  ${p.name} (${p.account})`).join('\n')
    throw new Error(`Several properties visible, choose one with --property:\n${list}`)
  }
  return props[0]
}

// ---------------------------------------------------------------- reports

const errors = []

async function report(token, prop, { dims = [], metrics, range, limit = 50, orderDim = null }) {
  const body = {
    dateRanges: [range],
    dimensions: dims.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    limit,
    keepEmptyRows: false,
    metricAggregations: ['TOTAL'],
  }
  if (orderDim) body.orderBys = [{ dimension: { dimensionName: orderDim } }]
  else if (dims.length) body.orderBys = [{ metric: { metricName: metrics[0] }, desc: true }]
  const json = await call(`${DATA_API}/properties/${prop}:runReport`, token, body)
  return {
    dims,
    metrics,
    rows: (json.rows || []).map((r) => ({
      keys: (r.dimensionValues || []).map((v) => v.value),
      values: (r.metricValues || []).map((v) => v.value),
    })),
    // Without dimensions the API returns one row instead of totals.
    totals: (json.totals?.[0]?.metricValues || (dims.length ? [] : json.rows?.[0]?.metricValues || [])).map((v) => v.value),
    rowCount: json.rowCount || 0,
  }
}

const safe = async (label, fn) => {
  try { return await fn() } catch (e) { errors.push(`${label}: ${e.message}`); return null }
}

// GA4 renamed "conversions" to "keyEvents". Check once which name applies.
async function keyEventMetric(token, prop, range) {
  for (const name of ['keyEvents', 'conversions']) {
    try {
      await report(token, prop, { metrics: [name], range, limit: 1 })
      return name
    } catch { /* next candidate */ }
  }
  errors.push('No key event metric accepted (neither keyEvents nor conversions).')
  return null
}

// ---------------------------------------------------------------- formatting

const DIM_LABEL = {
  sessionDefaultChannelGroup: 'Channel', firstUserDefaultChannelGroup: 'First-user channel',
  sessionSource: 'Source', sessionMedium: 'Medium', sessionCampaignName: 'Campaign',
  landingPagePlusQueryString: 'Landing page', pagePath: 'Page', hostName: 'Hostname',
  country: 'Country', city: 'City', deviceCategory: 'Device', eventName: 'Event', date: 'Date',
  yearMonth: 'Month', newVsReturning: 'New/returning', itemName: 'Item',
}
const MET_LABEL = {
  sessions: 'Sessions', totalUsers: 'Users', newUsers: 'New users', activeUsers: 'Active users',
  screenPageViews: 'Page views', engagementRate: 'Engagement rate', bounceRate: 'Bounce rate',
  averageSessionDuration: 'Avg. duration', eventCount: 'Events', keyEvents: 'Key events',
  conversions: 'Conversions', sessionKeyEventRate: 'Key event rate', ecommercePurchases: 'Purchases',
  purchaseRevenue: 'Purchase revenue', totalRevenue: 'Total revenue', itemsPurchased: 'Items purchased',
  itemRevenue: 'Item revenue',
}

const esc = (s) => String(s).replace(/\|/g, '\\|')

function fmt(metric, raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return esc(raw)
  if (/Rate$/.test(metric)) return `${(n * 100).toFixed(1)} %`
  if (/Duration$/.test(metric)) return `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`
  if (/Revenue$/.test(metric)) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function table(rep) {
  if (!rep) return '_Report failed, see notes at the end._'
  if (!rep.rows.length) return '_No data in this period._'
  const head = [...rep.dims.map((d) => DIM_LABEL[d] || d), ...rep.metrics.map((m) => MET_LABEL[m] || m)]
  const lines = [`| ${head.join(' | ')} |`, `|${'---|'.repeat(head.length)}`]
  for (const r of rep.rows) {
    lines.push(`| ${[...r.keys.map(esc), ...r.values.map((v, i) => fmt(rep.metrics[i], v))].join(' | ')} |`)
  }
  if (rep.rowCount > rep.rows.length) lines.push(`\n_${rep.rows.length} of ${rep.rowCount} rows shown._`)
  return lines.join('\n')
}

function deltaTable(now, prev, metrics) {
  const lines = ['| Metric | Current | Previous | Delta |', '|---|---|---|---|']
  metrics.forEach((m, i) => {
    const a = Number(now?.totals?.[i])
    const b = Number(prev?.totals?.[i])
    const d = Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? `${a >= b ? '+' : ''}${(((a - b) / b) * 100).toFixed(1)} %` : 'n/a'
    lines.push(`| ${MET_LABEL[m] || m} | ${now ? fmt(m, now.totals[i]) : 'n/a'} | ${prev ? fmt(m, prev.totals[i]) : 'n/a'} | ${d} |`)
  })
  return lines.join('\n')
}

// Channel table with derived revenue per session and purchase rate: the two
// numbers that rank channels by business value instead of by traffic.
function channelValue(rep) {
  if (!rep) return '_Report failed, see notes at the end._'
  if (!rep.rows.length) return '_No data in this period._'
  const idx = (m) => rep.metrics.indexOf(m)
  const lines = ['| Channel | Sessions | Purchases | Purchase rate | Revenue | Revenue per session |', '|---|---|---|---|---|---|']
  for (const r of rep.rows) {
    const s = Number(r.values[idx('sessions')])
    const p = Number(r.values[idx('ecommercePurchases')])
    const rev = Number(r.values[idx('totalRevenue')])
    lines.push(`| ${esc(r.keys[0])} | ${s} | ${p} | ${s ? ((p / s) * 100).toFixed(2) + ' %' : 'n/a'} | ${fmt('totalRevenue', rev)} | ${s ? (rev / s).toFixed(2) : 'n/a'} |`)
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------- periods

const iso = (d) => d.toISOString().slice(0, 10)
const day = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x }

// GA4 delivers the running day only partially, so the period ends yesterday.
const endDate = opt('--end', iso(day(new Date(), -1)))
const startDate = opt('--start', iso(day(new Date(endDate), -(DAYS - 1))))
const range = { startDate, endDate }
const spanDays = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1
const prevRange = { startDate: iso(day(new Date(startDate), -spanDays)), endDate: iso(day(new Date(startDate), -1)) }

// ---------------------------------------------------------------- run

const { token, account } = await accessToken()

if (flag('--whoami')) {
  console.log(account)
  process.exit(0)
}

if (flag('--list')) {
  const props = await listProperties(token)
  console.log(`Service account: ${account}`)
  if (!props.length) console.log('No GA4 property visible. Grant access in GA4 under Admin > Property access management.')
  for (const p of props) console.log(`${p.id}\t${p.name}\t(${p.account})`)
  process.exit(0)
}

const prop = await resolveProperty(token)

// Ad hoc mode: one table to the console, no files.
if (opt('--dims', null) || opt('--metrics', null)) {
  const dims = (opt('--dims', '') || '').split(',').filter(Boolean)
  const metrics = (opt('--metrics', 'sessions') || '').split(',').filter(Boolean)
  const rep = await report(token, prop.id, { dims, metrics, range, limit: Number(opt('--limit', 25)) })
  console.log(`# GA4 ${prop.id} ${prop.name} | ${range.startDate} to ${range.endDate} | ${rep.rowCount} rows in total\n`)
  console.log(table(rep))
  process.exit(0)
}

const KE = await keyEventMetric(token, prop.id, range)
const TOTAL_METRICS = ['sessions', 'totalUsers', 'newUsers', 'screenPageViews', 'engagementRate', 'averageSessionDuration', ...(KE ? [KE] : [])]
const PERF = ['sessions', 'totalUsers', 'engagementRate', ...(KE ? [KE] : [])]
const SHOP = ['sessions', 'ecommercePurchases', 'totalRevenue', 'purchaseRevenue']
const r = (label, spec) => safe(label, () => report(token, prop.id, { range, ...spec }))

const [
  total, totalPrev, byHost, byChannel, byFirstChannel, bySourceMedium, byCampaign, byLanding,
  byCountry, byCountryChannel, byCity, byDevice, byEvent, byEventHost, byEventChannel, byEventCampaign,
  byChannelValue, byNewReturning, byDeviceEvent, byMonth, byMonthEvent, byItem, byDay,
] = await Promise.all([
  r('Totals', { metrics: TOTAL_METRICS }),
  safe('Totals previous period', () => report(token, prop.id, { metrics: TOTAL_METRICS, range: prevRange })),
  // Always the first question: which hosts does this property measure?
  // Staging, localhost and tag-manager preview hosts pollute every number.
  r('Hostnames', { dims: ['hostName'], metrics: PERF, limit: 20 }),
  r('Channels', { dims: ['sessionDefaultChannelGroup'], metrics: PERF, limit: 30 }),
  r('First-user channels', { dims: ['firstUserDefaultChannelGroup'], metrics: ['totalUsers', 'newUsers', ...(KE ? [KE] : [])], limit: 30 }),
  r('Source/medium', { dims: ['sessionSource', 'sessionMedium'], metrics: PERF, limit: 60 }),
  r('Campaigns', { dims: ['sessionCampaignName'], metrics: PERF, limit: 40 }),
  r('Landing pages', { dims: ['landingPagePlusQueryString'], metrics: PERF, limit: 80 }),
  r('Countries', { dims: ['country'], metrics: PERF, limit: 30 }),
  // Bot clusters show up here: one country, Direct, engagement under 10 %.
  r('Country x channel', { dims: ['country', 'sessionDefaultChannelGroup'], metrics: PERF, limit: 40 }),
  r('Cities', { dims: ['city'], metrics: PERF, limit: 25 }),
  r('Devices', { dims: ['deviceCategory'], metrics: PERF, limit: 10 }),
  r('Events', { dims: ['eventName'], metrics: ['eventCount', 'totalUsers', ...(KE ? [KE] : [])], limit: 60 }),
  r('Events x hostname', { dims: ['hostName', 'eventName'], metrics: ['eventCount'], limit: 80 }),
  ...(KE ? [
    r('Key events x channel', { dims: ['sessionDefaultChannelGroup', 'eventName'], metrics: [KE], limit: 100 }),
    r('Key events x campaign', { dims: ['sessionCampaignName', 'eventName'], metrics: [KE], limit: 60 }),
  ] : [null, null]),
  r('Purchases and revenue x channel', { dims: ['sessionDefaultChannelGroup'], metrics: SHOP, limit: 30 }),
  r('New vs returning', { dims: ['newVsReturning'], metrics: [...PERF, 'ecommercePurchases'], limit: 5 }),
  ...(KE ? [r('Key events x device', { dims: ['deviceCategory', 'eventName'], metrics: [KE], limit: 40 })] : [null]),
  r('Months', { dims: ['yearMonth'], metrics: [...PERF, 'ecommercePurchases', 'totalRevenue'], limit: 40, orderDim: 'yearMonth' }),
  ...(KE ? [r('Key events x month', { dims: ['yearMonth', 'eventName'], metrics: [KE], limit: 300, orderDim: 'yearMonth' })] : [null]),
  r('Items', { dims: ['itemName'], metrics: ['itemsPurchased', 'itemRevenue'], limit: 40 }),
  r('Daily trend', { dims: ['date'], metrics: PERF, limit: 400, orderDim: 'date' }),
])

// Key event rows are only meaningful where the count is above zero.
const nonZero = (rep) => rep && { ...rep, rows: rep.rows.filter((x) => Number(x.values.at(-1)) > 0) }
const t = (i) => (total?.totals?.[i] !== undefined ? fmt(TOTAL_METRICS[i], total.totals[i]) : 'n/a')

// AI assistants appear under several mediums and channels. Sum them by source.
const AI = /chatgpt|openai|perplexity|copilot|claude\.ai|gemini|bard|deepseek|you\.com|phind/i
const aiRows = (bySourceMedium?.rows || []).filter((x) => AI.test(x.keys[0]))
const aiSessions = aiRows.reduce((a, x) => a + Number(x.values[0]), 0)

const md = `# GA4 export ${endDate}

> Property: \`${prop.id}\`${prop.name ? ` (${esc(prop.name)})` : ''} · Period: ${range.startDate} to ${range.endDate} (${spanDays} days) · Previous period: ${prevRange.startDate} to ${prevRange.endDate} · Source: GA4 Data API, service account, read only · generated by \`ga4-pull.mjs\` (ga4-growth-strategy skill)
> Total: **${t(0)} sessions**, **${t(1)} users** (${t(2)} new), ${t(3)} page views, engagement rate ${t(4)}, avg. duration ${t(5)}${KE ? `, ${MET_LABEL[KE].toLowerCase()} ${t(6)}` : ''}.
> Key events are whatever the property marks as key events. They are NOT the same as customers. Purchases in GA4 are a floor: compare with the shop or accounting backend before trusting any revenue figure.

## Totals vs previous period

${deltaTable(total, totalPrev, TOTAL_METRICS)}

## Hostnames

Check first: test hosts (staging, localhost, 127.0.0.1, tag-manager preview) belong out of every conclusion.

${table(byHost)}

## Channels (session scope, last click)

${table(byChannel)}

## Channels by business value

Purchase rate and revenue per session rank channels by value, not by traffic. A short window on few purchases misleads: read this on 12 months.

${channelValue(byChannelValue)}

## First-user channels (where users first came from)

Compare with the session view: channels that start journeys (organic, social, AI, paid) lose credit under last click, Direct gains it.

${table(byFirstChannel)}

## Source and medium

AI assistants detected by source: ${aiRows.length ? `${aiSessions} sessions across ${aiRows.length} source/medium rows (${aiRows.map((x) => `${esc(x.keys[0])} / ${esc(x.keys[1])}`).join(', ')})` : 'none'}.

${table(bySourceMedium)}

## Campaigns

${table(byCampaign)}

## Landing pages (top 80)

${table(byLanding)}

## Countries

${table(byCountry)}

## Country x channel

${table(byCountryChannel)}

## Cities

${table(byCity)}

## Devices

${table(byDevice)}

## New vs returning

${table(byNewReturning)}

## Events

${table(byEvent)}

## Events x hostname

Which host fires which event. An event missing on one host points to a dead trigger there.

${table(byEventHost)}

## Key events x channel

${table(nonZero(byEventChannel))}

## Key events x campaign

${table(nonZero(byEventCampaign))}

## Key events x device

${table(nonZero(byDeviceEvent))}

## Months

${table(byMonth)}

## Key events x month

A lead event falling while purchases stay flat is a silent pipeline problem.

${table(nonZero(byMonthEvent))}

## Items purchased

${table(byItem)}

## Daily trend

${table(byDay)}
${errors.length ? `\n## Notes\n\nThese parts of the export failed and are missing above:\n\n${errors.map((e) => `- ${e}`).join('\n')}\n` : ''}`

const OUT_DIR = path.resolve(opt('--out', 'ga4-data'))
fs.mkdirSync(OUT_DIR, { recursive: true })
const suffix = spanDays === 28 ? '' : `-${spanDays}d`
const outFile = path.join(OUT_DIR, `${endDate}${suffix}.md`)
fs.writeFileSync(outFile, md, 'utf8')
// Raw data beside it, for later analysis without a second API call.
fs.writeFileSync(path.join(OUT_DIR, `${endDate}${suffix}.json`), JSON.stringify({
  property: prop, range, prevRange, keyEventMetric: KE,
  total, totalPrev, byHost, byChannel, byFirstChannel, bySourceMedium, byCampaign, byLanding, byCountry,
  byCountryChannel, byCity, byDevice, byEvent, byEventHost, byEventChannel, byEventCampaign, byChannelValue,
  byNewReturning, byDeviceEvent, byMonth, byMonthEvent, byItem, byDay, errors,
}), 'utf8')

console.log(`GA4 ${prop.id} ${range.startDate} to ${range.endDate}: ${t(0)} sessions, ${t(1)} users${KE ? `, ${t(6)} ${MET_LABEL[KE].toLowerCase()}` : ''}`)
console.log(`-> ${outFile}`)
if (errors.length) console.log(`Notes: ${errors.length} part(s) failed, listed at the end of the file.`)
