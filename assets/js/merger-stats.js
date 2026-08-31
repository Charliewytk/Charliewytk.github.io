/** Load live Merger Monitor stats from feed_summary.json (synced from digest pipeline). */
(function () {
  const SUMMARY_URL = '/merger-monitor/feed_summary.json'

  function fmtPct(n, digits) {
    if (n == null || Number.isNaN(Number(n))) return null
    return Number(n).toFixed(digits ?? 2) + '%'
  }

  function fmtSignedPct(n) {
    if (n == null || Number.isNaN(Number(n))) return null
    const v = Number(n)
    return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
  }

  function apply(summary) {
    if (!summary || typeof summary !== 'object') return

    const publishable = summary.publishable
    const totalDeals = summary.deals
    const clears = summary.clears_breakeven
    const be = summary.breakeven_pct
    const breakRate = summary.break_rate_pct
    const digestDate = summary.digest_date ?? summary.generated

    document.querySelectorAll('[data-merger-breakeven]').forEach((el) => {
      const v = fmtPct(be, 2)
      if (v) el.textContent = v
    })
    document.querySelectorAll('[data-merger-break-rate]').forEach((el) => {
      const v = fmtPct(breakRate, 1)
      if (v) el.textContent = v
    })
    document.querySelectorAll('[data-merger-ev-3pct]').forEach((el) => {
      const v = fmtSignedPct(summary.ev_3pct_per_deal)
      if (v) el.textContent = v
    })
    document.querySelectorAll('[data-merger-ev-1pct]').forEach((el) => {
      const v = fmtSignedPct(summary.ev_1pct_per_deal)
      if (v) el.textContent = v
    })
    document.querySelectorAll('[data-merger-median-days]').forEach((el) => {
      if (summary.median_days_to_close != null) {
        el.textContent = String(summary.median_days_to_close)
      }
    })
    document.querySelectorAll('[data-merger-live-copy]').forEach((el) => {
      if (publishable == null || clears == null || be == null) return
      el.textContent =
        'Break-even is ' + fmtPct(be, 2) + ' today and ' + clears + ' of the ' +
        publishable + ' live deals clear it.'
    })
    document.querySelectorAll('[data-merger-deals]').forEach((el) => {
      if (totalDeals != null) el.textContent = String(totalDeals)
    })
    document.querySelectorAll('[data-merger-priced]').forEach((el) => {
      if (summary.priced != null) el.textContent = String(summary.priced)
    })
    document.querySelectorAll('[data-merger-corroborated]').forEach((el) => {
      if (summary.corroborated != null) el.textContent = String(summary.corroborated)
    })
    document.querySelectorAll('[data-merger-forms]').forEach((el) => {
      if (summary.filing_types != null) el.textContent = String(summary.filing_types)
    })
    document.querySelectorAll('[data-merger-built]').forEach((el) => {
      if (digestDate) el.textContent = String(digestDate)
    })
  }

  fetch(SUMMARY_URL, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then(apply)
    .catch(() => {})
})()
