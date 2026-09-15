import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DiaryView,
  QuestionView,
  HistoryView,
  CompareView,
  MemoView,
  SelfHomeView,
  MiniRadar,
  type QuestionCardData,
  type RecordCardData,
  type PhotoDraft,
  type MemoForm,
} from "../../../src/features/reflection/views";
import "./preview.css";
const mediaMode = new URLSearchParams(location.search).get("media");
const mediaUrl = mediaMode === "error" ? "./missing-media-fixture.png" : mediaMode ? "./media-fixture.svg" : undefined;
const records: [RecordCardData, RecordCardData] = [
  {
    id: "fixture-cafe",
    photoUrl: mediaUrl,
    title: "カフェでひと息",
    body: "窓際の席で、コーヒーを飲みながら読書。とても落ち着けた。",
    when: "5月12日（日）10:24",
    place: "本山",
    purposes: ["コーヒーを飲みながら読書"],
    impression: "落ち着いて、心地よかった",
  },
  {
    id: "fixture-park",
    photoUrl: mediaUrl,
    title: "東山公園で散歩",
    body: "園内をゆっくり歩いた",
    when: "5月10日（金）15:18",
    place: "東山公園",
    purposes: ["園内をゆっくり歩いた"],
    impression: "リフレッシュできて、すっきりした",
  },
];
const questions: QuestionCardData[] = [
  {
    id: "q1",
    month: "2024年5月",
    question: "どんな時間が心地よかった？",
    answer: "人が少なくて、本に集中できた",
    status: "answered",
    record: records[0],
  },
  {
    id: "q2",
    month: "2024年5月",
    question: "散歩で印象に残ったことは？",
    answer: "",
    status: "deferred",
    record: records[1],
  },
  {
    id: "q3",
    month: "2024年5月",
    question: "何を感じましたか？",
    answer: "",
    status: "skipped",
    record: {
      ...records[0],
      id: "fixture-temple",
      title: "覚王山で散策",
      place: "覚王山",
    },
  },
];
function Preview() {
  const empty = new URLSearchParams(location.search).has("empty");
  const [photos, setPhotos] = useState<PhotoDraft[]>(mediaUrl ? [{id: "media-fixture", url: mediaUrl, name: "表示確認画像"}] : []);
  const [page, setPage] = useState(
    new URLSearchParams(location.search).get("page") || "diary",
  );
  const [body, setBody] = useState(
    "今日は少し遠回りして、気になっていたカフェに行ってみた。\n\n窓から入る光がやわらかくて、店内も静かで、久しぶりにゆっくり本を読むことができた。",
  );
  const [date, setDate] = useState("2024-05-12");
  const [answer, setAnswer] = useState(questions[0]!.answer);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(["q1"]);
  const [common, setCommon] = useState("ひとりで落ち着けた");
  const [difference, setDifference] = useState("室内と屋外");
  const [memo, setMemo] = useState<MemoForm>({
    name: "落ち着ける席",
    body: "窓際で本が読める場所を探したい。",
    origins: ["fixture-cafe"],
    keywords: ["ひとり", "読書"],
    useForSuggestions: true,
  });
  const [keyword, setKeyword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const save = () =>
    setNotice("表示確認用の操作です。API保存は行っていません。");
  const nav = (p: string) => {
    setPage(p);
    history.replaceState({}, "", `?page=${p}`);
  };
  const titles: Record<string, string> = {
    "self-home": "自分を知る",
    diary: "日記",
    question: "今日の軌跡",
    history: "振り返りの記録",
    compare: "2つの体験を比べる",
    memo: "メモを編集",
  };
  return (
    <>
      <aside className="qa-note">
        <strong>表示確認用 fixture・API未接続</strong>
        <nav>
          {Object.entries(titles).map(([id, t]) => (
            <button onClick={() => nav(id)} key={id}>
              {t}
            </button>
          ))}
        </nav>
      </aside>
      <main className="qa-phone">
        {page !== "self-home" && (
          <header>
            <button onClick={() => nav("self-home")} aria-label="戻る">
              ‹
            </button>
            <strong>{titles[page] || page}</strong>
          </header>
        )}
        {notice && (
          <p role="status" className="qa-status">
            {notice}
          </p>
        )}
        {page === "diary" && (
          <DiaryView
            date={date}
            changeDate={setDate}
            body={body}
            changeBody={setBody}
            photos={photos}
            addPhotos={(files) =>
              setPhotos((current) => [
                ...current,
                ...files.map((file) => ({
                  id: crypto.randomUUID(),
                  url: URL.createObjectURL(file),
                  name: file.name,
                })),
              ])
            }
            removePhoto={(id) =>
              setPhotos((current) => {
                const photo = current.find((p) => p.id === id);
                if (photo) URL.revokeObjectURL(photo.url);
                return current.filter((p) => p.id !== id);
              })
            }
            save={save}
            dirty
            ai={{ busy: false, generate: save, adopt: save, cancel: save }}
          />
        )}
        {page === "question" && (
          <QuestionView
            item={empty ? undefined : questions[0]}
            answer={answer}
            onAnswer={setAnswer}
            openRecord={save}
            save={save}
          />
        )}{" "}
        {page === "history" && (
          <HistoryView
            items={(empty ? [] : questions).filter(
              (q) => filter === "all" || q.status === filter,
            )}
            filter={filter}
            setFilter={setFilter}
            expanded={expanded}
            toggle={(id) =>
              setExpanded((x) =>
                x.includes(id) ? x.filter((v) => v !== id) : [...x, id],
              )
            }
            openRecord={save}
            editAnswer={() => nav("question")}
            interpret={save}
            more={save}
            hasMore={false}
          />
        )}{" "}
        {page === "compare" && (
          <CompareView
            records={empty ? [] : records}
            options={empty ? [] : records}
            common={common}
            difference={difference}
            setCommon={setCommon}
            setDifference={setDifference}
            select={save}
            open={save}
            save={save}
          />
        )}{" "}
        {page === "memo" && (
          <MemoView
            value={memo}
            change={setMemo}
            options={(empty ? [] : records).map((r) => ({
              id: r.id,
              label: r.title,
            }))}
            keyword={keyword}
            setKeyword={setKeyword}
            save={save}
            cancel={save}
            remove={save}
            confirmDelete={confirm}
            setConfirmDelete={setConfirm}
          />
        )}{" "}
        {page === "self-home" && (
          <SelfHomeView
            recent={empty ? undefined : records[0]}
            navigate={save}
            chart={
              <MiniRadar
                axes={[
                  { label: "本", value: 0.7 },
                  { label: "カフェ", value: 0.74 },
                  { label: "自然", value: 0.78 },
                  { label: "散歩", value: 0.72 },
                ]}
              />
            }
          />
        )}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
