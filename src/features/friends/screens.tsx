import { useEffect, useRef, useState } from "react";
import type { ScreenDefinition, ScreenProps } from "../../app/contracts";
import { useScreenState } from "../../app/useScreenState";
import { useMapBridge } from "../../app/useMapBridge";
import { api } from "../../app/api";
import { Icon } from "../../ui/Icon";
import { MapPreview } from "../../map/MapPreview";
import type { CommonInfoRecordView } from "../../../packages/api-client";
import {
  Action,
  Avatar,
  Media,
  Notice,
  RecordCard,
  Search,
  SharedNote,
  SharingIcon,
} from "./components";
import {
  directory,
  periodQuery,
  mapFocus,
  errorText,
  friendships,
  useRead,
  useSharingDraft,
} from "./data";
import "./friends.css";
import { FriendCompare } from "./comparison";

type Props = ScreenProps & { active?: boolean };
function readKey(props: Props, suffix = "") {
  return `${props.scopeKey}:${props.route.pageId}:${JSON.stringify(props.route.params)}:${suffix}`;
}
function OpenRecord(props: Props, record: CommonInfoRecordView) {
  props.navigate("knowledge-detail", {
    recordId: record.id,
    personId: record.person.id,
    returnTo: props.route.pageId,
  });
}
function ReadStatus({
  state,
}: {
  state: { loading: boolean; error?: string; reload: () => void };
}) {
  return state.loading ? (
    <Notice>読み込み中…</Notice>
  ) : state.error ? (
    <Notice error retry={state.reload}>
      {state.error}
    </Notice>
  ) : null;
}

function CommunityHome(props: Props) {
  const data = useRead(
    readKey(props),
    async (signal) => {
      const [records, people] = await Promise.all([
        api.request("getSharedRecords", {
          query: { limit: 3, includeUndated: true },
          signal,
        }),
        directory(signal),
      ]);
      return { records: records.items, people: people.people };
    },
    props.active !== false,
  );
  const bridge = useMapBridge();
  useEffect(() => {
    if (!data.data || props.active === false) {
      bridge.clear("community-home");
      return;
    }
    const placed = data.data.records.flatMap((record) =>
      record.place?.coordinates
        ? [
            {
              id: record.id,
              placeId: record.place.id,
              recordIds: [record.id],
              coordinates: record.place.coordinates,
              label: `${record.person.displayName}：${record.place.name}`,
            },
          ]
        : [],
    );
    bridge.showPlaces("community-home", { places: placed });
    const focus = mapFocus(placed.map((place) => place.coordinates));
    if (focus) bridge.focus("community-home", focus);
    const off = bridge.onSelect("community-home", (selection) =>
      props.navigate("knowledge-detail", { recordId: selection.id }),
    );
    return () => {
      off();
      bridge.clear("community-home");
    };
  }, [bridge, data.data, props.active]);
  return (
    <div className="fr-screen fr-home">
      <div className="fr-home-intro">
        <div className="fr-section-heading">
          <h1>みんなを知る</h1>
          <button
            className="fr-menu-button"
            aria-label="メニュー"
            onClick={() => props.navigate("navigation", { mode: "main" })}
          >
            <Icon name="menu" />
          </button>
        </div>
        <p>誰かの体験から、街の新しい一面へ。</p>
      </div>
      <div className="fr-map fr-map-large">
        {props.active !== false && (
          <MapPreview bridge={bridge} label="地域と友達の地図" />
        )}
      </div>
      <ReadStatus state={data} />
      <button
        className="fr-home-card"
        onClick={() => props.navigate("local-knowledge")}
      >
        <div className="fr-home-heading">
          <Icon name="map" />
          <div>
            <h3>地域の知</h3>
            <small>地域に集まった声を見つける</small>
          </div>
          <Icon name="chevron" />
        </div>
        <div className="fr-preview-photos">
          {data.data?.records.map((record) => (
            <Media
              key={record.id}
              retryable={false}
              items={record.media.filter((m) => m.kind === "photo").slice(0, 1)}
            />
          ))}
        </div>
        {data.data && !data.data.records.length && (
          <small>共有された記録はまだありません</small>
        )}
      </button>
      <button
        className="fr-home-card"
        onClick={() => props.navigate("friends-map")}
      >
        <div className="fr-home-heading">
          <Icon name="people" />
          <div>
            <h3>友達の地図</h3>
            <small>友達の視点で街を見る</small>
          </div>
          <Icon name="chevron" />
        </div>
        <div className="fr-preview-people">
          {data.data?.people.slice(0, 3).map((person) => (
            <div key={person.id}>
              <Avatar person={person} />
              <p>{person.name}</p>
            </div>
          ))}
        </div>
        {data.data && !data.data.people.length && (
          <small>友達を探して、申請できます</small>
        )}
      </button>
    </div>
  );
}
function FriendsMap(props: Props) {
  const [form, setForm] = useScreenState({
    query: "",
    submitted: "",
    selected: props.route.params.personId ?? "",
    cursor: "",
    searchCursor: "",
  });
  const people = useRead(
    readKey(props, `${form.submitted}:${form.searchCursor}:${form.selected}`),
    async (signal) => {
      const d = await directory(signal);
      const search = form.submitted
        ? await api.request("getPeople", {
            query: {
              q: form.submitted,
              limit: 100,
              cursor: form.searchCursor || undefined,
            },
            signal,
          })
        : null;
      const selectedPerson =
        form.selected &&
        !d.people.some((p) => p.id === form.selected) &&
        !search?.items.some((p) => p.id === form.selected)
          ? (
              await api.request("getPeoplePersonId", {
                path: { personId: form.selected },
                signal,
              })
            ).data
          : null;
      return {
        ...d,
        selectedPerson,
        visible: search?.items ?? d.people,
        nextCursor: search?.nextCursor,
      };
    },
    props.active !== false,
  );
  const personId = form.selected || people.data?.visible[0]?.id || "";
  const person =
    people.data?.visible.find((p) => p.id === personId) ??
    people.data?.people.find((p) => p.id === personId) ??
    people.data?.selectedPerson;
  const shared = useRead(
    readKey(props, `${personId}:${form.cursor}`),
    async (signal) => {
      const query = {
        personIds: [personId],
        ...periodQuery(props.route.params),
      };
      const [records, map, own] = await Promise.all([
        api.request("getSharedRecords", {
          query: { ...query, cursor: form.cursor || undefined, limit: 20 },
          signal,
        }),
        api.request("getSharedRecordsMap", { query, signal }),
        props.route.params.overlay === "both"
          ? api.request("getSharedRecordsMap", {
              query: { audience: "own", ...periodQuery(props.route.params) },
              signal,
            })
          : Promise.resolve(null),
      ]);
      return { records, map: map.data, own: own?.data };
    },
    !!personId && props.active !== false,
  );
  const bridge = useMapBridge();
  useEffect(() => {
    if (!shared.data || props.active === false) {
      bridge.clear("friends-map");
      bridge.clear("friend-compare");
      return;
    }
    bridge.showPlaces("friends-map", {
      places: shared.data.map.items.map((item) => ({
        id: item.recordId,
        placeId: item.placeId,
        recordIds: [item.recordId],
        coordinates: item.coordinates,
        label: `${person?.name ?? "友達"}：${shared.data?.records.items.find((record) => record.id === item.recordId)?.place?.name ?? "共有した場所"}`,
      })),
    });
    if (shared.data.own)
      bridge.showPlaces("friend-compare", {
        places: shared.data.own.items.map((item) => ({
          id: item.recordId,
          placeId: item.placeId,
          recordIds: [item.recordId],
          coordinates: item.coordinates,
          label: "わたしの場所",
        })),
      });
    const offOwn = bridge.onSelect("friend-compare", (selected) =>
      props.navigate("knowledge-detail", { recordId: selected.id }),
    );
    const focus = mapFocus(
      [...shared.data.map.items, ...(shared.data.own?.items ?? [])].map(
        (item) => item.coordinates,
      ),
    );
    if (focus) bridge.focus("friends-map", focus);
    const off = bridge.onSelect("friends-map", (selected) =>
      props.navigate("knowledge-detail", { recordId: selected.id, personId }),
    );
    return () => {
      off();
      offOwn();
      bridge.clear("friends-map");
      bridge.clear("friend-compare");
    };
  }, [bridge, shared.data, props.active, personId, person?.name]);
  return (
    <div className="fr-screen fr-friends-map">
      <div className="fr-section-heading">
        <h1>友達の地図</h1>
        <button
          className="fr-menu-button"
          aria-label="メニュー"
          onClick={() => props.navigate("navigation", { mode: "main" })}
        >
          <Icon name="menu" />
        </button>
      </div>
      <Search
        label="友達の名前で検索…"
        value={form.query}
        change={(query) => setForm({ ...form, query })}
        submit={() =>
          setForm({
            ...form,
            submitted: form.query,
            cursor: "",
            searchCursor: "",
          })
        }
      />
      <ReadStatus state={people} />
      <div className="fr-people-strip">
        {people.data?.visible.map((p) => (
          <button
            key={p.id}
            aria-pressed={p.id === personId}
            onClick={() => setForm({ ...form, selected: p.id, cursor: "" })}
          >
            <Avatar person={p} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      {people.data?.nextCursor && (
        <Action
          onClick={() =>
            setForm({ ...form, searchCursor: people.data!.nextCursor! })
          }
        >
          次の検索結果を見る
        </Action>
      )}
      {people.data && !people.data.visible.length && (
        <Notice>該当する友達はいません。名前で相手を検索できます。</Notice>
      )}
      <div className="fr-map fr-map-large">
        {props.active !== false && (
          <MapPreview
            bridge={bridge}
            label={`${person?.name ?? "友達"}の共有地点`}
            interactive
          />
        )}
      </div>
      <ReadStatus state={shared} />
      {props.route.params.overlay === "both" && (
        <Notice>
          オレンジ：{person?.name ?? "友達"} ／
          青緑：わたし。各地点の表示名で持ち主を確認できます。
        </Notice>
      )}
      <section className="fr-friend-sheet">
        <span className="fr-grabber" aria-hidden="true" />
        {person && (
          <div className="fr-profile">
            <button
              className="fr-text-button"
              onClick={() => props.navigate("friend-profile", { personId })}
            >
              <Avatar person={person} />
              <div>
                <h2>{person.name}の地図</h2>
                <small>共有された記録のみ</small>
              </div>
            </button>
          </div>
        )}
        {shared.data?.records.items.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            open={() => OpenRecord(props, record)}
          />
        ))}
        {shared.data && !shared.data.records.items.length && (
          <Notice>
            現在見られる共有記録がありません。相手の活動がないという意味ではありません。
          </Notice>
        )}
        {shared.data?.records.nextCursor && (
          <Action
            onClick={() =>
              setForm({ ...form, cursor: shared.data!.records.nextCursor! })
            }
          >
            次の記録を見る
          </Action>
        )}
        <div className="fr-actions">
          <Action
            disabled={!personId}
            onClick={() => props.navigate("friend-compare", { personId })}
          >
            <Icon name="people" />
            共通点を見る
          </Action>
          <Action
            disabled={!personId}
            onClick={() => props.navigate("shared-route", { personId })}
          >
            おすすめルート
          </Action>
        </div>
      </section>
    </div>
  );
}
function FriendProfile(props: Props) {
  const personId = props.route.params.personId ?? "";
  const profile = useRead(
    readKey(props),
    async (signal) => {
      const [person, me, relations, records] = await Promise.all([
        api.request("getPeoplePersonId", { path: { personId }, signal }),
        api.request("getMe", { signal }),
        friendships(signal),
        api.request("getSharedRecords", {
          query: { personIds: [personId], includeUndated: true, limit: 2 },
          signal,
        }),
      ]);
      return {
        person: person.data,
        me: me.data,
        relation: relations.find(
          (r) => r.recipientId === personId || r.requesterId === personId,
        ),
        records,
      };
    },
    !!personId && props.active !== false,
  );
  const [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const requestId = useRef("");
  const menuButton = useRef<HTMLButtonElement>(null);
  const value = profile.data;
  const relation = value?.relation;
  const outgoing = relation?.requesterId === value?.me.id;
  async function mutate(remove = false) {
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      if (remove && relation)
        await api.request("deleteFriendshipsFriendshipId", {
          path: { friendshipId: relation.id },
          version: relation.version,
        });
      else if (relation?.status === "pending" && !outgoing)
        await api.request("patchFriendshipsFriendshipId", {
          path: { friendshipId: relation.id },
          version: relation.version,
          body: { status: "accepted" },
        });
      else if (!relation) {
        requestId.current ||= crypto.randomUUID();
        await api.request("postFriendships", {
          body: { id: requestId.current, recipientId: personId },
          idempotencyKey: requestId.current,
        });
      }
      setMenu(false);
      profile.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fr-screen">
      <ReadStatus state={profile} />
      {!personId && <Notice>表示する友達を地図から選んでください。</Notice>}
      {value && (
        <>
          <div className="fr-section-heading">
            <span className="fr-relation">
              {relation?.status === "accepted"
                ? "友達"
                : relation
                  ? outgoing
                    ? "申請中"
                    : "友達申請が届いています"
                  : "まだ友達ではありません"}
            </span>
            <button
              ref={menuButton}
              aria-label="友達関係のメニュー"
              className="fr-text-button"
              onClick={() => setMenu(!menu)}
            >
              •••
            </button>
          </div>
          {menu && (
            <div
              className="fr-inline-menu"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setMenu(false);
                  menuButton.current?.focus();
                  event.preventDefault();
                }
              }}
            >
              <p>
                友達解除後も、指定した相手への共有設定は残ります。共有の解除は記録ごとの共有範囲で変更できます。
              </p>
              {relation && (
                <Action disabled={busy} onClick={() => void mutate(true)}>
                  {relation.status === "accepted"
                    ? "友達を解除する"
                    : outgoing
                      ? "申請を取り消す"
                      : "申請を断る"}
                </Action>
              )}
              <Action
                onClick={() => {
                  setMenu(false);
                  menuButton.current?.focus();
                }}
              >
                閉じる
              </Action>
            </div>
          )}
          <div className="fr-profile">
            <Avatar person={value.person} large />
            <div>
              <h2>{value.person.name}</h2>
              <p>{value.person.bio || "紹介文はありません"}</p>
            </div>
          </div>
          {value.me.id !== personId && relation?.status !== "accepted" && (
            <Action
              disabled={busy || (!!relation && outgoing)}
              onClick={() => void mutate()}
            >
              {busy
                ? "保存中…"
                : relation
                  ? outgoing
                    ? "申請中"
                    : "友達申請を承認する"
                  : "友達申請を送る"}
            </Action>
          )}
          {error && (
            <Notice error retry={profile.reload}>
              {error}
            </Notice>
          )}
          <SharedNote />
          <div className="fr-section-heading">
            <h3>公開しているテーマ</h3>
            <button
              className="fr-text-button"
              onClick={() => props.navigate("personal-map", { personId })}
            >
              すべて見る <Icon name="chevron" size={14} />
            </button>
          </div>
          <Notice>
            共有テーマは提供待ちです。共有記録からテーマを推測して公開しません。
          </Notice>
          <div className="fr-section-heading">
            <h3>最近の体験</h3>
            <button
              className="fr-text-button"
              onClick={() => props.navigate("knowledge-list", { personId })}
            >
              すべて見る <Icon name="chevron" size={14} />
            </button>
          </div>
          {value.records.items.map((record) => (
            <RecordCard
              compact
              key={record.id}
              record={record}
              open={() => OpenRecord(props, record)}
            />
          ))}
          {!value.records.items.length && (
            <Notice>現在見られる共有記録がありません。</Notice>
          )}
          <Action
            primary
            onClick={() => props.navigate("friends-map", { personId })}
          >
            <Icon name="map" />
            地図で見る
          </Action>
          <div className="fr-actions">
            <Action
              onClick={() => props.navigate("friend-compare", { personId })}
            >
              共通点を見る
            </Action>
            <Action onClick={() => props.navigate("sharing", { personId })}>
              共有する記録を選ぶ
            </Action>
          </div>
        </>
      )}
    </div>
  );
}
function Sharing(props: Props) {
  const recordId = props.route.params.recordId ?? "";
  const [cursor, setCursor] = useScreenState("");
  const own = useRead(
    readKey(props, `own:${cursor}`),
    (signal) =>
      api.request("getRecords", {
        query: {
          limit: 20,
          cursor: cursor || undefined,
          ...periodQuery(props.route.params),
        },
        signal,
      }),
    !recordId && props.active !== false,
  );
  const record = useRead(
    readKey(props, "record"),
    (signal) =>
      api.request("getRecordsRecordId", { path: { recordId }, signal }),
    !!recordId && props.active !== false,
  );
  const { draft, update, clear } = useSharingDraft(props.scopeKey, recordId);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [verificationPending, setVerificationPending] = useState(false);
  const value = record.data?.data;
  useEffect(() => {
    if (value && !draft)
      update({
        visibility: value.record.visibility,
        sharedWith: [...value.record.sharedWith],
        version: value.record.version,
        dirty: false,
        selectedPeople: [],
      });
  }, [value, draft]);
  useEffect(() => {
    if (
      !verificationPending ||
      !value ||
      !draft ||
      value.record.version < draft.version
    )
      return;
    const current = value.record;
    update({
      ...draft,
      visibility: current.visibility,
      sharedWith: current.sharedWith,
      version: current.version,
      dirty: false,
    });
    setVerificationPending(false);
    setSaved(true);
  }, [verificationPending, value]);
  async function save() {
    if (!draft || !value || busy || verificationPending) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const written = await api.request("patchRecordsRecordId", {
        path: { recordId },
        version: draft.version,
        body: {
          visibility: draft.visibility,
          sharedWith: draft.visibility === "selected" ? draft.sharedWith : [],
        },
      });
      update({
        ...draft,
        visibility: written.data.visibility,
        sharedWith: written.data.sharedWith,
        version: written.data.version,
        dirty: false,
      });
      setVerificationPending(true);
      record.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  if (!recordId)
    return (
      <div className="fr-screen">
        <h2>共有する記録を選ぶ</h2>
        <p>共有する前に、写真・本文・相手を確認できます。</p>
        <ReadStatus state={own} />
        {own.data?.items.map((item) => (
          <Action
            key={item.id}
            onClick={() =>
              props.navigate("sharing", {
                ...props.route.params,
                recordId: item.id,
              })
            }
          >
            {item.body || "本文のない記録"}
          </Action>
        ))}
        {own.data && !own.data.items.length && (
          <Notice>共有できる記録がありません。記録を作成してください。</Notice>
        )}
        {own.data?.nextCursor && (
          <Action onClick={() => setCursor(own.data!.nextCursor!)}>
            次の記録を見る
          </Action>
        )}
      </div>
    );
  return (
    <div className="fr-screen fr-sharing">
      <div>
        <h3>この内容を共有します</h3>
        <p>選んだ相手に、下の内容が表示されます。</p>
      </div>
      <ReadStatus state={record} />
      {value && (
        <>
          <div className="fr-share-preview">
            {value.media.status === "ready" ? (
              <Media items={value.media.data.items} />
            ) : (
              <Notice error retry={record.reload}>
                写真を取得できませんでした。
              </Notice>
            )}
            <p>{value.record.body || "本文のない記録"}</p>
          </div>
        </>
      )}
      {draft && (
        <>
          <fieldset
            className="fr-radio-group"
            disabled={busy || verificationPending}
          >
            <legend>公開範囲を選ぶ</legend>
            {(
              [
                ["private", "自分だけ", "自分のみが見られます"],
                ["selected", "選んだ友達", "特定の友達にのみ見せます"],
                ["public", "公開", "だれでも見ることができます"],
              ] as const
            ).map(([visibility, title, detail]) => (
              <div className="fr-radio" key={visibility}>
                <label className="fr-radio-choice">
                  <input
                    type="radio"
                    name={`visibility-${recordId}`}
                    value={visibility}
                    checked={draft.visibility === visibility}
                    onChange={() => {
                      update({ ...draft, visibility, dirty: true });
                      setSaved(false);
                    }}
                  />
                  {visibility === "selected" ? (
                    <Icon name="people" />
                  ) : (
                    <SharingIcon
                      name={visibility === "private" ? "lock" : "globe"}
                    />
                  )}
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                </label>
                {visibility === "selected" && (
                  <button
                    type="button"
                    aria-label={`共有する友達を選ぶ · ${draft.sharedWith.length}人`}
                    onClick={() =>
                      props.navigate("friend-picker", { recordId })
                    }
                  >
                    {draft.sharedWith.length}人 ›
                  </button>
                )}
              </div>
            ))}
          </fieldset>
          {draft.visibility === "selected" && (
            <>
              {!draft.sharedWith.length && (
                <Notice>共有する友達を1人以上選んでください。</Notice>
              )}
            </>
          )}
          <h3>見せる内容</h3>
          <div className="fr-radio fr-content-kind">
            <SharingIcon name="image" />
            <span>
              <strong>写真と本文</strong>
              <small>この記録の写真と、あなたが書いた本文</small>
            </span>
            <b aria-hidden="true">✓</b>
          </div>
          <Notice>診断結果や過去の軌跡などは含まれません。</Notice>
          {draft.dirty && <small>未保存の変更があります</small>}
          {error && (
            <Notice error>
              {error}
              <button onClick={record.reload}>最新の保存内容を確認</button>
            </Notice>
          )}
          {value &&
            !verificationPending &&
            draft.version !== value.record.version && (
              <Notice>
                保存済み：
                {value.record.visibility === "private"
                  ? "自分だけ"
                  : value.record.visibility === "public"
                    ? "公開"
                    : `選んだ友達 ${value.record.sharedWith.length}人`}
                。下書きを確認してから現在の版で保存してください。
                <button
                  onClick={() =>
                    update({ ...draft, version: value.record.version })
                  }
                >
                  この版で下書きを保存する準備
                </button>
              </Notice>
            )}
          {verificationPending && (
            <Notice retry={record.reload}>
              更新は受け付けられました。保存内容を再取得して確認しています。
            </Notice>
          )}
          {saved && (
            <Notice>共有範囲を保存し、再取得した内容を確認しました。</Notice>
          )}
          <Action
            primary
            disabled={
              busy ||
              verificationPending ||
              !value ||
              (draft.visibility === "selected" && !draft.sharedWith.length) ||
              (!!value && draft.version !== value.record.version)
            }
            onClick={() => void save()}
          >
            {busy
              ? "保存中…"
              : draft.visibility === "private"
                ? "自分だけにする"
                : "共有する"}
          </Action>
          <Action
            onClick={() => {
              clear();
              props.back();
            }}
          >
            {saved ? "戻る" : "変更を取り消して戻る"}
          </Action>
        </>
      )}
    </div>
  );
}
function FriendPicker(props: Props) {
  const recordId = props.route.params.recordId ?? "";
  const { draft, update } = useSharingDraft(props.scopeKey, recordId);
  const [form, setForm] = useScreenState({
    query: "",
    submitted: "",
    selected: draft?.sharedWith ?? [],
  });
  const data = useRead(readKey(props), directory, props.active !== false);
  const visible =
    data.data?.people.filter((p) =>
      p.name
        .normalize("NFKC")
        .toLocaleLowerCase()
        .includes(form.submitted.normalize("NFKC").toLocaleLowerCase()),
    ) ?? [];
  function toggle(id: string) {
    setForm({
      ...form,
      selected: form.selected.includes(id)
        ? form.selected.filter((x) => x !== id)
        : [...form.selected, id],
    });
  }
  function done() {
    if (!draft || !data.data) return;
    update({
      ...draft,
      sharedWith: form.selected,
      selectedPeople: data.data.people.filter((p) =>
        form.selected.includes(p.id),
      ),
      visibility: "selected",
      dirty: true,
    });
    props.back();
  }
  return (
    <div className="fr-screen">
      <Search
        label="友達の表示名で検索"
        value={form.query}
        change={(query) => setForm({ ...form, query })}
        submit={() => setForm({ ...form, submitted: form.query })}
      />
      <h3>友達を選ぶ</h3>
      <p>一緒に地図を育てている友達から選べます。</p>
      <ReadStatus state={data} />
      {!draft && <Notice>共有する記録から、この画面を開いてください。</Notice>}
      <ul className="fr-person-list">
        {visible.map((person) => (
          <li className="fr-person-row" key={person.id}>
            <input
              type="checkbox"
              aria-label={`${person.name}に共有する`}
              checked={form.selected.includes(person.id)}
              onChange={() => toggle(person.id)}
            />
            <button
              className="fr-text-button"
              onClick={() =>
                props.navigate("friend-profile", { personId: person.id })
              }
            >
              <Avatar person={person} />
              <span>
                <strong>{person.name}</strong>
                <small>{person.bio}</small>
              </span>
              <Icon name="chevron" size={16} />
            </button>
          </li>
        ))}
      </ul>
      {data.data && !visible.length && (
        <Notice>該当する友達はいません。検索文字を変えてください。</Notice>
      )}
      <div className="fr-selected">
        <strong>選択中の友達：{form.selected.length}人</strong>
        {form.selected.map((id) => {
          const person =
            data.data?.people.find((p) => p.id === id) ??
            draft?.selectedPeople.find((p) => p.id === id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              aria-label={`${person?.name ?? "選択した相手"}の選択を外す`}
            >
              {person && <Avatar person={person} />}
              {person?.name ?? "選択した相手"} ×
            </button>
          );
        })}
      </div>
      <small>
        完了ではまだ共有されません。次の画面で共有範囲を保存します。
      </small>
      <Action primary disabled={!draft || !data.data} onClick={done}>
        完了
      </Action>
    </div>
  );
}
function SharedRoute(props: Props) {
  const personId = props.route.params.personId,
    routeId = props.route.params.routeId;
  const [cursor, setCursor] = useScreenState("");
  const data = useRead(
    readKey(props, cursor),
    async (signal) => {
      const list = routeId
        ? null
        : await api.request("getSharedRoutes", {
            query: { personId, limit: 20, cursor: cursor || undefined },
            signal,
          });
      const route = routeId
        ? (
            await api.request("getSavedRoutesRouteId", {
              path: { routeId },
              signal,
            })
          ).data
        : null;
      const person = route
        ? (
            await api.request("getPeoplePersonId", {
              path: { personId: route.personId },
              signal,
            })
          ).data
        : null;
      return { list, route, person };
    },
    props.active !== false,
  );
  const bridge = useMapBridge();
  const route = data.data?.route;
  useEffect(() => {
    if (!route || props.active === false) return;
    bridge.showRoute("shared-route", {
      routeId: route.id,
      geometry: route.geometry,
      waypoints: route.waypoints.map((waypoint, index) => ({
        id: `${route.id}:${index}`,
        coordinates: waypoint.coordinates,
        label: waypoint.name,
        number: index + 1,
      })),
    });
    const focus = mapFocus(route.geometry.coordinates);
    if (focus) bridge.focus("shared-route", focus);
    return () => bridge.clear("shared-route");
  }, [bridge, route, props.active]);
  return (
    <div className="fr-screen">
      <ReadStatus state={data} />
      {data.data?.list && (
        <>
          <h2>おすすめルート</h2>
          {data.data.list.items.map((item) => (
            <Action
              key={item.id}
              onClick={() =>
                props.navigate("shared-route", {
                  personId: item.personId,
                  routeId: item.id,
                })
              }
            >
              {item.title || "共有ルート"} <Icon name="chevron" size={16} />
            </Action>
          ))}
          {data.data.list.nextCursor && (
            <Action onClick={() => setCursor(data.data!.list!.nextCursor!)}>
              次のルートを見る
            </Action>
          )}
          {!data.data.list.items.length && (
            <Notice>現在見られる共有ルートがありません。</Notice>
          )}
        </>
      )}
      {route && (
        <>
          <h2>
            {route.title ||
              `${data.data?.person?.name ?? "友達"}のおすすめコース`}
          </h2>
          {data.data?.person && (
            <div className="fr-profile">
              <Avatar person={data.data.person} />
              <strong>{data.data.person.name}のルート</strong>
            </div>
          )}
          <div className="fr-route-time">
            <Icon name="clock" size={30} />
            <div>
              <small>移動時間（取得時の目安）</small>
              <strong>約 {Math.ceil(route.durationSec / 60)} 分</strong>
              <small>滞在時間・目的・各地点の説明は提供待ちです</small>
            </div>
          </div>
          <div className="fr-map">
            {props.active !== false && (
              <MapPreview bridge={bridge} label="友達のルートと立ち寄り順" />
            )}
          </div>
          <ol className="fr-stops">
            {route.waypoints.map((stop, index) => (
              <li key={`${route.id}:${index}`}>
                <span className="fr-stop-number">{index + 1}</span>
                <div>
                  <strong>{stop.name}</strong>
                  {route.legs.find((leg) => leg.toIndex === index) && (
                    <small>
                      前の地点から約{" "}
                      {Math.ceil(
                        route.legs.find((leg) => leg.toIndex === index)!
                          .durationSec / 60,
                      )}
                      分
                    </small>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <Action
            primary
            onClick={() =>
              props.navigate("route-conditions", {
                sharedRouteId: route.id,
                personId: route.personId,
              })
            }
          >
            自分の条件で経路を確認 <Icon name="chevron" size={16} />
          </Action>
          <Notice>
            元ルートを変更せず、自分の起点と移動手段で確認します。
          </Notice>
          <Action
            disabled={!props.route.params.recordId}
            onClick={() =>
              props.navigate("knowledge-detail", {
                recordId: props.route.params.recordId,
              })
            }
          >
            このコースの元の記録を見る
          </Action>
          {!props.route.params.recordId && (
            <small>元の記録との関連情報がまだありません。</small>
          )}
        </>
      )}
    </div>
  );
}
export const screens: ScreenDefinition[] = [
  {
    id: "community-home",
    title: "みんなを知る",
    component: CommunityHome,
    layout: { header: "none", contentPadding: "none", background: "soft" },
  },
  {
    id: "friends-map",
    title: "友達の地図",
    component: FriendsMap,
    layout: { header: "none", contentPadding: "none", background: "soft" },
  },
  {
    id: "friend-profile",
    title: "友達のプロフィール",
    component: FriendProfile,
    layout: { header: "back", bottomNav: false, background: "soft" },
  },
  {
    id: "friend-compare",
    title: "友達との共通点",
    component: FriendCompare,
    layout: { header: "back", bottomNav: false, background: "soft" },
  },
  {
    id: "shared-route",
    title: "友達のおすすめルート",
    component: SharedRoute,
    layout: { header: "back", bottomNav: false, background: "soft" },
  },
  {
    id: "sharing",
    title: "共有範囲の確認",
    component: Sharing,
    layout: { header: "back", bottomNav: false, background: "soft" },
  },
  {
    id: "friend-picker",
    title: "共有する友達",
    component: FriendPicker,
    layout: { header: "back", bottomNav: false, background: "soft" },
  },
];
