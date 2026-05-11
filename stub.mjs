// Stub data — matches the data shapes consumed by paypay-roundtable.jsx.
// Used by default so the backend is demoable without an API key.
// Live mode (with ANTHROPIC_API_KEY set) replaces this with real agent output.
//
// 11 personas after Bloomberg removal. Klarman renumbered 11 → 10.

// Index 9 (Dimon) bear, index 8 (Munger) abstain.
// Vote totals: 7 bull / 2 abs / 2 bear.
export const STUB_AGENT_STANCE = [
  "bull", "bull", "bull", "bull", "abs", "bull",
  "bear", "bull", "abs", "bear", "bull",
];

export const STUB_AGENT_CONFIDENCE = [
  0.82, 0.91, 0.74, 0.88, 0.0, 0.79,
  0.71, 0.77, 0.0, 0.65, 0.84,
];

// Discussion feed — Japanese
export const STUB_DISCUSSION_JA = [
  { speaker: 0, text: "AI 計算スケーリングの本流は依然として強い。電力・チップ供給のボトルネックを通る銘柄に集中したい。テック比率は妥当。", stance: "bull", topic: "AI・計算インフラ", t: "12:42" },
  { speaker: 3, text: "実質金利のピークは超えた。インカム＋債券スリーブは引き続き持続可能。リスクパリティ的には魅力的。", stance: "bull", topic: "マクロ・全天候", t: "12:39" },
  { speaker: 1, text: "直近30日の出来高プロファイルとボラ・サーフェスを見ると、INC スリーブのリバランスは現状維持で良い。シグナルは弱い買い。", stance: "bull", topic: "クオンツ・ファクター", t: "12:35" },
  { speaker: 6, text: "高配当大型株のバリュエーションは過熱気味。私は反対票を投じる。GLD の比率を上げて備えるべき。", stance: "bear", topic: "コントラリアン", t: "12:31" },
  { speaker: 5, text: "クレジットスプレッドは歴史的にタイト。ここで強気に振り切るのは慎重に。配当グロースの新規買付は控えめに。", stance: "bull", topic: "クレジット", t: "12:28" },
  { speaker: 9, text: "ノンバンク信用市場の拡大とプライベートクレジットの不透明性を警戒している。ストレス時に備えて現金枠は厚めに保ちたい。", stance: "bear", topic: "銀行・与信", t: "12:24" },
  { speaker: 7, text: "VIX は底値圏。テールリスクが安く買える。INC スリーブのプットスプレッドを薄く張りたい。", stance: "bull", topic: "リスク・ヘッジ", t: "12:21" },
  { speaker: 10, text: "高配当スリーブにバリューの偏りを足したい。配当グロースの中でも PE が低い銘柄に傾けたい。条件付き賛成。", stance: "bull", topic: "ディープ・バリュー", t: "12:17" },
  { speaker: 2, text: "マルチ戦略の観点では、INC スリーブの増額はリスク調整後リターンが見合う。実行コスト 8.2bps も許容範囲。", stance: "bull", topic: "マルチ戦略", t: "12:14" },
];

export const STUB_DISCUSSION_EN = [
  { speaker: 0, text: "AI compute-scaling is still the dominant thesis. Concentrate on names that capture the power and chip-supply bottlenecks. Tech weighting is reasonable.", stance: "bull", topic: "AI / Compute", t: "12:42" },
  { speaker: 3, text: "The real-rate peak is behind us. The Income plus bond sleeve remains sustainable and looks attractive from a risk-parity lens.", stance: "bull", topic: "Macro / All-weather", t: "12:39" },
  { speaker: 1, text: "The 30-day volume profile and volatility surface say the INC sleeve can stay as is. The signal is a weak buy.", stance: "bull", topic: "Quant / Factors", t: "12:35" },
  { speaker: 6, text: "High-dividend large caps look overheated. I vote no. Raise the GLD sleeve if we want more defense.", stance: "bear", topic: "Contrarian", t: "12:31" },
  { speaker: 5, text: "Credit spreads are historically tight. I would avoid leaning too bullish and keep new dividend-growth buys modest.", stance: "bull", topic: "Credit", t: "12:28" },
  { speaker: 9, text: "I'm watching non-bank credit expansion and private-credit opacity. We should keep a fatter cash buffer for stress scenarios.", stance: "bear", topic: "Banking / Credit", t: "12:24" },
  { speaker: 7, text: "VIX is near the floor. Tail risk is cheap. I would add a light put-spread hedge to the INC sleeve.", stance: "bull", topic: "Risk / Hedging", t: "12:21" },
  { speaker: 10, text: "Conditional yes. Add more value bias to the high-dividend sleeve and tilt toward lower-PE names within dividend growth.", stance: "bull", topic: "Deep Value", t: "12:17" },
  { speaker: 2, text: "From a multi-strategy lens, the INC increase has acceptable risk-adjusted return. 8.2bps friction is within tolerance.", stance: "bull", topic: "Multi-strategy", t: "12:14" },
];

export const STUB_DISCUSSION_KO = [
  { speaker: 0, text: "AI 컴퓨팅 스케일링의 본류는 여전히 강합니다. 전력·칩 공급 병목을 통과하는 종목에 집중하고 싶습니다. 테크 비중은 타당합니다.", stance: "bull", topic: "AI · 컴퓨팅", t: "12:42" },
  { speaker: 3, text: "실질금리 피크는 지났습니다. 인컴+채권 슬리브는 지속 가능하며 리스크 패리티 관점에서 매력적입니다.", stance: "bull", topic: "매크로 · 올웨더", t: "12:39" },
  { speaker: 1, text: "최근 30일의 거래량 프로파일과 변동성 서피스를 보면 INC 슬리브는 현 상태 유지가 적절합니다. 시그널은 약한 매수입니다.", stance: "bull", topic: "퀀트 · 팩터", t: "12:35" },
  { speaker: 6, text: "고배당 대형주의 밸류에이션이 과열 기미입니다. 저는 반대표를 던집니다. GLD 비중을 올려 대비해야 합니다.", stance: "bear", topic: "컨트래리언", t: "12:31" },
  { speaker: 5, text: "크레딧 스프레드는 역사적으로 타이트합니다. 여기서 과도하게 강세에 편승하는 것은 신중해야 합니다. 배당 그로스 신규 매수는 보수적으로.", stance: "bull", topic: "크레딧", t: "12:28" },
  { speaker: 9, text: "비은행 신용 시장 확장과 사모 신용의 불투명성을 경계합니다. 스트레스 시나리오에 대비해 현금 버퍼를 두텁게 유지해야 합니다.", stance: "bear", topic: "뱅킹 · 신용", t: "12:24" },
  { speaker: 7, text: "VIX는 바닥권입니다. 테일 리스크가 싸게 매수 가능합니다. INC 슬리브에 풋 스프레드 헷지를 얇게 깔고 싶습니다.", stance: "bull", topic: "리스크 · 헷지", t: "12:21" },
  { speaker: 10, text: "조건부 찬성. 고배당 슬리브에 밸류 편향을 더하고 배당 그로스 내에서도 저PER 종목으로 기울이고 싶습니다.", stance: "bull", topic: "딥 밸류", t: "12:17" },
  { speaker: 2, text: "멀티 스트래티지 관점에서 INC 슬리브 증액은 리스크 조정 수익률이 합당합니다. 집행 비용 8.2bps도 허용 범위입니다.", stance: "bull", topic: "멀티 스트래티지", t: "12:14" },
];

export const STUB_VOTE_REASONS_JA = [
  "AI 計算ボトルネックに賭ける",
  "統計シグナルは弱い買い",
  "マルチ戦略で増額に賛成",
  "金利ピークアウトを評価",
  "短期シグナル不足で棄権",
  "債券スリーブ条件付き賛成",
  "バリュエーション過熱を警戒",
  "ヘッジ厚めなら賛成",
  "強気の前提を反転して再点検",
  "ノンバンク信用リスクを警戒",
  "バリュー偏重で条件付き賛成",
];

export const STUB_VOTE_REASONS_EN = [
  "Bets on the AI compute bottleneck",
  "Quant signal is a weak buy",
  "Multi-strategy yes on increase",
  "Rates appear past peak",
  "Abstains on weak short-term signals",
  "Conditional yes on bond sleeve",
  "Warns on valuation heat",
  "Yes if hedges stay thicker",
  "Inverts the bull case to test it",
  "Cautious on non-bank credit risk",
  "Conditional yes on value tilt",
];

export const STUB_VOTE_REASONS_KO = [
  "AI 컴퓨팅 병목에 베팅",
  "통계 시그널은 약한 매수",
  "멀티 스트래티지로 증액 찬성",
  "금리 피크아웃을 평가",
  "단기 시그널 부족으로 기권",
  "채권 슬리브 조건부 찬성",
  "밸류에이션 과열 경계",
  "헷지 두텁게 깔면 찬성",
  "강세 전제 반전해 재점검",
  "비은행 신용 리스크 경계",
  "밸류 편향으로 조건부 찬성",
];

export const STUB_COMMITTEE_EVENTS_JA = [
  { kind: "motion", speaker: 3, time: "12:39", title: "提案", text: "PP-INC を +2%。金利ピークアウト後のインカム再評価を取りに行く。", stance: "bull", evidence: ["実質金利", "VIX安定"] },
  { kind: "challenge", speaker: 6, time: "12:31", title: "反対意見", text: "大型株は過熱気味。上げるなら GLD の保険も同時に増やしたい。", stance: "bear", evidence: ["PER上昇", "集中リスク"] },
  { kind: "evidence", speaker: 1, time: "12:35", title: "データ提示", text: "出来高プロファイルとボラ・サーフェスは現状維持の弱い買いシグナル。CPI も予想を下回りフロー継続。", stance: "bull", evidence: ["CPI +2.4%", "8.2bps"] },
  { kind: "counter", speaker: 5, time: "12:28", title: "条件付き賛成", text: "クレジットはタイト。PP-BND を -1% するなら月次で再評価する条件を付ける。", stance: "bull", evidence: ["スプレッド", "再評価条件"] },
  { kind: "lock", speaker: 2, time: "12:14", title: "投票ロック", text: "執行摩擦は 8.2bps。スリッページ見込みは基準内。可決後の実行は可能。", stance: "bull", evidence: ["流動性", "執行可能"] },
];

export const STUB_COMMITTEE_EVENTS_EN = [
  { kind: "motion", speaker: 3, time: "12:39", title: "Proposal", text: "Increase PP-INC by +2%. Capture income re-rating after the rate peak.", stance: "bull", evidence: ["Real yield", "Stable VIX"] },
  { kind: "challenge", speaker: 6, time: "12:31", title: "Objection", text: "Large caps look overheated. If we raise exposure, add GLD protection too.", stance: "bear", evidence: ["Higher PER", "Concentration risk"] },
  { kind: "evidence", speaker: 1, time: "12:35", title: "Data check", text: "Volume profile and vol surface point to a weak buy. CPI came in below forecast and flows continue.", stance: "bull", evidence: ["CPI +2.4%", "8.2bps"] },
  { kind: "counter", speaker: 5, time: "12:28", title: "Conditional yes", text: "Credit is tight. If PP-BND goes down 1%, add a monthly review condition.", stance: "bull", evidence: ["Spreads", "Review condition"] },
  { kind: "lock", speaker: 2, time: "12:14", title: "Vote lock", text: "Execution friction is 8.2 bps. Slippage is within limits, so the decision can be executed.", stance: "bull", evidence: ["Liquidity", "Executable"] },
];

export const STUB_COMMITTEE_EVENTS_KO = [
  { kind: "motion", speaker: 3, time: "12:39", title: "제안", text: "PP-INC 비중 +2%. 금리 피크아웃 이후 인컴 재평가를 노립니다.", stance: "bull", evidence: ["실질금리", "VIX 안정"] },
  { kind: "challenge", speaker: 6, time: "12:31", title: "반대 의견", text: "대형주는 과열 기미입니다. 비중을 올린다면 GLD 보험도 함께 늘려야 합니다.", stance: "bear", evidence: ["PER 상승", "집중 리스크"] },
  { kind: "evidence", speaker: 1, time: "12:35", title: "데이터 제시", text: "거래량 프로파일과 변동성 서피스는 약한 매수 시그널. CPI는 예상 하회로 자금 유입이 지속됩니다.", stance: "bull", evidence: ["CPI +2.4%", "8.2bps"] },
  { kind: "counter", speaker: 5, time: "12:28", title: "조건부 찬성", text: "크레딧이 타이트합니다. PP-BND를 -1% 한다면 월별 재점검 조건을 답니다.", stance: "bull", evidence: ["스프레드", "재점검 조건"] },
  { kind: "lock", speaker: 2, time: "12:14", title: "투표 락", text: "집행 마찰은 8.2bps. 슬리피지는 기준 내이며 가결 후 집행 가능합니다.", stance: "bull", evidence: ["유동성", "집행 가능"] },
];

export function buildRoundtablePayload(lang = "ja") {
  return {
    source: "stub",
    generatedAt: new Date().toISOString(),
    discussion:
      lang === "en" ? STUB_DISCUSSION_EN :
      lang === "ko" ? STUB_DISCUSSION_KO :
                      STUB_DISCUSSION_JA,
    stances: STUB_AGENT_STANCE,
    confidences: STUB_AGENT_CONFIDENCE,
  };
}

export function buildCommitteePayload(lang = "ja") {
  return {
    source: "stub",
    generatedAt: new Date().toISOString(),
    events:
      lang === "en" ? STUB_COMMITTEE_EVENTS_EN :
      lang === "ko" ? STUB_COMMITTEE_EVENTS_KO :
                      STUB_COMMITTEE_EVENTS_JA,
    voteReasons:
      lang === "en" ? STUB_VOTE_REASONS_EN :
      lang === "ko" ? STUB_VOTE_REASONS_KO :
                      STUB_VOTE_REASONS_JA,
    stances: STUB_AGENT_STANCE,
    confidences: STUB_AGENT_CONFIDENCE,
    voteCounts: { bull: 7, abs: 2, bear: 2 },
  };
}
