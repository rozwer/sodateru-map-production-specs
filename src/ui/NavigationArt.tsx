/** DOM/SVG reconstruction of the reference's decorative trees, path and city. No UI raster is served. */
export function NavigationArt({ community = false }: { community?: boolean }) {
  return <svg className="sm-navigation-art" viewBox="0 0 286 170" aria-hidden="true">
    <defs><linearGradient id={community ? 'park-community' : 'park-self'} x2="0" y2="1"><stop stopColor="#d9efea" stopOpacity="0"/><stop offset="1" stopColor="#d1eee2"/></linearGradient></defs>
    <path d="M0 111Q65 91 126 106T286 94V170H0Z" fill={`url(#${community ? 'park-community' : 'park-self'})`}/>
    <g fill="#dbeef0"><path d="M82 106V62h13v44M101 108V38h14v70M120 105V69h16v36M160 106V48h11v58M173 108V59h16v49M225 107V69h13v38"/><path d="m105 38 4-8 3 8m51 10 4-12 3 12"/></g>
    <g fill="#f6fcfa"><path d="M86 68h3v4h-3m0 5h3v4h-3m19-31h3v4h-3m5 0h3v4h-3m-5 8h3v4h-3m5 0h3v4h-3m15 9h3v4h-3m6 0h3v4h-3m41-1h3v4h-3m5 0h3v4h-3"/></g>
    {[{x:27,y:17,s:1.3},{x:68,y:63,s:.85},{x:153,y:87,s:.55},{x:218,y:75,s:.8},{x:265,y:64,s:.86}].map(({x,y,s},i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0C-13-8-25 10-17 21-36 26-26 49-14 46-33 62-11 76 0 65 12 77 35 60 19 49 34 39 21 21 12 22 25 8 9-10 0 0Z" fill={community && i % 2 ? '#d7df9d' : '#addccd'} opacity=".8"/>
      <path d="M0 83V26m0 27-11-15m11 24 15-19m-15-2 8-16" fill="none" stroke="#78bca7" strokeWidth="1.5"/>
    </g>)}
    <path d="M162 114c-80 1-66 10-36 20 30 11 22 21-10 36h-68c72-24 81-24 43-35-34-10-28-19 71-21Z" fill="#fff" opacity=".92"/>
    <g fill="#b9dfb9" opacity=".65"><path d="m8 143 4-11 3 11m7 1 2-7 3 7m155-2 3-10 3 10m13 2 2-8 3 8m67-4 4-12 3 12"/></g>
    {community && <><g stroke="#baad80" strokeWidth="3"><path d="M27 131h48M28 136h47M34 136v13M69 136v13M222 130h44M222 135h44M228 135v13M260 135v13"/></g><g><circle cx="43" cy="111" r="5" fill="#6a6454"/><path d="M37 129v-9a6 6 0 0 1 12 0v9" fill="#58899d"/><circle cx="59" cy="108" r="5" fill="#6d6c62"/><path d="M53 129v-12a6 6 0 0 1 12 0v12" fill="#d4c7a6"/><circle cx="239" cy="109" r="5" fill="#5c5c55"/><path d="M233 128v-10a6 6 0 0 1 12 0v10" fill="#6793a0"/></g></>}
  </svg>;
}
