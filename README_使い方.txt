22年育成ゲーム・GitHub Pages用ベース

【目的】
同じ父・母・子を固定キャラクターとして、妊娠中から22歳まで育てる選択式育成ゲームの土台です。
父または母をプレイヤーとして選択できます。
どのルートでも、選択したプレイヤー側が主養育者として子どもを引き取る、というゲーム上の固定ルールを前提にしています。

【現時点で実装済み】
・父／母プレイヤー選択
・子どもの名前入力
・妊娠8週から開始
・選択するたびに妊娠週数が進行
・32週以降から確率で出産、42週までには出産
・出生時健康状態を「先天ランダム＋妊娠中の行動＋確率」で決定
・早産
・NICU
・持病
・継続的医療ケアの簡易判定
・0歳〜22歳の年齢進行
・年齢イベント
・性格／自立／反抗／依存などの内部パラメータ
・家計、清潔度、家庭安定による部屋背景変化
・CSSだけで描いた2頭身キャラクター
・妊娠中は子どもの姿を表示しない
・年齢に応じてキャラクターサイズ変更
・記録一覧
・発見済み状態一覧
・localStorageによる3スロットのセーブ／ロード
・22歳時点の状態まとめ
・0歳〜22歳の履歴から簡易日記生成

【GitHub Pagesへ置くファイル】
index.html
style.css
game.js
data/ 以下すべて

同じ階層構造を崩さずアップロードしてください。

【イベントを増やす方法】
1. data/events/ の好きな場所に新しい .json を作る
2. 1ファイル1イベントで書く
3. data/events/index.json の files にパスを1行追加する

例：
"./data/events/age/age7_new_friend.json"

ゲーム本体 game.js は基本的に触らず、JSONを追加して人生イベントを増やしていく設計です。

【イベントJSON基本形】
{
  "id": "重複しないID",
  "phase": "age",
  "minAge": 7,
  "maxAge": 7,
  "weight": 5,
  "title": "イベント名",
  "text": "{name}に起きた出来事を書く。",
  "conditions": [
    {"source":"stats","key":"kindness","gte":20}
  ],
  "choices": [
    {
      "label": "選択肢",
      "hint": "画面に小さく出す説明",
      "effects": {
        "kindness": 3,
        "independence": 1
      },
      "record": "あとで成長記録や日記材料になる文章。"
    }
  ]
}

【妊娠イベント】
phase を "pregnancy" にして minWeek / maxWeek を使います。
roles:["mother"] または roles:["father"] をつけると、そのプレイヤーだけに出ます。

【現在使える effects】
money
cleanliness
familyStability
partnerTrust
homeStress
prenatalRisk
prenatalCare
health
kindness
independence
sociability
rebellion
selfEsteem
school
delinquency
parentAttachment
parentDependence

【現在使える主な flags】
premature
nicu
chronicIllness
severeMedicalNeeds
parentsSeparated
partnerGone
delinquentPath

【重要】
このベースは完成版ではなく、拡張前提の土台です。
分岐を何百個に増やしても、イベントJSONを個別ファイルとして追加できます。
日記文章も data/diary/fragments.json に追加できます。

【次に増やしやすい項目】
・離婚／別居／復縁
・非プレイヤー親の死亡
・親の死の真相を知るイベント
・父依存／母依存
・病気ごとの専用ルート
・保育園／幼稚園／学校イベント
・友人関係
・恋愛
・進学／就職
・ヤンキー化／更生
・不登校
・引きこもり
・家出
・家庭の経済状況
・住居悪化／改装
・服装／髪型の差分
・BGM／効果音
・画像素材への差し替え
