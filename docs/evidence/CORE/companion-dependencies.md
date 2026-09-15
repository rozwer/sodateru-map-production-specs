# COMPANION用の共通依存追加

2026-09-15、CORE #3 / COMPANION #35。起点 `97f4d1a`。

package.jsonとbun.lockへsharp `0.35.4`を完全一致で追加した。PNG/WebPの実decodeに使用する。[sharp導入仕様](https://sharp.pixelplumbing.com/install/)のNode >=20.9条件は固定Node 22.22.1で満たす。ZIP展開はCOMPANION担当がNode標準のnode:zlibで扱うため、新しいZIP依存は追加しない。

```sh
mise exec -- bun install --frozen-lockfile
mise exec -- node docs/evidence/CORE/companion-dependencies.mjs
```

macOS arm64 / Node v22.22.1でPASS：

- PNG/WebPを実際にRGBA画素へdecodeし、元の2×2画素と一致。
- 不正画像を拒否。

既存依存の版は変更していない。sharpのplatform別optional dependencyはBunのlockへ保存した。他OSでのnative binary実行は未確認。

この確認は依存単体の証拠。相棒ZIPの正式manifest・v2全動作・サイズ上限・保存・UIはCOMPANION担当の受入に残る。COMPANION v0.1断片は今回の共有型へ取り込まず、v0.2補正版の通知を待つ。
