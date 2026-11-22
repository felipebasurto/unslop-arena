/* unslop arena — fullscreen page, one slop slider, nothing else. */
(function () {
  "use strict";
  var RUNS = window.ARENA_RUNS || [];
  var $ = function (id) { return document.getElementById(id); };
  var LS = "unslop-arena-votes";

  var votes = [];
  try { votes = JSON.parse(localStorage.getItem(LS) || "[]"); } catch (e) {}
  function save() { try { localStorage.setItem(LS, JSON.stringify(votes)); } catch (e) {} }

  var deck = [], idx = 0, committed = false, session = [];
  var slider = $("slop"), frame = $("frame");

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function current() {
    return RUNS.find(function (r) { return r.id === deck[idx]; });
  }

  /* verdict copy by slider zone */
  var ZONES = [
    [8, "chef's kiss. suspicious."],
    [22, "mostly human. few tells."],
    [38, "vibes are clean-ish"],
    [55, "classic ai layout energy"],
    [72, "gradient deploy detected"],
    [88, "slop incarnate"],
    [101, "a language model's diary"]
  ];
  function verdictFor(v) {
    for (var i = 0; i < ZONES.length; i++) if (v <= ZONES[i][0]) return ZONES[i][1];
    return ZONES[ZONES.length - 1][1];
  }

  /* fake telemetry — pure decoration, reacts to the slider like it knows things */
  var METRICS = [
    ["vibe coherence", "σ", function (v) { return 96 - v * 0.85; }],
    ["gradient suspicion", "%", function (v) { return 8 + v * 0.75; }],
    ["badge confidence", "%", function (v) { return 15 + v * 0.6; }],
    ["em-dash index", "‰", function (v) { return 4 + v * 0.45; }]
  ];
  function telemetryTick() {
    var v = +slider.value;
    var html = "";
    for (var i = 0; i < METRICS.length; i++) {
      var m = METRICS[i];
      var x = Math.max(0, Math.min(999, m[2](v) + (Math.random() * 9 - 4.5)));
      html += m[0] + " <b>" + x.toFixed(1) + m[1] + "</b> · ";
    }
    $("telemetry").innerHTML = html.slice(0, -3);
    /* jittering decimal on the readout */
    $("readout").innerHTML = v + '<span class="dec">.' + Math.floor(Math.random() * 10) + "</span>";
  }
  setInterval(telemetryTick, 140);

  function syncLook() {
    var v = +slider.value;
    $("verdict").textContent = verdictFor(v);
    $("verdict").style.color = "hsl(" + Math.round(140 - v * 1.35) + " 75% 62%)";
  }

  slider.addEventListener("input", syncLook);

  function stamp(text) {
    var el = $("stamp");
    el.innerHTML = "<span>" + text + "</span>";
    el.classList.remove("show", "hidden");
    void el.offsetWidth;
    el.classList.add("show");
    document.body.classList.remove("shake");
    void document.body.offsetWidth;
    document.body.classList.add("shake");
    setTimeout(function () {
      el.classList.add("hidden");
      document.body.classList.remove("shake");
    }, 950);
  }

  function commit() {
    if (committed) return;
    var run = current();
    if (!run) return;
    committed = true;
    var v = +slider.value;
    var vote = { run: run.id, guess: v, actual: run.slop, ts: Date.now() };
    votes.push(vote);
    session.push(vote);
    save();
    stamp("SLOP " + v);
    $("progress-fill").style.width = ((idx + 1) / deck.length * 100) + "%";
    setTimeout(function () { idx++; next(); }, 1050);
  }

  slider.addEventListener("change", commit);
  slider.addEventListener("keydown", function (e) {
    if (e.key === "Enter") commit();
  });

  function next() {
    var run = current();
    if (!run) return end();
    committed = false;
    slider.value = 50;
    syncLook();
    frame.src = run.preview;
    $("deck-pos").textContent = (idx + 1) + " / " + deck.length;
    $("deck-pos").title = run.page + " · " + run.stack;
    $("console").classList.remove("hidden");
    $("end").classList.add("hidden");
    slider.focus({ preventScroll: true });
  }

  function end() {
    $("console").classList.add("hidden");
    var n = session.length;
    var guess = n ? session.reduce(function (s, v) { return s + v.guess; }, 0) / n : 0;
    var actual = 0, known = 0;
    session.forEach(function (v) {
      var r = RUNS.find(function (x) { return x.id === v.run; });
      if (r) { actual += r.slop; known++; }
    });
    actual = known ? Math.round(actual / known) : 0;
    $("end-avg").innerHTML = Math.round(guess) +
      '<small> you said · ' + actual + " actual</small>";
    $("end").classList.remove("hidden");
  }

  $("again").addEventListener("click", function () {
    deck = shuffle(RUNS.map(function (r) { return r.id; }));
    idx = 0;
    session = [];
    next();
  });

  /* score-only index */
  function renderIndex() {
    var list = RUNS.slice().sort(function (a, b) { return b.slop - a.slop; });
    $("index-grid").innerHTML = list.map(function (r) {
      return '<div class="idx-card" data-open="' + r.id + '">' +
        '<iframe src="' + r.preview + '" loading="lazy" tabindex="-1"></iframe>' +
        '<span class="idx-score">' + r.slop + "</span></div>";
    }).join("");
    Array.prototype.forEach.call($("index-grid").querySelectorAll(".idx-card"), function (el) {
      el.onclick = function () {
        var r = RUNS.find(function (x) { return x.id === el.dataset.open; });
        window.open(r.preview, "_blank");
      };
    });
  }
  $("index-btn").addEventListener("click", function () {
    $("index-view").classList.remove("hidden");
    renderIndex();
  });
  $("index-close").addEventListener("click", function () {
    $("index-view").classList.add("hidden");
  });
  $("index-view").addEventListener("click", function (e) {
    if (e.target === $("index-view")) $("index-view").classList.add("hidden");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") $("index-view").classList.add("hidden");
  });

  if (!RUNS.length) {
    $("end-avg").textContent = "no pages";
    $("end").classList.remove("hidden");
    return;
  }
  deck = shuffle(RUNS.map(function (r) { return r.id; }));
  next();
})();
