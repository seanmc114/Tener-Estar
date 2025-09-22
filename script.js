// TURBO: Tener y Estar — v3
// Fix present 3rd-person negative for 'have' (does not have).
// Feedback is a vertical, color-coded list; inputs tint green/red after submit.
// Best score (min final time) shown on the level button for each (tense, level).

(() => {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const tenses = ["Present","Past","Future"];
  const levels = ["A1","A2","B1","B2","C1","C2","Boss"];
  const QUESTIONS_PER_RUN = 10;

  let currentTense = "Present";
  let currentLevel = null;
  let startTime = 0;
  let timerId = null;

  const persons = [
    {key:"I", en:"I", es:{tener:"tengo",   estar:"estoy"},     past:{tener:"tuve",     estar:"estuve"},     fut:{tener:"tendré",   estar:"estaré"}},
    {key:"you (sg.)", en:"you", es:{tener:"tienes",  estar:"estás"},     past:{tener:"tuviste",  estar:"estuviste"},  fut:{tener:"tendrás",  estar:"estarás"}},
    {key:"he", en:"he", es:{tener:"tiene",   estar:"está"},      past:{tener:"tuvo",     estar:"estuvo"},     fut:{tener:"tendrá",   estar:"estará"}},
    {key:"she", en:"she", es:{tener:"tiene",   estar:"está"},      past:{tener:"tuvo",     estar:"estuvo"},     fut:{tener:"tendrá",   estar:"estará"}},
    {key:"we", en:"we", es:{tener:"tenemos", estar:"estamos"},   past:{tener:"tuvimos",  estar:"estuvimos"},  fut:{tener:"tendremos",estar:"estaremos"}},
    {key:"you (pl.)", en:"you", es:{tener:"tenéis",  estar:"estáis"},    past:{tener:"tuvisteis",estar:"estuvisteis"},fut:{tener:"tendréis", estar:"estaréis"}},
    {key:"they", en:"they", es:{tener:"tienen", estar:"están"},    past:{tener:"tuvieron", estar:"estuvieron"}, fut:{tener:"tendrán",  estar:"estarán"}},
  ];

  // ---- English helpers ----
  function capitalise(s){ return s ? s[0].toUpperCase()+s.slice(1) : s; }
  const isThird = subj => (subj === "he" || subj === "she" || subj === "it");

  function doQuestionPresentHave(subj){
    return `${isThird(subj) ? 'Does' : 'Do'} ${subj} have?`;
  }
  function doNegPresentHave(subj){
    return `${capitalise(subj)} ${isThird(subj) ? 'does' : 'do'} not have`;
  }

  function bePresent(subj){
    if(subj==="I") return "am";
    if(subj==="you"||subj==="we"||subj==="they") return "are";
    if(subj==="he"||subj==="she"||subj==="it") return "is";
    return "are";
  }
  function bePresentNeg(subj){
    if(subj==="I") return "am not";
    return bePresent(subj) + " not";
  }
  function beQuestionPresent(subj){
    if(subj==="I") return "Am I?";
    if(subj==="you") return "Are you?";
    if(subj==="we") return "Are we?";
    if(subj==="they") return "Are they?";
    if(subj==="he"||subj==="she"||subj==="it") return `Is ${subj}?`;
    return `Are ${subj}?`;
  }
  function bePast(subj){
    if(subj==="I"||subj==="he"||subj==="she"||subj==="it") return "was";
    return "were";
  }
  function bePastNeg(subj){ return bePast(subj) + " not"; }
  function beQuestionPast(subj){
    if(subj==="I"||subj==="he"||subj==="she"||subj==="it") return `Was ${subj==='I'?'I':subj}?`.replace("Was I?", "Was I?");
    return `Were ${subj}?`;
  }

  // Spanish target forms
  function formsFor(verb, tense, person) {
    const map = {"Present": person.es, "Past": person.past, "Future": person.fut};
    const pos = map[tense][verb];
    const neg = `no ${pos}`;
    const q = `¿${pos}?`;
    return {pos, neg, q};
  }

  // English prompts (fixed)
  function englishPrompt(verb, tense, person, kind){
    const subj = person.en;
    if (verb === "tener") {
      if (tense === "Present") {
        if (kind==="pos") return `${capitalise(subj)} have (tener)`;
        if (kind==="neg") return `${doNegPresentHave(subj)} (tener)`;
        if (kind==="q")   return `${doQuestionPresentHave(subj)} (tener)`;
      } else if (tense === "Past") {
        if (kind==="pos") return `${capitalise(subj)} had (tener)`;
        if (kind==="neg") return `${capitalise(subj)} did not have (tener)`;
        if (kind==="q")   return `Did ${subj} have? (tener)`;
      } else {
        if (kind==="pos") return `${capitalise(subj)} will have (tener)`;
        if (kind==="neg") return `${capitalise(subj)} will not have (tener)`;
        if (kind==="q")   return `Will ${subj} have? (tener)`;
      }
    } else {
      // estar
      if (tense === "Present") {
        if (kind==="pos") return `${capitalise(subj)} ${bePresent(subj)} (estar)`;
        if (kind==="neg") return `${capitalise(subj)} ${bePresentNeg(subj)} (estar)`;
        if (kind==="q")   return `${beQuestionPresent(subj)} (estar)`;
      } else if (tense === "Past") {
        if (kind==="pos") return `${capitalise(subj)} ${bePast(subj)} (estar)`;
        if (kind==="neg") return `${capitalise(subj)} ${bePastNeg(subj)} (estar)`;
        if (kind==="q")   return `${beQuestionPast(subj)} (estar)`;
      } else {
        if (kind==="pos") return `${capitalise(subj)} will be (estar)`;
        if (kind==="neg") return `${capitalise(subj)} will not be (estar)`;
        if (kind==="q")   return `Will ${subj} be? (estar)`;
      }
    }
  }

  function buildPool(tense){
    const verbs = ["tener","estar"];
    const kinds = ["pos","neg","q"];
    const pool = [];
    persons.forEach(p => {
      verbs.forEach(v => {
        const targets = formsFor(v, tense, p);
        kinds.forEach(k => {
          pool.push({ prompt: englishPrompt(v, tense, p, k), answer: targets[k], meta:{verb:v, person:p.key, tense, kind:k} });
        });
      });
    });
    return pool;
  }

  function norm(s){
    return s
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[¿?¡!]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function renderLevels(){
    const host = $("#level-list");
    host.innerHTML = "";
    levels.forEach(lv => {
      const btn = document.createElement("button");
      btn.className = "level-btn";
      btn.dataset.level = lv;
      btn.textContent = labelForLevel(lv);
      btn.addEventListener("click", () => startLevel(lv));
      host.appendChild(btn);
    });
    // refresh labels with any stored bests
    refreshAllLevelLabels();
  }

  function labelForLevel(level){
    const best = getBest(currentTense, level);
    return best != null ? `${level} — Best: ${best.toFixed(1)}s` : level;
  }

  function refreshAllLevelLabels(){
    $$("#level-list .level-btn").forEach(btn => {
      const lv = btn.dataset.level;
      btn.textContent = labelForLevel(lv);
    });
  }

  function setTenseButtons(){
    $$(".tense-button").forEach(b => {
      b.classList.toggle("active", b.dataset.tense === currentTense);
      b.onclick = () => {
        currentTense = b.dataset.tense;
        $$(".tense-button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        refreshAllLevelLabels();
      };
    });
  }

  function startLevel(level){
    currentLevel = level;
    $("#level-list").style.display = "none";
    $("#game").style.display = "block";
    $("#results").innerHTML = "";
    $("#back-button").style.display = "none";

    const pool = buildPool(currentTense);
    shuffle(pool);
    const quiz = pool.slice(0, QUESTIONS_PER_RUN);

    const qwrap = $("#questions");
    qwrap.innerHTML = "";
    quiz.forEach((q,i) => {
      const row = document.createElement("div");
      row.className = "q";
      const p = document.createElement("div");
      p.className = "prompt";
      p.textContent = `${i+1}. ${q.prompt}`;
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Type the Spanish form (e.g., tengo)";
      row.appendChild(p);
      row.appendChild(input);
      qwrap.appendChild(row);
    });

    $("#submit").onclick = () => checkAnswers(quiz);
    startTimer();
  }

  function startTimer(){
    startTime = performance.now();
    $("#timer").textContent = "Time: 0s";
    clearInterval(timerId);
    timerId = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      $("#timer").textContent = `Time: ${elapsed.toFixed(1)}s`;
    }, 100);
  }

  function stopTimer(){
    clearInterval(timerId);
  }

  function checkAnswers(quiz){
    stopTimer();
    const inputs = $$("#questions .q input");
    let correct = 0;
    const resultItems = [];
    inputs.forEach((inp, i) => {
      const expected = quiz[i].answer;
      const ok = norm(inp.value) === norm(expected);
      inp.classList.remove("good","bad");
      inp.classList.add(ok ? "good" : "bad");
      if (ok) correct++;
      const li = document.createElement("li");
      li.className = ok ? "correct" : "incorrect";
      li.textContent = `${i+1}. ${quiz[i].prompt} → ${quiz[i].answer}`;
      resultItems.push(li);
    });
    const elapsed = (performance.now() - startTime)/1000;
    const penalty = (quiz.length - correct) * 30;
    const finalTime = elapsed + penalty;

    // Save & refresh best on level button
    if (currentLevel) {
      saveBest(currentTense, currentLevel, finalTime);
    }

    // Build vertical feedback list
    const wrap = document.createElement("div");
    wrap.style.width = "100%";
    const summary = document.createElement("div");
    summary.className = "result-summary";
    summary.innerHTML = [
      `<div class="line">✅ Correct: ${correct}/${quiz.length}</div>`,
      penalty>0 ? `<div class="line">⏱️ Penalty: +${penalty}s (30s per incorrect)</div>` : ``,
      `<div class="line">🏁 Final Time: ${finalTime.toFixed(1)}s</div>`
    ].join("");

    const ul = document.createElement("ul");
    resultItems.forEach(li => ul.appendChild(li));
    wrap.appendChild(summary);
    wrap.appendChild(ul);

    const results = $("#results");
    results.innerHTML = "";
    results.appendChild(wrap);

    $("#back-button").style.display = "inline-block";
    $("#back-button").onclick = () => {
      $("#game").style.display = "none";
      $("#level-list").style.display = "flex";
      refreshAllLevelLabels();
    };
  }

  function shuffle(arr){
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ---- Best score storage ----
  function keyForBest(tense, level){
    return `turbo_te_best_${tense}_${level}`;
  }
  function getBest(tense, level){
    const v = localStorage.getItem(keyForBest(tense, level));
    return v ? parseFloat(v) : null;
  }
  function saveBest(tense, level, score){
    const cur = getBest(tense, level);
    const best = (cur == null || score < cur) ? score : cur;
    localStorage.setItem(keyForBest(tense, level), best.toString());
  }

  // init
  renderLevels();
  setTenseButtons();
})();