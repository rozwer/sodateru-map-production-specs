# Provider Schema互換修正

PILGRIMAGE実SDKで invalid_json_schema / HTTP400 / orderedRelationIds uniqueItems is not permitted を担当が確認した（Issue #7）。共通providerへ送るcloneだけからarrayのuniqueItemsを除き、実行器の元Schemaによる結果検証は保持する。

限定回帰は修正前1失敗→修正後2成功。元Schemaで重複配列が拒否されること、uniqueItemsという通常プロパティが保持されることを確認。追加の実AI呼出は実施していない。

正式main起動の別障害はlive-engine.jsonに記録：本人session成功後、GET /me/settingsが共通契約未生成で404。COREへIssue #3コメント5674259467で共有済み。MAP-CUSTOM実Luna保存・再起動成功の証拠はPR133のdocs/evidence/MAP-CUSTOM/live-ai-http.json（正式main未確認と区別）。
