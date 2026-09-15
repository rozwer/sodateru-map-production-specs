import { useEffect, useState } from "react";

/** Keep one map mounted while the caller changes only its plugin overlays. */
export function usePreviewPhase(revision: string | null, active: boolean) {
  const [state, setState] = useState<{
    revision: string | null;
    phase: "before" | "after";
  }>({ revision: null, phase: "before" });
  useEffect(() => {
    if (!revision || !active) {
      setState({ revision, phase: "before" });
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      setState({ revision, phase: "before" });
      if (document.hidden) return;
      timer = setInterval(
        () =>
          setState((previous) => ({
            revision,
            phase: previous.phase === "before" ? "after" : "before",
          })),
        2600,
      );
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", start);
    };
  }, [revision, active]);
  return state.revision === revision ? state.phase : "before";
}
