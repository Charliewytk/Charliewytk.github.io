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

  function fmtCount(n) {
    if (n == null || Number.isNaN(Number(n))) return null
    return Number(n).toLocaleString('en-GB')
  }

  /**
   * Bind one attribute to one value. Every stat goes through here so a missing
   * key leaves the hardcoded fallback standing rather than writing "null" or an
   * empty span into the page -- a blank number reads as a broken site, whereas
   * the previous day's figure is merely a day old.
   */
  function set(attr, value) {
    if (value == null) return
    document.querySelectorAll('[data-merger-' + attr + ']').forEach((el) => {
      el.textContent = value
    })
  }

  function apply(summary) {
    if (!summary || typeof summary !== 'object') return

    const publishable = summary.publishable
    const clears = summary.clears_breakeven
    const be = summary.breakeven_pct

    set('breakeven', fmtPct(be, 2))
    set('break-rate', fmtPct(summary.break_rate_pct, 1))
    set('ev-3pct', fmtSignedPct(summary.ev_3pct_per_deal))
    set('ev-1pct', fmtSignedPct(summary.ev_1pct_per_deal))
    set('median-days', summary.median_days_to_close == null
      ? null : String(summary.median_days_to_close))
    set('p90-days', summary.p90_days_to_close == null
      ? null : String(summary.p90_days_to_close))
    // The three cost terms the EV subtracts. Stated separately because a reader
    // checking the arithmetic needs each one, and because the carry moves with
    // the T-bill rate while the other two do not.
    set('break-loss', fmtPct(summary.break_loss_median_pct, 0))
    set('cost', fmtPct(summary.cost_pct, 2))
    set('carry', fmtPct(summary.carry_pct, 2))
    set('annualised-3pct', fmtPct(summary.annualised_3pct, 1))
    // The denominator behind the break rate. The page used to state "39 breaks
    // in 1,606" as literal text, with nothing able to update either number.
    set('breaks', fmtCount(summary.breaks))
    set('settled', fmtCount(summary.settled))
    set('deals', fmtCount(summary.deals))
    set('priced', fmtCount(summary.priced))
    set('corroborated', fmtCount(summary.corroborated))
    set('forms', fmtCount(summary.filing_types))
    set('built', summary.digest_date ?? summary.generated)

    if (publishable != null && clears != null && be != null) {
      set('live-copy',
        'Break-even is ' + fmtPct(be, 2) + ' today and ' + clears + ' of the ' +
        publishable + ' live deals clear it.')
    }
  }

  // NOT DONE HERE: patching the break rate inside the Dataset JSON-LD.
  //
  // That block exists only on /merger-monitor/ pages, and every one of those is
  // a dated snapshot -- the table is published a week late on purpose, so its
  // JSON-LD carries temporalCoverage of the build date. Rewriting it from
  // today's summary would make an archived page describe a measurement taken
  // after it was published, which is the same fabrication as the stale 2.4%
  // figure, only harder to notice. The break rate in that block is emitted by
  // render_page.py from the same derived base rates the digest prints, so it is
  // correct at build time and stays correct for the date it claims.

  fetch(SUMMARY_URL, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then(apply)
    .catch(() => {})
})()
