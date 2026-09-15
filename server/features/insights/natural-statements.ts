import type {AxisKey} from "./daily-evidence.ts";

// A bounded set of completed-action clauses, independent of dates, IDs and scores.
// Keep the original sentence as the citation; never rewrite the source record.
const completed:Record<AxisKey,RegExp>={
 nature:/(?:公園|森|林|山|海辺|川辺|自然の中)(?:を(?:ゆっくり|少し)?(?:散歩し(?:た|て|ながら)|歩いた)|で過ごした)|自然に触れた|自然を楽しんだ/u,
 books:/(?:本|書籍|小説|絵本|漫画)を(?:読んだ|読み(?=[、,]|$)|開いて|開いた|見つけ(?:た|[、,])|探した|眺めた|買った|発見(?:した)?$)|読書をした/u,
 cafe:/(?:カフェ|喫茶店)で(?:本を読(?:んだ|み)|少し読んだ|話(?:した|し)|[^。]{0,24}話をし(?:[、,]|た|$)|(?:お茶|コーヒー)を飲んだ|過ごした|休憩した)/u,
 walk:/散歩(?:をした|をして|した|して|しながら)|(?:公園|森|林|山|海辺|川辺|街|近所|商店街)を歩いた/u,
 social:/(?:友人|友達|家族|同僚|恋人|知人)と(?:[^。]{0,24}(?:話した|話し[、,]|話をし[、,])|合流してごはん|過ごした|会った|食事した|食事をした)|人と過ごした/u
};
// Deny a whole named category, not an isolated activity such as "did not read".
// Coordinated "読む・探すこと" names the book-interaction category explicitly.
const declined:Record<AxisKey,RegExp>={
 nature:/自然に触れなかった|自然に触れる時間(?:や|と|は)[^。]*(?:取らなかった|取らず|なかった)/u,
 books:/本に触れなかった|本を読む・探すこと(?:と|や)[^。]*(?:しなかった|なかった)/u,
 cafe:/(?:カフェ|喫茶店)(?:には?寄ら(?:ず|なかった)|に行かなかった|で過ごさなかった|への立ち寄り[^。]*しなかった)/u,
 walk:/散歩(?:をしなかった|しなかった)|散歩(?:の時間|や)[^。]*(?:取らなかった|取らず|なかった)/u,
 social:/(?:誰とも|人とも?)過ごさなかった|人と過ごす時間(?:も|は|と)[^。]*(?:取らなかった|取らず)/u
};

export function classifyNaturalStatement(text:string,key:AxisKey):boolean|null{
 // A plan, hypothetical, report about another person, or hearsay is not self evidence.
 if(/たい|予定|つもり|わけではない|わけじゃない|とは限らない|とは言えない|ことはない|ことがない|ていない|てない|読んだら|散歩したら|読もう|歩こう|しよう|明日|今度|いつか|もし|だったら|なら|らしい|と聞|と言(?:った|って)|(?:友人|友達|家族|同僚|恋人|知人|彼女?|誰か)(?:が|は)/u.test(text))return null;
 const yes=completed[key].test(text);
 // A morning/evening/trip-only denial cannot establish an entire day without that axis.
 const limited=/朝|午前|午後|昼|夕方|夜|途中|帰り|行く前|その時/u.test(text);
 const no=!limited&&declined[key].test(text);
 return yes===no?null:yes;
}
