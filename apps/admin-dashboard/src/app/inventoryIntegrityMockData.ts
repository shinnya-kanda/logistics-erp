import type { InventoryIntegrityReadOnlyData } from "./inventoryIntegrityTypes";

const inventoryIntegrityMockData: InventoryIntegrityReadOnlyData = {
  summaries: [
    {
      label: "真実データ",
      value: "inventory_transactions",
      level: "stable",
      status: "compare_ready",
      description:
        "inventory_transactions が在庫の truth です。inventory_current は表示用 cache / read model です。",
    },
    {
      label: "比較範囲",
      value: "static mock",
      level: "watch",
      status: "compare_ready",
      description:
        "inventory_current と inventory_transactions aggregation の将来比較を静的に整理します。",
    },
    {
      label: "再構築ステータス",
      value: "未実装",
      level: "limited",
      status: "review_needed",
      description:
        "rebuild、replay、correction はこの read-only scaffold の対象外です。",
    },
  ],
  issues: [
    {
      id: "inventory-integrity-projection-gap",
      level: "limited",
      status: "projection_gap",
      title: "差異候補",
      description:
        "将来の compare で、inventory_current と transaction 由来数量が一致しない可能性があります。",
      currentReadModelSignal: "inventory_current は古い cache の可能性があります。",
      transactionTruthSignal: "expected current quantity は inventory_transactions から導出します。",
    },
    {
      id: "inventory-integrity-source-gap",
      level: "watch",
      status: "source_gap",
      title: "transaction 網羅性確認",
      description:
        "入庫 / 出庫 / 移動 / 調整が transaction として残っているかを確認する候補です。",
      currentReadModelSignal: "inventory_current だけでは event completeness を証明できません。",
      transactionTruthSignal: "inventory_transactions が数量移動の audit trail です。",
    },
    {
      id: "inventory-integrity-rebuild-boundary",
      level: "degraded",
      status: "review_needed",
      title: "rebuild 境界は実行不可",
      description:
        "この画面は将来の rebuild 判断材料を説明しても、rebuild、replay、correction は実行しません。",
      currentReadModelSignal: "inventory_current remains display-only.",
      transactionTruthSignal: "inventory_transactions が将来の reasoning に使う唯一の truth input です。",
    },
  ],
  signals: [
    {
      id: "inventory-integrity-read-only",
      level: "stable",
      label: "READ ONLY",
      value: "更新なし",
      note: "inventory_current 更新、transaction 書換、rebuild、replay、correction はできません。",
    },
    {
      id: "inventory-integrity-compare-only",
      level: "watch",
      label: "比較 semantics のみ",
      value: "静的表示",
      note: "compare の意味を説明するだけで、live data への比較は実行しません。",
    },
    {
      id: "inventory-integrity-truth",
      level: "stable",
      label: "truth 境界",
      value: "transactions",
      note: "inventory_transactions が truth で、inventory_current は projection / read model です。",
    },
  ],
  compareProjections: [
    {
      id: "inventory-compare-part-location-gap",
      scope: "location",
      label: "Part/location quantity comparison",
      description:
        "Static projection of how a future comparison could reason about inventory_current quantity by part and location.",
      difference: {
        currentReadModelQuantity: "120",
        transactionAggregationQuantity: "118",
        differenceQuantity: "+2",
        reason: "read_model_cache_gap",
        severity: "warning",
      },
      lineage: {
        trace: {
          traceId: "inventory-compare-trace-part-location-gap",
          parentTraceId: "static-inventory-integrity-parent-trace",
          label: "部品・棚別 compare trace",
        },
        derivedFrom: [
          {
            source: "inventory_transactions",
            label: "transaction aggregation",
            semanticMeaning: "入出庫・移動・調整の履歴から将来導出する truth quantity です。",
          },
          {
            source: "inventory_current",
            label: "read model cache",
            semanticMeaning: "比較対象の cache であり、truth ではありません。",
          },
        ],
        dependencies: [
          {
            id: "dependency-part-location-scope",
            label: "part_no + location_code scope",
            semanticMeaning: "差異理由を部品・棚単位で説明するための静的 dependency です。",
          },
        ],
        evidence: [
          {
            id: "evidence-cache-gap",
            label: "cache gap evidence",
            semanticMeaning: "read model cache gap の可能性を示す説明用証跡です。",
          },
        ],
        semanticBoundary: "reasoning_visualization_only",
      },
      truthStatement:
        "inventory_transactions aggregation is the truth input; inventory_current is the compare target/cache.",
      executionBoundary:
        "Reasoning visualization only. No live compare, rebuild, replay, correction, or inventory mutation is executed.",
    },
    {
      id: "inventory-compare-project-scope-gap",
      scope: "project",
      label: "Project scoped aggregation comparison",
      description:
        "Static projection of future project_no scoped comparison between read model and transaction aggregation.",
      difference: {
        currentReadModelQuantity: "64",
        transactionAggregationQuantity: "64",
        differenceQuantity: "0",
        reason: "not_compared",
        severity: "info",
      },
      lineage: {
        trace: {
          traceId: "inventory-compare-trace-project-scope-gap",
          parentTraceId: "static-inventory-integrity-parent-trace",
          label: "project_no compare trace",
        },
        derivedFrom: [
          {
            source: "static_policy",
            label: "compare policy placeholder",
            semanticMeaning: "まだ live compare していないことを示す静的 policy 由来の表示です。",
          },
        ],
        dependencies: [
          {
            id: "dependency-project-scope",
            label: "project_no scope",
            semanticMeaning: "project_no 単位の比較境界を説明するための dependency です。",
          },
        ],
        evidence: [
          {
            id: "evidence-not-compared",
            label: "not compared evidence",
            semanticMeaning: "差異 0 は正しさの証明ではなく、未実行 mock であることの証跡です。",
          },
        ],
        semanticBoundary: "reasoning_visualization_only",
      },
      truthStatement:
        "A zero difference in this mock does not prove correctness; transactions remain the source of truth.",
      executionBoundary:
        "Compare semantics only. This scaffold does not query Supabase or execute comparison logic.",
    },
    {
      id: "inventory-compare-inventory-type-gap",
      scope: "inventory_type",
      label: "Inventory type boundary comparison",
      description:
        "Static projection for future project / mrp inventory type boundary review before any rebuild reasoning.",
      difference: {
        currentReadModelQuantity: "31",
        transactionAggregationQuantity: "28",
        differenceQuantity: "+3",
        reason: "transaction_aggregation_gap",
        severity: "watch",
      },
      lineage: {
        trace: {
          traceId: "inventory-compare-trace-inventory-type-gap",
          parentTraceId: "static-inventory-integrity-parent-trace",
          label: "inventory_type compare trace",
        },
        derivedFrom: [
          {
            source: "inventory_transactions",
            label: "inventory type aggregation",
            semanticMeaning: "inventory_type 境界で将来集計される transaction truth です。",
          },
          {
            source: "inventory_current",
            label: "inventory type cache",
            semanticMeaning: "inventory_type 別の compare target/cache です。",
          },
        ],
        dependencies: [
          {
            id: "dependency-inventory-type-boundary",
            label: "project / mrp boundary",
            semanticMeaning: "在庫種別境界の取り違えを説明するための dependency です。",
          },
        ],
        evidence: [
          {
            id: "evidence-aggregation-boundary",
            label: "aggregation boundary evidence",
            semanticMeaning: "aggregation scope の差異を review するための静的証跡です。",
          },
        ],
        semanticBoundary: "reasoning_visualization_only",
      },
      truthStatement:
        "inventory_current is not truth even when grouped by inventory_type; transaction aggregation defines the expected quantity.",
      executionBoundary:
        "No rebuild/replay/correction. Boundary review is represented as read-only reasoning metadata.",
    },
  ],
  attentionProjections: [
    {
      id: "inventory-attention-part-location-gap",
      projectionId: "inventory-compare-part-location-gap",
      attentionLevel: "review_required",
      reviewPriority: "high",
      title: "部品・棚別差異の優先確認",
      reason:
        "inventory_current と inventory_transactions aggregation の差異が +2 で、cache gap の可能性があります。",
      reviewFocus:
        "部品番号・棚・直近の入出庫/移動 transaction を確認し、inventory_current を truth と誤読しないこと。",
      escalation: {
        candidate: "manager_review_candidate",
        label: "所長確認候補",
        semanticMeaning:
          "現場説明が必要になる可能性を示す review routing です。assignment ではありません。",
        executionBoundary:
          "エスカレーション、通知、担当割当、修正処理は実行しません。",
      },
      reviewSignals: [
        {
          id: "review-signal-cache-gap",
          label: "要確認 cache gap",
          reason: "read model cache と transaction truth の差異が見える可能性があります。",
          evidenceHint: "lineage の cache gap evidence と部品・棚 dependency を確認します。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "review prioritization only. No attention execution, notification, assignment, compare execution, rebuild, replay, or correction is executed.",
    },
    {
      id: "inventory-attention-project-scope-gap",
      projectionId: "inventory-compare-project-scope-gap",
      attentionLevel: "reference",
      reviewPriority: "low",
      title: "project_no 境界の参考確認",
      reason:
        "差異 0 の mock は正しさの証明ではなく、未比較状態を説明するための参考 signal です。",
      reviewFocus:
        "project_no scope が compare 対象として理解できるかを確認します。safe 判定ではありません。",
      escalation: {
        candidate: "none",
        label: "エスカレーションなし",
        semanticMeaning:
          "現時点では監査・所長確認候補ではなく、理解補助の attention です。",
        executionBoundary:
          "通知、担当割当、完了処理、safe 判定は行いません。",
      },
      reviewSignals: [
        {
          id: "review-signal-not-compared",
          label: "未比較の注意シグナル",
          reason: "差異 0 が correctness guarantee に見えないようにするための signal です。",
          evidenceHint: "not compared evidence と static policy 由来を確認します。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "review prioritization only. No attention execution, notification, assignment, compare execution, rebuild, replay, or correction is executed.",
    },
    {
      id: "inventory-attention-inventory-type-gap",
      projectionId: "inventory-compare-inventory-type-gap",
      attentionLevel: "tracking_required",
      reviewPriority: "medium",
      title: "在庫種別境界の要追跡",
      reason:
        "project / mrp 境界で transaction aggregation gap が見える可能性があります。",
      reviewFocus:
        "在庫種別の取り違え、aggregation scope、transaction truth の由来を確認します。",
      escalation: {
        candidate: "audit_review_candidate",
        label: "要監査候補",
        semanticMeaning:
          "監査観点で追跡が必要になる可能性を示す候補です。監査開始ではありません。",
        executionBoundary:
          "監査通知、担当割当、correction、rebuild、replay は実行しません。",
      },
      reviewSignals: [
        {
          id: "review-signal-inventory-type-boundary",
          label: "在庫種別 boundary signal",
          reason: "inventory_type 境界の差異理由を優先して読むための signal です。",
          evidenceHint: "aggregation boundary evidence と project / mrp dependency を確認します。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "review prioritization only. No attention execution, notification, assignment, compare execution, rebuild, replay, or correction is executed.",
    },
  ],
  evidenceProjections: [
    {
      id: "inventory-evidence-part-location-gap",
      projectionId: "inventory-compare-part-location-gap",
      attentionId: "inventory-attention-part-location-gap",
      title: "部品・棚別差異の証跡",
      source: {
        source: "inventory_transactions",
        label: "transaction truth",
        semanticMeaning:
          "入出庫・移動・調整の履歴から差異理由を説明するための truth source です。",
      },
      confidence: "medium",
      quality: "partial",
      explanation:
        "inventory_transactions aggregation と inventory_current cache の差異を説明する根拠候補です。",
      rationale:
        "数量差 +2 は cache gap の可能性を示しますが、live evidence resolution は行っていません。",
      gaps: [
        {
          id: "evidence-gap-live-resolution",
          label: "live resolution 未実装",
          reason: "現在は static mock のため、実データの証跡解決は行いません。",
          limitation: "この証跡は説明補助であり、正しさの確定や自動修正には使いません。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "Evidence/explainability only. No evidence execution, auto-fix, rebuild, replay, correction, notification, or assignment is executed.",
    },
    {
      id: "inventory-evidence-project-scope-gap",
      projectionId: "inventory-compare-project-scope-gap",
      attentionId: "inventory-attention-project-scope-gap",
      title: "project_no 境界の参考証跡",
      source: {
        source: "static_policy",
        label: "static policy evidence",
        semanticMeaning:
          "未比較状態を正しさと誤読しないための静的な説明 source です。",
      },
      confidence: "unknown",
      quality: "limited",
      explanation:
        "差異 0 の mock は correctness guarantee ではなく、未実行であることを説明します。",
      rationale:
        "project_no scope の読み方を補助しますが、live compare や evidence resolution はしていません。",
      gaps: [
        {
          id: "evidence-gap-not-compared",
          label: "未比較 gap",
          reason: "live compare を実行していないため、実際の一致は確認していません。",
          limitation: "差異 0 表示を safe 判定や完了判定として扱わないでください。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "Evidence/explainability only. No evidence execution, auto-fix, rebuild, replay, correction, notification, or assignment is executed.",
    },
    {
      id: "inventory-evidence-inventory-type-gap",
      projectionId: "inventory-compare-inventory-type-gap",
      attentionId: "inventory-attention-inventory-type-gap",
      title: "在庫種別境界の証跡不足",
      source: {
        source: "lineage_projection",
        label: "lineage evidence",
        semanticMeaning:
          "project / mrp 境界と aggregation scope の関係を説明する lineage 由来の証跡です。",
      },
      confidence: "low",
      quality: "missing",
      explanation:
        "在庫種別境界の差異理由を追跡するには追加の実データ確認が必要です。",
      rationale:
        "aggregation boundary evidence は静的説明であり、監査開始や correction 判断ではありません。",
      gaps: [
        {
          id: "evidence-gap-boundary-resolution",
          label: "境界解決不足",
          reason: "inventory_type 境界の live evidence resolution は未実装です。",
          limitation: "証跡不足は review limitation であり、rebuild や auto-fix の根拠ではありません。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "Evidence/explainability only. No evidence execution, auto-fix, rebuild, replay, correction, notification, or assignment is executed.",
    },
  ],
};

export function getInventoryIntegrityMockData(): InventoryIntegrityReadOnlyData {
  return inventoryIntegrityMockData;
}
