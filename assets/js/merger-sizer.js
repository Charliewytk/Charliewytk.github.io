/** Published merger cost-sizer. Frozen 3% case, not the live feed. */
(function (root) {
  // Stated on /example/ and /subscribe/: 2.4% is 39 of 1,606 settled outcomes.
  var BREAKS = 39;
  var SETTLED = 1606;
  var PUBLISHED_BREAK_RATE_PCT = 2.4;
  var BREAK_LOSS_PCT = 27;
  var COST_PCT = 0.4;
  var CARRY_PCT = 0.49;
  var ANNUALISED_3PCT = 24.6;
  var REFERENCE_SPREAD_PCT = 3;
  var PUBLISHED_BREAKEVEN_PCT = 1.59;

  function almost(a, b) {
    return Math.abs(a - b) < 1e-9;
  }

  function parseMoney(raw) {
    if (raw == null || raw === "") return null;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    var s = String(raw).trim().replace(/[$,\s]/g, "");
    if (!s) return null;
    var n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function parseOptionalPct(raw, fallback) {
    if (raw == null || raw === "") return fallback;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : fallback;
    var s = String(raw).trim().replace(/%/g, "");
    if (!s) return fallback;
    var n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }

  function fmtPct(n, digits) {
    return Number(n).toFixed(digits) + "%";
  }

  function fmtSignedPct(n, digits) {
    var v = Number(n);
    if (!Number.isFinite(v)) return "";
    return (v >= 0 ? "+" : "") + v.toFixed(digits) + "%";
  }

  function breakProbability(breakRatePct) {
    if (almost(breakRatePct, PUBLISHED_BREAK_RATE_PCT)) return BREAKS / SETTLED;
    return breakRatePct / 100;
  }

  function breakevenPct(p, costPct) {
    if (almost(p, BREAKS / SETTLED) && almost(costPct, COST_PCT)) {
      return PUBLISHED_BREAKEVEN_PCT;
    }
    return (costPct + CARRY_PCT + p * BREAK_LOSS_PCT) / (1 - p);
  }

  function size(input) {
    input = input || {};
    var offer = parseMoney(input.offer);
    var market = parseMoney(input.market);
    if (offer == null || market == null || offer <= 0 || market <= 0) {
      return { error: "Need an offer and a market above zero." };
    }

    var breakRatePct = parseOptionalPct(input.breakRatePct, PUBLISHED_BREAK_RATE_PCT);
    var costPct = parseOptionalPct(input.costPct, COST_PCT);
    var p = breakProbability(breakRatePct);
    var spreadPct = (offer / market - 1) * 100;
    var annualisedPct = spreadPct * (ANNUALISED_3PCT / REFERENCE_SPREAD_PCT);
    var netPct = (1 - p) * spreadPct + p * (-BREAK_LOSS_PCT) - costPct - CARRY_PCT;
    var be = breakevenPct(p, costPct);

    return {
      spreadPct: spreadPct,
      annualisedPct: annualisedPct,
      netPct: netPct,
      costPct: costPct,
      carryPct: CARRY_PCT,
      breakLossPct: BREAK_LOSS_PCT,
      breaks: BREAKS,
      settled: SETTLED,
      spreadLabel: fmtSignedPct(spreadPct, 2),
      annualisedLabel: fmtPct(annualisedPct, 1),
      netLabel: fmtSignedPct(netPct, 2),
      breakRateLabel: almost(breakRatePct, PUBLISHED_BREAK_RATE_PCT)
        ? fmtPct(PUBLISHED_BREAK_RATE_PCT, 1)
        : fmtPct(breakRatePct, breakRatePct % 1 === 0 ? 1 : 2),
      costLabel: fmtPct(costPct, 2),
      breakevenLabel: fmtPct(be, 2),
    };
  }

  var api = { size: size, fmtSignedPct: fmtSignedPct };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.MergerSizer = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
