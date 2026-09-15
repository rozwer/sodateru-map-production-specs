import { useId, useState, type ReactNode } from "react";
import { PluginControlIcon, PluginStatus } from "../plugins/views";
import type { PluginViewStatus } from "../plugins/view-model";
import { featureRequestMessages as m } from "./messages";
import {
  limitRequestBody,
  requestCharacterCount,
  type FeatureRequestDraft,
  type FeatureRequestModel,
} from "./view-model";
import "./feature-requests.css";

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-9.3a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}
function VisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {visible ? (
        <>
          <circle cx="12" cy="12" r="10" />
          <ellipse cx="12" cy="12" rx="4" ry="10" />
          <path d="M2 12h20M4 6h16M4 18h16" />
        </>
      ) : (
        <>
          <rect x="4" y="10" width="16" height="12" rx="2" />
          <path d="M7 10V7a5 5 0 0 1 10 0v3M12 15v3" />
        </>
      )}
    </svg>
  );
}
function RequestHand() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 14V5a1.5 1.5 0 0 1 3 0v8-10a1.5 1.5 0 0 1 3 0v10-8a1.5 1.5 0 0 1 3 0v9-5a1.5 1.5 0 0 1 3 0v7c0 5-3 7-7 7-3 0-5-2-7-5l-3-5a1.8 1.8 0 0 1 3-2l2 3Z" />
    </svg>
  );
}
function Avatar({ item }: { item: FeatureRequestModel }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="request-avatar">
      {item.avatarUrl && !failed ? (
        <img src={item.avatarUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        <PluginControlIcon name="person" />
      )}
    </span>
  );
}

export function FeatureRequestListView({
  items,
  tab,
  onTab,
  onWrite,
  onLike,
  onEdit,
  onDelete,
  onRequest,
  guideUrl,
  more,
  onMore,
  notice,
  onDismissNotice,
  ...status
}: PluginViewStatus & {
  items: FeatureRequestModel[];
  tab: "public" | "drafts";
  onTab: (tab: "public" | "drafts") => void;
  onWrite: () => void;
  onLike: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRequest: (id: string) => void;
  guideUrl?: string;
  more?: boolean;
  onMore?: () => void;
  onDismissNotice: () => void;
}) {
  return (
    <div className="request-page request-list-page">
      {notice && (
        <div className="request-success" role="status">
          <span aria-hidden="true">✓</span>
          <strong>{notice}</strong>
          <button
            type="button"
            aria-label={m.dismiss}
            onClick={onDismissNotice}
          >
            ×
          </button>
        </div>
      )}
      <div className="request-heading">
        <div>
          <h2>{m.title}</h2>
          <p>{m.lead}</p>
        </div>
        <button
          type="button"
          className="request-create"
          onClick={onWrite}
          aria-label={m.write}
        >
          <span aria-hidden="true">＋</span>
          <small>{m.write}</small>
        </button>
      </div>
      <div className="request-tabs" role="group" aria-label="表示するお願い">
        <button
          type="button"
          aria-pressed={tab === "public"}
          onClick={() => onTab("public")}
        >
          {m.publicTab}
        </button>
        <button
          type="button"
          aria-pressed={tab === "drafts"}
          onClick={() => onTab("drafts")}
        >
          {m.draftsTab}
        </button>
      </div>
      <PluginStatus {...status} />
      <ul className="request-posts">
        {items.map((item) => (
          <li key={item.id}>
            <article className="request-post">
              <header>
                <Avatar item={item} />
                <div className="request-author">
                  <strong>{item.name}</strong>
                  <time>{item.timestampLabel}</time>
                </div>
                {item.owned && (
                  <span className="request-visibility">
                    <VisibilityIcon visible={item.visibility === "public"} />
                    {item.visibility === "public" ? m.public : m.private}
                  </span>
                )}
                <button
                  type="button"
                  className="request-like"
                  aria-label={`${item.liked ? m.unlike : m.like}：${item.name}のお願い、${item.likeCount}件`}
                  aria-pressed={item.liked}
                  disabled={status.busy}
                  onClick={() => onLike(item.id)}
                >
                  <Heart filled={item.liked} />
                  <span>{item.likeCount}</span>
                </button>
              </header>
              <p className="request-body">{item.body}</p>
              {!!item.tags.length && (
                <ul className="request-tags" aria-label="タグ">
                  {item.tags.map((tag) => (
                    <li key={tag.id}>
                      {tag.icon === "place" ? (
                        <PluginControlIcon name="pin" />
                      ) : tag.icon === "weather" ? (
                        <span aria-hidden="true">☂</span>
                      ) : null}
                      {tag.label}
                    </li>
                  ))}
                </ul>
              )}
              {item.owned ? (
                <div className="request-own-actions">
                  <button
                    type="button"
                    onClick={() => onEdit(item.id)}
                    disabled={status.busy}
                  >
                    <span aria-hidden="true">✎</span>
                    {m.edit}
                  </button>
                  <button
                    type="button"
                    className="request-delete"
                    onClick={() => onDelete(item.id)}
                    disabled={status.busy}
                  >
                    <PluginControlIcon name="trash" />
                    {m.remove}
                  </button>
                </div>
              ) : (
                <div className="request-public-actions">
                  <button
                    type="button"
                    className="request-ask"
                    onClick={() => onRequest(item.id)}
                  >
                    <RequestHand />
                    {m.request}
                  </button>
                  {guideUrl && (
                    <a href={guideUrl} target="_blank" rel="noreferrer">
                      <PluginControlIcon name="github" />
                      <span>
                        {m.develop} ↗<br />
                        GitHub
                      </span>
                    </a>
                  )}
                </div>
              )}
            </article>
            {item.owned && <p className="request-own-help">{m.ownHelp}</p>}
          </li>
        ))}
      </ul>
      {!items.length && !status.busy && !status.error && (
        <p className="request-empty">
          {tab === "public" ? m.emptyPublic : m.emptyDraft}
        </p>
      )}
      {more && onMore && (
        <button
          type="button"
          className="request-button request-button--secondary"
          onClick={onMore}
          disabled={status.busy}
        >
          {m.more}
        </button>
      )}
    </div>
  );
}

export function FeatureRequestEditorView({
  value,
  onChange,
  onSave,
  nameLocked,
  editing,
  fieldErrors,
  ...status
}: PluginViewStatus & {
  value: FeatureRequestDraft;
  onChange: (value: FeatureRequestDraft) => void;
  onSave: (visibility: "private" | "public") => void;
  nameLocked?: boolean;
  editing?: boolean;
  fieldErrors?: { name?: string; body?: string };
}) {
  const id = useId();
  const count = requestCharacterCount(value.body);
  const update = (patch: Partial<FeatureRequestDraft>) =>
    onChange({ ...value, ...patch });
  const disabled =
    status.busy || !value.name.trim() || !value.body.trim() || count > 200;
  return (
    <div className="request-page request-editor-page">
      <p className="request-editor-lead">{m.editorLead}</p>
      <form
        className="request-editor-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled) onSave(value.visibility);
        }}
      >
        <div className="request-field">
          <label htmlFor={`${id}-name`}>{m.name}</label>
          <input
            id={`${id}-name`}
            type="text"
            autoComplete="nickname"
            value={value.name}
            readOnly={nameLocked}
            disabled={status.busy}
            onChange={(event) => update({ name: event.target.value })}
            aria-describedby={`${id}-name-help`}
            aria-invalid={Boolean(fieldErrors?.name)}
          />
          <p id={`${id}-name-help`}>{fieldErrors?.name || m.nameHelp}</p>
        </div>
        <div className="request-field request-body-field">
          <div className="request-label-row">
            <label htmlFor={`${id}-body`}>{m.body}</label>
            <output id={`${id}-count`} htmlFor={`${id}-body`}>
              {count} / {m.bodyLimit}
            </output>
          </div>
          <textarea
            id={`${id}-body`}
            value={value.body}
            disabled={status.busy}
            onChange={(event) =>
              update({ body: limitRequestBody(event.target.value) })
            }
            aria-describedby={`${id}-count${fieldErrors?.body ? ` ${id}-body-error` : ""}`}
            aria-invalid={Boolean(fieldErrors?.body)}
            rows={6}
          />
          {fieldErrors?.body && (
            <p id={`${id}-body-error`} role="alert">
              {fieldErrors.body}
            </p>
          )}
        </div>
        <fieldset className="request-visibility-options" disabled={status.busy}>
          <legend>{m.visibility}</legend>
          <div>
            {(["private", "public"] as const).map((visibility) => (
              <label key={visibility}>
                <input
                  type="radio"
                  name={`${id}-visibility`}
                  value={visibility}
                  checked={value.visibility === visibility}
                  onChange={() => update({ visibility })}
                />
                <span>
                  <VisibilityIcon visible={visibility === "public"} />
                  <strong>{m[visibility]}</strong>
                  <small>
                    {visibility === "public" ? m.publicHelp : m.privateHelp}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="request-editor-help">
          <PluginControlIcon name="bulb" />
          {m.confirmation}
        </div>
        <PluginStatus {...status} />
        <div className="request-editor-actions">
          <button
            type="button"
            className="request-button request-button--secondary"
            onClick={() => onSave("private")}
            disabled={disabled}
          >
            {m.draft}
          </button>
          <button type="submit" className="request-button" disabled={disabled}>
            {editing ? m.saveChanges : m.submit}
          </button>
        </div>
      </form>
    </div>
  );
}

export function FeatureRequestDeleteView({
  body,
  onDelete,
  onCancel,
  ...status
}: PluginViewStatus & {
  body: string;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="request-page request-delete-page">
      <h3>{m.removeTitle}</h3>
      <blockquote>{body}</blockquote>
      <p>{m.removeHelp}</p>
      <PluginStatus {...status} />
      <div className="request-editor-actions">
        <button
          type="button"
          className="request-button request-button--secondary"
          onClick={onCancel}
          disabled={status.busy}
        >
          {m.cancel}
        </button>
        <button
          type="button"
          className="request-button request-button--danger"
          onClick={onDelete}
          disabled={status.busy}
        >
          {m.remove}
        </button>
      </div>
    </div>
  );
}
