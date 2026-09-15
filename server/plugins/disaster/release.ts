import type { PluginRelease, Declaration } from '../../features/plugins/index.ts';
import { defaultSettings, definitions, settingsSchema, validateSettings } from './catalog.ts';
const declaration = (): Declaration[] => [{targetKey:'layer:disaster',property:'visibility',value:true}];
export const disasterRelease: PluginRelease = {
  manifest:{id:'disaster',name:'防災情報',description:'洪水想定・地形・降水解析を出典と時点付きで地図に重ねます。',category:'地域情報',author:'育てる地図',
    pluginVersion:'1.0.0',updatedAt:1789437600000,changeLog:'実提供元の画像と地域・時点を保存して再取得。停止時に地図表示を解除。',icon:'shield',
    usageInfo:['地域とレイヤーを設定し、導入後に防災情報を更新してください。','現在の浸水や安全を判定する機能ではありません。'],
    sources:Object.values(definitions).map(d=>({name:d.label,url:d.sourceUrl,attribution:d.attribution})),
    settingsSchema,defaultSettings:{...defaultSettings},trialConditions:['試用は模擬表示です。実際の災害情報ではありません。']},
  declarations(settings){validateSettings(settings);return declaration();},
  trial(settings){
    const s=validateSettings(settings),[w,south,e,n]=s.region.bounds;
    return {dataKind:'mock',label:'防災レイヤーの模擬表示（実際の災害情報ではありません）',generatedAt:Date.now(),declarations:declaration(),
      features:[{type:'Feature',id:'disaster-trial',geometry:{type:'Polygon',coordinates:[[[w,south],[e,south],[e,n],[w,n],[w,south]]]},
        properties:{kind:'hazard',label:'模擬ハザード表示',legendId:'mock-hazard',sourceIds:['mock'],status:'simulated',value:null,unit:null}}],
      legends:[{id:'mock-hazard',label:'模擬ハザード',color:'#E59745',meaning:'表示確認用の架空の範囲。実ハザードや現在の浸水ではありません。'}],
      sources:[{id:'mock',title:'表示確認用の模擬データ',url:null,attribution:'育てる地図',dataKind:'mock',fetchedAt:null,sourceUpdatedAt:null,observedAt:null,issuedAt:null,validAt:null}],
      warnings:['この試用結果は保存・実取得されません。導入後に実情報を取得してください。']};
  },
};
