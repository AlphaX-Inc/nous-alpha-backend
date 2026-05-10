---
name: industry-timing-rotation-model
description: Build, test, and run a stock-market industry/sector rotation model that ranks industries by relative and absolute trend strength, times entries around breakouts and support/resistance, confirms breakouts through follow-through and volume/participation, and reduces or exits exposure when exhaustion, failed breakouts, or reversal conditions appear.
model: opus
---

## Version History

**v1.1 — Research audit enhancements:** volatility-managed position scaling (Barroso & Santa-Clara 2015), momentum crash indicator (Daniel & Moskowitz 2016), Novy-Marx intermediate-horizon momentum weighting, credit spread regime filter (Gilchrist & Zakrajšek 2012), updated bibliography with 20+ papers.

**v1.2 — Calendar Effects Integration:** 12 calendar-aware adjustments synthesized from Calendar Effects in Markets expert knowledge: OPEX breakout suppression (Ni/Pearson/Poteshman 2005, Chiang 2014, Avellaneda/Lipkin 2003), FOMC pre-drift confirmation (Lucca/Moench 2015), turn-of-month exhaustion dampener, tax-loss selling momentum distortion filter (Stivers/Sun 2013), earnings season dispersion amplifier, calendar-aware rebalance scheduling, quarter-end false exhaustion filter, seasonal regime overlay (Bouman/Jacobsen 2002), risk exit calendar awareness, OPEX+FOMC confluence risk flag, year-round harvesting awareness. New CalendarEngine module, 17 new reason codes, 13 new ablation tests, full config.yaml calendar block with per-effect toggles. 4 conflicts resolved (OPEX vs breakout, tax-loss vs momentum, TOM vs exhaustion, FOMC drift vs breakout quality). 7 new bibliography entries. 30+ papers total.

**v1.3 — Calendar Effects Refinement:** 6 enhancements: (1) OPEX prior-return context modulates suppression based on 5-day pre-OPEX price action (rally into OPEX = stronger suppression, sell-off = weaker), (2) mutual fund tax-loss selling activation (Sep 15-Oct 31 window, 20% momentum penalty reduction), (3) 3 cross-effect interactions (TOM+FOMC amplified exhaustion dampening, December OPEX+Tax Selling elevated suppression, OPEX+Earnings weakened pinning), (4) calendar invalidation logic (auto-disable all calendar adjustments on regime change to RED, exogenous shock >3×ATR, crash risk, or credit stress trigger), (5) calendar conviction score diagnostic metric (-5 to +5 aggregate), (6) 0DTE awareness documentation and 5 new anti-patterns. 12 new reason codes, 8 new ablation tests, 5 new unit-test requirements, 10 new CalendarEngine methods. Deferred to v1.4+: deep ITM option pressure (requires options data), 10 refinement factors (requires sentiment/positioning data), daily gamma exposure estimate.

---

## Research basis to incorporate

Use the studies below as the empirical foundation. The model should not assume any single technical rule is universally profitable; instead it combines robust effects, requires confirmation, controls data-snooping risk, and adapts to regimes.

### Core empirical insights

1. **Cross-sectional momentum exists over intermediate horizons.** Jegadeesh and Titman (1993) document that buying past winners and selling past losers generates significant positive returns over 3- to 12-month holding periods, with some longer-run dissipation. Use this to justify 3-, 6-, and 12-minus-1-month relative momentum inputs.

2. **Industry momentum is a primary driver of equity momentum.** Moskowitz and Grinblatt (1999) document strong industry momentum and find that individual-stock momentum becomes much less profitable after controlling for industry momentum. Use industries/sectors as the main rotation unit.

3. **Time-series momentum supports absolute trend filters.** Moskowitz, Ooi, and Pedersen (2012) document persistence in 1- to 12-month returns across liquid futures, with longer-horizon partial reversals. Use this to justify absolute trend filters that prevent buying weak sectors simply because they are less weak than peers.

4. **Trend-following has long-horizon evidence but needs robust implementation.** Hurst, Ooi, and Pedersen (2017) find trend-following has delivered positive average returns across many decades and asset classes. Use this to support multi-horizon trend signals and volatility-aware sizing.

5. **Breakouts and trading-range rules have empirical support, but with caveats.** Brock, Lakonishok, and LeBaron (1992) test moving-average and trading-range-break rules on the Dow Jones Industrial Average from 1897 to 1986 and report support for technical strategies. Sullivan, Timmermann, and White (1999) emphasize data-snooping controls when evaluating technical rules. Therefore, use breakouts as an overlay and validate with walk-forward tests and reality-check style multiple-testing controls.

6. **Support/resistance and price extremes can influence market behavior.** Osler (2000) finds support and resistance levels help predict intraday trend interruptions in exchange rates, though predictive power varies. Huddart, Lang, and Yetman (2009) find volume rises when stocks cross the upper or lower limit of past trading ranges, supporting attention/participation checks at breakouts. George and Hwang (2004) show nearness to the 52-week high explains a large portion of momentum profits; use 52-week highs/lows as durable reference levels.

7. **Volume can affect the strength and persistence of momentum.** Lee and Swaminathan (2000) find past trading volume predicts both the magnitude and persistence of price momentum. Use abnormal volume and volume run-rate to confirm breakouts and detect possible exhaustion.

8. **Momentum crashes and turning points require explicit risk controls.** Daniel and Moskowitz (2016) document that momentum crashes are partly forecastable, especially in panic states after market declines and when volatility is high. Goulding, Harvey, and Mazzoleni (2023) show slow and fast momentum intersections contain turning-point information. Use market regime, volatility, fast/slow trend conflict, failed-breakout states, and de-risking rules.

9. **Moving averages can add allocation value when predictability is uncertain.** Zhu and Zhou (2009) analyze moving-average trading rules from an asset-allocation perspective and find value when return predictability is uncertain. Levine and Pedersen (2016) show time-series momentum and moving-average crossovers are closely related/equivalent in general forms. Use moving averages as interpretable approximations of trend filters, but avoid over-optimizing exact windows.

10. **Technical analysis evidence is mixed and sensitive to implementation.** Park and Irwin (2007) review evidence and highlight data snooping, ex-post rule selection, transaction costs, and risk adjustment as key weaknesses. Always treat the model as a probabilistic ranking and risk-management tool, not as a deterministic forecasting engine.

### v1.1 Research Audit Enhancements

11. **Intermediate-horizon momentum is the robust signal.** Novy-Marx (2012) shows that 7-12 month momentum is the strongest and most robust component; recent returns (1-6 months) contain substantial reversal noise. Increase ret_252_21 weight from 50% to 60%; reduce ret_63 from 25% to 15%.

12. **Volatility-managed momentum dramatically reduces crash risk.** Barroso and Santa-Clara (2015) show that scaling momentum exposure inversely to recent realized volatility approximately doubles the Sharpe ratio. Implement as: vol_scale = target_vol / max(realized_vol_21, vol_floor).

13. **Momentum crash indicator improves regime filter.** Daniel and Moskowitz (2016) find momentum crashes cluster when market has recent large drawdown AND volatility is elevated. Add crash_risk = I(benchmark_drawdown_63 < -0.10) AND I(realized_vol_21 > 1.5 * realized_vol_252).

14. **Credit spreads improve regime classification.** Gilchrist and Zakrajšek (2012) show the excess bond premium forecasts economic activity. Add credit_stress = I(HY_OAS > 500bps) OR I(BAA_AAA_spread > 200bps).

15. **Value and momentum are natural hedges.** Asness, Moskowitz, and Pedersen (2013) document negative correlation between value and momentum across asset classes.

16. **Volatility-managed portfolios improve risk-adjusted returns broadly.** Moreira and Muir (2017) show reducing exposure in high-volatility periods improves Sharpe ratios across many factors.

### v1.2 Calendar Effects Integration

17. **Options expiration pinning suppresses breakouts.** Ni/Pearson/Poteshman (2005), Chiang (2014), Avellaneda/Lipkin (2003). During OPEX week: raise breakout_quality threshold, require higher volume confirmation, extend follow-through windows.

18. **Pre-FOMC announcement drift creates false breakouts.** Lucca and Moench (2015). Breakouts during pre-FOMC drift require post-FOMC confirmation.

19. **Turn-of-month rally is flow-driven and robust.** Dampen exhaustion penalty during TOM window in GREEN/YELLOW regimes.

20. **Tax-loss selling distorts momentum signals in Q4.** Stivers and Sun (2013). During Oct 15 - Dec 31: flag sectors with extreme YTD returns and adjust momentum scoring.

21. **Earnings season increases cross-sectional dispersion.** Increase relative_momentum_score weight during earnings season.

22. **Quarter-end institutional rebalancing creates false exhaustion.** Reduce exhaustion penalty during last 5 trading days of each quarter.

23. **OPEX-FOMC confluence is the highest-risk calendar configuration.** Downgrade regime by one level and raise all breakout thresholds.

24. **Sell-in-May / Halloween effect provides seasonal regime modulation.** Bouman and Jacobsen (2002). Apply soft seasonal multiplier — never overriding RED regime.

25. **Year-round tax-loss harvesting has diminished the January effect.** January reversal bonus should be smaller for large-cap sectors.

### v1.3 Calendar Effects Refinement

26. **Pre-OPEX return context modulates pinning and reversal dynamics.** Compute ret_5d entering OPEX week: if ret_5d > 1.5×ATR, increase OPEX suppression; if ret_5d < -1.5×ATR, reduce OPEX suppression.

27. **Mutual fund fiscal year-end creates an earlier, distinct tax-loss selling window.** Activate tax_loss_window_fund (Sep 15 - Oct 31) with 20% momentum penalty reduction.

28. **Cross-effect interactions amplify or dampen individual calendar effects.** Three highest-impact: (a) TOM+FOMC amplified exhaustion dampening; (b) December OPEX+Tax Selling elevated suppression; (c) OPEX+Earnings weakened pinning.

29. **0DTE options have made gamma effects more continuous.** Monthly OPEX flag captures PEAK of gamma effects, but daily gamma is now non-trivial.

30. **Calendar effects are invalidated by regime changes and exogenous shocks.** Disable all calendar adjustments on: regime change to RED, shock > 3×ATR, crash risk, or credit stress trigger.

---

## Tradable universe

Default U.S. sector ETF universe: XLB, XLC, XLE, XLF, XLI, XLK, XLP, XLRE, XLU, XLV, XLY. Optional tech sub-universe: SOXX, IGV, SKYY, HACK, WCLD, FTEC, ROBO, QTUM, ARKK. Benchmark: SPY. Cash proxy: BIL.

---

## Data requirements

Daily OHLCV (adjusted close for returns, split-adjusted for ATR/levels). Calendar engine requires: OPEX dates (3rd Friday algorithm), FOMC announcement dates (external calendar), trading-day-of-month index, quarter-end dates, earnings season windows (weeks 3-6 after quarter-end).

---

## Feature definitions

### Return and trend features
ret_21, ret_63, ret_126, ret_252, ret_252_21 (12-minus-1 month momentum). Cross-sectional momentum: cs_mom_i = 0.15*z_xs(ret_63) + 0.25*z_xs(ret_126) + 0.60*z_xs(ret_252_21) [v1.1 Novy-Marx weights]. Relative strength: rs_i,t = C_i,t / B_t; rs_slope_63. Moving-average trend: trend_filter = I(C > ma_200) + I(ma_50 > ma_200) + I(slope(ma_50) > 0) + I(rs_slope_63 > 0).

### v1.1: Volatility-managed scaling
vol_scale_i = target_vol / max(realized_vol_21_i, vol_floor); cap at 2.0.

### v1.1: Momentum crash risk indicator
momentum_crash_risk = I(benchmark_drawdown_63 < -0.10) AND I(benchmark_vol_ratio > 1.50).

### v1.2: Calendar feature definitions
opex_week, opex_day, opex_thu_fri, post_opex_mon, fomc_week, fomc_pre_drift, fomc_day, fomc_post_day, opex_fomc_confluence, tom_window, tax_loss_window_retail, tax_loss_window_fund, ytd_return_i, tax_loss_victim, window_dressing_beneficiary, earnings_season, quarter_end_window, seasonal_weak, seasonal_strong.

### v1.3: OPEX prior-return context features
opex_pre_return_5d = C_t / C_{t-5} - 1; opex_pre_return_atr = normalized by ATR. opex_rally_into = I(opex_week AND opex_pre_return_atr > 1.50). opex_selloff_into = I(opex_week AND opex_pre_return_atr < -1.50).

### v1.3: Cross-effect interaction features
tom_fomc_confluence, december_opex, opex_earnings_overlap, santa_claus_window.

### v1.3: Calendar conviction score
Aggregate diagnostic score (~-5 to +5): +1.0 TOM, +1.0 seasonal_strong, +0.5 earnings_season, +0.5 post_opex_mon, +0.5 fomc_post_day, -1.0 opex_week, -0.5 opex_rally_into, -1.0 tax_loss_victim, -0.5 seasonal_weak, -1.5 opex_fomc_confluence, -0.5 december_opex+tax, +0.5 opex_earnings_overlap, +0.5 tom_fomc_confluence, -0.5 quarter_end_window, +0.3 santa_claus_window.

### Volatility and liquidity
ATR_14, realized_vol_21/63/252, volume_z_20, dollar_volume.

### Support and resistance levels
Donchian (N=20,55,126,252), swing pivots (k=3,5,10), 52-week reference levels.

### Breakout signal
breakout_quality = 0.30*scaled(close_above_resistance_in_ATR) + 0.20*scaled(close_location_value) + 0.20*scaled(volume_z_20) + 0.20*I(rs_breakout) + 0.10*I(market_confirm).

### v1.2: Calendar-adjusted breakout thresholds
OPEX week: +0.15 quality, +0.50 volume_z. OPEX+FOMC: same. Pre-FOMC drift: flag only. Post-OPEX Monday: -0.05 quality. Post-FOMC: +0.10 bonus.

### v1.3: OPEX prior-return context adjustments
Rally into OPEX: additional +0.05 quality, +0.25 volume_z. Sell-off into OPEX: -0.05 quality, -0.25 volume_z.

### Follow-through signal
K=5 bars default. Follow-through score: mean of no_close_back, positive_progress, rs_progress, higher_low, volume_sustained.

### v1.2: Calendar-adjusted follow-through windows
OPEX overlap: extend to 7 days. Pre-FOMC: extend to post-FOMC+2. OPEX+FOMC: 7 days. Post-OPEX breakout: +0.15 bonus.

### Exhaustion / reversal-risk features
exhaustion = 0.20*I(extension_atr_50>3) + 0.15*I(rsi_14>75) + 0.20*I(volume_climax) + 0.20*I(wide_range_reversal) + 0.15*I(rs_divergence) + 0.10*I(fast_slow_conflict).

### v1.2: Calendar-adjusted exhaustion dampening
TOM window (GREEN/YELLOW): exhaustion *= 0.60. Quarter-end (CONFIRMED/EXTENDED): exhaustion *= 0.75.

### v1.3: Cross-effect interaction adjustments
TOM+FOMC confluence: exhaustion *= 0.50 (replaces standard TOM). December OPEX+Tax: +0.05 quality. OPEX+Earnings: -0.05 quality, -0.25 volume_z.

### v1.3: Calendar effect invalidation logic
calendar_invalidated = True when: regime_changed_to_RED, benchmark_gap > 3×ATR, momentum_crash_risk, or new credit_stress. When invalidated: revert ALL calendar adjustments to base values.

---

## Market regime filter

GREEN: benchmark_abs_trend >= 2, vol_state < 1.50, NOT crash_risk, NOT credit_stress. YELLOW: mixed or crash_risk or credit_stress (downgrade). RED: trend <= 1 and both negative, or vol >= 2.00, or both crash+credit.

### v1.2: Calendar-adjusted regime modifiers
OPEX+FOMC confluence: downgrade one level. Seasonal: weak months GREEN *= 0.90, strong months YELLOW *= 1.10. RED NEVER modified by seasonal.

---

## Sector state machine

9 states: AVOID, BASE, BREAKOUT_CANDIDATE, CONFIRMED_ADVANCE, PULLBACK_TO_SUPPORT, EXTENDED_ADVANCE, FAILED_BREAKOUT, REVERSAL_RISK, DOWNTREND. Transition rules use calendar-adjusted thresholds.

---

## Composite score

raw_score = w_rmom*relative_momentum + w_atrend*absolute_trend + 0.15*near_52w_high + 0.15*follow + 0.10*volume_attention + 0.05*vol_managed_bonus. Default w_rmom=0.35, w_atrend=0.20. Earnings season: w_rmom=0.40, w_atrend=0.15. Tax-loss victim: momentum *= 0.70. Window dressing: momentum *= 0.85. January reversal: +0.05 (large-cap). v1.3: MF tax-loss (Sep-Oct): momentum *= 0.80. penalty = 0.25*exhaustion + 0.35*reversal_risk + 0.20*I(bad_state) + 0.20*regime_penalty. final_score = raw_score - penalty.

---

## Portfolio construction

Eligibility: CONFIRMED_ADVANCE or PULLBACK_TO_SUPPORT, top N, absolute_trend > 0, reversal_risk < 0.40, exhaustion < 0.60, NOT RED, NOT crash_risk. Weighting: score-weighted inverse-volatility. Vol-managed scaling (v1.1). Constraints: max 35% single sector, min 5%, max 50% turnover. Risk exits: breakout_stop, swing_stop, ma_stop, hard_stop. v1.2: OPEX widen stops -0.25 ATR, Dec tax-loss widen -0.50 ATR, TOM block stop tightening.

---

## Rebalancing process

Daily after close. v1.2: Calendar-aware scheduling — prefer first Tue/Wed of month, avoid OPEX week, quarter-end last 2 days, pre-FOMC. Risk exits ALWAYS allowed.

---

## Backtesting and validation

Required metrics: CAGR, vol, Sharpe, Sortino, max DD, Calmar, hit rate, profit factor, turnover, exposure, tracking error, IR, capture ratios, VaR/CVaR. 21 ablation tests (8 base + 3 v1.1 + 13 v1.2 + 8 v1.3 = 32 total including "all combined" tests).

---

## Implementation architecture

Modules: data_adapter.py, data_validator.py, features.py, levels.py, signals.py, portfolio.py, risk.py, vol_manager.py (v1.1), crash_indicator.py (v1.1), calendar_engine.py (v1.2/v1.3), execution.py, backtest.py, live_loop.py. CalendarEngine: 27 methods (17 v1.2 + 10 v1.3). Unit tests: 21 requirements (8 base + 2 v1.1 + 6 v1.2 + 5 v1.3).

---

## Config YAML

universe: {benchmark: SPY, cash_proxy: BIL, symbols: [XLB..XLY]}. features: {momentum_weights: [0.15, 0.25, 0.60]}. breakout: {min_quality_score: 0.60, min_volume_z: 0.75}. market_regime: {crash thresholds, credit thresholds}. volatility_management: {target_vol: 0.12, max_leverage: 2.0}. calendar: {opex, fomc, opex_fomc_confluence, turn_of_month, tax_loss_selling, earnings_season, quarter_end, seasonal_regime, rebalance_calendar, opex_prior_return (v1.3), mutual_fund_tax_loss (v1.3), cross_effects (v1.3), santa_claus (v1.3), invalidation (v1.3)} — all with enabled toggles.

---

## Live output schema

date, symbol, state, score_0_100, rank, eligible, weights, stops, all score components, market_regime, momentum_crash_risk, vol_scale, calendar_flags, effective_ft_window, opex_pre_return_atr (v1.3), calendar_conviction_score (v1.3), calendar_invalidated (v1.3), reason_codes. 41 reason codes total (15 base + 4 v1.1 + 14 v1.2 + 12 v1.3 — see workspace file for complete list).

---

## Practical model interpretation

23 bullets covering: prefer relative leadership + absolute uptrend; breakouts improve timing not override momentum; exhaustion reduces aggressiveness; failed breakouts more actionable than overbought; regime essential; low-turnover weekly model preferred; vol-managed scaling highest-impact (v1.1); crash risk triggers before crashes (v1.1); value-momentum hedge (v1.1); calendar effects are overlays not standalone (v1.2); OPEX most important calendar effect for ITRM (v1.2); soft modifiers with toggles (v1.2); ~60-70% of days have some calendar effect (v1.2); risk exits never blocked (v1.2); OPEX suppression not uniform — prior-return context matters (v1.3); MF tax-loss distinct from retail (v1.3); cross-effects matter most in December and TOM+FOMC (v1.3); calendar invalidated by regime changes (v1.3); conviction score is diagnostic only (v1.3); 0DTE has changed microstructure (v1.3); sentiment/positioning integration deferred to v1.4+ (v1.3).

---

## Version summaries

### v1.1: Validated 9 components, enhanced 5, added 5 (vol-managed scaling, crash indicator, credit stress, value-momentum note, 252d vol).

### v1.2: Added 12 calendar integration points, new CalendarEngine module, 17 reason codes, 13 ablation tests, resolved 4 conflicts.

### v1.3: Added 6 enhancements (OPEX prior-return, MF tax-loss activation, 3 cross-effects, invalidation logic, conviction score, 0DTE awareness), 12 reason codes, 8 ablation tests, 5 unit tests, 5 anti-patterns. Deferred: deep ITM option pressure, 10 refinement factors, daily gamma estimate.

---

## Bibliography

Asness/Moskowitz/Pedersen (2013), Avellaneda/Lipkin (2003), Barroso/Santa-Clara (2015), Bouman/Jacobsen (2002), Brock/Lakonishok/LeBaron (1992), Chiang (2014), Daniel/Moskowitz (2016), DeBondt/Thaler (1985), Faber (2007), Filippou/Garcia-Ares/Zapatero, George/Hwang (2004), Gilchrist/Zakrajšek (2012), Goulding/Harvey/Mazzoleni (2023), Huddart/Lang/Yetman (2009), Hurst/Ooi/Pedersen (2017), Jegadeesh/Titman (1993), Lee/Swaminathan (2000), Levine/Pedersen (2016), Li/Yu (2012), Lo/Mamaysky/Wang (2000), Lucca/Moench (2015), Moreira/Muir (2017), Moskowitz/Grinblatt (1999), Moskowitz/Ooi/Pedersen (2012), Ni/Pearson/Poteshman (2005), Novy-Marx (2012), Osler (2000), Park/Irwin (2007), Stivers/Sun (2013), Sullivan/Timmermann/White (1999), Zhu/Zhou (2009).

---

NOTE: The complete v1.3 skill with full pseudocode, exact formulas, complete config YAML, all 41 reason codes listed individually, full CalendarEngine class with 27 method signatures, complete state machine transition rules, and detailed bibliography with full citations is stored in workspace file `itrm_v13_full.md` (73,002 chars, 1,700 lines). This skill prompt contains the complete framework in condensed form — all sections, all logic, all parameters, all version changes. Load the workspace file for copy-paste-ready implementation code.
