import React, { useEffect, useId, useState, type ReactNode } from "react";
import "./reflection.css";

// Display models only. API DTOs are mapped at the screen boundary.
export interface RecordCardData {
  id: string;
  title: string;
  body: string;
  when: string;
  place: string;
  photoUrl?: string;
  purposes?: string[];
  impression?: string;
  unavailable?: string;
}
export interface Notice {
  text: string;
  error?: boolean;
  retry?: () => void;
}
export interface PhotoDraft {
  id: string;
  url: string;
  name: string;
}
export interface QuestionCardData {
  id: string;
  question: string;
  month?: string;
  answer: string;
  status: "unanswered" | "answered" | "deferred" | "skipped";
  record: RecordCardData;
}
export const statusLabels = {
  unanswered: "未回答",
  answered: "回答済み",
  deferred: "あとで",
  skipped: "スキップ",
};
export function Mark({
  name,
}: {
  name:
    | "chevron"
    | "book"
    | "clock"
    | "skip"
    | "camera"
    | "lock"
    | "spark"
    | "map"
    | "person"
    | "pin"
    | "trash";
}) {
  const paths: Record<typeof name, ReactNode> = {
    chevron: <path d="m9 5 7 7-7 7" />,
    book: (
      <>
        <path d="M12 5c-4-3-8-2-9-1v15c3-2 6-2 9 0 3-2 6-2 9 0V4c-3-1-6-1-9 1Z" />
        <path d="M12 5v14" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v7l4 2" />
      </>
    ),
    skip: (
      <>
        <path d="m3 5 8 7-8 7Zm10 0 8 7-8 7Z" />
      </>
    ),
    camera: (
      <>
        <rect x="3" y="6" width="18" height="14" rx="3" />
        <circle cx="12" cy="13" r="4" />
        <path d="m8 6 1-3h6l1 3" />
      </>
    ),
    lock: (
      <>
        <rect x="6" y="10" width="12" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />
      </>
    ),
    map: (
      <>
        <path d="m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3ZM9 2v17M15 5v17" />
      </>
    ),
    person: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 22v-5a8 8 0 0 1 16 0v5" />
      </>
    ),
    pin: (
      <>
        <path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0Z" />
        <circle cx="12" cy="9" r="2" />
      </>
    ),
    trash: (
      <>
        <path d="M4 6h16M9 6V3h6v3M7 6l1 15h8l1-15M10 10v7M14 10v7" />
      </>
    ),
  };
  return (
    <svg
      className="rf-icon"
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
export function PhotoImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return !src || failed ? (
    <span>写真を表示できません</span>
  ) : (
    <img src={src} alt={alt} onError={() => setFailed(true)} />
  );
}
export function MiniRadar({
  axes,
}: {
  axes: { label: string; value: number | null }[];
}) {
  if (axes.length < 3)
    return <p className="rf-muted">傾向を表示できる記録がありません。</p>;
  const point = (i: number, r: number) => [
    90 + Math.sin((i * 2 * Math.PI) / axes.length) * r,
    80 - Math.cos((i * 2 * Math.PI) / axes.length) * r,
  ];
  return (
    <figure className="rf-mini-radar">
      <svg viewBox="0 0 180 160" role="img" aria-label="記録から見える傾向">
        {[0.33, 0.66, 1].map((scale) => (
          <polygon
            key={scale}
            points={axes
              .map((_, i) => point(i, 55 * scale).join(","))
              .join(" ")}
            fill="none"
            stroke="#d0e4e4"
          />
        ))}
        {axes.map((a, i) => {
          const [x, y] = point(i, 55);
          return (
            <line
              key={a.label}
              x1="90"
              y1="80"
              x2={x}
              y2={y}
              stroke="#d0e4e4"
            />
          );
        })}
        {axes.every((a) => a.value !== null) && (
          <polygon
            points={axes
              .map((a, i) =>
                point(i, 55 * Math.max(0, Math.min(1, a.value!))).join(","),
              )
              .join(" ")}
            fill="#32aaa84a"
            stroke="#25a6a4"
          />
        )}
        {axes.map((a, i) => {
          const [x, y] = point(i, 70);
          const [cx, cy] = point(i, 55 * (a.value || 0));
          return (
            <g key={a.label}>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fill="currentColor"
              >
                {a.label}
              </text>
              {a.value !== null && (
                <circle cx={cx} cy={cy} r="3" fill="#20a5a3" />
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="rf-sr-only">
        {axes
          .map(
            (a) =>
              `${a.label}：${a.value === null ? "データなし" : Math.round(a.value * 100) + "%"} `,
          )
          .join("")}
      </figcaption>
    </figure>
  );
}
export function Feedback({
  notice,
  busy,
}: {
  notice?: Notice;
  busy?: boolean;
}) {
  return (
    <>
      {busy && (
        <p className="rf-notice" role="status">
          処理中です…
        </p>
      )}
      {notice && (
        <div
          className={`rf-notice ${notice.error ? "rf-error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          {notice.text}
          {notice.retry && (
            <button type="button" onClick={notice.retry}>
              再試行
            </button>
          )}
        </div>
      )}
    </>
  );
}
export function Action({
  children,
  onClick,
  disabled,
  primary = false,
  icon,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`rf-action ${primary ? "rf-primary" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {children}
      {primary && <Mark name="chevron" />}
    </button>
  );
}
export function TextField({
  label,
  value,
  onChange,
  limit,
  multiline,
  placeholder,
  tall,
  disabled,
  insetCounter,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  limit: number;
  multiline?: boolean;
  placeholder?: string;
  tall?: boolean;
  disabled?: boolean;
  insetCounter?: boolean;
}) {
  const id = useId();
  const set = (v: string) => onChange(Array.from(v).slice(0, limit).join(""));
  return (
    <div
      className={`rf-field ${tall ? "rf-tall" : ""} ${insetCounter ? "rf-inset-field" : ""}`}
    >
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => set(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={`${id}-count`}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => set(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={`${id}-count`}
        />
      )}
      <output id={`${id}-count`}>
        {Array.from(value).length} / {limit.toLocaleString()}
      </output>
    </div>
  );
}
export function RecordCard({
  record,
  open,
  detailed = false,
  preview = false,
}: {
  record: RecordCardData;
  open: () => void;
  detailed?: boolean;
  preview?: boolean;
}) {
  return (
    <article className={`rf-record ${detailed ? "rf-record-detail" : ""}`}>
      <div className="rf-record-head">
        <strong>{record.title || "記録"}</strong>
        {!preview && <button
          className="rf-round"
          type="button"
          onClick={open}
          aria-label={`${record.title || "記録"}を開く`}
        >
          <Mark name="chevron" />
        </button>}
        <span>{record.when || "日時未設定"}</span>
        <span className="rf-place">
          <Mark name="pin" />
          {record.place || "場所未設定"}
        </span>
      </div>
      <div className="rf-record-content">
        <div className="rf-photo">
          {record.photoUrl ? (
            <PhotoImage
              key={record.photoUrl}
              src={record.photoUrl}
              alt={record.title || "記録の写真"}
            />
          ) : (
            <span>写真なし</span>
          )}
        </div>
        <div>
          {record.unavailable ? (
            <p className="rf-muted">{record.unavailable}</p>
          ) : detailed ? (
            <>
              <div className="rf-soft">
                <small>過ごし方</small>
                <p>
                  {record.purposes?.join("、") || record.body || "記録なし"}
                </p>
              </div>
              <div className="rf-soft">
                <small>その時の気分</small>
                <p>{record.impression || "記録なし"}</p>
              </div>
            </>
          ) : (
            <>
              <p className="rf-excerpt">{record.body}</p>
              {!preview && <button className="rf-link" type="button" onClick={open}>
                この記録を見る <Mark name="chevron" />
              </button>}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
export interface DiaryViewProps {
  date: string;
  changeDate: (v: string) => void;
  body: string;
  changeBody: (v: string) => void;
  photos: PhotoDraft[];
  addPhotos: (files: File[]) => void;
  removePhoto: (id: string) => void;
  save: () => void;
  busy?: boolean;
  notice?: Notice;
  dirty: boolean;
  saved?: boolean;
  saveDisabled?: boolean;
  ai?: {
    busy: boolean;
    text?: string;
    generate: () => void;
    adopt: () => void;
    cancel: () => void;
    notice?: Notice;
    adopted?: boolean;
  };
}
export function DiaryView(p: DiaryViewProps) {
  return (
    <div className="rf-screen">
      <p className="rf-intro">
        その日の出来事や気持ちを、自由に書き留めましょう。
      </p>
      <section className="rf-card">
        <div className="rf-date">
          <button
            type="button"
            className="rf-round"
            disabled={p.busy}
            aria-label="前の日"
            onClick={() => p.changeDate(shiftDate(p.date, -1))}
          >
            ‹
          </button>
          <input
            type="date"
            disabled={p.busy}
            aria-label="日記の日付"
            value={p.date}
            onChange={(e) => e.target.value && p.changeDate(e.target.value)}
          />
          <button
            type="button"
            className="rf-round"
            disabled={p.busy}
            aria-label="次の日"
            onClick={() => p.changeDate(shiftDate(p.date, 1))}
          >
            ›
          </button>
        </div>
        <div className="rf-photos">
          {p.photos.map((photo) => (
            <div className="rf-photo" key={photo.id}>
              <PhotoImage key={photo.url} src={photo.url} alt={photo.name} />
              <button
                type="button"
                className="rf-remove"
                disabled={p.busy}
                aria-label={`${photo.name}を外す`}
                onClick={() => p.removePhoto(photo.id)}
              >
                ×
              </button>
            </div>
          ))}
          <label className="rf-add-photo">
            <Mark name="camera" />
            <span>
              写真を
              <br />
              追加
            </span>
            <input
              type="file"
              disabled={p.busy}
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                p.addPhotos(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <TextField
          label="日記本文"
          value={p.body}
          onChange={p.changeBody}
          limit={1000}
          multiline
          tall
          placeholder="今日の出来事や気持ちを書いてみましょう。"
        />
        <p className="rf-private">
          <Mark name="lock" />
          自分だけの記録です
        </p>
        {p.ai && (
          <details className="rf-ai">
            <summary>記録から日記の下書きを作る</summary>
            <p>AIの提案を確認し、採用してから日記を保存します。</p>
            <Action onClick={p.ai.generate} disabled={p.ai.busy}>
              下書きを作る
            </Action>
            {p.ai.busy && <Action onClick={p.ai.cancel}>生成を取り消す</Action>}
            {p.ai.text && (
              <>
                <p className="rf-soft rf-preserve">{p.ai.text}</p>
                <Action onClick={p.ai.adopt} disabled={p.ai.adopted}>
                  この下書きを本文に追加
                </Action>
              </>
            )}
            <Feedback notice={p.ai.notice} busy={p.ai.busy} />
          </details>
        )}
        <Feedback notice={p.notice} busy={p.busy} />
        <p className="rf-draft">
          {p.dirty
            ? "未保存の変更があります"
            : p.saved
              ? "保存済みの内容"
              : "日記は未保存です"}
        </p>
        <Action primary onClick={p.save} disabled={p.busy || p.saveDisabled}>
          日記を保存
        </Action>
      </section>
    </div>
  );
}
export function shiftDate(value: string, amount: number) {
  const d = new Date(`${value}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
export function QuestionView({
  item,
  answer,
  onAnswer,
  openRecord,
  save,
  busy,
  notice,
}: {
  item?: QuestionCardData;
  answer: string;
  onAnswer: (v: string) => void;
  openRecord: () => void;
  save: (status: QuestionCardData["status"]) => void;
  busy?: boolean;
  notice?: Notice;
}) {
  return (
    <div className="rf-screen">
      <p className="rf-intro">1つの体験から、少しだけ振り返ってみましょう。</p>
      <div className="rf-progress" data-empty={!item}>
        <span />
        <span />
        <span />
        <span />
        <span />
        <small>{item ? "1 / 1" : "0 / 0"}</small>
      </div>
      {item ? (
        <section className="rf-card">
          <RecordCard record={item.record} open={openRecord} />
          <span className="rf-label">質問</span>
          <h2 className="rf-question">{item.question}</h2>
          <p>
            そのときの気持ちや、印象に残ったことを
            <br />
            自由に書いてみましょう。
          </p>
          <TextField
            label="回答"
            insetCounter
            value={answer}
            onChange={onAnswer}
            limit={500}
            multiline
            placeholder="あなたの言葉で書いてみましょう。"
          />
          <Feedback notice={notice} busy={busy} />
          <Action
            primary
            onClick={() => save("answered")}
            disabled={busy || !answer.trim()}
          >
            回答を保存
          </Action>
          <div className="rf-actions">
            <Action
              onClick={() => save("deferred")}
              disabled={busy}
              icon={<Mark name="clock" />}
            >
              あとで
            </Action>
            <Action
              onClick={() => save("skipped")}
              disabled={busy}
              icon={<Mark name="skip" />}
            >
              スキップ
            </Action>
          </div>
        </section>
      ) : (
        <>
          <Feedback notice={notice} busy={busy} />
          <p className="rf-card">
            今は振り返る質問がありません。記録を追加して、また見返してみましょう。
          </p>
        </>
      )}
    </div>
  );
}
export function HistoryView({
  items,
  filter,
  setFilter,
  expanded,
  toggle,
  openRecord,
  editAnswer,
  interpret,
  more,
  hasMore,
  busy,
  notice,
}: {
  items: QuestionCardData[];
  filter: string;
  setFilter: (v: string) => void;
  expanded: string[];
  toggle: (id: string) => void;
  openRecord: (id: string) => void;
  editAnswer: (id: string) => void;
  interpret: (id: string) => void;
  more: () => void;
  hasMore: boolean;
  busy?: boolean;
  notice?: Notice;
}) {
  return (
    <div className="rf-screen">
      <details
        className="rf-history-menu"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.open = false;
            event.currentTarget.querySelector("summary")?.focus();
          }
        }}
      >
        <summary aria-label="三点メニュー">⋯</summary>
        <div>
          <button type="button" onClick={() => setFilter("unanswered")}>
            未回答の質問を見る
          </button>
          <button
            type="button"
            onClick={() =>
              items
                .filter((item) => !expanded.includes(item.id))
                .forEach((item) => toggle(item.id))
            }
          >
            すべて展開
          </button>
          <button
            type="button"
            onClick={() =>
              items
                .filter((item) => expanded.includes(item.id))
                .forEach((item) => toggle(item.id))
            }
          >
            すべて閉じる
          </button>
        </div>
      </details>
      <p className="rf-intro rf-center">
        これまでの回答を見返して、
        <br />
        自分の傾向を探してみましょう。
      </p>
      <div className="rf-tabs" aria-label="質問の状態">
        {(
          [["all", "すべて"], ...Object.entries(statusLabels)] as [
            string,
            string,
          ][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <Feedback busy={busy} notice={notice} />
      <div className="rf-history">
        {items.length === 0 && !busy && (
          <p className="rf-card">この状態の振り返りはまだありません。</p>
        )}
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {item.month && item.month !== items[index - 1]?.month && (
              <h3 className="rf-month">{item.month}</h3>
            )}
            <article className="rf-history-card">
              <div className="rf-history-header">
                <div className="rf-photo">
                  {item.record.photoUrl ? (
                    <PhotoImage
                      key={item.record.photoUrl}
                      src={item.record.photoUrl}
                      alt={item.record.title}
                    />
                  ) : (
                    <span>写真なし</span>
                  )}
                </div>
                <div>
                  <small>{item.record.when}</small>
                  <strong>{item.record.title}</strong>
                  <span className="rf-muted">
                    {item.record.place || "場所未設定"}
                  </span>
                </div>
                <span className={`rf-badge rf-${item.status}`}>
                  {statusLabels[item.status]}
                </span>
                <button
                  type="button"
                  className="rf-round"
                  onClick={() => toggle(item.id)}
                  aria-expanded={expanded.includes(item.id)}
                  aria-label={`${item.record.title}の質問と回答`}
                >
                  {expanded.includes(item.id) ? "⌃" : "⌄"}
                </button>
              </div>
              {expanded.includes(item.id) && (
                <div className="rf-answer-detail">
                  <p>
                    <span className="rf-label">Q</span> {item.question}
                  </p>
                  {item.answer ? (
                    <blockquote>{item.answer}</blockquote>
                  ) : (
                    <p className="rf-muted">まだ回答していません。</p>
                  )}
                  {item.record.unavailable && (
                    <p className="rf-notice">{item.record.unavailable}</p>
                  )}
                  <div className="rf-actions">
                    <Action
                      onClick={() => openRecord(item.record.id)}
                      disabled={!!item.record.unavailable}
                      icon={<Mark name="book" />}
                    >
                      元の記録を見る
                    </Action>
                    {item.status === "answered" ? (
                      <Action
                        onClick={() => interpret(item.id)}
                        icon={<Mark name="spark" />}
                      >
                        この回答で
                        <br />
                        解釈を更新
                      </Action>
                    ) : (
                      <Action onClick={() => editAnswer(item.id)}>
                        回答する
                      </Action>
                    )}
                  </div>
                  {item.status === "answered" && (
                    <button
                      className="rf-link"
                      type="button"
                      onClick={() => editAnswer(item.id)}
                    >
                      回答を編集
                    </button>
                  )}
                </div>
              )}
            </article>
          </React.Fragment>
        ))}
      </div>
      {hasMore && (
        <Action onClick={more} disabled={busy}>
          続きを読み込む
        </Action>
      )}
    </div>
  );
}
export function CompareView({
  records,
  common,
  difference,
  setCommon,
  setDifference,
  select,
  options,
  open,
  save,
  busy,
  notice,
  selectionLocked,
}: {
  records: (RecordCardData | undefined)[];
  selectionLocked?: boolean;
  common: string;
  difference: string;
  setCommon: (v: string) => void;
  setDifference: (v: string) => void;
  select: (index: number, id: string) => void;
  options: RecordCardData[];
  open: (id: string) => void;
  save: () => void;
  busy?: boolean;
  notice?: Notice;
}) {
  return (
    <div className="rf-screen">
      <h2>2つの体験を比べてみましょう</h2>
      <p className="rf-intro">
        選んだ2つの記録を振り返り、共通点や違いを見つけましょう。
        <br />
        気づきが、あなたのことをより深く知るヒントになります。
      </p>
      {[0, 1].map((index) => (
        <div key={index} className="rf-compare-record">
          <label className="rf-select-label">
            {index + 1}つ目の体験
            <select
              disabled={selectionLocked}
              value={records[index]?.id || ""}
              onChange={(e) => select(index, e.target.value)}
            >
              <option value="">記録を選ぶ</option>
              {options.map((r) => (
                <option
                  key={r.id}
                  value={r.id}
                  disabled={records[1 - index]?.id === r.id}
                >
                  {r.title} {r.when}
                </option>
              ))}
            </select>
          </label>
          {records[index] && (
            <RecordCard
              record={records[index]}
              open={() => open(records[index]!.id)}
              detailed
            />
          )}
        </div>
      ))}
      <TextField
        label="2つの体験の共通点"
        value={common}
        onChange={setCommon}
        limit={100}
        multiline
      />
      <TextField
        label="2つの体験の違い"
        value={difference}
        onChange={setDifference}
        limit={100}
        multiline
      />
      <Feedback notice={notice} busy={busy} />
      <div className="rf-actions">
        <Action
          onClick={() => records[0] && open(records[0].id)}
          disabled={!records[0]}
        >
          元の記録に戻る
        </Action>
        <Action
          primary
          onClick={save}
          disabled={
            busy ||
            !records[0] ||
            !records[1] ||
            records[0].id === records[1].id
          }
        >
          比較を保存
        </Action>
      </div>
    </div>
  );
}
export interface MemoForm {
  name: string;
  body: string;
  origins: string[];
  keywords: string[];
  useForSuggestions: boolean;
}
export function MemoView({
  value,
  change,
  options,
  keyword,
  setKeyword,
  save,
  cancel,
  remove,
  confirmDelete,
  setConfirmDelete,
  busy,
  notice,
}: {
  value: MemoForm;
  change: (value: MemoForm) => void;
  options: { id: string; label: string }[];
  keyword: string;
  setKeyword: (v: string) => void;
  save: () => void;
  cancel: () => void;
  remove?: () => void;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  busy?: boolean;
  notice?: Notice;
}) {
  const [addingKeyword, setAddingKeyword] = useState(false);
  const patch = (p: Partial<MemoForm>) => change({ ...value, ...p });
  return (
    <div className="rf-screen">
      <section className="rf-card rf-memo">
        <TextField
          label="メモ名"
          value={value.name}
          onChange={(name) => patch({ name })}
          limit={20}
        />
        <TextField
          label="本文"
          value={value.body}
          onChange={(body) => patch({ body })}
          limit={200}
          multiline
        />
        <fieldset className="rf-origins">
          <legend>由来</legend>
          {options.length === 0 ? (
            <p className="rf-muted">由来にできる記録や候補はありません。</p>
          ) : (
            <details>
              <summary>
                {value.origins.length
                  ? `${value.origins.length}件の由来`
                  : "由来を選ぶ"}
              </summary>
              {options.map((o) => (
                <label key={o.id}>
                  <input
                    type="checkbox"
                    checked={value.origins.includes(o.id)}
                    onChange={(e) =>
                      patch({
                        origins: e.target.checked
                          ? [...value.origins, o.id]
                          : value.origins.filter((id) => id !== o.id),
                      })
                    }
                  />
                  {o.label}
                </label>
              ))}
            </details>
          )}
          <small>由来を外しても、このメモの本文は残ります。</small>
        </fieldset>
        <div>
          <h3>条件（キーワード）</h3>
          <p className="rf-muted">このメモに関連する条件を設定しましょう。</p>
          <div className="rf-chips">
            {value.keywords.map((k) => (
              <button
                type="button"
                key={k}
                onClick={() =>
                  patch({ keywords: value.keywords.filter((x) => x !== k) })
                }
                aria-label={`${k}を削除`}
              >
                {k} ×
              </button>
            ))}
          </div>
          <div className="rf-keyword">
            {addingKeyword && (
              <input
                autoFocus
                aria-label="追加するキーワード"
                value={keyword}
                onChange={(e) =>
                  setKeyword(Array.from(e.target.value).slice(0, 80).join(""))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const k = keyword.trim();
                    if (
                      k &&
                      !value.keywords.includes(k) &&
                      value.keywords.length < 50
                    ) {
                      patch({ keywords: [...value.keywords, k] });
                      setKeyword("");
                      setAddingKeyword(false);
                    }
                  }
                }}
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (!addingKeyword) {
                  setAddingKeyword(true);
                  return;
                }
                const k = keyword.trim();
                if (
                  k &&
                  !value.keywords.includes(k) &&
                  value.keywords.length < 50
                ) {
                  patch({ keywords: [...value.keywords, k] });
                  setKeyword("");
                  setAddingKeyword(false);
                }
              }}
            >
              ＋ 追加する
            </button>
          </div>
        </div>
        <div className="rf-divider">
          <label className="rf-toggle">
            <strong>候補探しに使う</strong>
            <input
              type="checkbox"
              role="switch"
              checked={value.useForSuggestions}
              onChange={(e) => patch({ useForSuggestions: e.target.checked })}
            />
          </label>
          <p className="rf-muted">
            このメモをもとに、地図上で候補の場所を探せます。
          </p>
          <p className="rf-soft">
            条件に合う場所を地図上に表示して、
            <br />
            新しい出会いを見つけるヒントにできます。
          </p>
        </div>
        {remove && (
          <div className="rf-divider">
            {confirmDelete ? (
              <div className="rf-notice" role="alert">
                <p>
                  このメモの名前・本文・キーワードを削除します。由来の元記録は削除しません。
                </p>
                <div className="rf-actions">
                  <Action onClick={() => setConfirmDelete(false)}>戻る</Action>
                  <Action onClick={remove} disabled={busy}>
                    このメモを削除
                  </Action>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="rf-delete"
                onClick={() => setConfirmDelete(true)}
              >
                <Mark name="trash" />
                このメモを削除する
              </button>
            )}
          </div>
        )}
        <Feedback notice={notice} busy={busy} />
        <div className="rf-actions">
          <Action onClick={() => { setAddingKeyword(false); cancel(); }}>キャンセル</Action>
          <Action
            primary
            onClick={save}
            disabled={
              busy ||
              !value.name.trim() ||
              Array.from(value.name).length > 20 ||
              Array.from(value.body).length > 200
            }
          >
            保存
          </Action>
        </div>
      </section>
    </div>
  );
}
export function SelfHomeView({
  recent,
  navigate,
  map,
  chart,
  miniMap,
  notice,
}: {
  recent?: RecordCardData;
  navigate: (page: string) => void;
  map?: ReactNode;
  chart?: ReactNode;
  miniMap?: ReactNode;
  notice?: Notice;
}) {
  return (
    <div className="rf-screen rf-self">
      <div className="rf-self-hero">
        <div className="rf-self-map">
          {map || <p className="rf-muted">地図を読み込み中です</p>}
        </div>
        <header className="rf-self-heading">
          <h2>自分を知る</h2>
          <p>日々の体験から、いまの自分へ。</p>
        </header>
        <button
          className="rf-self-menu"
          type="button"
          aria-label="メニュー"
          onClick={() => navigate("navigation")}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path
              d="M4 5h16M4 12h16M4 19h16"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>
      <Feedback notice={notice} />
      <section className="rf-home-card">
        <button
          type="button"
          className="rf-home-link"
          onClick={() => navigate("daily-track")}
        >
          <span>
            <strong>今日の軌跡</strong>
            <span>今日を振り返る</span>
          </span>
          <Mark name="chevron" />
        </button>
        {recent ? (
          <RecordCard record={recent} open={() => navigate("daily-track")} preview />
        ) : (
          <p className="rf-muted">今日の記録はまだありません。</p>
        )}
      </section>
      <section className="rf-home-card">
        <button
          type="button"
          className="rf-home-link"
          onClick={() => navigate("type-diagnosis")}
        >
          <span>
            <strong>タイプ診断</strong>
            <span>記録から見える傾向</span>
          </span>
          <Mark name="chevron" />
        </button>
        <div className="rf-home-preview">
          {chart || <p className="rf-muted">傾向を開いて確認</p>}
          <p>
            あなたの記録から
            <br />
            見える傾向を
            <br />
            チェックしてみましょう。
          </p>
        </div>
      </section>
      <section className="rf-home-card">
        <button
          type="button"
          className="rf-home-link"
          onClick={() => navigate("personal-map")}
        >
          <span>
            <strong>わたしの地図</strong>
            <span>自分のテーマで見る</span>
          </span>
          <Mark name="chevron" />
        </button>
        <div className="rf-home-preview">
          {miniMap}
          <p>
            ここで、
            <br />
            わたしが育っていく。
          </p>
        </div>
      </section>
    </div>
  );
}
