import type {
  InventoryIntegrityProjectionRegistry,
  InventoryIntegrityReadOnlyData,
} from "./inventoryIntegrityTypes";
import { getInventoryIntegrityProjection } from "./inventoryIntegrityProjectionService";
import {
  createInventoryIntegrityStaticMockSource,
  getInventoryIntegrityProjectionRegistry,
} from "./inventoryIntegritySource";

const inventoryIntegrityMockData: InventoryIntegrityReadOnlyData = {
  summaries: [
    {
      label: "真実データ",
      value: "inventory_transactions",
      level: "stable",
      status: "compare_ready",
      description:
        "inventory_transactions が在庫の真実(truth)です。inventory_current は比較対象の表示用 cache です。",
    },
    {
      label: "比較範囲",
      value: "static mock",
      level: "watch",
      status: "compare_ready",
      description:
        "inventory_current と inventory_transactions 集計の将来比較を静的に整理します。",
    },
    {
      label: "再構築ステータス",
      value: "未実装",
      level: "limited",
      status: "review_needed",
      description:
        "再構築(rebuild)、replay、correction はこの参照表示の対象外です。",
    },
  ],
  issues: [
    {
      id: "inventory-integrity-projection-gap",
      level: "limited",
      status: "projection_gap",
      title: "差異候補",
      description:
        "将来の比較で、inventory_current と transaction 由来数量が一致しない可能性があります。",
      currentReadModelSignal: "inventory_current は古い cache の可能性があります。",
      transactionTruthSignal: "期待現在庫は inventory_transactions から導出します。",
    },
    {
      id: "inventory-integrity-source-gap",
      level: "watch",
      status: "source_gap",
      title: "transaction 網羅性の確認",
      description:
        "入庫 / 出庫 / 移動 / 調整が transaction として残っているかを確認する候補です。",
      currentReadModelSignal: "inventory_current だけでは履歴の網羅性を証明できません。",
      transactionTruthSignal: "inventory_transactions が数量移動の監査証跡(audit trail)です。",
    },
    {
      id: "inventory-integrity-rebuild-boundary",
      level: "degraded",
      status: "review_needed",
      title: "再構築(rebuild)は実行不可",
      description:
        "この画面は将来の再構築判断材料を説明しても、rebuild、replay、correction は実行しません。",
      currentReadModelSignal: "inventory_current は表示用のままです。",
      transactionTruthSignal: "inventory_transactions が将来の説明に使う唯一の truth input です。",
    },
  ],
  signals: [
    {
      id: "inventory-integrity-read-only",
      level: "stable",
      label: "参照のみ(READ ONLY)",
      value: "更新なし",
      note: "inventory_current 更新、transaction 書換、再構築(rebuild)、replay、correction はできません。",
    },
    {
      id: "inventory-integrity-compare-only",
      level: "watch",
      label: "比較は表示のみ",
      value: "静的表示",
      note: "比較(compare)の意味を説明するだけで、live data への比較は実行しません。",
    },
    {
      id: "inventory-integrity-truth",
      level: "stable",
      label: "真実データ境界",
      value: "transactions",
      note: "inventory_transactions が truth で、inventory_current は比較対象の表示用 cache です。",
    },
  ],
  compareProjections: [
    {
      id: "inventory-compare-part-location-gap",
      scope: "location",
      label: "部品・棚別の数量差異",
      description:
        "部品・棚単位で inventory_current と transaction 集計を将来どう比較するかを静的に説明します。",
      metadata: {
        identity: {
          projectionId: "inventory-compare-part-location-gap",
          projectionType: "compare_projection",
          projectionVersion: "static-b37-02",
          scope: "location",
          generatedAt: "static mock",
          contractVersion: "inventory-integrity-projection-contract",
        },
        snapshot: {
          snapshotId: "snapshot-part-location-static",
          asOfTime: "static mock",
          observedAt: "static mock",
          transactionCoverage: "partial",
          freshness: "unknown",
          limitation: "static mock のため、実データ snapshot や live freshness は確認していません。",
        },
        evidence: {
          source: {
            source: "inventory_transactions",
            label: "transaction truth",
            semanticMeaning:
              "入出庫・移動・調整の履歴から差異理由を説明するための truth source です。",
          },
          confidence: {
            level: "medium",
            reason: "transaction 集計と cache 差異の説明材料はありますが、live resolution はありません。",
            caveat: "medium confidence は正しさ保証や実行許可ではありません。",
          },
          freshness: {
            level: "unknown",
            reason: "live compare や Supabase fetch を行っていない静的 projection です。",
            caveat: "鮮度は確認制限であり、rebuild や compare execution の開始条件ではありません。",
          },
          completeness: {
            level: "partial",
            scope: "部品・棚別の差異説明に必要な mock evidence metadata の範囲",
            caveat: "一部の説明材料のみであり、正しさ保証や自動補完ではありません。",
          },
          gaps: [
            {
              id: "metadata-evidence-gap-live-resolution",
              label: "live resolution 未実装",
              reason: "現在は static mock のため、実データの証跡解決は行いません。",
              limitation: "この gap は review limitation であり、auto-fix や rebuild の根拠ではありません。",
            },
          ],
          semanticBoundary: "reasoning_visualization_only",
          executionBoundary:
            "metadata は説明表示のみです。evidence execution、rebuild、replay、correction は実行しません。",
        },
        confidence: {
          level: "medium",
          reason: "差異理由と由来 metadata はありますが、live evidence resolution は未実装です。",
          caveat: "説明可能性の目安であり、truth guarantee ではありません。",
        },
        freshness: {
          level: "unknown",
          reason: "live compare や Supabase fetch を行っていない静的 projection です。",
          caveat: "鮮度は確認制限であり、rebuild や compare execution の開始条件ではありません。",
        },
        completeness: {
          level: "partial",
          scope: "部品・棚別の差異説明に必要な mock metadata の範囲",
          caveat: "一部の説明材料のみであり、正しさ保証や自動補完ではありません。",
        },
        traceability: {
          sourceTraceLabel: "inventory_transactions truth と inventory_current cache の比較由来",
          sourceChain: ["inventory_transactions", "inventory_current", "static compare projection"],
          caveat: "source chain は追跡用の読み方であり、execution chain ではありません。",
        },
        lineage: {
          lineageLabel: "部品・棚別 compare projection lineage",
          derivedFrom: ["transaction 集計", "表示用 cache", "部品 + 棚の範囲"],
          caveat: "lineage は由来説明であり、因果確定や修正権限ではありません。",
        },
        reviewReadiness: {
          level: "partially_ready",
          reason: "差異理由と由来 metadata はありますが、live evidence resolution は未実装です。",
          caveat: "一部レビュー可能な状態であり、承認可能や実行可能ではありません。",
        },
        lifecycle: {
          state: "projection_review_required",
          label: "確認が必要な projection",
          readability:
            "差異候補と制限付き metadata があるため、人が確認する対象として読む lifecycle state です。",
          interpretation:
            "review required は確認観点であり、承認、rebuild、correction、workflow 開始を意味しません。",
          semanticBoundary: "reasoning_visualization_only",
          executionBoundary:
            "lifecycle semantics は lifecycle engine ではありません。compare execution、rebuild、replay、correction、mutation は実行しません。",
        },
        semanticBoundary: "reasoning_visualization_only",
        executionBoundary:
          "説明表示のみです。live compare、rebuild、replay、correction、在庫更新は実行しません。",
      },
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
          label: "部品・棚別の比較トレース(trace)",
        },
        derivedFrom: [
          {
            source: "inventory_transactions",
            label: "transaction 集計",
            semanticMeaning: "入出庫・移動・調整の履歴から将来導出する truth quantity です。",
          },
          {
            source: "inventory_current",
            label: "表示用 cache",
            semanticMeaning: "比較対象の cache であり、truth ではありません。",
          },
        ],
        dependencies: [
          {
            id: "dependency-part-location-scope",
            label: "部品 + 棚の範囲",
            semanticMeaning: "差異理由を部品・棚単位で説明するための静的な依存関係です。",
          },
        ],
        evidence: [
          {
            id: "evidence-cache-gap",
            label: "cache 差異の証跡",
            semanticMeaning: "表示用 cache 差異の可能性を示す説明用証跡です。",
          },
        ],
        semanticBoundary: "reasoning_visualization_only",
      },
      truthStatement:
        "inventory_transactions 集計が truth input で、inventory_current は比較対象の cache です。",
    },
    {
      id: "inventory-compare-project-scope-gap",
      scope: "project",
      label: "project_no 別の数量差異",
      description:
        "project_no 単位で表示用 cache と transaction 集計を将来どう比較するかを静的に説明します。",
      metadata: {
        identity: {
          projectionId: "inventory-compare-project-scope-gap",
          projectionType: "compare_projection",
          projectionVersion: "static-b37-02",
          scope: "project",
          generatedAt: "static mock",
          contractVersion: "inventory-integrity-projection-contract",
        },
        snapshot: {
          snapshotId: "snapshot-project-scope-static",
          asOfTime: "static mock",
          observedAt: "static mock",
          transactionCoverage: "unknown",
          freshness: "unknown",
          limitation: "未比較 mock のため、snapshot coverage は確認していません。",
        },
        evidence: {
          source: {
            source: "static_policy",
            label: "静的 policy 証跡",
            semanticMeaning:
              "未比較状態を正しさと誤読しないための静的な説明 source です。",
          },
          confidence: {
            level: "unknown",
            reason: "live compare を実行していないため、実データ根拠の信頼度は判断できません。",
            caveat: "unknown confidence は safe 判定や無視可能を意味しません。",
          },
          freshness: {
            level: "unknown",
            reason: "差異 0 は live freshness ではなく、未比較状態を示す static policy です。",
            caveat: "unknown freshness は safe 判定や compare completion ではありません。",
          },
          completeness: {
            level: "missing",
            scope: "project_no compare の live evidence / source coverage",
            caveat: "不足は取得指示ではなく、review limitation です。",
          },
          gaps: [
            {
              id: "metadata-evidence-gap-not-compared",
              label: "未比較 gap",
              reason: "live compare を実行していないため、実際の一致は確認していません。",
              limitation: "差異 0 表示を safe 判定や完了判定として扱わないでください。",
            },
          ],
          semanticBoundary: "reasoning_visualization_only",
          executionBoundary:
            "metadata は説明表示のみです。evidence execution、compare execution、rebuild は実行しません。",
        },
        confidence: {
          level: "unknown",
          reason: "live compare と evidence resolution がないため、実データ review の材料が不足しています。",
          caveat: "不明は安全保証や正しさ保証ではありません。",
        },
        freshness: {
          level: "unknown",
          reason: "差異 0 は live freshness ではなく、未比較状態を示す static policy です。",
          caveat: "unknown freshness は safe 判定や compare completion ではありません。",
        },
        completeness: {
          level: "missing",
          scope: "project_no compare の live evidence / source coverage",
          caveat: "不足は取得指示ではなく、review limitation です。",
        },
        traceability: {
          sourceTraceLabel: "static policy 由来の未比較説明",
          sourceChain: ["static_policy", "static compare projection"],
          caveat: "未比較の traceability は replay eligibility ではありません。",
        },
        lineage: {
          lineageLabel: "project_no compare projection lineage",
          derivedFrom: ["未比較 policy", "project_no の範囲"],
          caveat: "差異 0 の lineage は正しさ保証ではありません。",
        },
        reviewReadiness: {
          level: "not_ready",
          reason: "live compare と evidence resolution がないため、実データ review の材料が不足しています。",
          caveat: "レビュー未準備であり、correction や rebuild の指示ではありません。",
        },
        lifecycle: {
          state: "projection_created",
          label: "作成済み未比較 projection",
          readability:
            "static projection として作成済みですが、live compare や evidence resolution は未実行として読む lifecycle state です。",
          interpretation:
            "created は存在確認であり、正しさ、比較完了、レビュー可能、実行許可を意味しません。",
          semanticBoundary: "reasoning_visualization_only",
          executionBoundary:
            "lifecycle semantics は lifecycle engine ではありません。query 実行、compare execution、rebuild、mutation は実行しません。",
        },
        semanticBoundary: "reasoning_visualization_only",
        executionBoundary:
          "比較の意味を説明するだけです。Supabase query や比較処理は実行しません。",
      },
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
          label: "project_no の比較トレース(trace)",
        },
        derivedFrom: [
          {
            source: "static_policy",
            label: "未比較 policy",
            semanticMeaning: "まだ live compare していないことを示す静的 policy 由来の表示です。",
          },
        ],
        dependencies: [
          {
            id: "dependency-project-scope",
            label: "project_no の範囲",
            semanticMeaning: "project_no 単位の比較境界を説明するための依存関係です。",
          },
        ],
        evidence: [
          {
            id: "evidence-not-compared",
            label: "未比較の証跡",
            semanticMeaning: "差異 0 は正しさの証明ではなく、未実行 mock であることの証跡です。",
          },
        ],
        semanticBoundary: "reasoning_visualization_only",
      },
      truthStatement:
        "この mock の差異 0 は正しさの証明ではありません。inventory_transactions が truth です。",
    },
    {
      id: "inventory-compare-inventory-type-gap",
      scope: "inventory_type",
      label: "在庫種別境界の数量差異",
      description:
        "project / mrp の在庫種別境界を、再構築判断ではなく確認材料として静的に説明します。",
      metadata: {
        identity: {
          projectionId: "inventory-compare-inventory-type-gap",
          projectionType: "compare_projection",
          projectionVersion: "static-b37-02",
          scope: "inventory_type",
          generatedAt: "static mock",
          contractVersion: "inventory-integrity-projection-contract",
        },
        snapshot: {
          snapshotId: "snapshot-inventory-type-static",
          asOfTime: "static mock",
          observedAt: "static mock",
          transactionCoverage: "partial",
          freshness: "stale",
          limitation: "在庫種別境界の source coverage は static mock の範囲に限定されています。",
        },
        evidence: {
          source: {
            source: "lineage_projection",
            label: "差異由来(lineage)証跡",
            semanticMeaning:
              "project / mrp 境界と集計範囲の関係を説明する lineage 由来の証跡です。",
          },
          confidence: {
            level: "low",
            reason: "在庫種別境界の live evidence resolution がなく、説明材料に制限があります。",
            caveat: "low confidence は誤り確定や correction required ではありません。",
          },
          freshness: {
            level: "stale",
            reason: "静的な境界説明であり、最新 transaction 反映とは限りません。",
            caveat: "stale は確認制限であり、rebuild required ではありません。",
          },
          completeness: {
            level: "partial",
            scope: "inventory_type 境界の静的 evidence metadata",
            caveat: "partial は見えている範囲の制限であり、missing action required ではありません。",
          },
          gaps: [
            {
              id: "metadata-evidence-gap-boundary-resolution",
              label: "境界解決不足",
              reason: "inventory_type 境界の live evidence resolution は未実装です。",
              limitation: "証跡不足は review limitation であり、rebuild や auto-fix の根拠ではありません。",
            },
          ],
          semanticBoundary: "reasoning_visualization_only",
          executionBoundary:
            "metadata は説明表示のみです。監査開始、correction、rebuild、replay は実行しません。",
        },
        confidence: {
          level: "low",
          reason: "在庫種別境界の説明材料はありますが、live evidence resolution はありません。",
          caveat: "低い説明可能性は誤り確定や修正指示ではありません。",
        },
        freshness: {
          level: "stale",
          reason: "静的な境界説明であり、最新 transaction 反映とは限りません。",
          caveat: "stale は確認制限であり、rebuild required ではありません。",
        },
        completeness: {
          level: "partial",
          scope: "inventory_type 境界の静的説明 metadata",
          caveat: "partial は見えている範囲の制限であり、missing action required ではありません。",
        },
        traceability: {
          sourceTraceLabel: "在庫種別境界の transaction / cache / lineage 由来",
          sourceChain: ["inventory_transactions", "inventory_current", "lineage_projection"],
          caveat: "traceability は由来追跡であり、causal proof ではありません。",
        },
        lineage: {
          lineageLabel: "inventory_type compare projection lineage",
          derivedFrom: ["在庫種別別 transaction 集計", "在庫種別別 cache", "project / mrp 境界"],
          caveat: "lineage gap は review limitation であり、correction 指示ではありません。",
        },
        reviewReadiness: {
          level: "partially_ready",
          reason: "在庫種別境界の説明材料はありますが、live evidence resolution はありません。",
          caveat: "一部レビュー可能な状態であり、監査開始や修正指示ではありません。",
        },
        lifecycle: {
          state: "projection_stale",
          label: "鮮度制限あり projection",
          readability:
            "静的な境界説明であり、最新 transaction 反映とは限らない stale lifecycle state として読みます。",
          interpretation:
            "stale は確認制限であり、rebuild required、correction required、workflow 開始を意味しません。",
          semanticBoundary: "reasoning_visualization_only",
          executionBoundary:
            "lifecycle semantics は lifecycle engine ではありません。refresh、rebuild、replay、correction、mutation は実行しません。",
        },
        semanticBoundary: "reasoning_visualization_only",
        executionBoundary:
          "rebuild、replay、correction は行いません。境界確認は参照用 metadata として表示します。",
      },
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
          label: "在庫種別の比較トレース(trace)",
        },
        derivedFrom: [
          {
            source: "inventory_transactions",
            label: "在庫種別別 transaction 集計",
            semanticMeaning: "inventory_type 境界で将来集計される transaction truth です。",
          },
          {
            source: "inventory_current",
            label: "在庫種別別 cache",
            semanticMeaning: "inventory_type 別の比較対象 cache です。",
          },
        ],
        dependencies: [
          {
            id: "dependency-inventory-type-boundary",
            label: "project / mrp 境界",
            semanticMeaning: "在庫種別境界の取り違えを説明するための依存関係です。",
          },
        ],
        evidence: [
          {
            id: "evidence-aggregation-boundary",
            label: "集計境界の証跡",
            semanticMeaning: "集計範囲の差異を確認するための静的証跡です。",
          },
        ],
        semanticBoundary: "reasoning_visualization_only",
      },
      truthStatement:
        "inventory_type 別に見ても inventory_current は truth ではありません。transaction 集計が期待数量を定義します。",
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
        "inventory_current と inventory_transactions 集計の差異が +2 で、cache 差異の可能性があります。",
      reviewFocus:
        "部品番号・棚・直近の入出庫/移動 transaction を確認し、inventory_current を truth と誤読しないこと。",
      escalation: {
        candidate: "manager_review_candidate",
        label: "所長確認候補",
        semanticMeaning:
          "現場説明が必要になる可能性を示す確認ルート候補です。担当割当ではありません。",
        executionBoundary:
          "エスカレーション、通知、担当割当、修正処理は実行しません。",
      },
      reviewSignals: [
        {
          id: "review-signal-cache-gap",
          label: "cache 差異の要確認",
          reason: "表示用 cache と transaction truth の差異が見える可能性があります。",
          evidenceHint: "差異由来(lineage)の cache 差異証跡と部品・棚の依存関係を確認します。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "確認優先度の説明表示のみです。attention execution、通知、担当割当、比較実行、rebuild、replay、correction は実行しません。",
    },
    {
      id: "inventory-attention-project-scope-gap",
      projectionId: "inventory-compare-project-scope-gap",
      attentionLevel: "reference",
      reviewPriority: "low",
      title: "project_no 境界の参考確認",
      reason:
        "差異 0 の mock は正しさの証明ではなく、未比較状態を説明するための参考シグナルです。",
      reviewFocus:
        "project_no の範囲が比較対象として理解できるかを確認します。safe 判定ではありません。",
      escalation: {
        candidate: "none",
        label: "エスカレーションなし",
        semanticMeaning:
          "現時点では監査・所長確認候補ではなく、理解補助の注意シグナルです。",
        executionBoundary:
          "通知、担当割当、完了処理、safe 判定は行いません。",
      },
      reviewSignals: [
        {
          id: "review-signal-not-compared",
          label: "未比較の注意シグナル",
          reason: "差異 0 が正しさの保証に見えないようにするためのシグナルです。",
          evidenceHint: "未比較の証跡と static policy 由来を確認します。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "確認優先度の説明表示のみです。attention execution、通知、担当割当、比較実行、rebuild、replay、correction は実行しません。",
    },
    {
      id: "inventory-attention-inventory-type-gap",
      projectionId: "inventory-compare-inventory-type-gap",
      attentionLevel: "tracking_required",
      reviewPriority: "medium",
      title: "在庫種別境界の要追跡",
      reason:
        "project / mrp 境界で transaction 集計差異が見える可能性があります。",
      reviewFocus:
        "在庫種別の取り違え、集計範囲、transaction truth の由来を確認します。",
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
          label: "在庫種別境界シグナル",
          reason: "inventory_type 境界の差異理由を優先して読むためのシグナルです。",
          evidenceHint: "集計境界の証跡と project / mrp 依存関係を確認します。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "確認優先度の説明表示のみです。attention execution、通知、担当割当、比較実行、rebuild、replay、correction は実行しません。",
    },
  ],
  evidenceProjections: [
    {
      id: "inventory-evidence-part-location-gap",
      projectionId: "inventory-compare-part-location-gap",
      attentionId: "inventory-attention-part-location-gap",
      title: "部品・棚別差異の証跡",
      metadata: {
        source: {
          source: "inventory_transactions",
          label: "transaction truth",
          semanticMeaning:
            "入出庫・移動・調整の履歴から差異理由を説明するための truth source です。",
        },
        confidence: {
          level: "medium",
          reason: "inventory_transactions 集計と inventory_current cache の差異を説明する根拠候補です。",
          caveat: "medium confidence は正しさ保証や実行許可ではありません。",
        },
        freshness: {
          level: "unknown",
          reason: "static mock のため、実データ証跡の鮮度は確認していません。",
          caveat: "unknown freshness は safe 判定ではありません。",
        },
        completeness: {
          level: "partial",
          scope: "部品・棚別差異の static evidence",
          caveat: "partial evidence は補完指示ではありません。",
        },
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
          "証跡と説明の表示のみです。evidence execution、auto-fix、rebuild、replay、correction、通知、担当割当は実行しません。",
      },
      source: {
        source: "inventory_transactions",
        label: "transaction truth",
        semanticMeaning:
          "入出庫・移動・調整の履歴から差異理由を説明するための truth source です。",
      },
      confidence: "medium",
      quality: "partial",
      explanation:
        "inventory_transactions 集計と inventory_current cache の差異を説明する根拠候補です。",
      rationale:
        "数量差 +2 は cache 差異の可能性を示しますが、live evidence resolution は行っていません。",
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
        "証跡と説明の表示のみです。evidence execution、auto-fix、rebuild、replay、correction、通知、担当割当は実行しません。",
    },
    {
      id: "inventory-evidence-project-scope-gap",
      projectionId: "inventory-compare-project-scope-gap",
      attentionId: "inventory-attention-project-scope-gap",
      title: "project_no 境界の参考証跡",
      metadata: {
        source: {
          source: "static_policy",
          label: "静的 policy 証跡",
          semanticMeaning:
            "未比較状態を正しさと誤読しないための静的な説明 source です。",
        },
        confidence: {
          level: "unknown",
          reason: "project_no 範囲の live compare は実行していません。",
          caveat: "unknown confidence は安全保証ではありません。",
        },
        freshness: {
          level: "unknown",
          reason: "未比較状態を示す static evidence です。",
          caveat: "unknown freshness は compare completion ではありません。",
        },
        completeness: {
          level: "missing",
          scope: "project_no 境界の live evidence",
          caveat: "missing evidence は fetch / upload 指示ではありません。",
        },
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
          "証跡と説明の表示のみです。evidence execution、auto-fix、rebuild、replay、correction、通知、担当割当は実行しません。",
      },
      source: {
        source: "static_policy",
        label: "静的 policy 証跡",
        semanticMeaning:
          "未比較状態を正しさと誤読しないための静的な説明 source です。",
      },
      confidence: "unknown",
      quality: "limited",
      explanation:
        "差異 0 の mock は正しさの保証ではなく、未実行であることを説明します。",
      rationale:
        "project_no 範囲の読み方を補助しますが、live compare や evidence resolution はしていません。",
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
        "証跡と説明の表示のみです。evidence execution、auto-fix、rebuild、replay、correction、通知、担当割当は実行しません。",
    },
    {
      id: "inventory-evidence-inventory-type-gap",
      projectionId: "inventory-compare-inventory-type-gap",
      attentionId: "inventory-attention-inventory-type-gap",
      title: "在庫種別境界の証跡不足",
      metadata: {
        source: {
          source: "lineage_projection",
          label: "差異由来(lineage)証跡",
          semanticMeaning:
            "project / mrp 境界と集計範囲の関係を説明する lineage 由来の証跡です。",
        },
        confidence: {
          level: "low",
          reason: "在庫種別境界の live evidence resolution は未実装です。",
          caveat: "low confidence は誤り確定ではありません。",
        },
        freshness: {
          level: "stale",
          reason: "静的な lineage evidence であり、最新 transaction 反映とは限りません。",
          caveat: "stale は確認制限であり、rebuild required ではありません。",
        },
        completeness: {
          level: "missing",
          scope: "在庫種別境界の live evidence resolution",
          caveat: "missing evidence は correction 指示ではありません。",
        },
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
          "証跡と説明の表示のみです。evidence execution、auto-fix、rebuild、replay、correction、通知、担当割当は実行しません。",
      },
      source: {
        source: "lineage_projection",
        label: "差異由来(lineage)証跡",
        semanticMeaning:
          "project / mrp 境界と集計範囲の関係を説明する lineage 由来の証跡です。",
      },
      confidence: "low",
      quality: "missing",
      explanation:
        "在庫種別境界の差異理由を追跡するには追加の実データ確認が必要です。",
      rationale:
        "集計境界の証跡は静的説明であり、監査開始や correction 判断ではありません。",
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
        "証跡と説明の表示のみです。evidence execution、auto-fix、rebuild、replay、correction、通知、担当割当は実行しません。",
    },
  ],
  sourceMappings: [
    {
      id: "inventory-source-transactions-truth",
      projectionId: "inventory-compare-part-location-gap",
      sourceType: "transaction_truth",
      relation: "truth_source",
      confidence: "high",
      label: "transaction truth source",
      sourceName: "inventory_transactions",
      explanation:
        "入出庫・移動・調整の履歴から期待現在庫を導出する由来データです。在庫の truth として扱います。",
      gaps: [],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "由来データ(source mapping)は説明表示のみです。source execution、compare execution、rebuild、replay、correction は実行しません。",
    },
    {
      id: "inventory-source-current-cache",
      projectionId: "inventory-compare-part-location-gap",
      sourceType: "current_cache",
      relation: "compare_target",
      confidence: "medium",
      label: "比較対象 cache",
      sourceName: "inventory_current",
      explanation:
        "inventory_current は比較対象の表示用 cache です。truth ではなく、差異確認の対象として表示します。",
      gaps: [
        {
          id: "source-gap-cache-freshness",
          label: "cache 鮮度 gap",
          reason: "inventory_current の鮮度はこの static mock では確認していません。",
          limitation: "cache gap は説明用であり、更新や再構築の開始条件ではありません。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "由来データ(source mapping)は説明表示のみです。source execution、compare execution、rebuild、replay、correction は実行しません。",
    },
    {
      id: "inventory-source-lineage-evidence",
      projectionId: "inventory-compare-inventory-type-gap",
      sourceType: "lineage_metadata",
      relation: "derived_context",
      confidence: "low",
      label: "差異由来 metadata",
      sourceName: "差異由来(lineage)表示モデル",
      explanation:
        "project / mrp 境界と集計範囲の由来を説明する metadata です。source data の変更根拠ではありません。",
      gaps: [
        {
          id: "source-gap-lineage-resolution",
          label: "由来解決不足",
          reason: "lineage は静的表示で、由来データ解決(source trace resolution)は行っていません。",
          limitation: "由来不足は review limitation であり、source 修正や correction を開始しません。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "由来データ(source mapping)は説明表示のみです。source execution、compare execution、rebuild、replay、correction は実行しません。",
    },
    {
      id: "inventory-source-static-policy",
      projectionId: "inventory-compare-project-scope-gap",
      sourceType: "static_policy",
      relation: "limitation_context",
      confidence: "unknown",
      label: "未比較 policy source",
      sourceName: "static policy",
      explanation:
        "差異 0 を safe 判定と誤読しないための静的な説明 source です。実データ一致の証明ではありません。",
      gaps: [
        {
          id: "source-gap-live-compare",
          label: "live compare 未実装",
          reason: "Supabase や API に接続していないため、実データの由来データ(source trace)は解決していません。",
          limitation: "未実行 gap は説明用であり、通知、担当割当、比較実行には接続しません。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "由来データ(source mapping)は説明表示のみです。source execution、compare execution、rebuild、replay、correction は実行しません。",
    },
  ],
};

const inventoryIntegrityMockSource = createInventoryIntegrityStaticMockSource(
  inventoryIntegrityMockData,
);

export function getInventoryIntegrityMockData(): InventoryIntegrityReadOnlyData {
  return getInventoryIntegrityProjection(inventoryIntegrityMockSource).data;
}

export function getInventoryIntegrityMockProjectionRegistry(): InventoryIntegrityProjectionRegistry {
  return getInventoryIntegrityProjectionRegistry(inventoryIntegrityMockSource);
}
