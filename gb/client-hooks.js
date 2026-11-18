// GameBull hooks into the client's page. A classic script the build puts right AFTER their last script (match-hud.js),
// so their files stay exactly as delivered: their constructors (CMain, CMenu, CGame, CGoalArea, CMatchHud,
// CSpriteLibrary) and helpers (playSound...) are globals this file wraps before their page starts (their CMain is
// created on jQuery ready, after every script has run). Their top-level consts (RugbyTournament, RugbyAnnouncer,
// RugbyCountdown, DolphinsTheme) are shared with every classic script and only read here. The GameBull shell
// (main.tsx, a module) talks only to window.RKClient below.
//
// A GameBull run (tournament / Score Challenge / solo / room), the client's design kept:
//  - their own board and their own START: s_oMain.gotoGame() (their PLAY button) builds their pitch, HUD and kicker;
//    s_oGame.startRound() (their START 120 SECOND ROUND button) starts their 120 s clock and their meters;
//  - a challenge time limit (or ?devSeconds) other than their 120 s starts their clock with the difference already
//    used (their clock code, timer and last-10-second alert unchanged: their deadline is read from performance.now()
//    once, and that one reading is moved by the difference);
//  - their scoring (green 500 / yellow 200 / red 100 / miss or post 0, counted when the power is locked; their last
//    kick counts if its power was locked before 0), their distance / wind / meter progression and their random wind
//    are kept; the GameBull seed is only logged;
//  - their clock at 0 -> their own gameOver() (their 0:00, their game-over sound, input off); "0" held 0.7 s by the
//    shell, then the GameBull board replaces their result dialog (so nothing is written to their local top 10).
//    Challenge target: their total reaches it -> their own gameOver() 0.9 s later -> the board;
//  - their title screen (CMenu) and their dialogs (instructions, name entry, local leaderboard) never show: the
//    GameBull lobby, challenge screens and board replace them (playbook trap W16: their <dialog>.showModal() would sit
//    in the browser's top layer, above every GameBull screen).
(function () {
  "use strict";
  var hooks = { onLock: null, onEnd: null };   // set by the shell
  var RUN = RugbyTournament.duration / 1000;   // their 120 s (tournament.js)
  var R = null;            // the current GameBull run, null under the lobby
  var last = null;         // the last run's facts
  var game = null;         // their CGame (s_oGame)
  var hud = null;          // their CMatchHud of the current game
  var hudScore = 0;        // the last score their HUD was given (their _iScore)
  var lastHit = null;      // their CGoalArea.getAreaHit() answer for the kick being locked
  var ready = false, readyWaiters = [];
  var stadium = null;      // tenant background composite for their stadium picture (null = theirs)
  var log = function (m) { console.log("[RK-GB] " + m); };

  // ---- one reading of their clock, moved (their startRound / gameOver read performance.now() exactly once) ----
  function withClockShift(ms, fn) {
    var real = performance.now;
    performance.now = function () { delete performance.now; return real.call(performance) + ms; };
    try { return fn(); } finally { if (Object.prototype.hasOwnProperty.call(performance, "now")) delete performance.now; }
  }

  // ---- their dialogs never open (W16): instructions, result, name entry, local leaderboard ----
  var clientShowModal = HTMLDialogElement.prototype.showModal, dialogLogged = {};
  HTMLDialogElement.prototype.showModal = function () {
    if (this.classList && this.classList.contains("tournament")) {
      var what = this.querySelector("#round-start") ? "instructions / START" : this.querySelector("#round-save") ? "result / name entry / local leaderboard" : "dialog";
      if (!dialogLogged[what]) { dialogLogged[what] = true; log("Their " + what + " dialog is not shown (GameBull screens replace it)."); }
      return;
    }
    return clientShowModal.apply(this, arguments);
  };

  // ---- their page start-up: sound default, sprite library ----
  // GameBull mute = their own speaker (s_bAudioActive + Howler mute, as their HUD button does). Their default is OFF
  // (audio_enable_on_startup: false); in GameBull the sound is ON until the player chooses (playbook trap W6, as in
  // Klondike), and the player's choice is remembered here (their page does not save it).
  var MUTE_KEY = "RugbyKicks_Muted";
  var savedMute = null;
  try { savedMute = localStorage.getItem(MUTE_KEY); } catch (e) { /* private mode */ }
  var ClientCMain = CMain;
  CMain = function (oData) {
    ClientCMain.call(this, oData);
    s_bAudioActive = savedMute !== "1";
    log("Sound " + (s_bAudioActive ? "ON" : "OFF") + (savedMute === null ? " (GameBull default until the player chooses; their default is OFF)." : " (the player's choice)."));
    hookSprites(s_oSpriteLibrary);
  };
  // Their title screen art is never shown (the GameBull lobby replaces their title, credits and panels), so it is not
  // downloaded: these keys are added by their _loadImages() but used only by CMenu / CCreditsPanel / CMsgBox /
  // CAreYouSurePanel / CEndPanel. Their stadium picture is swapped for the tenant composite when a background is set.
  var MENU_ONLY = { logo: 1, but_play: 1, but_info: 1, msg_box: 1, ctl_logo: 1, but_yes_big: 1, but_exit_big: 1, but_home: 1, but_restart: 1, bg_menu: 1 };
  function hookSprites(lib) {
    var add = lib.addSprite, get = lib.getSprite, skipped = [];
    lib.addSprite = function (key, path) {
      if (MENU_ONLY[key]) { if (skipped.indexOf(key) < 0) skipped.push(key); return; }
      return add.call(lib, key, path);
    };
    lib.getSprite = function (key) {
      if (key === "red_dolphins_stadium" && stadium) return stadium;
      return get.call(lib, key);
    };
    var load = lib.loadSprites;
    lib.loadSprites = function () { if (skipped.length) { log("Their title-screen art not loaded (never shown): " + skipped.join(", ") + "."); skipped = []; } return load.call(lib); };
  }

  // ---- their loader's progress (their CPreloader.refreshLoader(percent)), for the GameBull loading page's bar ----
  var loadPct = 0;
  var ClientPreloader = CPreloader;
  CPreloader = function () {
    ClientPreloader.call(this);
    var self = this, refresh = this.refreshLoader;
    this.refreshLoader = function (p) { loadPct = p; return refresh.call(self, p); };
  };

  // ---- their title screen = parked under the GameBull lobby ----
  var ClientCMenu = CMenu;
  CMenu = function () {
    s_oMenu = null;
    stopLoops();
    if (!ready) {
      ready = true;
      log("Their game is loaded (" + s_oSpriteLibrary.getNumSprites() + " pictures); parked under the GameBull lobby (their title screen is not built).");
      readyWaiters.splice(0).forEach(function (f) { f(); });
    }
  };
  void ClientCMenu;

  // ---- sound gate: their sounds play only in a GameBull run (not under the lobby, the board or the end panel) ----
  var clientPlaySound = playSound;
  playSound = function (name, vol, loop) {
    if (!R || R.silent) return (typeof s_aSounds !== "undefined" && s_aSounds && s_aSounds[name]) || null;
    return clientPlaySound(name, vol, loop);
  };
  function stopLoops() {
    try { ["soundtrack", "crowd"].forEach(function (k) { if (s_aSounds && s_aSounds[k]) s_aSounds[k].stop(); }); } catch (e) { /* not loaded */ }
    try { RugbyAnnouncer.stop(); RugbyCountdown.stop(); } catch (e) { /* n/a */ }
  }

  // ---- their goal area: which zone the kick being locked hits (their getAreaHit, unchanged) ----
  var goal = null;
  var ClientGoalArea = CGoalArea;
  CGoalArea = function (iStage, oParent) {
    ClientGoalArea.call(this, iStage, oParent);
    goal = this;
    var get = this.getAreaHit;
    this.getAreaHit = function (x, y) { var h = get.call(this, x, y); lastHit = h; return h; };
  };

  // ---- their two meters (direction, power): which one is running, for the localhost autoplay only ----
  var meters = { h: null, v: null };
  var ClientMeter = CShotIndicatorController;
  CShotIndicatorController = function (x, y, vertical) {
    ClientMeter.call(this, x, y, vertical);
    var m = this, start = m.startAnimation, end = m.endAnimation;
    m.gbOn = false;
    m.startAnimation = function () { m.gbOn = true; m.gbSince = performance.now(); return start.apply(m, arguments); };
    m.endAnimation = function () { m.gbOn = false; return end.apply(m, arguments); };
    meters[vertical ? "v" : "h"] = m;
  };

  // ---- their HUD: the score it shows (their _iScore) and their clock digits ----
  var ClientHud = CMatchHud;
  CMatchHud = function (onToggle, owner) {
    ClientHud.call(this, onToggle, owner);
    hud = this;
    var rs = this.refreshScore;
    this.refreshScore = function (v) { hudScore = v; var out = rs(v); checkTarget(); return out; };
  };
  function hudChild(name) {
    var root = s_oStage && s_oStage.getChildByName ? s_oStage.getChildByName("match-hud") : null;
    return root ? root.getChildByName(name) : null;
  }

  // ---- their game ----
  var ClientCGame = CGame;
  CGame = function (oData) {
    ClientCGame.call(this, oData);
    hookGame(this);
  };
  function hookGame(g) {
    game = g;
    var shot = g.playerShot, over = g.gameOver;
    // A kick counts when its power is locked (their playerShot adds its points then, if they can still aim).
    g.playerShot = function (x, y) {
      var counts = !!R && R.live && !R.ended && g.canAim();
      lastHit = null;
      var out = shot.call(g, x, y);
      if (counts) tally(lastHit ? lastHit.areahit : null);
      return out;
    };
    // Their gameOver() reschedules itself while time is left; once their deadline has passed it locks the round
    // (their _finished: canAim() false from then on), shows 0:00, plays their game-over sound and opens their result.
    g.gameOver = function () {
      var out = over.apply(g, arguments);
      if (R && R.live && !R.ended && !g.canAim()) roundOver();
      return out;
    };
  }
  function tally(area) {
    R.kicks++;
    if (area === GREEN_TARGET) R.green++;
    else if (area === YELLOW_TARGET) R.yellow++;
    else if (area === RED_TARGET) R.red++;
    else R.miss++;            // wide left / right or post hit (their 0)
    R.score = R.green * GREEN_AREA_POINTS + R.yellow * YELLOW_AREA_POINTS + R.red * RED_AREA_POINTS;
  }
  // Challenge target: checked on the score their HUD shows (their ball has landed and their score has counted up), so
  // the goal line, their HUD and the early finish agree; the round ends 0.9 s later.
  function checkTarget() {
    if (!R || !R.live || R.ended || R.locked || !(R.target > 0) || hudScore < R.target || !game || !game.canAim()) return;   // at their 0 the clock ends it
    R.locked = true;
    log("Challenge target " + R.target + " reached: their score " + hudScore + "; ending in 0.9 s.");
    hooks.onLock && hooks.onLock("target");
    setTimeout(endNow, 900);
  }
  // Early finish (challenge target): their own gameOver(), with its one clock reading moved past their deadline.
  function endNow() {
    if (!R || R.ended || !game) return;
    R.why = "target";
    withClockShift(R.deadline - performance.now() + 1, function () { game.gameOver(); });
  }
  function roundOver() {
    R.ended = true; R.locked = true;
    var why = R.why || "time";
    var rows = R.green * GREEN_AREA_POINTS + R.yellow * YELLOW_AREA_POINTS + R.red * RED_AREA_POINTS;
    last = { reason: why, total: hudScore, green: R.green, yellow: R.yellow, red: R.red, miss: R.miss, kicks: R.kicks,
      greenPts: GREEN_AREA_POINTS, yellowPts: YELLOW_AREA_POINTS, redPts: RED_AREA_POINTS,
      playMs: Math.round(Math.min(performance.now(), R.deadline) - R.startedAt) };
    log("Round over (" + why + "): " + R.kicks + " kicks: green " + R.green + ", yellow " + R.yellow + ", red " + R.red + ", miss/post " + R.miss +
      "; their score " + hudScore + "; " + (rows === hudScore ? "score check ok (zones = their score)." : "SCORE CHECK FAILED: zones give " + rows + "."));
    if (why !== "target") hooks.onLock && hooks.onLock("clock");
    hooks.onEnd && hooks.onEnd(last);
  }

  // ---- canvas geometry (their 640 x 1024 stage, fitted and centred by their sizeHandler) ----
  function canvasRect() {
    var c = document.getElementById("canvas");
    return c ? c.getBoundingClientRect() : null;
  }
  // A rectangle of their stage (stage units) in page pixels.
  function stageRect(x0, y0, x1, y1) {
    var c = canvasRect(); if (!c || !c.width) return null;
    var k = c.width / CANVAS_WIDTH, ky = c.height / CANVAS_HEIGHT;
    return { left: c.left + x0 * k, top: c.top + y0 * ky, right: c.left + x1 * k, bottom: c.top + y1 * ky, width: (x1 - x0) * k, height: (y1 - y0) * ky, k: k };
  }

  // ---- iPhone / Safari sound ----
  // Their sounds are Howler (Web Audio). Howler unlocks its context on the first tap, but a GameBull run starts after a
  // server call, outside the tap (trap W1): so every tap (the lobby's Join, the challenge's Start, their pitch) also
  // resumes Howler's context inside the gesture, and the audio session is "playback" (iOS 16.4+, trap W2), so the
  // silent switch does not mute the game.
  try { if (navigator.audioSession) { navigator.audioSession.type = "playback"; log("Audio session set to playback."); } } catch (e) { /* n/a */ }
  var unlocked = false;
  function unlockTap() {
    try {
      var c = window.Howler && Howler.ctx; if (!c || !s_bAudioActive) return;
      var ok = function () { if (!unlocked && c.state === "running") { unlocked = true; log("Game sound unlocked by a tap (Web Audio running)."); } };
      if (c.state === "running") ok(); else c.resume().then(ok).catch(function () {});
    } catch (e) { /* no Web Audio */ }
  }
  ["touchend", "pointerup", "click", "keydown"].forEach(function (t) { document.addEventListener(t, unlockTap, { capture: true, passive: true }); });

  function muted() { return !s_bAudioActive; }
  function saveMute() { try { localStorage.setItem(MUTE_KEY, s_bAudioActive ? "0" : "1"); } catch (e) { /* private mode */ } }
  var lastActive = null;
  setInterval(function () {      // their HUD speaker changes s_bAudioActive: remember the player's choice
    if (lastActive !== null && lastActive !== s_bAudioActive) saveMute();
    lastActive = s_bAudioActive;
  }, 250);

  window.RKClient = {
    hooks: hooks,
    // Resolves when their game has loaded every picture (their preloader called their gotoMenu).
    whenReady: function () { return new Promise(function (res) { if (ready) res(); else readyWaiters.push(res); }); },
    loadProgress: function () { return ready ? 1 : loadPct / 100; },
    // Their sounds (Howler), for the loading page's progress: resolves when each has loaded (or failed).
    soundJobs: function () {
      var list = [];
      try { for (var k in s_aSounds) list.push(s_aSounds[k]); } catch (e) { return []; }
      return list.map(function (h) {
        return new Promise(function (res) { var st = h.state(); if (st === "loaded") return res(); h.once("load", res); h.once("loaderror", res); });
      });
    },
    // Under the lobby: their own exit (their BACK TO TITLE: stops their crowd, unloads their pitch and HUD, their
    // gotoMenu = parked). Their loops are stopped (the lobby is silent, as in the other GameBull ports).
    park: function () {
      if (R) R.silent = true;
      if (game && s_oGame === game && hud) { try { game.onExit(); } catch (e) { console.warn("[RK-GB] Their onExit threw:", e); } }
      game = null; hud = null; R = null;
      stopLoops();
    },
    // Their board for a run, frozen (no clock yet): their PLAY (gotoGame: pitch, kicker, HUD at their 2:00). opt.seconds =
    // the run length (their 120 s, a challenge limit or ?devSeconds); opt.target = challenge target (0 = none).
    prepare: function (opt) {
      opt = opt || {};
      var secs = opt.seconds > 0 ? opt.seconds : RUN;
      if (game && hud) { R = R || {}; R.silent = true; try { game.onExit(); } catch (e) { /* already gone */ } }
      R = { seconds: secs, target: opt.target || 0, live: false, locked: false, ended: false, silent: false, why: null,
        kicks: 0, green: 0, yellow: 0, red: 0, miss: 0, score: 0, startedAt: -1, deadline: 0 };
      last = null; hudScore = 0;
      s_oMain.gotoGame();
      if (secs !== RUN && s_oInterface) s_oInterface.refreshTime(secs * 1000);   // their HUD shows the run's length
      // Their music, as their page starts it when it has loaded (their _allResourcesLoaded); their START turns it down.
      try { if (s_aSounds && s_aSounds.soundtrack && !s_aSounds.soundtrack.playing()) clientPlaySound("soundtrack", 1, true); } catch (e) { /* not loaded */ }
      log("Their pitch is set (their gotoGame): " + secs + " s run" + (R.target ? ", challenge target " + R.target : "") + "; waiting for START.");
    },
    // Their START (startRound): their clock and meters start. A run length other than their 120 s moves the one clock
    // reading their startRound takes by the difference, so their deadline is exactly the run's length from now.
    go: function () {
      if (!R || R.live || !game) return;
      var shift = (RUN - R.seconds) * 1000;
      var t0 = performance.now();
      withClockShift(-shift, function () { game.startRound(); });
      R.live = true; R.startedAt = t0; R.deadline = t0 + R.seconds * 1000;
      log("Their START: " + R.seconds + " s on their clock" + (shift ? " (" + (shift > 0 ? shift / 1000 + " s of their 120 s used up front" : -shift / 1000 + " s added to their 120 s") + ")." : "."));
    },
    start: function (opt) { window.RKClient.prepare(opt); window.RKClient.go(); },
    // Under the results board: their loops and voice stopped, no new sound from their page until the next run.
    silence: function () {
      if (R) R.silent = true;
      stopLoops();
      log("Game audio stopped under the results board (their music and crowd stopped, their sounds blocked).");
    },
    totalScore: function () { return R && !R.ended ? hudScore : last ? last.total : 0; },   // the score their HUD shows
    remaining: function () { return R && R.live && !R.ended ? Math.max(0, R.deadline - performance.now()) / 1000 : 0; },
    isLive: function () { return !!R && R.live && !R.ended; },
    isRunning: function () { return !!R && R.live && !R.locked && !!game && game.canAim(); },
    // Their clock digits (HUD "match-timer", centred at 359, 62 on their HUD panel), in page pixels, and a switch that
    // hides them while the GameBull 10..1 is drawn over them.
    clock: function () {
      var t = hudChild("match-timer"); if (!t) return null;
      var p = t.parent, r = stageRect(p.x + t.x - 70, p.y + t.y - 29, p.x + t.x + 70, p.y + t.y + 29);
      return r ? { left: r.left, top: r.top, width: r.width, height: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2, fontPx: 47 * r.k } : null;
    },
    hideClock: function (hide) { var t = hudChild("match-timer"); if (t && t.visible === !!hide) t.visible = !hide; },
    // Free spots measured on their stage (stage units -> page pixels): their whole canvas, their HUD panel, the row
    // under their speaker button (right of their wind badge), the row left of their distance badge, and the band
    // under their badges (background only: their stadium banner).
    spots: function () {
      var c = canvasRect(); if (!c || !c.width) return null;
      return {
        canvas: { left: c.left, top: c.top, right: c.right, bottom: c.bottom, width: c.width, height: c.height },
        hud: stageRect(14, 20, 626, 104),
        speaker: stageRect(547, 32, 607, 92),
        underSpeaker: stageRect(507, 119, 624, 152),
        leftOfBadges: stageRect(16, 117, 134, 154),
        underBadges: stageRect(40, 160, 600, 200),
      };
    },
    muted: muted,
    setMuted: function (v) {
      v = !!v;
      if (muted() !== v) {
        Howler.mute(v); s_bAudioActive = !v;           // as their own speaker button (CInterface._onAudioToggle)
        if (v) { try { RugbyAnnouncer.stop(); RugbyCountdown.stop(); } catch (e) { /* n/a */ } }
        if (hud && hud.audioToggle) hud.audioToggle.setActive(s_bAudioActive);
      }
      saveMute(); lastActive = s_bAudioActive;
    },
    // Tenant background: a copy of their stadium picture (same size, so their camera and layout are unchanged) with the
    // tenant picture over the whole stand, sky and banners, and their pitch (the play surface the kicker and ball stand
    // on, painted into the same picture from row 1149 down) kept on top. Applies from the next run.
    setBackground: function (img) {
      var src = s_oSpriteLibrary && ClientSprite("red_dolphins_stadium");
      if (!src || !src.width) { log("Tenant background: their stadium picture is not loaded yet."); return false; }
      var w = src.width, h = src.height, PITCH = 1149;
      var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      var x = cv.getContext("2d");
      var s = Math.max(w / img.width, PITCH / img.height), dw = img.width * s, dh = img.height * s;
      x.drawImage(img, (w - dw) / 2, (PITCH - dh) / 2, dw, dh);
      x.drawImage(src, 0, PITCH, w, h - PITCH, 0, PITCH, w, h - PITCH);
      stadium = cv;
      log("Tenant background applied to their stadium (stand, sky and banners; their pitch kept on top from row " + PITCH + ").");
      return true;
    },
    // Localhost autoplay only (gamebull/ui/DevAuto.tsx, every frame): picks a zone for each kick (green 50 %, yellow 25 %,
    // red 15 %, miss 10 %), watches their two meters and taps through their own tap handler (s_oInterface._handleClick)
    // when their own getAreaHit, with their own wind drift and distance power, says the cursor is on it. Their meters
    // and rules decide every kick; after 4 s on one meter it taps anyway.
    autoStep: function () {
      if (!window.RKClient.isRunning() || !s_oInterface || !game || !goal) return;
      var c = game.getConditions(), drift = c.wind * 0.044 * c.distance / 36, power = (c.distance - 22) * 0.014;
      if (!auto) { var r = Math.random(); auto = { zone: r < 0.5 ? GREEN_TARGET : r < 0.75 ? YELLOW_TARGET : r < 0.9 ? RED_TARGET : NULL_TARGET_LEFT, x: 0 }; }
      var h = meters.h, v = meters.v, now = performance.now(), tap = function () { s_oInterface._handleClick(); };
      if (h && h.gbOn) {
        var x = h.getCursorPosition(), want = auto.zone === NULL_TARGET_LEFT ? -0.8 : 0;
        if (Math.abs(x + drift - want) < 0.05 || now - h.gbSince > 4000) { auto.x = x; tap(); }
      } else if (v && v.gbOn) {
        var keep = lastHit, area = goal.getAreaHit(auto.x + drift, v.getCursorPosition() + power).areahit; lastHit = keep;
        var hit = auto.zone === NULL_TARGET_LEFT ? area < 0 : area === auto.zone;
        if (hit || now - v.gbSince > 4000) { tap(); auto = null; }
      }
    },
  };
  var auto = null;
  function ClientSprite(key) { var st = stadium; stadium = null; try { return s_oSpriteLibrary.getSprite(key); } finally { stadium = st; } }
  window.dispatchEvent(new Event("rkclient-ready"));
})();
