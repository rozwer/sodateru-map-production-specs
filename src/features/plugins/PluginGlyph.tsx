import type { PluginKind } from "./view-model";

/** Feature artwork follows the supplied motorcycle/shield/torii pictograms. */
export function PluginGlyph({
  kind,
  className = "",
  variant,
  vehicle,
}: {
  kind: PluginKind;
  className?: string;
  variant?: "store";
  vehicle?: string;
}) {
  return (
    <span
      className={`plugin-glyph plugin-glyph--${kind} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "bike" && vehicle === "moped" ? <><circle cx="13" cy="46" r="9" strokeWidth="5"/><circle cx="51" cy="46" r="9" strokeWidth="5"/><path d="M13 46h20l11-15-3-17h8m-8 0-5-6M9 28h15v18m-14-18h18" strokeWidth="5"/></> : kind === "bike" ? (
          <>
            <circle cx="13" cy="46" r="10" strokeWidth="5" />
            <circle cx="51" cy="46" r="10" strokeWidth="5" />
            <path
              d="m13 46 15-16 11 14H22M42 20l9 26M36 11h8l5 12M7 27l17 3"
              strokeWidth="5"
            />
            <path
              d="m19 29 8-8h10l8 11-9 9H24Zm8 13h11l-3 7H23Z"
              fill="currentColor"
              strokeWidth="2"
            />
            <path d="M42 19h7v8h-5" fill="currentColor" strokeWidth="2" />
            {vehicle === "large" && <path d="M19 21h17l9 13-12 4-12-5Z" fill="currentColor"/>}
          </>
        ) : kind === "disaster" ? (
          <>
            <path d="M32 5 54 14v19c0 14-12 23-22 28C22 56 10 47 10 33V14Z" />
            <path
              d="M32 22c-4 8-10 14-10 19a10 10 0 0 0 20 0c0-5-6-11-10-19Z"
              fill="currentColor"
              strokeWidth="1"
            />
          </>
        ) : kind === "nature" ? (
          <><path d="m32 6-12 17h7L15 39h11l-6 11h24l-6-11h11L37 23h7Z" /><path d="M32 50v10" /></>
        ) : kind === "pilgrimage" && variant === "store" ? <><path d="M32 60S10 37 10 24a22 22 0 0 1 44 0c0 13-22 36-22 36Z"/><path d="m32 12 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1Z" fill="currentColor" strokeWidth="1"/></> : kind === "pilgrimage" ? (
          <>
            <path
              d="M7 12c17 3 33 3 50 0M9 18h46M13 28h38M20 19l-2 37M44 19l2 37M29 19v9M35 19v9"
              strokeWidth="6"
            />
          </>
        ) : (
          <>
            <path d="m32 6 6 18 19 1-15 12 5 19-15-11-15 11 5-19L7 25l19-1Z" />
          </>
        )}
      </svg>
    </span>
  );
}
