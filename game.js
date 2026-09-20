const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const DEFAULT_STATE = () => ({
  version: 1,
  started: false,
  ended: false,
  playerRole: "mother",
  childName: "ひなた",
  phase: "pregnancy",
  pregnancyWeek: 8,
  age: -1,
  turn: 0,
  seed: {
    congenital: randInt(0, 100),
    premature: randInt(0, 100),
    baselineHealth: randInt(45, 95),
    temperament: randInt(0, 100)
  },
  stats: {
    money: 50,
    cleanliness: 50,
    familyStability: 55,
    partnerTrust: 55,
    homeStress: 20,
    prenatalRisk: 10,
    prenatalCare: 30,
    health: 0,
    kindness: 0,
    independence: 0,
    sociability: 0,
    rebellion: 0,
    selfEsteem: 0,
    school: 0,
    delinquency: 0,
    parentAttachment: 0,
    parentDependence: 0
  },
  flags: {
    premature: false,
    nicu: false,
    chronicIllness: false,
    severeMedicalNeeds: false,
    parentsSeparated: false,
    partnerGone: false,
    delinquentPath: false
  },
  history: [],
  discovered: [],
  usedEvents: [],
  currentEventId: null
});

let state = DEFAULT_STATE();
let config = null;
let eventManifest = null;
let events = [];
let diaryData = null;

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function clamp(n, min=0, max=100){ return Math.max(min, Math.min(max, n)); }
function choice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
function deepClone(v){ return JSON.parse(JSON.stringify(v)); }

async function loadData(){
  config = await fetch("./data/config.json").then(r => r.json());
  eventManifest = await fetch("./data/events/index.json").then(r => r.json());
  diaryData = await fetch("./data/diary/fragments.json").then(r => r.json());
  const loaded = await Promise.all(
    eventManifest.files.map(path => fetch(path).then(r => {
      if(!r.ok) throw new Error(`イベントJSONを読み込めません: ${path}`);
      return r.json();
    }))
  );
  events = loaded.flatMap(v => Array.isArray(v) ? v : [v]);
}

function setStateFromSave(saved){
  state = Object.assign(DEFAULT_STATE(), saved);
  state.stats = Object.assign(DEFAULT_STATE().stats, saved.stats || {});
  state.flags = Object.assign(DEFAULT_STATE().flags, saved.flags || {});
  state.history ||= [];
  state.discovered ||= [];
  state.usedEvents ||= [];
}

function initUI(){
  $$(".role-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".role-choice").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.playerRole = btn.dataset.role;
    });
  });

  $("#startBtn").addEventListener("click", startGame);
  $("#openRecordBtn").addEventListener("click", showRecords);
  $("#openSaveBtn").addEventListener("click", showSaveModal);
  $("#loadFromSetupBtn").addEventListener("click", showSaveModal);
  $("#closeModalBtn").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", e => {
    if(e.target.id === "modalBackdrop") closeModal();
  });
  $("#openDiaryBtn").addEventListener("click", showDiary);
  $("#endingRecordBtn").addEventListener("click", showRecords);
  $("#newGameBtn").addEventListener("click", () => location.reload());
}

function startGame(){
  const name = $("#childNameInput").value.trim() || "ひなた";
  const role = $(".role-choice.selected")?.dataset.role || "mother";
  state = DEFAULT_STATE();
  state.started = true;
  state.childName = name;
  state.playerRole = role;
  addHistory("妊娠8週", `${role === "mother" ? "母" : "父"}として、${name}が生まれる前の生活が始まった。`, "start");
  $("#setupPanel").classList.add("hidden");
  $("#gamePanel").classList.remove("hidden");
  render();
  nextEvent();
}

function render(){
  const s = state.stats;
  $("#guardianLabel").textContent = state.playerRole === "mother" ? "母" : "父";
  $("#moneyStat").textContent = Math.round(s.money);
  $("#cleanStat").textContent = Math.round(s.cleanliness);
  $("#familyStat").textContent = Math.round(s.familyStability);
  $("#independenceStat").textContent = Math.round(s.independence);

  if(state.phase === "pregnancy"){
    $("#ageLabel").textContent = `妊娠 ${state.pregnancyWeek}週`;
    $("#healthLabel").textContent = "出生前";
    $("#phaseKicker").textContent = "PREGNANCY";
  }else{
    $("#ageLabel").textContent = `${state.age}歳`;
    $("#healthLabel").textContent = healthText();
    $("#phaseKicker").textContent = `AGE ${state.age}`;
  }

  renderHome();
  renderCharacter();
}

function renderHome(){
  const room = $("#room");
  const c = state.stats.cleanliness;
  const m = state.stats.money;
  room.classList.remove("room-normal","room-clean","room-worn","room-poor","room-nice");
  let label = "普通";

  if(c < 25 || m < 18){
    room.classList.add("room-poor");
    label = "かなり荒れている";
  }else if(c < 42 || m < 35){
    room.classList.add("room-worn");
    label = "少し傷んでいる";
  }else if(c > 72 && m > 70){
    room.classList.add("room-nice");
    label = "かなり整っている";
  }else if(c > 64){
    room.classList.add("room-clean");
    label = "きれい";
  }else{
    room.classList.add("room-normal");
  }
  $("#homeLabel").textContent = label;
  $("#trash").classList.toggle("hidden", c >= 35);
}

function renderCharacter(){
  const chibi = $("#chibi");
  chibi.className = "chibi";
  $("#crib").classList.add("hidden");
  $("#desk").classList.add("hidden");

  if(state.phase === "pregnancy"){
    chibi.classList.add("hidden");
    $("#sceneCaption").textContent = "妊娠中。まだこの部屋に子どもの姿はない。";
    return;
  }

  chibi.classList.remove("hidden");
  let stage = "stage-adult";
  if(state.age <= 0){ stage = "stage-baby"; $("#crib").classList.remove("hidden"); }
  else if(state.age <= 3) stage = "stage-toddler";
  else if(state.age <= 11){ stage = "stage-child"; $("#desk").classList.remove("hidden"); }
  else if(state.age <= 17){ stage = "stage-teen"; $("#desk").classList.remove("hidden"); }
  chibi.classList.add(stage);

  if(state.stats.rebellion > 55 || state.stats.delinquency > 45) chibi.classList.add("trait-rebel");
  if(state.flags.chronicIllness || state.flags.severeMedicalNeeds) chibi.classList.add("trait-sick");
  if(state.stats.kindness > 50) chibi.classList.add("trait-kind");

  $("#sceneCaption").textContent = `${state.childName}、${state.age}歳。${currentTraitSentence()}`;
}

function currentTraitSentence(){
  if(state.flags.severeMedicalNeeds) return "日常的な医療管理を受けながら暮らしている。";
  if(state.flags.chronicIllness) return "通院を続けながら成長している。";
  if(state.stats.delinquency > 60) return "かなり荒れた行動が目立つ。";
  if(state.stats.rebellion > 55) return "反抗心が強くなっている。";
  if(state.stats.kindness > 55 && state.stats.independence > 45) return "人に優しく、自分で考える力も育っている。";
  if(state.stats.parentDependence > 60) return "養育者への依存がかなり強い。";
  return "まだいろいろな可能性が残っている。";
}

function healthText(){
  if(state.flags.severeMedicalNeeds) return "常時医療あり";
  if(state.flags.chronicIllness) return "定期通院";
  if(state.stats.health >= 75) return "良好";
  if(state.stats.health >= 50) return "おおむね安定";
  return "やや不安定";
}

async function nextEvent(){
  render();
  if(state.ended) return;

  if(state.phase === "pregnancy"){
    if(shouldBirthNow()){
      doBirth();
      return;
    }
    const ev = pickEvent("pregnancy");
    if(ev){ showEvent(ev); return; }
    showFallbackPregnancy();
    return;
  }

  if(state.age >= 22){
    finishGame();
    return;
  }

  const ev = pickEvent("age");
  if(ev){ showEvent(ev); return; }
  showFallbackAge();
}

function pickEvent(phase){
  const candidates = events.filter(ev => {
    if(state.usedEvents.includes(ev.id) && !ev.repeatable) return false;
    if(ev.phase !== phase) return false;
    if(ev.roles && !ev.roles.includes(state.playerRole)) return false;
    if(phase === "pregnancy"){
      if(ev.minWeek != null && state.pregnancyWeek < ev.minWeek) return false;
      if(ev.maxWeek != null && state.pregnancyWeek > ev.maxWeek) return false;
    }
    if(phase === "age"){
      if(ev.minAge != null && state.age < ev.minAge) return false;
      if(ev.maxAge != null && state.age > ev.maxAge) return false;
    }
    return conditionsPass(ev.conditions || []);
  });
  if(!candidates.length) return null;
  const weighted = [];
  for(const ev of candidates){
    const w = ev.weight || 1;
    for(let i=0;i<w;i++) weighted.push(ev);
  }
  return choice(weighted);
}

function conditionsPass(conditions){
  return conditions.every(c => {
    let value;
    if(c.source === "stats") value = state.stats[c.key];
    else if(c.source === "flags") value = state.flags[c.key];
    else value = state[c.key];

    if("eq" in c && value !== c.eq) return false;
    if("neq" in c && value === c.neq) return false;
    if("gte" in c && !(value >= c.gte)) return false;
    if("lte" in c && !(value <= c.lte)) return false;
    return true;
  });
}

function showEvent(ev){
  state.currentEventId = ev.id;
  $("#eventTitle").textContent = interpolate(ev.title);
  $("#eventText").textContent = interpolate(ev.text);
  $("#choices").innerHTML = "";
  ev.choices.forEach(ch => {
    if(ch.conditions && !conditionsPass(ch.conditions)) return;
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerHTML = `<strong>${escapeHtml(interpolate(ch.label))}</strong>${ch.hint ? `<span>${escapeHtml(interpolate(ch.hint))}</span>` : ""}`;
    btn.addEventListener("click", () => applyChoice(ev, ch));
    $("#choices").appendChild(btn);
  });
}

function applyChoice(ev, ch){
  applyEffects(ch.effects || {});
  if(ch.flags) Object.assign(state.flags, ch.flags);
  if(ch.discover) discover(ch.discover);
  state.usedEvents.push(ev.id);

  const label = state.phase === "pregnancy" ? `妊娠${state.pregnancyWeek}週` : `${state.age}歳`;
  addHistory(label, interpolate(ch.record || ch.label), ev.id);

  if(ch.advanceWeeks){
    state.pregnancyWeek += ch.advanceWeeks;
    state.turn++;
  }else if(state.phase === "pregnancy"){
    state.pregnancyWeek += 2;
    state.turn++;
  }

  if(ch.advanceYears){
    state.age += ch.advanceYears;
  }else if(state.phase === "age"){
    state.age += 1;
  }

  if(ch.forceBirth) doBirth();
  else nextEvent();
}

function applyEffects(effects){
  Object.entries(effects).forEach(([key, val]) => {
    if(key in state.stats){
      state.stats[key] = clamp(state.stats[key] + val, -100, 100);
    }
  });
}

function shouldBirthNow(){
  const w = state.pregnancyWeek;
  if(w < 32) return false;
  if(w >= 42) return true;
  const base = {32:4,33:5,34:7,35:9,36:12,37:18,38:26,39:35,40:48,41:65}[w] || 4;
  const risk = state.stats.prenatalRisk * .18 + state.seed.premature * .08;
  return Math.random() * 100 < base + risk;
}

function doBirth(){
  const week = state.pregnancyWeek;
  state.flags.premature = week < 37;

  const randomNoise = randInt(-18,18);
  let health = state.seed.baselineHealth
    + state.stats.prenatalCare * .20
    - state.stats.prenatalRisk * .28
    + randomNoise;

  if(state.seed.congenital > 92) health -= randInt(28,48);
  if(state.seed.congenital > 97) health -= randInt(15,30);
  if(week < 34) health -= randInt(12,25);
  else if(week < 37) health -= randInt(4,12);

  health = clamp(Math.round(health), 8, 100);
  state.stats.health = health;

  if((week < 35 && Math.random() < .7) || health < 42) state.flags.nicu = true;
  if(health < 48 || (state.seed.congenital > 88 && Math.random() < .55)) state.flags.chronicIllness = true;
  if(health < 25 || (state.seed.congenital > 97 && Math.random() < .65)) state.flags.severeMedicalNeeds = true;

  state.phase = "age";
  state.age = 0;

  let text = `${state.childName}が妊娠${week}週で生まれた。`;
  if(state.flags.nicu) text += " 出生後はNICUでの管理が必要になった。";
  else if(state.flags.chronicIllness) text += " 生まれてまもなく、継続的な通院が必要だと分かった。";
  else text += " 出生直後の状態はおおむね安定していた。";

  addHistory("0歳・出生", text, "birth");
  discover(state.flags.premature ? "早産" : "満期付近の出生");
  if(state.flags.nicu) discover("NICU経験");
  if(state.flags.chronicIllness) discover("持病あり");
  if(state.flags.severeMedicalNeeds) discover("継続的な医療ケア");

  render();
  showBirthEvent(text);
}

function showBirthEvent(text){
  $("#phaseKicker").textContent = "BIRTH";
  $("#eventTitle").textContent = `${state.childName}が生まれた`;
  $("#eventText").textContent = text;
  $("#choices").innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "choice-btn";
  btn.innerHTML = "<strong>育児を始める</strong><span>0歳から22歳まで、毎年の選択を重ねます。</span>";
  btn.addEventListener("click", () => nextEvent());
  $("#choices").appendChild(btn);
}

function showFallbackPregnancy(){
  const motherChoices = [
    {label:"今日は早めに休む",hint:"身体を休めて次の週へ進む。",effects:{prenatalCare:3,homeStress:-2,cleanliness:-1},record:"早めに休んで過ごした。"},
    {label:"部屋を片づける",hint:"家の状態を整える。",effects:{cleanliness:6,homeStress:-1},record:"生まれてくる子のために部屋を片づけた。"},
    {label:"少し無理をして働く",hint:"家計は助かるが、負担は増える。",effects:{money:5,prenatalRisk:3,homeStress:2},record:"身体に負担を感じながらも働いた。"}
  ];
  const fatherChoices = [
    {label:"家事を引き受ける",hint:"妻の負担を減らす。",effects:{familyStability:4,partnerTrust:4,cleanliness:4,homeStress:-3},record:"家事を引き受けて家庭を整えた。"},
    {label:"残業して収入を増やす",hint:"家計は増えるが家庭にいる時間は減る。",effects:{money:6,partnerTrust:-1,homeStress:1},record:"残業を増やして家計を支えた。"},
    {label:"自分の時間を優先する",hint:"家庭への関わりは少なくなる。",effects:{partnerTrust:-4,familyStability:-3,homeStress:3},record:"家庭より自分の時間を優先した。"}
  ];
  showSyntheticEvent("何事もない一日", "大きな出来事はない。次の時間をどう過ごす？", state.playerRole==="mother"?motherChoices:fatherChoices, "pregnancy");
}

function showFallbackAge(){
  const age = state.age;
  const choices = [
    {label:"よく話を聞く",hint:"安心感や優しさに影響する。",effects:{kindness:3,parentAttachment:3,selfEsteem:2},record:`${state.childName}の話をよく聞いた。`},
    {label:"できることは自分でさせる",hint:"自立心が育ちやすい。",effects:{independence:4,selfEsteem:1,parentDependence:-2},record:`${state.childName}に、自分で考えてやらせてみた。`},
    {label:"先回りして全部やってあげる",hint:"安心は増えるが依存が強まることがある。",effects:{parentAttachment:3,parentDependence:5,independence:-3},record:`${state.childName}が困らないよう、先回りして手を貸した。`}
  ];
  if(age >= 12){
    choices.push({label:"強く叱って従わせる",hint:"反抗・家庭緊張が増える可能性。",effects:{rebellion:6,homeStress:5,parentAttachment:-4},record:`${state.childName}を強く叱り、従わせようとした。`});
  }
  showSyntheticEvent(`${age}歳の日常`, `${state.childName}は${age}歳。大きな事件のない時期にも、日々の接し方は少しずつ残っていく。`, choices, "age");
}

function showSyntheticEvent(title, text, choices, phase){
  $("#eventTitle").textContent = title;
  $("#eventText").textContent = text;
  $("#choices").innerHTML = "";
  choices.forEach(ch => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerHTML = `<strong>${escapeHtml(ch.label)}</strong><span>${escapeHtml(ch.hint||"")}</span>`;
    btn.addEventListener("click", () => {
      applyEffects(ch.effects||{});
      const label = phase === "pregnancy" ? `妊娠${state.pregnancyWeek}週` : `${state.age}歳`;
      addHistory(label, ch.record || ch.label, "fallback");
      if(phase === "pregnancy") state.pregnancyWeek += 2;
      else state.age += 1;
      nextEvent();
    });
    $("#choices").appendChild(btn);
  });
}

function finishGame(){
  state.ended = true;
  render();
  $("#gamePanel").classList.add("hidden");
  $("#endingPanel").classList.remove("hidden");
  const summary = endingProfile();
  $("#endingTitle").textContent = `${state.childName}、22歳`;
  $("#endingSummary").innerHTML = Object.entries(summary).map(([k,v]) =>
    `<div class="ending-row"><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`
  ).join("");
  discover(summary["性格"]);
  discover(summary["自立"]);
  discover(summary["健康"]);
  addHistory("22歳", `${state.childName}は22歳になった。`, "ending");
}

function endingProfile(){
  const s = state.stats;
  let personality = "穏やかな大人";
  if(s.delinquency > 60) personality = "荒っぽさを残した大人";
  else if(s.rebellion > 60) personality = "反骨心の強い大人";
  else if(s.kindness > 55) personality = "人に優しい大人";
  else if(s.selfEsteem < -20) personality = "自信を持ちにくい大人";

  let independence = "必要なことは自分で決められる";
  if(s.parentDependence > 65 && s.independence < 35) independence = "養育者への依存がかなり強い";
  else if(s.independence > 65) independence = "かなり自立している";
  else if(s.independence < 20) independence = "まだ大人になりきれない部分が目立つ";

  let health = healthText();
  if(state.flags.nicu && !state.flags.chronicIllness) health += "（乳児期にNICU経験）";

  let family = s.parentAttachment > 55 ? "養育者との結びつきが強い" : "養育者とは一定の距離がある";
  if(s.parentDependence > 65) family += "・依存傾向あり";

  let life = "生活はおおむね安定";
  if(s.money < 25 || s.cleanliness < 25) life = "生活環境には不安定さが残った";
  else if(s.money > 70 && s.cleanliness > 70) life = "整った生活環境を維持している";

  return {
    "性格": personality,
    "自立": independence,
    "健康": health,
    "養育者との関係": family,
    "生活": life
  };
}

function addHistory(ageLabel, text, eventId){
  state.history.push({
    ageLabel,
    text,
    eventId,
    at: Date.now()
  });
}

function discover(label){
  if(label && !state.discovered.includes(label)) state.discovered.push(label);
}

function showRecords(){
  openModal("RECORD","成長記録",`
    <div class="stat-table">
      ${statCell("名前",state.childName)}
      ${statCell("プレイヤー",state.playerRole==="mother"?"母":"父")}
      ${statCell("現在",state.phase==="pregnancy"?`妊娠${state.pregnancyWeek}週`:`${state.age}歳`)}
      ${statCell("健康",state.phase==="pregnancy"?"出生前":healthText())}
    </div>
    <h3>発見済みの状態</h3>
    <div class="record-list">
      <div class="record-item"><p>${state.discovered.length ? state.discovered.map(escapeHtml).join(" ／ ") : "まだありません。"}</p></div>
    </div>
    <h3>年齢ごとの記録</h3>
    <div class="record-list">
      ${state.history.length ? state.history.map(h => `<div class="record-item"><div class="age">${escapeHtml(h.ageLabel)}</div><p>${escapeHtml(h.text)}</p></div>`).join("") : "<p>まだ記録はありません。</p>"}
    </div>
  `);
}

function showSaveModal(){
  let html = '<div class="save-grid">';
  for(let i=1;i<=3;i++){
    const saved = getSave(i);
    const desc = saved ? `${saved.childName}／${saved.phase==="pregnancy"?`妊娠${saved.pregnancyWeek}週`:`${saved.age}歳`}` : "空きスロット";
    html += `<div class="save-slot">
      <h3>SLOT ${i}</h3><p>${escapeHtml(desc)}</p>
      <button class="secondary" data-save="${i}">ここにセーブ</button>
      <button class="ghost" data-load="${i}" ${saved?"":"disabled"}>ロード</button>
      <button class="ghost" data-delete="${i}" ${saved?"":"disabled"}>削除</button>
    </div>`;
  }
  html += "</div>";
  openModal("SAVE","セーブ／ロード",html);

  $$("[data-save]").forEach(btn => btn.addEventListener("click", () => {
    localStorage.setItem(`ikusei_save_${btn.dataset.save}`, JSON.stringify(state));
    showSaveModal();
  }));
  $$("[data-load]").forEach(btn => btn.addEventListener("click", () => {
    const saved = getSave(btn.dataset.load);
    if(!saved) return;
    setStateFromSave(saved);
    $("#setupPanel").classList.add("hidden");
    $("#endingPanel").classList.add("hidden");
    $("#gamePanel").classList.toggle("hidden", state.ended);
    if(state.ended) $("#endingPanel").classList.remove("hidden");
    closeModal();
    render();
    if(state.ended) finishGame();
    else nextEvent();
  }));
  $$("[data-delete]").forEach(btn => btn.addEventListener("click", () => {
    localStorage.removeItem(`ikusei_save_${btn.dataset.delete}`);
    showSaveModal();
  }));
}

function getSave(slot){
  try{
    const raw = localStorage.getItem(`ikusei_save_${slot}`);
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}

function showDiary(){
  const paragraphs = [];
  const birth = state.history.find(h => h.eventId === "birth");
  const intro = choice(diaryData.intro).replaceAll("{name}",state.childName);
  paragraphs.push(`<p>${escapeHtml(intro)}</p>`);

  if(birth){
    paragraphs.push(`<h3>0歳</h3><p>${escapeHtml(birth.text)}</p>`);
  }

  const grouped = {};
  state.history.forEach(h => {
    const match = h.ageLabel.match(/^(\d+)歳$/);
    if(match){
      const a = Number(match[1]);
      (grouped[a] ||= []).push(h.text);
    }
  });

  Object.keys(grouped).map(Number).sort((a,b)=>a-b).forEach(age => {
    const prefix = diaryPrefix(age);
    const memories = grouped[age].slice(0,3).join(" ");
    paragraphs.push(`<h3>${age}歳</h3><p>${escapeHtml(prefix)} ${escapeHtml(memories)}</p>`);
  });

  const profile = endingProfile();
  const close = choice(diaryData.closing)
    .replaceAll("{name}",state.childName)
    .replaceAll("{personality}",profile["性格"])
    .replaceAll("{independence}",profile["自立"]);
  paragraphs.push(`<h3>22歳・現在</h3><p>${escapeHtml(close)}</p>`);

  openModal("DIARY",`${state.childName}の22年日記`,`<div class="diary">${paragraphs.join("")}</div>`);
}

function diaryPrefix(age){
  if(age <= 2) return choice(diaryData.earlyChildhood);
  if(age <= 6) return choice(diaryData.childhood);
  if(age <= 12) return choice(diaryData.schoolAge);
  if(age <= 17) return choice(diaryData.teen);
  return choice(diaryData.youngAdult);
}

function openModal(kicker,title,body){
  $("#modalKicker").textContent = kicker;
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = body;
  $("#modalBackdrop").classList.remove("hidden");
}
function closeModal(){ $("#modalBackdrop").classList.add("hidden"); }
function statCell(k,v){ return `<div class="stat-cell"><span>${escapeHtml(k)}</span><strong>${escapeHtml(String(v))}</strong></div>`; }
function interpolate(text=""){
  return String(text)
    .replaceAll("{name}", state.childName)
    .replaceAll("{guardian}", state.playerRole==="mother"?"母":"父");
}
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

window.addEventListener("DOMContentLoaded", async () => {
  initUI();
  try{
    await loadData();
  }catch(err){
    console.error(err);
    alert("ゲームデータの読み込みに失敗しました。GitHub PagesなどのWebサーバー上で開いてください。");
  }
  render();
});
