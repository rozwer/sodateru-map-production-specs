import { useEffect, useId, useRef, type ReactNode } from "react";
import { PluginGlyph } from "./PluginGlyph";
import { pluginMessages as m } from "./messages";
import type {
  PluginCardModel,
  PluginCategory,
  PluginConditionField,
  PluginConditionValue,
  PluginConflictSide,
  PluginPreview,
  PluginViewStatus,
} from "./view-model";
import "./plugins.css";

type ControlName =
  | "pin"
  | "map"
  | "settings"
  | "refresh"
  | "bulb"
  | "info"
  | "database"
  | "layers"
  | "person"
  | "calendar"
  | "document"
  | "arrow"
  | "play"
  | "trash"
  | "search"
  | "github"
  | "lock";
export function PluginControlIcon({ name }: { name: ControlName }) {
  const paths: Record<ControlName, ReactNode> = {
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    map: (
      <>
        <path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3ZM8 2v17m8-14v17" />
      </>
    ),
    settings: (
      <>
        <path d="M3 5h18M3 12h18M3 19h18" />
        <circle cx="8" cy="5" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="9" cy="19" r="2" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 9a8 8 0 1 0 0 6M20 3v6h-6" />
      </>
    ),
    bulb: (
      <>
        <path d="M8 16c0-3-3-4-3-8a7 7 0 0 1 14 0c0 4-3 5-3 8ZM9 19h6m-5 3h4M12 0v-2M1 6l-2-1m24 1 2-1" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 10v7m0-11v1" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 4 18 4 18 0V5M3 11c0 4 18 4 18 0M3 16c0 4 18 4 18 0" />
      </>
    ),
    layers: (
      <>
        <path d="m2 7 10-5 10 5-10 5Zm0 5 10 5 10-5M2 17l10 5 10-5" />
      </>
    ),
    person: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 22v-3a8 8 0 0 1 16 0v3Z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M7 1v6m10-6v6M3 10h18m-13 4h2m4 0h2m-8 4h2" />
      </>
    ),
    document: (
      <>
        <path d="M5 2h10l4 4v16H5Zm10 0v5h4M8 11h8m-8 4h8m-8 4h5" />
      </>
    ),
    arrow: <path d="m9 4 8 8-8 8" />,
    play: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 7 8 5-8 5Z" fill="currentColor" stroke="none" />
      </>
    ),
    trash: (
      <>
        <path d="M3 5h18M9 5V2h6v3M6 5v17h12V5M10 9v9m4-9v9" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15 15 6 6" />
      </>
    ),
    lock: <><rect x="5" y="10" width="14" height="12" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3" /></>,
    github: (
      <>
        <path d="M7 3v12a4 4 0 0 0 4 4h3a4 4 0 0 0 4-4V7" />
        <circle cx="7" cy="3" r="2" />
        <circle cx="18" cy="5" r="2" />
        <circle cx="7" cy="21" r="2" />
      </>
    ),
  };
  return (
    <svg
      className="plugin-control-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function PluginStatus({
  busy,
  busyLabel,
  error,
  notice,
  onRetry,
}: PluginViewStatus) {
  return (
    <>
      {busy && (
        <p className="plugin-status" role="status">
          {busyLabel || m.saving}
        </p>
      )}
      {error && (
        <div className="plugin-error" role="alert">
          <p>{error}</p>
          {onRetry && (
            <button
              type="button"
              className="plugin-button plugin-button--secondary"
              onClick={onRetry}
              disabled={busy}
            >
              {m.retry}
            </button>
          )}
        </div>
      )}
      {notice && (
        <p className="plugin-notice" role="status">
          {notice}
        </p>
      )}
    </>
  );
}

export function PreviewFrame({ map, caption, legend, mock }: PluginPreview) {
  return (
    <figure className="plugin-preview">
      <div className="plugin-preview-map">
        {map}
        {!!legend?.length && (
          <ul className="plugin-map-legend" aria-label="地図の凡例">
            {legend.map((item) => (
              <li key={item.id}>
                <span
                  style={{
                    borderColor: item.color,
                    borderStyle: item.dashed ? "dashed" : "solid",
                  }}
                />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {(caption || mock) && (
        <figcaption>
          {mock && <strong>{m.mock}</strong>}
          {caption && <span>{caption}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function FeatureHeading({
  plugin,
  large = false,
}: {
  plugin: PluginCardModel;
  large?: boolean;
}) {
  return (
    <div
      className={`plugin-feature-heading${large ? " plugin-feature-heading--large" : ""}`}
    >
      {plugin.displayIcon || <PluginGlyph kind={plugin.kind} />}
      <div>
        <h2>{plugin.name}</h2>
        <p>{plugin.description}</p>
      </div>
    </div>
  );
}

function Information({
  children,
  icon = "info",
}: {
  children: ReactNode;
  icon?: ControlName;
}) {
  return (
    <div className="plugin-information">
      <PluginControlIcon name={icon} />
      <div>{children}</div>
    </div>
  );
}

export function PluginStoreView({
  plugins,
  query,
  category,
  onQuery,
  onCategory,
  onOpen,
  onManage,
  onRequests,
  guideUrl,
  ...status
}: PluginViewStatus & {
  plugins: PluginCardModel[];
  query: string;
  category: PluginCategory;
  onQuery: (query: string) => void;
  onCategory: (category: PluginCategory) => void;
  onOpen: (id: string) => void;
  onManage: () => void;
  onRequests: () => void;
  guideUrl?: string;
}) {
  const inputId = useId();
  const visible = plugins.filter(
    (plugin) =>
      (category === "all" || plugin.category === category) &&
      `${plugin.name} ${plugin.description}`
        .toLocaleLowerCase("ja")
        .includes(query.trim().toLocaleLowerCase("ja")),
  );
  return (
    <div className="plugin-page plugin-store">
      <header className="plugin-store-heading">
        <h2>{m.storeHeading}</h2>
        <details className="plugin-development-guide">
          <summary><PluginControlIcon name="github" />開発ガイド</summary>
          <div><strong>自分のアイデアで地図を育てる</strong><p>まずは「お願い」から、ほしい機能を提案できます。</p><button type="button" onClick={onRequests}>お願いを書く・見る</button><a href={guideUrl || "https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/01_requirements/04_api/endpoints/07_plugins.md"} target="_blank" rel="noreferrer">拡張機能の仕様を読む ↗</a></div>
        </details>
      </header>
      <label className="plugin-search" htmlFor={inputId}>
        <PluginControlIcon name="search" />
        <span className="plugin-sr-only">{m.search}</span>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={m.search}
        />
      </label>
      <nav className="plugin-tabs" aria-label="拡張機能の操作">
        <button type="button" aria-current="page">
          {m.tabs.store}
        </button>
        <button type="button" onClick={onManage}>
          {m.tabs.installed}
        </button>
      </nav>
      <fieldset className="plugin-categories">
        <legend className="plugin-sr-only">分類で絞る</legend>
        {Object.entries(m.categories).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name={`${inputId}-category`}
              checked={category === value}
              onChange={() => onCategory(value as PluginCategory)}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <PluginStatus {...status} />
      <ul className="plugin-store-list">
        {visible.map((plugin) => (
          <li className="plugin-store-card" key={plugin.id}>
            <button
              type="button"
              className="plugin-store-open"
              onClick={() => onOpen(plugin.id)}
              aria-label={`${plugin.name}の詳細を見る`}
            >
              <PluginGlyph kind={plugin.kind} />
              <div className="plugin-store-copy">
                <h3>{plugin.name}</h3>
                <div className="plugin-badges">
                  {plugin.demo && <span>デモ</span>}
                  <span>
                    {plugin.installed
                      ? plugin.enabled
                        ? "導入済み・ON"
                        : "導入済み・OFF"
                      : m.notInstalled}
                  </span>
                </div>
                <p className="plugin-subtle">
                  {plugin.author && `提供者 ${plugin.author}`}
                  {plugin.versionLabel && ` ｜ ${plugin.versionLabel}`}
                </p>
                <p>{plugin.description}</p>
              </div>
              <PluginControlIcon name="arrow" />
              <div className="plugin-store-card-footer">
                <span>
                  <PluginControlIcon name="map" />
                  地図を育てるで使用
                </span>
                <span><PluginControlIcon name="lock" />{plugin.permissions.join("・")}</span>
                <strong>
                  {m.details} <PluginControlIcon name="arrow" />
                </strong>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {!visible.length && !status.busy && !status.error && (
        <p className="plugin-empty">{m.emptyStore}</p>
      )}
      <button className="plugin-guide" type="button" onClick={onRequests}>
        <PluginControlIcon name="bulb" />こんな機能がほしい・お願いを見る<PluginControlIcon name="arrow" />
      </button>
    </div>
  );
}

export function PluginDetailView({
  plugin,
  preview,
  onTry,
  ...status
}: PluginViewStatus & {
  plugin: PluginCardModel;
  preview: PluginPreview;
  onTry: () => void;
}) {
  return (
    <div className="plugin-page plugin-detail">
      <FeatureHeading plugin={plugin} large />
      <PreviewFrame {...preview} />
      <section className="plugin-capabilities">
        <PluginControlIcon name="bulb" />
        <div>
          <h3>{m.canDo}</h3>
          <p>{plugin.summary || plugin.description}</p>
        </div>
      </section>
      <dl className="plugin-facts">
        <div>
          <dt>
            <PluginControlIcon name="person" />
            {m.author}
          </dt>
          <dd>{plugin.author || m.missing}</dd>
        </div>
        <div>
          <dt>
            <PluginControlIcon name="calendar" />
            {m.updatedAt}
          </dt>
          <dd>{plugin.updatedAt || m.missing}</dd>
        </div>
        <div>
          <dt>
            <PluginControlIcon name="document" />
            {m.description}
          </dt>
          <dd>{plugin.description}</dd>
        </div>
        {plugin.sources?.map((source) => (
          <div key={source.id}>
            <dt>
              <PluginControlIcon name="database" />
              出典
            </dt>
            <dd>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              ) : (
                source.title
              )}
              {source.updatedAt && <small>（{source.updatedAt}）</small>}
            </dd>
          </div>
        ))}
      </dl>
      <PluginStatus {...status} />
      <button
        type="button"
        className="plugin-button"
        onClick={onTry}
        disabled={status.busy}
      >
        {m.try}
        <PluginControlIcon name="arrow" />
      </button>
    </div>
  );
}

export function PluginConditions({
  fields,
  onChange,
  busy,
}: {
  fields: PluginConditionField[];
  onChange: (id: string, value: string | boolean) => void;
  busy?: boolean;
}) {
  const idPrefix = useId();
  return (
    <div className="plugin-conditions">
      {fields.map((field, index) => (
        <div
          className={`plugin-condition plugin-condition--${field.type}`}
          key={field.id}
        >
          {field.type === "choice" ? (
            <fieldset disabled={busy || field.disabled}>
              <legend>{field.label}</legend>
              {field.help && <p>{field.help}</p>}
              <div className="plugin-choice-cards">
                {field.options?.map((option) => (
                  <label key={option.value}>
                    <input
                      type="radio"
                      name={`${idPrefix}-${field.id}`}
                      value={option.value}
                      checked={field.value === option.value}
                      onChange={() => onChange(field.id, option.value)}
                    />
                    <span>
                      <PluginGlyph kind="bike" />
                      <strong>{option.label}</strong>
                      {option.detail && <small>{option.detail}</small>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : field.type === "boolean" ? (
            <label
              className="plugin-switch-row"
              htmlFor={`${idPrefix}-${field.id}`}
            >
              <span>
                <strong>{field.label}</strong>
                {field.help && <small>{field.help}</small>}
              </span>
              <span className="plugin-switch">
                <input
                  id={`${idPrefix}-${field.id}`}
                  type="checkbox"
                  checked={Boolean(field.value)}
                  disabled={busy || field.disabled}
                  onChange={(event) => onChange(field.id, event.target.checked)}
                />
                <span aria-hidden="true" />
              </span>
            </label>
          ) : (
            <>
              <label
                className="plugin-field-heading"
                htmlFor={`${idPrefix}-${field.id}`}
              >
                {index === 0 && <PluginControlIcon name="pin" />}
                {field.label}
              </label>
              {field.help && <p>{field.help}</p>}
              {field.type === "select" ? (
                <select
                  id={`${idPrefix}-${field.id}`}
                  value={String(field.value)}
                  disabled={busy || field.disabled}
                  onChange={(event) => onChange(field.id, event.target.value)}
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${idPrefix}-${field.id}`}
                  type="text"
                  value={String(field.value)}
                  disabled={busy || field.disabled}
                  onChange={(event) => onChange(field.id, event.target.value)}
                />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function PluginTrialView({
  fields,
  onChange,
  onPreview,
  preview,
  phase,
  onContinue,
  ...status
}: PluginViewStatus & {
  fields: PluginConditionField[];
  onChange: (id: string, value: string | boolean) => void;
  onPreview: () => void;
  preview?: PluginPreview;
  phase?: "before" | "after";
  onContinue: () => void;
}) {
  const result = useRef<HTMLElement>(null);
  const hasPreview = Boolean(preview);
  useEffect(() => {
    if (hasPreview) result.current?.focus();
  }, [hasPreview]);
  return (
    <div className="plugin-page plugin-trial">
      <p className="plugin-intro">{m.previewIntro}</p>
      <div className="plugin-card plugin-trial-card">
        <PluginConditions
          fields={fields}
          onChange={onChange}
          busy={status.busy}
        />
        <Information>{m.previewNote}</Information>
      </div>
      <PluginStatus {...status} />
      {preview && (
        <section
          ref={result}
          tabIndex={-1}
          className="plugin-trial-result"
          aria-label="試用プレビュー"
        >
          <div className="plugin-preview-phase" aria-live="polite">
            {phase === "before" ? m.before : m.after}
          </div>
          <PreviewFrame {...preview} mock />
        </section>
      )}
      <button
        type="button"
        className="plugin-button"
        disabled={status.busy}
        onClick={preview ? onContinue : onPreview}
      >
        {preview ? m.toInstall : m.preview}
        <PluginControlIcon name="arrow" />
      </button>
    </div>
  );
}

export function PluginInstallView({
  conditions,
  preview,
  layers,
  unknownNote,
  onInstall,
  onCancel,
  editing = false,
  ...status
}: PluginViewStatus & {
  conditions: PluginConditionValue[];
  preview: PluginPreview;
  layers: { id: string; name: string; description: string }[];
  unknownNote?: string;
  onInstall: () => void;
  onCancel: () => void;
  editing?: boolean;
}) {
  return (
    <div className="plugin-page plugin-install">
      <p className="plugin-intro">
        {editing ? "変更する条件を確認して保存します。" : m.installIntro}
      </p>
      <PreviewFrame {...preview} />
      <section className="plugin-install-section">
        <div className="plugin-section-heading">
          <PluginControlIcon name="database" />
          <div>
            <h3>{m.usedInformation}</h3>
            <p>{m.usedInformationHelp}</p>
          </div>
        </div>
        <dl className="plugin-condition-summary">
          {conditions.map((condition) => (
            <div key={condition.label}>
              <dt>{condition.label}</dt>
              <dd>{condition.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="plugin-install-section">
        <div className="plugin-section-heading">
          <PluginControlIcon name="layers" />
          <div>
            <h3>{m.additionalLayers}</h3>
            <p>{m.additionalLayersHelp}</p>
          </div>
        </div>
        <ul className="plugin-layer-list">
          {layers.map((layer) => (
            <li key={layer.id}>
              <span className="plugin-layer-icon">
                <PluginControlIcon name="layers" />
              </span>
              <div>
                <strong>{layer.name}</strong>
                <p>{layer.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {unknownNote && (
        <section className="plugin-unknown">
          <PluginControlIcon name="info" />
          <div>
            <h4>{m.unknownRoadTitle}</h4>
            <p>{unknownNote}</p>
          </div>
        </section>
      )}
      <PluginStatus {...status} />
      <div className="plugin-actions">
        <button
          type="button"
          className="plugin-button plugin-button--secondary"
          disabled={status.busy}
          onClick={onCancel}
        >
          {m.cancel}
        </button>
        <button
          type="button"
          className="plugin-button"
          disabled={status.busy}
          onClick={onInstall}
        >
          {editing ? m.save : m.install}
        </button>
      </div>
    </div>
  );
}

export function PluginManageView({
  plugins,
  previews,
  onToggle,
  onIcon,
  onMap,
  onConditions,
  onUpdate,
  onCompanion,
  onFind,
  onRemove,
  onRequests,
  ...status
}: PluginViewStatus & {
  plugins: PluginCardModel[];
  previews: Record<string, PluginPreview>;
  onToggle: (id: string, enabled: boolean) => void;
  onIcon: (id: string) => void;
  onMap: (id: string) => void;
  onConditions: (id: string) => void;
  onUpdate: (id: string) => void;
  onCompanion: () => void;
  onFind: () => void;
  onRemove?: (id: string) => void;
  onRequests?: () => void;
}) {
  return (
    <div className="plugin-page plugin-manage">
      <nav className="plugin-tabs" aria-label="拡張機能の操作">
        <button type="button" onClick={onFind}>{m.tabs.store}</button>
        <button type="button" aria-current="page">{m.tabs.installed}</button>
      </nav>
      <h2 className="plugin-page-heading">{m.installed}</h2>
      <p className="plugin-intro">{m.manageIntro}</p>
      <PluginStatus {...status} />
      <ul className="plugin-managed-list">
        {plugins.map((plugin) => (
          <li className="plugin-card plugin-managed-card" key={plugin.id}>
            <div className="plugin-managed-header">
              <FeatureHeading plugin={plugin} />
              <label className="plugin-switch">
                <span className="plugin-sr-only">{plugin.name}のON/OFF</span>
                <input
                  type="checkbox"
                  checked={plugin.enabled}
                  onChange={(event) =>
                    onToggle(plugin.id, event.target.checked)
                  }
                  disabled={status.busy}
                />
                <span aria-hidden="true" />
              </label>
            </div>
            {previews[plugin.id] && (
              <div className="plugin-managed-map">
                <PreviewFrame {...previews[plugin.id]!} />
                {plugin.regionLabel && (
                  <span className="plugin-region-caption">
                    <PluginControlIcon name="pin" />
                    {plugin.regionLabel}
                  </span>
                )}
              </div>
            )}
            <div className="plugin-management-actions">
              {(
                [
                  ["pin", m.icon, onIcon, false],
                  ["map", m.useOnMap, onMap, !plugin.enabled],
                  ["settings", m.conditions, onConditions, false],
                  ["refresh", m.update, onUpdate, false],
                ] as const
              ).map(([icon, text, action, disabled]) => (
                <button
                  type="button"
                  key={icon}
                  disabled={status.busy || disabled}
                  onClick={() => action(plugin.id)}
                >
                  <PluginControlIcon name={icon} />
                  <span>{text}</span>
                </button>
              ))}
            </div>
            <div className="plugin-managed-meta"><span>{plugin.versionLabel} · {plugin.enabled ? m.enabled : m.disabled}</span>{onRemove && <button type="button" onClick={() => onRemove(plugin.id)} disabled={status.busy}>この機能を外す</button>}</div>
            {plugin.kind === "bike" && (
              <button
                className="plugin-companion"
                type="button"
                onClick={onCompanion}
              >
                <PluginGlyph kind="bike" />
                <span>
                  <strong>{m.companion}</strong>
                  <small>{m.companionHelp}</small>
                </span>
                <PluginControlIcon name="arrow" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!plugins.length && !status.busy && !status.error && (
        <p className="plugin-empty">{m.emptyInstalled}</p>
      )}
      <button type="button" className="plugin-button" onClick={onFind}>
        <span aria-hidden="true">＋</span>
        {m.findMore}
      </button>
      {onRequests && <button className="plugin-guide" type="button" onClick={onRequests}><PluginControlIcon name="bulb" />お願いを見る</button>}
    </div>
  );
}

export function PluginUpdateView({
  plugin,
  current,
  next,
  changes,
  onPreview,
  onUpdate,
  onRollback,
  onRemove,
  canRollback,
  ...status
}: PluginViewStatus & {
  plugin: PluginCardModel;
  current: { version: string; preview: PluginPreview };
  next?: { version: string; preview: PluginPreview };
  changes: string[];
  onPreview: () => void;
  onUpdate: () => void;
  onRollback: () => void;
  onRemove: () => void;
  canRollback: boolean;
}) {
  return (
    <div className="plugin-page plugin-update">
      <FeatureHeading plugin={{ ...plugin, description: m.updateHelp }} />
      <Information>{m.preservation}</Information>
      <section>
        <h3>{m.changes}</h3>
        {changes.length ? (
          <ul className="plugin-change-list">
            {changes.map((change, i) => (
              <li key={`${i}-${change}`}>{change}</li>
            ))}
          </ul>
        ) : (
          <p className="plugin-subtle">
            現在、提供されている更新はありません。
          </p>
        )}
      </section>
      <div className="plugin-version-comparison">
        <section>
          <div className="plugin-version-heading">
            <strong>{m.currentVersion}</strong>
            <span>{current.version}</span>
          </div>
          <PreviewFrame {...current.preview} />
        </section>
        <span className="plugin-version-arrow" aria-hidden="true">
          →
        </span>
        <section>
          <div className="plugin-version-heading">
            <strong>{m.nextVersion}</strong>
            <span>{next?.version || "—"}</span>
          </div>
          {next && <PreviewFrame {...next.preview} />}
        </section>
      </div>
      <button
        type="button"
        className="plugin-trial-link"
        onClick={onPreview}
        disabled={!next || status.busy}
      >
        <PluginControlIcon name="play" />
        <span>
          <strong>{m.trialUpdate}</strong>
          <small>{m.trialUpdateHelp}</small>
        </span>
        <PluginControlIcon name="arrow" />
      </button>
      <PluginStatus {...status} />
      <button
        type="button"
        className="plugin-button"
        onClick={onUpdate}
        disabled={!next || status.busy}
      >
        {m.applyUpdate}
      </button>
      <div className="plugin-update-footer">
        <button
          type="button"
          onClick={onRollback}
          disabled={!canRollback || status.busy}
        >
          <PluginControlIcon name="refresh" />
          {m.rollback}
        </button>
        <button
          type="button"
          className="plugin-danger-text"
          onClick={onRemove}
          disabled={status.busy}
        >
          <PluginControlIcon name="trash" />
          {m.remove}
        </button>
      </div>
    </div>
  );
}

export function PluginConflictView({
  target,
  description,
  sides,
  selection,
  selecting,
  onSelect,
  onChooseDisable,
  onDisable,
  onKeep,
  onBack,
  ...status
}: PluginViewStatus & {
  target: string;
  description: string;
  sides: PluginConflictSide[];
  selection?: string;
  selecting: boolean;
  onSelect: (id: string) => void;
  onChooseDisable: () => void;
  onDisable: () => void;
  onKeep: () => void;
  onBack: () => void;
}) {
  const id = useId();
  const firstChoice = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selecting) firstChoice.current?.focus();
  }, [selecting]);
  return (
    <div className="plugin-page plugin-conflict">
      <div className="plugin-warning">
        <span aria-hidden="true">⚠</span>
        <div>
          <strong>{m.conflictWarning}</strong>
          <p>{m.conflictHelp}</p>
        </div>
      </div>
      <section>
        <h3>対象：{target}</h3>
        <p className="plugin-subtle">{description}</p>
      </section>
      <div className="plugin-conflict-sides">
        {sides.map((side, i) => (
          <section key={side.id} className="plugin-card">
            <div className="plugin-conflict-heading">
              <PluginGlyph kind={side.kind} />
              <h4>
                {String.fromCharCode(65 + i)}. {side.name}
              </h4>
            </div>
            <PreviewFrame {...side.preview} />
            <p>{side.description}</p>
          </section>
        ))}
      </div>
      <Information icon="bulb">{m.conflictPreservation}</Information>
      {selecting && (
        <fieldset className="plugin-disable-choice">
          <legend>{m.selectToDisable}</legend>
          {sides.map((side, index) => (
            <label key={side.id}>
              <input
                ref={index === 0 ? firstChoice : undefined}
                type="radio"
                name={id}
                checked={selection === side.id}
                onChange={() => onSelect(side.id)}
                disabled={status.busy}
              />
              {side.name}
            </label>
          ))}
        </fieldset>
      )}
      <PluginStatus {...status} />
      <button
        type="button"
        className="plugin-button"
        onClick={onKeep}
        disabled={status.busy}
      >
        {m.keepBoth}
      </button>
      <button
        type="button"
        className="plugin-button plugin-button--outline"
        onClick={selecting ? onDisable : onChooseDisable}
        disabled={status.busy || (selecting && !selection)}
      >
        {m.disableOne}
      </button>
      <button
        type="button"
        className="plugin-back-button"
        onClick={onBack}
        disabled={status.busy}
      >
        {m.back}
      </button>
    </div>
  );
}

export function PluginRemoveConfirmation({
  name,
  onRemove,
  onCancel,
  ...status
}: PluginViewStatus & {
  name: string;
  onRemove: () => void;
  onCancel: () => void;
}) {
  return (
    <section
      className="plugin-page plugin-remove-confirm"
      aria-label={m.removeTitle}
    >
      <h3>
        {name}
        {"を削除しますか？"}
      </h3>
      <p>{m.removeHelp}</p>
      <PluginStatus {...status} />
      <div className="plugin-actions">
        <button
          type="button"
          className="plugin-button plugin-button--secondary"
          onClick={onCancel}
          disabled={status.busy}
        >
          {m.cancel}
        </button>
        <button
          type="button"
          className="plugin-button plugin-button--danger"
          onClick={onRemove}
          disabled={status.busy}
        >
          {m.remove}
        </button>
      </div>
    </section>
  );
}
