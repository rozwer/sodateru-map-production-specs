/** Decorative city silhouette for the approved store header; not geographic data. */
export function StoreSkyline() {
  return <svg className="grow-store-skyline" viewBox="0 0 440 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path fill="#fafffd" d="M0 22C18 15 27 36 42 27S59 8 77 14 92 30 111 16 135 8 150 17V0H0ZM302 24c10-28 35-14 39-7 22-11 36 0 40 13 18-2 22 7 37 11h22V0H300Z"/>
    <g fill="#c5edf0"><path d="M19 150V68h29v82M50 150V45h22v105M79 150V85h35v65M126 150V48h30v102M174 150V76h30v74M211 150V58h28v92M314 150V66h31v84M356 150V42h26v108M390 150V73h28v77"/><path d="m274 7 3 59 9 8-5 5 12 70h-44l15-70-5-5 10-8Zm-3 89-8 42h19l-7-42Z"/></g>
    <g fill="#e8fbf8">{[29,59,136,184,221,324,366,400].map(x => <g key={x}>{[80,98,116].map(y=><rect key={y} x={x} y={y} width="5" height="8" rx="1"/>)}</g>)}</g>
    <path fill="#d9f1df" d="M0 140V107q14-36 29-6 18-19 28 8 18-14 29 9 20-24 41 5 23-18 42 4 14-21 29-6 35-19 53 10 20-22 35-7 12-22 30-11 14-29 32-12 21-34 42-17 21-16 30 5v61Z"/>
    <g fill="#b8e6d2">{[11,96,163,305,430].map((x,i)=><g key={x}><path d={`M${x} 149v-33`} stroke="#a7d7cc" strokeWidth="3"/><circle cx={x} cy={106+i%2*6} r="13"/></g>)}</g>
  </svg>;
}
