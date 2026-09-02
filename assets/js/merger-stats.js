/** Load Merger Monitor stats from feed_summary.json (digest pipeline). */
(function (root) {
  var SUMMARY_URL = "/merger-monitor/feed_summary.json";

  function fmtPct(n, digits) {
    if (n == null || Number.isNaN(Number(n))) return null;
    return Number(n).toFixed(digits == null ? 2 : digits) + "%";
  }

  function fmtSignedPct(n) {
    if (n == null || Number.isNaN(Number(n))) return null;
    var v = Number(n);
    return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
  }

  function fmtCount(n) {
    if (n == null || Number.isNaN(Number(n))) return null;
    return Number(n).toLocaleString("en-GB");
  }

  function set(attr, value) {
    if (value == null) return;
    if (typeof document === "undefined") return;
    document.querySelectorAll("[data-merger-" + attr + "]").forEach(function (el) {
      el.textContent = value;
    });
  }

  function apply(summary) {
    if (!summary || typeof summary !== "object") return;

    var publishable = summary.publishable;
    var clears = summary.clears_breakeven;
    var be = summary.breakeven_pct;

    set("breakeven", fmtPct(be, 2));
    set("break-rate", fmtPct(summary.break_rate_pct, 1));
    set("ev-3pct", fmtSignedPct(summary.ev_3pct_per_deal));
    set("ev-1pct", fmtSignedPct(summary.ev_1pct_per_deal));
    set("median-days", summary.median_days_to_close == null
      ? null : String(summary.median_days_to_close));
    set("p90-days", summary.p90_days_to_close == null
      ? null : String(summary.p90_days_to_close));
    set("break-loss", fmtPct(summary.break_loss_median_pct, 0));
    set("cost", fmtPct(summary.cost_pct, 2));
    set("carry", fmtPct(summary.carry_pct, 2));
    set("annualised-3pct", fmtPct(summary.annualised_3pct, 1));
    set("breaks", fmtCount(summary.breaks));
    set("settled", fmtCount(summary.settled));
    set("deals", fmtCount(summary.deals));
    set("priced", fmtCount(summary.priced));
    set("clears", fmtCount(summary.clears_breakeven));
    set("corroborated", fmtCount(summary.corroborated));
    set("forms", fmtCount(summary.filing_types));
    set("built", summary.digest_date ?? summary.generated);

    if (publishable != null && clears != null && be != null) {
      set("live-copy",
        "Break-even is " + fmtPct(be, 2) + " today and " + clears + " of the " +
        publishable + " live deals clear it.");
    }
  }

  function boot() {
    if (typeof fetch !== "function") return;
    fetch(SUMMARY_URL, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && typeof data === "object" && !Array.isArray(data)) apply(data);
      })
      .catch(function () {});
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { apply: apply };
  }
  if (typeof document !== "undefined") {
    boot();
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
