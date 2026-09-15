/** Controlled icon selection. Candidate IDs and glyphs come from the caller. */
import { useId, type ReactNode } from "react";
import { PluginGlyph } from "./PluginGlyph";
import type { PluginCardModel, PluginViewStatus } from "./view-model";
import { PluginStatus } from "./views";
import "./plugins.css";

export type PluginIconChoice = { id: string; label: string; icon: ReactNode };
export function PluginIconView({
  plugin,
  options,
  selected,
  onChange,
  onSave,
  onCancel,
  ...status
}: PluginViewStatus & {
  plugin: PluginCardModel;
  options: PluginIconChoice[];
  selected: string;
  onChange: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const current = options.find((option) => option.id === selected);
  return (
    <div className="plugin-page">
      <PluginStatus {...status} />
      <div className="plugin-feature-heading">
        <PluginGlyph kind={plugin.kind} />
        <div>
          <h2>{plugin.name}</h2>
          <p>地図に表示するアイコンを選びます。</p>
        </div>
      </div>
      <section className="plugin-card plugin-trial-card">
        <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <legend
            style={{ fontSize: "1.0625rem", fontWeight: 750, marginBottom: 16 }}
          >
            アイコンを選ぶ
          </legend>
          <div className="plugin-choice-cards">
            {options.map((option) => (
              <label key={option.id}>
                <input
                  type="radio"
                  name={id}
                  checked={selected === option.id}
                  onChange={() => onChange(option.id)}
                  disabled={status.busy}
                />
                <span
                  style={{ height: 64, display: "grid", placeItems: "center" }}
                >
                  {option.icon}
                </span>
                <strong>{option.label}</strong>
              </label>
            ))}
          </div>
        </fieldset>
      </section>
      <section
        className="plugin-card"
        style={{
          display: "grid",
          justifyItems: "center",
          gap: 14,
          padding: "26px 16px",
        }}
        aria-label="選んだアイコンのプレビュー"
      >
        <h3>地図で使うアイコン</h3>
        <span
          style={{
            width: 108,
            height: 108,
            borderRadius: 54,
            display: "grid",
            placeItems: "center",
            background: "var(--color-soft)",
            color: "var(--color-ink)",
          }}
        >
          {current?.icon}
        </span>
        <strong>{current?.label || "アイコンを選んでください"}</strong>
        <p className="plugin-subtle">
          保存するまで、現在のアイコンは変わりません。
        </p>
      </section>
      <div className="plugin-actions">
        <button
          type="button"
          className="plugin-button plugin-button--secondary"
          onClick={onCancel}
        >
          キャンセル
        </button>
        <button
          type="button"
          className="plugin-button"
          onClick={onSave}
          disabled={status.busy || !current}
        >
          保存する
        </button>
      </div>
    </div>
  );
}
