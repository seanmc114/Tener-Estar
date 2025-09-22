// TURBO: Tener y Estar — grammar-correct prompts (fixed question/negation forms)
(() => {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const tenses = ["Present","Past","Future"];
  const levels = ["A1","A2","B1","B2","C1","C2","Boss"];

  let currentTense = "Present";
  let currentLevel = null;
  let startTime = 0;
  let timerId = null;
  const QUESTIONS_PER_RUN = 10;

  const persons = [
    {key:"I", en:"I", es:{tener:"tengo",   estar:"estoy"},     past:{tener:"tuve",     estar:"estuve"},     fut:{tener:"tendré",   estar:"estaré"}},
    {key:"you (sg.)", en:"you", es:{tener:"tienes",  estar:"estás"},     past:{tener:"tuviste",  estar:"estuviste"},  fut:{tener:"tendrás",  estar:"estarás"}},
    {key:"he", en:"he", es:{tener:"tiene",   estar:"está"},      past:{tener:"tuvo",     estar:"estuvo"},     fut:{tener:"tendrá",   estar:"estará"}},
    {key:"she", en:"she", es:{tener:"tiene",   estar:"está"},      past:{tener:"tuvo",     estar:"estuvo"},     fut:{tener:"tendrá",   estar:"estará"}},
    {key:"we", en:"we", es:{tener:"tenemos", estar:"estamos"},   past:{tener:"tuvimos",  estar:"estuvimos"},  fut:{tener:"tendremos",estar:"estaremos"}},
    {key:"you (pl.)", en:"you", es:{tener:"tenéis",  estar:"estáis"},    past:{tener:"tuvisteis",estar:"estuvisteis"},fut:{tener:"tendréis", estar:"estaréis"}},
    {key:"they", en:"they", es:{tener:"tienen", estar:"están"},    past:{tener:"tuvieron", estar:"estuvieron"}, fut:{tener:"tendrán",  estar:"estarán"}},
  ];

  function formsFor(verb, tense, person) {
    const map = {
      "Present": person.es,
      "Past": person.past,
      "Future": person.fut
    };
    const key = verb; // "tener" | "estar"
    const pos = map[tense][key];
    const neg = verb === "estar" && tense === "Present" && person.en === "I" ? "no estoy" : `no ${pos}`;
    const q = (() => {
      // For interrogative Spanish forms, produce ¿...?
      return `¿${pos}?`;
    })();
    return {pos, neg, q};
  }

  function englishPrompt(verb, tense, person, kind){
    // person.en contains pronoun to use in English prompts
    const subj = person.en;
    const third = (subj === "he" || subj === "she" || subj === "it");
    if (verb === "tener") {
      if (tense === "Present") {
        if (kind==="pos") return `${capitalise(subj)} have (tener)`;
        if (kind==="neg") return `${capitalise(subj)} do not have (tener)`;
        if (kind==="q")   return `${doQuestionPresentHave(subj, third)} (tener)`;
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
      // estar — be-verb
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

  // Helper functions for correct English grammar
  function capitalise(s){ if(!s) return s; return s[0].toUpperCase()+s.slice(1); }

  function doQuestionPresentHave(subj, third){
    // e.g. Do I have? Does he have?
    return `${third ? 'Does' : 'Do'} ${subj} have?`;
  }

  function bePresent(subj){
    // returns the present 'be' form for subj: am/are/is
    if(subj==="I") return "am";
    if(subj==="you") return "are";
    if(subj==="we") return "are";
    if(subj==="they") return "are";
    if(subj==="he" || subj==="she" || subj==="it") return "is";
    return "are";
  }
  function bePresentNeg(subj){
    if(subj==="I") return "am not";
    return bePresent(subj) + " not";
  }
  function beQuestionPresent(subj){
    // Am I? Are you? Is he?
    if(subj==="I") return "Am I?";
    if(subj==="you") return "Are you?";
    if(subj==="we") return "Are we?";
    if(subj==="they") return "Are they?";
    if(subj==="he" || subj==="she" || subj==="it") return `Is ${subj}?`;
    return `Are ${subj}?`;
  }

  function bePast(subj){
    if(subj==="I") return "was";
    if(subj==="he"||subj==="she"||subj==="it") return "was";
    return "were";
  }
  function bePastNeg(subj){
    return bePast(subj) + " not";
  }
  function beQuestionPast(subj){
    if(subj==="I") return "Was I?";
    if(subj==="he"||subj==="she"||subj==="it") return `Was ${subj}?`;
    return `Were ${subj}?`;
  }

  // Build pool
  function buildPool(tense){
    const verbs = ["tener","estar"];
    const kinds = ["pos","neg","q"];
    const pool = [];
    persons.forEach(p => {
      verbs.forEach(v => {
        const targets = formsFor(v, tense, p);
        kinds.forEach(k => {
          pool.push({
            prompt: englishPrompt(v, tense, p, k),
            answer: targets[k],
            meta: {verb:v, person:p.key, tense, kind:k}
          });
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
      btn.textContent = lv;
      btn.addEventListener("click", () => startLevel(lv));
      host.appendChild(btn);
    });
  }

  function setTenseButtons(){
    $$(".tense-button").forEach(b => {
      b.classList.toggle("active", b.dataset.tense === currentTense);
      b.onclick = () => {
        currentTense = b.dataset.tense;
        $$(".tense-button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
      };
    });
  }

  function startLevel(level){
    currentLevel = level;
    $("#level-list").style.display = "none";
    $("#game").style.display = "block";
    $("#results").textContent = "";
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
    inputs.forEach((inp, i) => {
      const expected = quiz[i].answer;
      const ok = norm(inp.value) === norm(expected);
      inp.classList.remove("good","bad");
      inp.classList.add(ok ? "good" : "bad");
      if (ok) correct++;
    });
    const elapsed = (performance.now() - startTime)/1000;
    const penalty = (quiz.length - correct) * 30;
    const finalTime = elapsed + penalty;

    const lines = [];
    lines.push(`✅ Correct: ${correct}/${quiz.length}`);
    if (penalty>0) lines.push(`⏱️ Penalty: +${penalty}s (30s per incorrect)`);
    lines.push(`🏁 Final Time: ${finalTime.toFixed(1)}s`);
    lines.push("");
    lines.push("Answers:");
    inputs.forEach((inp,i) => {
      lines.push(`${i+1}. ${quiz[i].prompt} → ${quiz[i].answer}`);
    });

    $("#results").textContent = lines.join("\n");
    $("#back-button").style.display = "inline-block";
    $("#back-button").onclick = () => {
      $("#game").style.display = "none";
      $("#level-list").style.display = "flex";
    };
  }

  function shuffle(arr){
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // init
  renderLevels();
  setTenseButtons();
})();