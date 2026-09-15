# 製品AIモデル決定

2026-09-15、指揮元経由のユーザー確定指示。CODEX_AI_MODEL=gpt-5.6-luna。精度を理由に担当側で別モデル・用途別モデルへ変更しない。推論強度も追加指定しない。

実行例: mise exec -- env CODEX_AI_MODEL=gpt-5.6-luna bun run start

SDK実応答: live-sdk.json、CLI実応答: live-ephemeral.json。いずれも本人データを含まない合成mapstyle入力。実応答の精度判断はユーザーへ返す。
