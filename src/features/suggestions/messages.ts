export const suggestionMessages = {
  checkinTitle: '今日はどう過ごしたい？',
  checkinLead: '今の気持ちや希望を入力して\nあなたに合う過ごし方を見つけましょう。',
  state: '今の状態', wishes: 'どんなふうに過ごしたい？', optional: '（任意）',
  time: '時間の目安', mode: '移動手段', companion: '同行者', effort: '移動のきつさ',
  search: 'この条件で探す', saveOnly: '回答だけ残す', skip: '今は答えず地図へ',
  listTitle: 'あなたにおすすめの過ごし方',
  listLead: '今の希望に合いそうな場所を見つけました。\n気になる場所を選んで、詳細を見てみましょう。',
  conditions: '現在の希望条件', edit: '編集する', change: '条件を変更',
  reason: 'この場所があなたにおすすめの理由', wishQuote: 'あなたの希望',
  confirmed: '確認できること', unknown: 'まだ確認できていないこと',
  select: 'これにする', later: '後で考える', memo: 'メモに残す', dismiss: '今回は見送る',
  source: '出典', official: '出典サイトをみる', photoMissing: '写真は未取得です',
  loading: '読み込んでいます…', saving: '保存しています…', retry: '再試行',
  empty: 'この条件に合う候補はありません。希望や移動条件を変えて探せます。',
  noBatch: '今日の希望から候補を探しましょう。',
  saved: '回答を保存しました。候補の選択や訪問は作成していません。',
  unSaved: '未保存の入力', stop: 'この場所・活動の提案を停止',
};
export const timeChoices = [['15', '15分'], ['30', '30分'], ['60', '1時間'], ['120+', '2時間以上']] as const;
export const modeChoices = [['walking', '徒歩'], ['cycling', '自転車'], ['transit', '電車・バス'], ['any', 'どれでも']] as const;
export const companionChoices = [['solo', 'ひとり'], ['friends_family', '友人・家族'], ['children', '子どもと'], ['pet', 'ペットと']] as const;
export const effortChoices = [['easy', '無理しない距離'], ['moderate', '少し歩いてもよい'], ['any', 'どこでもよい']] as const;
