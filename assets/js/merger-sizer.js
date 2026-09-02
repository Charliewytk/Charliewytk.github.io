/** Published merger cost-sizer. Frozen 3% case, not the live feed.
 *
 * Fail-closed bar (strategy-validation PR #16): unknown stage stays the
 * labelled 1.57% policy; known stage uses the measured 40bp GBP-funded
 * round trip, not a restated sliver or a zero-cost floor. Paper only.
 */
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

  // Paper-book gate. Same registered rates as shared/cost_sizing.py.
  var P_CLOSE = 0.9757;
  var PAPER_BREAK_LOSS = -0.2710;
  var RISK_FREE = 0.0370;
  var MEASURED_COST_FRAC = 0.0040;
  var REGISTERED_FLAT_PCT = 1.57;
  var MAX_SPREAD_PCT = 25;
  var KNOWN_BASES = {
    "stage-DEFM14A": 1,
    "stage-DEFM14C": 1,
    "stage-PREM14A": 1,
    "stage-PREM14C": 1,
    "stage-SC 14D9": 1,
    "computed-from-expiry": 1
  };
  var STAGE_DAYS = {
    DEFM14A: 49,
    DEFM14C: 49,
    PREM14A: 62,
    PREM14C: 62,
    "SC 14D9": 27
  };

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

  function firstDefined() {
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] !== undefined) return arguments[i];
    }
    return undefined;
  }

  function normalizeBasis(input) {
    var b = firstDefined(input.breakEvenBasis, input.break_even_basis);
    if (b != null && String(b).trim() !== "") return String(b).trim();
    var stage = input.stage;
    if (stage == null || String(stage).trim() === "") return null;
    var s = String(stage).trim();
    if (s.toLowerCase() === "unknown") return null;
    if (s === "computed-from-expiry" || KNOWN_BASES[s]) return s;
    if (STAGE_DAYS[s] != null) return "stage-" + s;
    return s;
  }

  function claimedBarPct(input) {
    var raw = firstDefined(input.claimedBarPct, input.breakEvenPct, input.break_even_pct);
    if (raw == null || raw === "") return null;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    var n = Number(String(raw).trim().replace(/%/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function explicitDays(input) {
    var raw = firstDefined(input.breakEvenDays, input.break_even_days, input.days);
    if (raw == null || raw === "") return null;
    var d = parseInt(raw, 10);
    return d > 0 ? d : null;
  }

  function daysFromBasis(basis) {
    if (!basis || String(basis).indexOf("stage-") !== 0) return null;
    var form = String(basis).slice("stage-".length);
    return STAGE_DAYS[form] != null ? STAGE_DAYS[form] : null;
  }

  function daysFor(input) {
    var explicit = explicitDays(input);
    if (explicit != null) return explicit;
    var inferred = daysFromBasis(normalizeBasis(input));
    if (inferred != null) return inferred;
    return 49;
  }

  function requireRoundTripCost(costFrac) {
    if (costFrac == null || !(Number(costFrac) > 0)) {
      throw new Error(
        "claimed spread cannot ship without costs: round-trip cost must be positive"
      );
    }
    return Number(costFrac);
  }

  function paperCarryFrac(days) {
    return RISK_FREE * Number(days) / 365;
  }

  function paperBreakEvenFrac(days, costFrac) {
    return (
      (-(1 - P_CLOSE) * PAPER_BREAK_LOSS + costFrac + paperCarryFrac(days)) / P_CLOSE
    );
  }

  function breakEvenPct(days, costFrac) {
    var d = days == null || days === "" ? 49 : days;
    var cost = costFrac == null || costFrac === ""
      ? MEASURED_COST_FRAC
      : requireRoundTripCost(costFrac);
    return paperBreakEvenFrac(d, cost) * 100;
  }

  function uncostedBreakEvenPct(days) {
    var d = days == null || days === "" ? 49 : days;
    return paperBreakEvenFrac(d, 0) * 100;
  }

  function round3(n) {
    return Math.round(Number(n) * 1000) / 1000;
  }

  function barIncludesCosts(barPct, days) {
    if (barPct == null) return false;
    return Number(barPct) > uncostedBreakEvenPct(days) + 1e-9;
  }

  function barChargesMeasuredCost(barPct, days) {
    if (barPct == null) return false;
    return round3(barPct) + 1e-9 >= round3(breakEvenPct(days));
  }

  function barBasisLabel(basis) {
    if (basis === "registered-flat") return "labelled 1.57% policy (unknown stage)";
    if (basis === "recomputed-costed") return "measured 40bp GBP-funded round trip";
    return "kept (charges measured 40bp)";
  }

  function paperBar(input) {
    input = input || {};
    var basis = normalizeBasis(input);
    var days = daysFor(input);
    var feed = claimedBarPct(input);
    var canVerify = explicitDays(input) != null || daysFromBasis(basis) != null;

    if (basis && KNOWN_BASES[basis]) {
      if (feed != null) {
        if (!canVerify || !barChargesMeasuredCost(feed, days)) {
          return { barPct: breakEvenPct(days), barBasis: "recomputed-costed" };
        }
        return { barPct: Number(feed), barBasis: basis };
      }
      return { barPct: breakEvenPct(days), barBasis: "recomputed-costed" };
    }

    var flat = REGISTERED_FLAT_PCT;
    if (!barIncludesCosts(flat, days)) {
      return { barPct: breakEvenPct(days), barBasis: "recomputed-costed" };
    }
    return { barPct: flat, barBasis: "registered-flat" };
  }

  function shouldOpen(spreadPct, candidate, maxSpreadPct) {
    if (spreadPct == null || !Number.isFinite(Number(spreadPct))) return false;
    var cap = maxSpreadPct == null ? MAX_SPREAD_PCT : maxSpreadPct;
    if (Number(spreadPct) > cap) return false;
    return Number(spreadPct) > paperBar(candidate).barPct;
  }

  function gateFields(input) {
    var gate = paperBar(input);
    var digits = gate.barBasis === "registered-flat" ? 2 : 3;
    return {
      barPct: gate.barPct,
      barBasis: gate.barBasis,
      barLabel: fmtPct(gate.barPct, digits),
      barBasisLabel: barBasisLabel(gate.barBasis),
      measuredCostPct: COST_PCT
    };
  }

  function size(input) {
    input = input || {};
    var gate = gateFields(input);
    var offer = parseMoney(input.offer);
    var market = parseMoney(input.market);
    if (offer == null || market == null || market <= 0) {
      return Object.assign({ error: "Need an offer and a market above zero." }, gate);
    }

    var breakRatePct = parseOptionalPct(input.breakRatePct, PUBLISHED_BREAK_RATE_PCT);
    var costPct = parseOptionalPct(input.costPct, COST_PCT);
    var p = breakProbability(breakRatePct);
    var spreadPct = (offer / market - 1) * 100;
    var annualisedPct = spreadPct * (ANNUALISED_3PCT / REFERENCE_SPREAD_PCT);
    var netPct = (1 - p) * spreadPct + p * (-BREAK_LOSS_PCT) - costPct - CARRY_PCT;
    var be = breakevenPct(p, costPct);

    return Object.assign({
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
      clears: shouldOpen(spreadPct, input)
    }, gate);
  }

  var api = {
    size: size,
    fmtSignedPct: fmtSignedPct,
    paperBar: paperBar,
    shouldOpen: shouldOpen,
    barChargesMeasuredCost: barChargesMeasuredCost,
    barIncludesCosts: barIncludesCosts,
    breakEvenPct: breakEvenPct,
    uncostedBreakEvenPct: uncostedBreakEvenPct,
    P_CLOSE: P_CLOSE,
    REGISTERED_FLAT_PCT: REGISTERED_FLAT_PCT
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.MergerSizer = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
