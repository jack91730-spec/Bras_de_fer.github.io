/**
 * GAME ENGINE — Moteur de combat Bras de Fer
 *
 * Mécanique :
 *  - Chaque clic joueur ajoute CLICK_POWER à playerForce
 *  - Chaque tick, les forces décroissent (DECAY)
 *  - armPosition = clamped(playerForce - aiForce) → -100 (p2 gagne) … +100 (p1 gagne)
 *  - Si armPosition atteint WIN_THRESH → fin du round
 *  - Timer 30 s : si le temps s'écoule, le leader gagne le round
 *  - Match en 3 rounds (best-of-3 : 2 gagnés)
 */

/* ══════════════════════════════════════════
   CONSTANTES
══════════════════════════════════════════ */
const ROUND_DURATION = 30;     // secondes
const MAX_FORCE      = 100;    // force max par joueur
const CLICK_POWER    = 6.5;    // force ajoutée par clic humain
const AI_CLICK_POWER = 5.8;    // force ajoutée par clic IA (légèrement moindre)
const DECAY          = 0.038;  // % de force perdue par tick (50 ms)
const TICK_MS        = 50;     // ms entre chaque tick
const WIN_THRESH     = 94;     // seuil de victoire du round
const ARM_LERP       = 0.14;   // vitesse de déplacement du bras (interpolation)

/* ══════════════════════════════════════════
   AUDIO
══════════════════════════════════════════ */
const bgMusic = new Audio('sons/musique.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;
let musicStarted = false;

function tryPlayMusic() {
  if (!musicStarted) {
    bgMusic.play().then(() => { musicStarted = true; }).catch(e => console.warn('Autoplay bloqué en attente d\'interaction', e));
  }
}

/* Géométrie SVG du bras */
const SVG_W    = 560;
const ELBOW_LX = 50;   // x du coude gauche
const ELBOW_RX = 510;  // x du coude droit
const ELBOW_Y  = 208;  // y des deux coudes (surface de la table)
const HAND_Y_NEUTRAL  = 148; // y des mains au neutre (bras levés)
const HAND_Y_OFFSET   = 38;  // aplatissement quand un côté perd

/* ══════════════════════════════════════════
   ÉTAT DU JEU
══════════════════════════════════════════ */
const G = {
  mode:   'pve',
  oppLvl: 1,
  p1Id:   1,
  p2Id:   2,
  p1Name: 'Joueur 1',
  p2Name: 'Adversaire',

  p1ClickPower: 6.5,
  p2ClickPower: 6.5,
  p1Decay: 0.038,
  p2Decay: 0.038,

  round:    1,
  scoreP1:  0,
  scoreP2:  0,
  roundWins: {},     // {1:'p1', 2:'p2', ...}
  koWinner:  null,   // 'p1' | 'p2' | null

  playerForce: 0,
  aiForce:     0,
  armPos:      0,    // position lissée du bras (-100 … +100)

  timer:       ROUND_DURATION,
  running:     false,

  _gameTick:  null,
  _timerTick: null,
};

/* ══════════════════════════════════════════
   UTILITAIRES
══════════════════════════════════════════ */
function clamp (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp  (a, b, t)   { return a + (b - a) * t; }
function deg   (rad)       { return rad * 180 / Math.PI; }

function getUrlParams () {
  const p = new URLSearchParams(window.location.search);
  return {
    mode: p.get('mode') || 'pve',
    p1id: parseInt(p.get('p1id')) || 1,
    p2id: parseInt(p.get('p2id')) || 2,
    opp:  parseInt(p.get('opp')) || 1,
  };
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
function initGame () {
  const params = getUrlParams();
  G.mode   = params.mode;
  G.p1Id   = params.p1id;
  G.p2Id   = params.p2id;
  G.oppLvl = params.opp;

  const player1 = AvatarSystem.getPlayer(G.p1Id);
  const player2 = AvatarSystem.getPlayer(G.p2Id);
  const opp = AIEngine.getLevel(G.oppLvl);

  G.p1Name = player1.name;
  G.p2Name = G.mode === 'pvp' ? player2.name : opp.name;

  /* Appliquer les statistiques */
  G.p1ClickPower = CLICK_POWER * (player1.puissance / 3);
  G.p1Decay = DECAY * (3 / player1.vitesse);

  if (G.mode === 'pvp') {
    G.p2ClickPower = CLICK_POWER * (player2.puissance / 3);
    G.p2Decay = DECAY * (3 / player2.vitesse);
  } else {
    G.p2ClickPower = AI_CLICK_POWER * (opp.puissance / 3);
    G.p2Decay = DECAY * (3 / opp.vitesse);
  }

  /* Noms */
  document.getElementById('name-p1').textContent = G.p1Name;
  document.getElementById('name-p2').textContent = G.p2Name;
  document.getElementById('pos-label-p1').textContent = '◄ ' + G.p1Name.toUpperCase();
  document.getElementById('pos-label-p2').textContent = G.p2Name.toUpperCase() + ' ►';

  /* Avatars */
  AvatarSystem.setAvatar(
    document.getElementById('avatar-p1'),
    AvatarSystem.getPlayerImgPath(G.p1Id),
    G.p1Name.slice(0,2), '#0b0b1e', player1.color
  );

  if (G.mode === 'pvp') {
    AvatarSystem.setAvatar(
      document.getElementById('avatar-p2'),
      AvatarSystem.getPlayerImgPath(G.p2Id),
      G.p2Name.slice(0,2), '#0b0b1e', player2.color
    );
    /* Barre force p2 → couleur selon joueur */
    document.getElementById('ring-p2').style.background = `linear-gradient(135deg, ${player2.color}, #001133)`;
    document.getElementById('ring-p2').style.boxShadow = `0 0 24px ${player2.color}66`;
    document.getElementById('fbar-p2').style.background = `linear-gradient(90deg, ${player2.color}88, ${player2.color})`;
    document.getElementById('score-p2').style.color = player2.color;
    document.getElementById('name-p2').style.color = player2.color;
    document.getElementById('panel-p2').classList.remove('ai-panel');
    /* Bouton P2 visible */
    document.getElementById('btn-p2').style.display = 'flex';
  } else {
    AvatarSystem.setAvatar(
      document.getElementById('avatar-p2'),
      AvatarSystem.getAiPath(G.oppLvl),
      opp ? opp.name[0] : '?', '#0b0b1e',
      opp ? opp.color : '#00e676'
    );
    /* Couleur ring IA selon niveau */
    if (opp) {
      document.getElementById('ring-p2').style.background =
        `linear-gradient(135deg, ${opp.color}, #001133)`;
      document.getElementById('ring-p2').style.boxShadow =
        `0 0 24px ${opp.color}66`;
      document.getElementById('fbar-p2').style.background =
        `linear-gradient(90deg, ${opp.color}88, ${opp.color})`;
      document.getElementById('name-p2').style.color = opp.color;
      document.getElementById('score-p2').style.color = opp.color;
    }
    document.getElementById('panel-p2').classList.add('ai-panel');
  }

  /* Initialise les ronds */
  buildRoundDots();
  tryPlayMusic();
  startRound();
}

/* ══════════════════════════════════════════
   ROUND DOTS
══════════════════════════════════════════ */
function buildRoundDots () {
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById('dot-' + i);
    if (!dot) continue;
    dot.className = 'round-dot';
    const w = G.roundWins[i];
    if (w === 'p1')     dot.classList.add('p1-won');
    else if (w === 'p2') dot.classList.add('p2-won');
    else if (i === G.round) dot.classList.add('current');
  }
  document.getElementById('round-label').textContent = `ROUND ${G.round} / 3`;
}

/* ══════════════════════════════════════════
   ROUND : DÉMARRAGE
══════════════════════════════════════════ */
function startRound () {
  G.playerForce = 0;
  G.aiForce     = 0;
  G.armPos      = 0;
  G.timer       = ROUND_DURATION;
  G.running     = false;

  updateArmSvg();
  updateBars();

  showCountdown(() => {
    G.running = true;

    /* Boucle de jeu (50 ms) */
    G._gameTick = setInterval(gameTick, TICK_MS);

    /* Timer 1 s */
    G._timerTick = setInterval(() => {
      if (!G.running) return;
      G.timer--;
      const el = document.getElementById('timer-display');
      el.textContent = G.timer;
      el.classList.toggle('urgent', G.timer <= 5);
      if (G.timer <= 0) endRound('time');
    }, 1000);

    /* IA */
    if (G.mode === 'pve') {
      AIEngine.start(
        G.oppLvl,
        aiClic,
        () => G.playerForce,
        () => G.aiForce
      );
    }
  });
}

/* ══════════════════════════════════════════
   BOUCLE DE JEU
══════════════════════════════════════════ */
function gameTick () {
  if (!G.running) return;

  /* Décroissance des forces */
  G.playerForce = Math.max(0, G.playerForce * (1 - G.p1Decay));
  G.aiForce     = Math.max(0, G.aiForce     * (1 - G.p2Decay));

  /* Calcul position cible du bras */
  const diff      = G.playerForce - G.aiForce;
  const targetPos = clamp(diff * 1.3, -MAX_FORCE, MAX_FORCE);
  G.armPos        = lerp(G.armPos, targetPos, ARM_LERP);

  /* Vérification victoire */
  if (G.armPos >=  WIN_THRESH) { endRound('p1'); return; }
  if (G.armPos <= -WIN_THRESH) { endRound('p2'); return; }

  updateBars();
  updateArmSvg();
  updatePanelStates();
}

/* ══════════════════════════════════════════
   CLICS
══════════════════════════════════════════ */
function playerClic () {
  tryPlayMusic();
  if (!G.running) return;
  G.playerForce = clamp(G.playerForce + G.p1ClickPower, 0, MAX_FORCE);
  addRipple(document.getElementById('btn-p1'));
}

function p2Clic () {
  tryPlayMusic();
  if (!G.running || G.mode !== 'pvp') return;
  G.aiForce = clamp(G.aiForce + G.p2ClickPower, 0, MAX_FORCE);
  addRipple(document.getElementById('btn-p2'));
}

function aiClic () {
  G.aiForce = clamp(G.aiForce + G.p2ClickPower, 0, MAX_FORCE);
}

function addRipple (btn) {
  if (!btn) return;
  const r = document.createElement('span');
  r.className = 'ripple-el';
  const s = btn.offsetWidth * 2;
  r.style.cssText = `width:${s}px;height:${s}px;left:50%;top:50%;margin-left:-${s/2}px;margin-top:-${s/2}px;`;
  btn.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

/* ══════════════════════════════════════════
   UPDATE UI — Barres de force
══════════════════════════════════════════ */
function updateBars () {
  const p1pct = (G.playerForce / MAX_FORCE * 100).toFixed(1);
  const p2pct = (G.aiForce     / MAX_FORCE * 100).toFixed(1);
  document.getElementById('fbar-p1').style.width = p1pct + '%';
  document.getElementById('fbar-p2').style.width = p2pct + '%';
  document.getElementById('fval-p1').textContent  = Math.round(p1pct) + ' %';
  document.getElementById('fval-p2').textContent  = Math.round(p2pct) + ' %';
  document.getElementById('score-p1').textContent = G.scoreP1;
  document.getElementById('score-p2').textContent = G.scoreP2;
}

/* ══════════════════════════════════════════
   UPDATE UI — Panneaux joueurs (winning / losing)
══════════════════════════════════════════ */
function updatePanelStates () {
  const p1 = document.getElementById('panel-p1');
  const p2 = document.getElementById('panel-p2');
  p1.classList.remove('winning','losing');
  p2.classList.remove('winning','losing');
  if      (G.armPos >  18) { p1.classList.add('winning'); p2.classList.add('losing'); }
  else if (G.armPos < -18) { p2.classList.add('winning'); p1.classList.add('losing'); }
}

/* ══════════════════════════════════════════
   UPDATE ANIMATION — Bras SVG
══════════════════════════════════════════ */
function updateArmSvg () {
  /*
   * armPos : +100 → P1 gagne (mains poussées vers le côté droit/P2)
   *          -100 → P2 gagne (mains poussées vers le côté gauche/P1)
   *
   * handX : 280 + (armPos/100)*110
   *   => armPos=0   : handX=280 (centre)
   *   => armPos=+100: handX=390 (côté P2)
   *   => armPos=-100: handX=170 (côté P1)
   *
   * handY : varie légèrement selon l'intensité (les mains s'abaissent du côté perdant)
   */
  const handX = 280 + (G.armPos / 100) * 110;
  const handY = HAND_Y_NEUTRAL + (Math.abs(G.armPos) / 100) * HAND_Y_OFFSET;

  /* ── Avant-bras gauche ── */
  const dxL = handX - ELBOW_LX;
  const dyL = handY - ELBOW_Y;
  const lenL = Math.sqrt(dxL * dxL + dyL * dyL);
  const angL = deg(Math.atan2(dyL, dxL));
  const foreL = document.getElementById('forearm-l');
  if (foreL) {
    foreL.setAttribute('width', Math.max(10, lenL));
    foreL.setAttribute('transform',
      `translate(${ELBOW_LX},${ELBOW_Y}) rotate(${angL})`);
  }

  /* ── Avant-bras droit ── */
  const dxR = handX - ELBOW_RX;
  const dyR = handY - ELBOW_Y;
  const lenR = Math.sqrt(dxR * dxR + dyR * dyR);
  const angR = deg(Math.atan2(dyR, dxR));
  const foreR = document.getElementById('forearm-r');
  if (foreR) {
    foreR.setAttribute('width', Math.max(10, lenR));
    foreR.setAttribute('transform',
      `translate(${ELBOW_RX},${ELBOW_Y}) rotate(${angR})`);
  }

  /* ── Groupe clash (mains + étincelle) ── */
  const clash = document.getElementById('clash-group');
  if (clash) clash.setAttribute('transform', `translate(${handX},${handY})`);

  /* ── Indicator line ── */
  const pl = document.getElementById('pos-line');
  if (pl) {
    pl.setAttribute('x1', handX);
    pl.setAttribute('x2', handX);
    pl.setAttribute('y1', ELBOW_Y);
    pl.setAttribute('y2', ELBOW_Y + 42);
  }

  /* ── Intensité de l'étincelle (plus forte quand le score est proche) ── */
  const intensity = 1 - Math.abs(G.armPos) / 100;
  const spark = document.getElementById('clash-spark');
  const aura  = document.getElementById('clash-aura');
  const rays  = document.getElementById('impact-rays');
  if (spark) { spark.setAttribute('r',  7 + intensity * 8); }
  if (aura)  { aura.setAttribute('r',  16 + intensity * 18); aura.setAttribute('opacity', 0.05 + intensity * 0.22); }
  if (rays)  { rays.setAttribute('opacity', 0.4 + intensity * 0.65); }

  /* ── Barre de position (marqueur coulissant) ── */
  const pct = ((G.armPos + 100) / 200) * 100;  // 0..100
  const marker = document.getElementById('pos-marker');
  const fill   = document.getElementById('pos-fill');
  if (marker) marker.style.left = pct + '%';
  if (fill) {
    const opp = AIEngine.getLevel(G.oppLvl);
    const p2Color = (G.mode === 'pvp') ? '#1e8fff' : (opp ? opp.color : '#00e676');
    if (G.armPos >= 0) {
      fill.style.left  = '50%';
      fill.style.width = (pct - 50) + '%';
      fill.style.background = 'linear-gradient(90deg, #ff3b4e, #ff8800)';
    } else {
      fill.style.left  = pct + '%';
      fill.style.width = (50 - pct) + '%';
      fill.style.background = `linear-gradient(90deg, ${p2Color}, ${p2Color}88)`;
    }
  }
}

/* ══════════════════════════════════════════
   FIN DE ROUND
══════════════════════════════════════════ */
function endRound (reason) {
  if (!G.running) return;
  G.running = false;

  clearInterval(G._gameTick);
  clearInterval(G._timerTick);
  AIEngine.stop();

  let winner;
  if (reason === 'time') winner = G.armPos >= 0 ? 'p1' : 'p2';
  else                   winner = reason;

  const elapsed = ROUND_DURATION - G.timer;
  const isKO = (reason !== 'time') && (elapsed <= 10);

  if (isKO) {
    G.koWinner = winner;
    if (winner === 'p1') G.scoreP1 = 2;
    else                 G.scoreP2 = 2;
    G.roundWins[1] = winner;
    G.roundWins[2] = winner;
  } else {
    G.roundWins[G.round] = winner;
    if (winner === 'p1') G.scoreP1++;
    else                 G.scoreP2++;
  }

  updateBars();
  buildRoundDots();

  /* Petite secousse visuelle */
  const svg = document.getElementById('arm-svg');
  if (svg) {
    svg.classList.add('shaking');
    setTimeout(() => svg.classList.remove('shaking'), 400);
  }

  const isMatchOver = G.round >= 3 || G.scoreP1 >= 2 || G.scoreP2 >= 2;
  const delay = 700;

  if (isMatchOver) setTimeout(showMatchResult, delay);
  else             setTimeout(() => showRoundResult(winner), delay);
}

/* ══════════════════════════════════════════
   OVERLAY — Résultat du round
══════════════════════════════════════════ */
function showRoundResult (winner) {
  const p1Won = winner === 'p1';
  document.getElementById('round-icon').textContent  = p1Won ? '🏆' : '😤';
  document.getElementById('round-title').textContent = p1Won ? 'ROUND GAGNÉ !' : 'ROUND PERDU !';
  document.getElementById('round-title').style.color = p1Won ? 'var(--gold)' : 'var(--p1)';
  document.getElementById('round-sub').textContent   = p1Won
    ? `${G.p1Name} prend l'avantage !`
    : `${G.p2Name} résiste !`;
  document.getElementById('rs-p1').textContent = G.scoreP1;
  document.getElementById('rs-p2').textContent = G.scoreP2;
  document.getElementById('ov-round').classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-next-round')?.addEventListener('click', () => {
    document.getElementById('ov-round').classList.remove('active');
    G.round++;
    buildRoundDots();
    startRound();
  });

  /* ══════════════════════════════════════════
     OVERLAY — Résultat du match
  ══════════════════════════════════════════ */
  document.getElementById('btn-rematch')?.addEventListener('click', () => {
    document.getElementById('ov-match').classList.remove('active');
    G.round     = 1;
    G.scoreP1   = 0;
    G.scoreP2   = 0;
    G.roundWins = {};
    G.koWinner  = null;
    buildRoundDots();
    startRound();
  });

  document.getElementById('btn-menu')?.addEventListener('click', () => {
    AIEngine.stop();
    window.location.href = 'index.html';
  });
});

function showMatchResult () {
  const p1Won = G.scoreP1 > G.scoreP2;

  if (G.koWinner) {
    document.getElementById('match-icon').textContent  = '🥊';
    document.getElementById('match-title').textContent = p1Won ? 'K.O. MAGISTRAL !' : 'K.O. FATAL !';
    document.getElementById('match-title').style.color = p1Won ? '#ff3b4e' : 'var(--p1)';
    document.getElementById('match-sub').textContent   = p1Won
      ? `${G.p1Name} a pulvérisé ${G.p2Name} en un éclair !`
      : `${G.p2Name} t'a mis K.O. direct !`;
  } else {
    document.getElementById('match-icon').textContent  = p1Won ? '👑' : '💀';
    document.getElementById('match-title').textContent = p1Won ? '🏆 VICTOIRE !' : '💥 DÉFAITE !';
    document.getElementById('match-title').style.color = p1Won ? 'var(--gold)' : 'var(--p1)';
    document.getElementById('match-sub').textContent   = p1Won
      ? `${G.p1Name} a écrasé ${G.p2Name} !`
      : `${G.p2Name} a dominé le combat !`;
  }
  document.getElementById('ms-p1').textContent = G.scoreP1;
  document.getElementById('ms-p2').textContent = G.scoreP2;

  document.getElementById('ov-match').classList.add('active');

  if (p1Won) spawnConfetti();

  /* Sauvegarde du score */
  if (typeof saveScore === 'function') {
    saveScore({
      p1:    G.p1Name,
      opp:   G.p2Name,
      mode:  G.mode,
      score: `${G.scoreP1}–${G.scoreP2}`,
      won:   p1Won,
    });
  }
}

/* ══════════════════════════════════════════
   COUNTDOWN OVERLAY
══════════════════════════════════════════ */
function showCountdown (callback) {
  const ov  = document.getElementById('ov-countdown');
  const num = document.getElementById('countdown-num');
  ov.classList.add('active');

  let count = 3;

  const tick = () => {
    /* Force re-animation */
    num.style.animation = 'none';
    void num.offsetWidth;
    num.style.animation = '';

    if (count === 0) {
      num.textContent  = 'GO !';
      num.style.color  = '#00e676';
      num.style.textShadow = '0 0 40px #00e676, 0 0 80px rgba(0,230,118,0.4)';
      setTimeout(() => {
        ov.classList.remove('active');
        num.style.color = '';
        num.style.textShadow = '';
        callback();
      }, 700);
    } else {
      num.textContent = count;
      num.style.color = '';
      count--;
      setTimeout(tick, 920);
    }
  };

  tick();
}

/* ══════════════════════════════════════════
   CONFETTI
══════════════════════════════════════════ */
function spawnConfetti () {
  const colors = ['#ff3b4e','#ffcc00','#00e676','#1e8fff','#ff8800','#cc44ff','#fff'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const size = 6 + Math.random() * 9;
    const dur  = 1.6 + Math.random() * 2.2;
    el.style.cssText = `
      left:${Math.random() * 100}vw;
      width:${size}px; height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${dur}s;
      animation-delay:${Math.random() * 0.8}s;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      top: -20px;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), (dur + 1) * 1000);
  }
}

/* ══════════════════════════════════════════
   PARTICULES
══════════════════════════════════════════ */
function spawnParticles (id, n = 20) {
  const c = document.getElementById(id);
  if (!c) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const sz = 1 + Math.random() * 2.5;
    p.style.cssText = `
      left:${Math.random()*100}%;
      width:${sz}px; height:${sz}px;
      animation-duration:${7+Math.random()*10}s;
      animation-delay:${Math.random()*9}s;
      opacity:${0.2+Math.random()*0.6};
    `;
    c.appendChild(p);
  }
}

/* ══════════════════════════════════════════
   ÉVÉNEMENTS
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  spawnParticles('particles-game', 22);

  /* Bouton P1 */
  const btnP1 = document.getElementById('btn-p1');
  btnP1.addEventListener('click', playerClic);
  btnP1.addEventListener('touchstart', e => { e.preventDefault(); playerClic(); }, { passive: false });

  /* Bouton P2 */
  const btnP2 = document.getElementById('btn-p2');
  btnP2.addEventListener('click', p2Clic);
  btnP2.addEventListener('touchstart', e => { e.preventDefault(); p2Clic(); }, { passive: false });

  /* Clavier */
  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'KeyZ') { e.preventDefault(); playerClic(); }
    if (e.code === 'Enter' || e.code === 'KeyM') { e.preventDefault(); p2Clic(); }
  });

  initGame();
});
