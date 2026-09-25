import React, { useEffect, useRef, useState } from "react";
import type { ScreenProps } from "../../app/contracts";
import { useScreenState } from "../../app/useScreenState";
import { api } from "../../app/api";
import type {
  RecordView,
  ReflectionComparison,
  ReflectionComparisonCreate,
  SourceRef,
} from "../../../packages/api-client";
import { CompareView, type RecordCardData, type Notice } from "./views";
import {
  allRecords,
  deviceTimeZone,
  errorNotice,
  recordCard,
  readRecordCard,
} from "./records";
interface CompareState {
  id: string;
  key: string;
  left: string;
  right: string;
  common: string;
  difference: string;
  edited: boolean;
  comparison?: ReflectionComparison;
  records: RecordView[];
  cards: Record<string, RecordCardData>;
  pendingCreate?: ReflectionComparisonCreate;
}
export function CompareScreen({
  route,
  navigate,
  scopeKey,
  active = true,
}: ScreenProps) {
  const [state, setState] = useScreenState<CompareState>(() => ({
    id: route.params.comparisonId || crypto.randomUUID(),
    key: crypto.randomUUID(),
    left: route.params.leftRecordId || "",
    right: route.params.rightRecordId || "",
    common: "",
    difference: "",
    edited: false,
    records: [],
    cards: {},
  }));
  const [notice, setNotice] = useState<Notice>();
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const control = useRef(new AbortController());
  const lock = useRef(false);
  const timeZone = route.params.timeZone || deviceTimeZone();
  useEffect(() => {
    if (!active) return;
    const c = new AbortController();
    control.current = c;
    setBusy(true);
    setNotice(undefined);
    void (async () => {
      try {
        const records = await allRecords(c.signal, "experience");
        const comparison = route.params.comparisonId
          ? (
              await api.request("getReflectionComparisonsComparisonId", {
                path: { comparisonId: route.params.comparisonId },
                signal: c.signal,
              })
            ).data
          : undefined;
        if (c.signal.aborted) return;
        setState((s) => ({
          ...s,
          records,
          comparison: comparison || s.comparison,
          left: comparison?.left.id || s.left,
          right: comparison?.right.id || s.right,
          common: s.edited ? s.common : comparison?.common || s.common,
          difference: s.edited
            ? s.difference
            : comparison?.differences || s.difference,
        }));
        if (comparison?.evidenceState === "changed")
          setNotice({
            text: "元の記録が訂正されています。保存した共通点と違いは保持しています。現在の原文を確認してください。",
          });
      } catch (error) {
        if (!c.signal.aborted)
          setNotice(errorNotice(error, () => setRevision((x) => x + 1)));
      } finally {
        if (!c.signal.aborted) setBusy(false);
      }
    })();
    return () => c.abort();
  }, [route.params.comparisonId, scopeKey, revision, active]);
  useEffect(() => {
    if (!active) return;
    const c = new AbortController();
    void Promise.all(
      [state.left, state.right]
        .filter(Boolean)
        .map(
          async (id) =>
            [id, await readRecordCard(id, timeZone, c.signal)] as const,
        ),
    )
      .then((entries) => {
        if (!c.signal.aborted)
          setState((s) => ({ ...s, cards: Object.fromEntries(entries) }));
      })
      .catch((error) => {
        if (!c.signal.aborted) setNotice(errorNotice(error));
      });
    return () => c.abort();
  }, [state.left, state.right, timeZone, revision, active]);
  const options: RecordCardData[] = state.records.map((r) => ({
    id: r.id,
    title: r.body.split("\n")[0]?.slice(0, 60) || "体験",
    body: r.body,
    place: "",
    when: r.effectiveStartedAt
      ? new Intl.DateTimeFormat("ja-JP", {
          timeZone,
          month: "numeric",
          day: "numeric",
        }).format(r.effectiveStartedAt)
      : "日時不明",
  }));
  const save = async () => {
    if (lock.current) return;
    const left = state.records.find((r) => r.id === state.left);
    const right = state.records.find((r) => r.id === state.right);
    if (!left || !right || left.id === right.id) return;
    lock.current = true;
    setBusy(true);
    setNotice(undefined);
    try {
      const fields = {
        left: {
          type: "record",
          id: left.id,
          version: left.version,
        } as SourceRef,
        right: {
          type: "record",
          id: right.id,
          version: right.version,
        } as SourceRef,
        common: state.common,
        differences: state.difference,
        timeZone,
      };
      let saved: ReflectionComparison;
      if (state.comparison)
        saved = (
          await api.request("patchReflectionComparisonsComparisonId", {
            path: { comparisonId: state.id },
            body: fields,
            version: state.comparison.version,
            signal: control.current.signal,
          })
        ).data;
      else {
        const body = state.pendingCreate || { id: state.id, ...fields };
        setState((s) => ({ ...s, pendingCreate: body }));
        saved = (
          await api.request("postReflectionComparisons", {
            body,
            idempotencyKey: state.key,
            signal: control.current.signal,
          })
        ).data;
      }
      if (
        saved.common !== fields.common ||
        saved.differences !== fields.differences
      ) {
        saved = (
          await api.request("patchReflectionComparisonsComparisonId", {
            path: { comparisonId: saved.id },
            body: fields,
            version: saved.version,
            signal: control.current.signal,
          })
        ).data;
      }
      const current = (
        await api.request("getReflectionComparisonsComparisonId", {
          path: { comparisonId: saved.id },
          signal: control.current.signal,
        })
      ).data;
      setState((s) => ({
        ...s,
        comparison: current,
        pendingCreate: undefined,
        edited:
          s.common !== current.common || s.difference !== current.differences,
      }));
      setNotice({
        text: "比較を保存し、同じ2件の記録とともに読み直しました。",
      });
      if (!route.params.comparisonId)
        navigate("experience-compare", { ...route.params, comparisonId: current.id });
    } catch (error) {
      if (!control.current.signal.aborted)
        setNotice(errorNotice(error, () => setRevision((x) => x + 1)));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const records = [state.cards[state.left], state.cards[state.right]];
  return (
    <CompareView
      records={records}
      selectionLocked={!!state.comparison || !!state.pendingCreate}
      options={options}
      common={state.common}
      difference={state.difference}
      setCommon={(common) => setState((s) => ({ ...s, common, edited: true }))}
      setDifference={(difference) =>
        setState((s) => ({ ...s, difference, edited: true }))
      }
      select={(index, id) => {
        if (state.comparison) {
          setNotice({
            text: "保存済み比較の対象2件は固定されています。別の2件は新しく比較してください。",
          });
          return;
        }
        setState((s) => ({ ...s, [index === 0 ? "left" : "right"]: id }));
      }}
      open={(recordId) => navigate("record-edit", { recordId })}
      save={() => void save()}
      busy={busy}
      notice={notice}
    />
  );
}
