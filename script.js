// TURBO: Tener y Estar — minimal clone that only uses these two verbs.
// Keeps the same layout/flow as the provided HTML (tense buttons, level list, game).

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

  // --------- Data (ONLY tener & estar) ----------
  const persons = [
    {en:"I", es:{tener:"tengo",   estar:"estoy"},     past:{tener:"tuve",     estar:"estuve"},     fut:{tener:"tendré",   estar:"estaré"}},
    {en:"you (sg.)", es:{tener:"tienes",  estar:"estás"},     past:{tener:"tuviste",  estar:"estuviste"},  fut:{tener:"tendrás",  estar:"estarás"}},
    {en:"he", es:{tener:"tiene",   estar:"está"},      past:{tener:"tuvo",     estar:"estuvo"},     fut:{tener:"tendrá",   estar:"estará"}},
    {en:"she", es:{tener:"tiene",   estar:"está"},      past:{tener:"tuvo",     estar:"estuvo"},     fut:{tener:"tendrá",   estar:"estará"}},
    {en:"we", es:{tener:"tenemos", estar:"estamos"},   past:{tener:"tuvimos",  estar:"estuvimos"},  fut:{tener:"tendremos",estar:"estaremos"}},
    {en:"you (pl.)", es:{tener:"tenéis",  estar:"estáis"},    past:{tener:"tuvisteis",estar:"estuvisteis"},fut:{tener:"tendréis", estar:"estaréis"}},
    {en:"they", es:{tener:"tienen", estar:"están"},    past:{tener:"tuvieron", estar:"estuvieron"}, fut:{tener:"tendrán",  estar:"estarán"}},
  ];

  function formsFor(verb, tense, person) {
    // returns positive, negative, interrogative Spanish targets for the chosen person/tense
    const map = {
      "Present": person.es,
      "Past": person.past,
      "Future": person.fut
    };
    const key = verb; // "tener" | "estar"
    const pos = map[tense][key];

    // Build negative and question
    const neg = `no ${pos}`;
    // Interrogative: add ¿ ? around the positive form for a minimal approach
    const q = `¿${pos}?`;
    return {pos, neg, q};
  }

  // English prompts for variety
  function englishPrompt(verb, tense, person, kind){
    const subj = person.en;
    if (verb === "tener") {
      if (tense === "Present") {
        if (kind==="pos") return `${subj} have (tener)`;
        if (kind==="neg") return `${subj} do not have (tener)`;
        if (kind==="q")   return `Do ${subj} have? (tener)`;
      } else if (tense === "Past") {
        if (kind==="pos") return `${subj} had (tener)`;
        if (kind==="neg") return `${subj} did not have (tener)`;
        if (kind==="q")   return `Did ${subj} have? (tener)`;
      } else {
        if (kind==="pos") return `${subj} will have (tener)`;
        if (kind==="neg") return `${subj} will not have (tener)`;
        if (kind==="q")   return `Will ${subj} have? (tener)`;
      }
    } else {
      // estar
      if (tense === "Present") {
        if (kind==="pos") return `${subj} are (estar)`;
        if (kind==="neg") return `${subj} are not (estar)`;
        if (kind==="q")   return `Are ${subj}? (estar)`;
      } else if (tense === "Past") {
        if (kind==="pos") return `${subj} were (estar)`;
        if (kind==="neg") return `${subj} were not (estar)`;
        if (kind==="q")   return `Were ${subj}? (estar)`;
      } else {
        if (kind==="pos") return `${subj} will be (estar)`;
        if (kind==="neg") return `${subj} will not be (estar)`;
        if (kind==="q")   return `Will ${subj} be? (estar)`;
      }
    }
  }

  // Build a pool of prompts only from tener & estar (pos/neg/question)
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
            meta: {verb:v, person:p.en, tense, kind:k}
          });
        });
      });
    });
    return pool;
  }

  // Utility: normalize accents & punctuation for forgiving compare
  function norm(s){
    return s
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"") // strip accents
      .replace(/[¿?¡!]/g,"")                           // strip punctuation
      .replace(/\s+/g," ")                              // collapse spaces
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
    $("#back").style.display = "none";

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
    $("#back").style.display = "inline-block";
    $("#back").onclick = () => {
      $("#game").style.display = "none";
      $("#level-list").style.display = "grid";
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
