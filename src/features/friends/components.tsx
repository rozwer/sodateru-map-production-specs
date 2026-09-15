import { useEffect, useState, type ReactNode } from "react";
import type {
  CommonInfoMediaView,
  CommonInfoRecordView,
  Person,
} from "../../../packages/api-client";
import { Icon } from "../../ui/Icon";
import { api } from "../../app/api";

export function Avatar({
  person,
  large = false,
}: {
  person: Pick<Person, "name" | "avatarUrl">;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [person.avatarUrl]);
  return (
    <span className={`fr-avatar ${large ? "fr-avatar-large" : ""}`}>
      {person.avatarUrl && !failed ? (
        <img
          src={person.avatarUrl}
          alt={`${person.name}の写真`}
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon name="person" size={large ? 48 : 28} />
      )}
    </span>
  );
}
export function Notice({
  children,
  retry,
  error = false,
}: {
  children: ReactNode;
  retry?: () => void;
  error?: boolean;
}) {
  return (
    <div
      className={`fr-notice ${error ? "fr-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
      {retry && (
        <button type="button" onClick={retry}>
          再試行
        </button>
      )}
    </div>
  );
}
export function Action({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`fr-action ${primary ? "fr-primary" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Media({
  items,
  retryable = true,
}: {
  items: CommonInfoMediaView[];
  retryable?: boolean;
}) {
  return (
    <div className="fr-media">
      {items.length ? (
        items.map((item) => (
          <Medium
            key={`${item.id}:${item.contentUrl}`}
            item={item}
            retryable={retryable}
          />
        ))
      ) : (
        <span className="fr-no-media">写真はありません</span>
      )}
    </div>
  );
}
function Medium({
  item,
  retryable,
}: {
  item: CommonInfoMediaView;
  retryable: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [source, setSource] = useState<string>();
  const [revision, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setSource(undefined);
    setFailed(false);
    if (item.status === "ready" && item.contentUrl) {
      api
        .request("getMediaMediaIdContent", {
          path: { mediaId: item.id },
          signal: controller.signal,
        })
        .then((blob) => {
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(blob);
          setSource(objectUrl);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        });
    }
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.status, item.contentUrl, revision]);
  if (failed || item.status !== "ready" || !item.contentUrl)
    return (
      <span className="fr-no-media">
        {item.status === "pending" ? "媒体を準備中" : "媒体を読み込めません"}
        {failed && retryable && (
          <button type="button" onClick={() => retry((value) => value + 1)}>
            媒体を再取得
          </button>
        )}
      </span>
    );
  if (!source) return <span className="fr-no-media">媒体を読み込み中…</span>;
  if (item.kind === "photo")
    return (
      <img
        src={source}
        alt="記録に添付された写真"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  if (item.kind === "video")
    return (
      <video
        src={source}
        controls
        preload="metadata"
        onError={() => setFailed(true)}
      />
    );
  return (
    <audio
      src={source}
      controls
      preload="metadata"
      onError={() => setFailed(true)}
    />
  );
}
export function RecordCard({
  record,
  open,
  compact = false,
}: {
  record: CommonInfoRecordView;
  open: () => void;
  compact?: boolean;
}) {
  return (
    <article className={`fr-record ${compact ? "fr-record-compact" : ""}`}>
      <Media items={record.media} />
      <div className="fr-record-copy">
        <button type="button" className="fr-text-button" onClick={open}>
          <strong>{record.place?.name ?? "場所を指定していない記録"}</strong>
          <Icon name="chevron" size={16} />
        </button>
        {record.place?.address && (
          <small>
            <Icon name="pin" size={14} /> {record.place.address}
          </small>
        )}
        <p>{record.body || "本文のない記録"}</p>
        <small>
          {record.effectiveAt === null
            ? "日付不明"
            : new Date(record.effectiveAt).toLocaleDateString("ja-JP")}
        </small>
        {!!record.purposes.length && (
          <div className="fr-tags">
            {record.purposes.map((purpose) => (
              <span key={purpose}>{purpose}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
export function Search({
  value,
  change,
  submit,
  label,
  iconOnly = false,
}: {
  iconOnly?: boolean;
  value: string;
  change: (value: string) => void;
  submit: () => void;
  label: string;
}) {
  return (
    <form
      className={`fr-search ${iconOnly ? "fr-search-icon" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label>
        <span className="fr-sr-only">{label}</span>
        <input
          type="search"
          value={value}
          onChange={(event) => change(event.target.value)}
          placeholder={label}
        />
      </label>
      <button type="submit" aria-label="検索">{iconOnly ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></svg> : "検索"}</button>
    </form>
  );
}
export function SharedNote() {
  return (
    <Notice>
      共有された記録のみ表示しています。
      <small>公開範囲で許可された写真・本文・場所を表示します。</small>
    </Notice>
  );
}

export function SharingIcon({ name }: { name: "lock" | "globe" | "image" }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "lock" ? (
        <>
          <rect x="4" y="10" width="16" height="12" rx="2" />
          <path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3" />
        </>
      ) : name === "globe" ? (
        <>
          <circle cx="12" cy="12" r="10" />
          <ellipse cx="12" cy="12" rx="4" ry="10" />
          <path d="M2 12h20M4 6h16M4 18h16" />
        </>
      ) : (
        <>
          <rect x="2" y="3" width="20" height="18" rx="2" />
          <circle cx="8" cy="9" r="2" />
          <path d="m3 18 6-5 4 3 4-5 5 6" />
        </>
      )}
    </svg>
  );
}
