/**
 * MAIN MENU — Navigation & Setup
 */

/* ══════════════════════════════════════
   État global partagé avec game.html
══════════════════════════════════════ */
const GameState = {
  mode:         'pve',       // 'pve' | 'pvp'
  opponentId:   null,        // 1-5 (PvE)
  p1Id:         null,        // 1-5
  p2Id:         null,        // 1-5
  selecting:    1,           // 1 or 2
};
window.GameState = GameState;

/* ══════════════════════════════════════
   Navigation entre écrans
══════════════════════════════════════ */
function showScreen (id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

/* ══════════════════════════════════════
   Particules d'ambiance
══════════════════════════════════════ */
function spawnParticles (containerId, count = 28) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 1 + Math.random() * 3;
    p.style.cssText = `
      left:${Math.random() * 100}%;
      width:${size}px; height:${size}px;
      animation-duration:${7 + Math.random() * 11}s;
      animation-delay:${Math.random() * 9}s;
      opacity:${0.25 + Math.random() * 0.65};
    `;
    c.appendChild(p);
  }
}

/* ══════════════════════════════════════
   Carrousel des adversaires
══════════════════════════════════════ */

/* Descriptions humoristiques ajoutées aux niveaux IA */
const OPP_DESCS = {
  1: "Aussi dangereux qu'un chaton sous somnifère. Il rate 3 clics sur 4 et s'excuse à chaque fois. Parfait pour ton premier combat.",
  2: "A regardé des tutos YouTube sur le bras de fer. Il a surtout regardé des vidéos de chats, mais bon, il essaie quand même.",
  3: "S'entraîne tous les matins... avec une éponge. Sa technique est discutable, sa motivation non. Méfie-toi un peu quand même.",
  4: "Champion régional 2019. Depuis il en parle à TOUS ses repas de famille. Il va te rappeler combien de fois il a gagné — à toi de l'écraser.",
  5: "N'est pas humain. On l'a vérifié. Aucun genou, aucune compassion, aucun mercy. Tu as été prévenu.",
};

let _oppIdx = 0;

function buildOpponentsGrid() {
  const levels = AIEngine.getLevels();
  const total  = levels.length;

  // Init index sur l'adversaire précédemment sélectionné (ou 0)
  if (GameState.opponentId) {
    _oppIdx = levels.findIndex(l => l.id === GameState.opponentId);
    if (_oppIdx < 0) _oppIdx = 0;
  }

  /* --- Dots --- */
  const dotsEl = document.getElementById('opp-dots');
  if (dotsEl) {
    dotsEl.innerHTML = levels.map((_, i) =>
      `<div class="carousel-dot${i === _oppIdx ? ' active' : ''}" data-idx="${i}"></div>`
    ).join('');
    dotsEl.querySelectorAll('.carousel-dot').forEach(d => {
      d.addEventListener('click', () => {
        const target = parseInt(d.dataset.idx);
        const dir = target > _oppIdx ? 1 : -1;
        _oppIdx = target;
        SFX.playNav(dir);
        renderOppCarousel('none');
      });
    });
  }

  renderOppCarousel('none');

  /* --- Flèches --- */
  const prev = document.getElementById('opp-prev');
  const next = document.getElementById('opp-next');
  prev.onclick = null; next.onclick = null;

  prev.onclick = () => {
    _oppIdx = (_oppIdx - 1 + total) % total;
    SFX.playNav(-1);
    renderOppCarousel('left');
  };
  next.onclick = () => {
    _oppIdx = (_oppIdx + 1) % total;
    SFX.playNav(1);
    renderOppCarousel('right');
  };

  /* --- Clavier (si l'écran adversaire est actif) --- */
  document.onkeydown = (e) => {
    if (!document.getElementById('screen-opponents').classList.contains('active')) return;
    if (e.key === 'ArrowLeft')  { prev.click(); }
    if (e.key === 'ArrowRight') { next.click(); }
    if (e.key === 'Enter')      { document.getElementById('btn-fight').click(); }
  };

  /* --- Bouton COMBATTRE --- */
  const btn = document.getElementById('btn-fight');
  btn.onclick = () => {
    const opp = levels[_oppIdx];
    GameState.opponentId = opp.id;
    SFX.playSelect();
    startGame();
  };
}

function makeOppCardHTML(opp) {
  if (!opp) return '';
  const dotsPow = Array(5).fill(0).map((_, i) =>
    `<div class="carousel-stat-dot${i < opp.puissance ? ' fill' : ''}"></div>`).join('');
  const dotsSpd = Array(5).fill(0).map((_, i) =>
    `<div class="carousel-stat-dot${i < opp.vitesse ? ' fill' : ''}"></div>`).join('');
  const fb = AvatarSystem.makeFallback(opp.name[0], '#0b0b1e', opp.color);
  const desc = OPP_DESCS[opp.id] || '';
  return `
    <div class="carousel-avatar-wrap" style="color:${opp.color}">
      <img class="carousel-avatar"
           src="${AvatarSystem.getAiPath(opp.id)}"
           onerror="this.src='${fb}'; this.onerror=null;"/>
    </div>
    <div class="carousel-char-name" style="color:${opp.color}">${opp.name}</div>
    <div class="carousel-stats">
      <div class="carousel-stat-row">
        <span>Puissance</span>
        <div class="carousel-stat-dots">${dotsPow}</div>
      </div>
      <div class="carousel-stat-row">
        <span>Vitesse</span>
        <div class="carousel-stat-dots">${dotsSpd}</div>
      </div>
    </div>
    <div class="opponent-tag" style="color:${opp.color};margin-top:8px;">${opp.tag}</div>
    <div class="carousel-char-desc" style="margin-top:4px;">${desc}</div>
  `;
}

function renderOppCarousel(animDir) {
  const levels = AIEngine.getLevels();
  const total  = levels.length;
  const cur    = levels[_oppIdx];
  const left   = levels[(_oppIdx - 1 + total) % total];
  const right  = levels[(_oppIdx + 1) % total];

  const centerEl = document.getElementById('opp-card-center');
  const leftEl   = document.getElementById('opp-card-left');
  const rightEl  = document.getElementById('opp-card-right');

  if (leftEl) {
    leftEl.innerHTML = makeOppCardHTML(left);
    leftEl.onclick = () => document.getElementById('opp-prev').click();
  }
  if (centerEl) {
    centerEl.innerHTML = makeOppCardHTML(cur);
    centerEl.classList.remove('anim-from-left', 'anim-from-right');
    void centerEl.offsetWidth;
    if (animDir === 'right') centerEl.classList.add('anim-from-right');
    if (animDir === 'left')  centerEl.classList.add('anim-from-left');
    centerEl.onclick = null;
    // Couleur de bordure selon la difficulté
    centerEl.style.borderColor = cur.color;
    centerEl.style.boxShadow   = `0 0 30px ${cur.color}44`;
  }
  if (rightEl) {
    rightEl.innerHTML = makeOppCardHTML(right);
    rightEl.onclick = () => document.getElementById('opp-next').click();
  }

  // Dots
  document.querySelectorAll('#opp-dots .carousel-dot').forEach((d, i) => {
    d.classList.toggle('active', i === _oppIdx);
  });

  // Pré-sélection pour btn-fight
  GameState.opponentId = cur.id;
}


/* ══════════════════════════════════════
   BRUITAGES (Web Audio API — pas de fichier requis)
══════════════════════════════════════ */
const SFX = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  // Petit "whoosh" de navigation (fréquence descendante)
  function playNav(dir = 1) {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = 'sine';
    const t = c.currentTime;
    osc.frequency.setValueAtTime(dir > 0 ? 520 : 680, t);
    osc.frequency.exponentialRampToValueAtTime(dir > 0 ? 320 : 420, t + 0.12);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.start(t); osc.stop(t + 0.15);
  }

  // "Ping" de confirmation (sélection)
  function playSelect() {
    const c = getCtx();
    [0, 0.06, 0.12].forEach((delay, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'triangle';
      const t = c.currentTime + delay;
      osc.frequency.setValueAtTime([440, 550, 660][i], t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.2);
    });
  }

  return { playNav, playSelect };
})();

/* ══════════════════════════════════════
   CARROUSEL de sélection du personnage
══════════════════════════════════════ */
let _carouselIdx = 0;   // index courant
let _carouselLocked = false;

function buildCharacterCarousel() {
  const players = AvatarSystem.getAllPlayers();
  const total = players.length;

  /* --- Titre --- */
  const title = document.getElementById('char-screen-title');
  if (title) {
    title.textContent = GameState.selecting === 1
      ? '🔴 JOUEUR 1 : CHOISIS TON COMBATTANT'
      : '🔵 JOUEUR 2 : CHOISIS TON COMBATTANT';
    title.style.color = GameState.selecting === 1 ? 'var(--p1)' : 'var(--p2)';
  }

  /* --- Dots --- */
  const dotsEl = document.getElementById('carousel-dots');
  if (dotsEl) {
    dotsEl.innerHTML = players.map((_, i) =>
      `<div class="carousel-dot${i === _carouselIdx ? ' active' : ''}" data-idx="${i}"></div>`
    ).join('');
    dotsEl.querySelectorAll('.carousel-dot').forEach(d => {
      d.addEventListener('click', () => {
        const target = parseInt(d.dataset.idx);
        const dir = target > _carouselIdx ? 1 : -1;
        _carouselIdx = target;
        SFX.playNav(dir);
        renderCarousel('none');
      });
    });
  }

  renderCarousel('none');

  /* --- Flèches --- */
  const prev = document.getElementById('carousel-prev');
  const next = document.getElementById('carousel-next');
  prev.onclick = null; next.onclick = null;

  prev.onclick = () => {
    if (_carouselLocked) return;
    _carouselIdx = (_carouselIdx - 1 + total) % total;
    SFX.playNav(-1);
    renderCarousel('left');
  };
  next.onclick = () => {
    if (_carouselLocked) return;
    _carouselIdx = (_carouselIdx + 1) % total;
    SFX.playNav(1);
    renderCarousel('right');
  };

  /* --- Clavier --- */
  document.onkeydown = (e) => {
    if (!document.getElementById('screen-character').classList.contains('active')) return;
    if (e.key === 'ArrowLeft')  { prev.click(); }
    if (e.key === 'ArrowRight') { next.click(); }
    if (e.key === 'Enter' || e.key === ' ') { document.getElementById('btn-select-char').click(); }
  };

  /* --- Bouton VALIDER --- */
  const btn = document.getElementById('btn-select-char');
  btn.onclick = () => {
    SFX.playSelect();
    const p = players[_carouselIdx];
    if (GameState.selecting === 1) {
      GameState.p1Id = p.id;
      if (GameState.mode === 'pve') {
        _oppIdx = 0;
        buildOpponentsGrid();
        showScreen('screen-opponents');
      } else {
        GameState.selecting = 2;
        _carouselIdx = 0;
        buildCharacterCarousel();
      }
    } else {
      GameState.p2Id = p.id;
      startGame();
    }
  };
}

function makeCardHTML(p) {
  if (!p) return '';
  const dotsPow = Array(5).fill(0).map((_, i) =>
    `<div class="carousel-stat-dot${i < p.puissance ? ' fill' : ''}"></div>`).join('');
  const dotsSpd = Array(5).fill(0).map((_, i) =>
    `<div class="carousel-stat-dot${i < p.vitesse ? ' fill' : ''}"></div>`).join('');
  const fb = AvatarSystem.makeFallback(p.name[0], '#0b0b1e', p.color);
  return `
    <div class="carousel-avatar-wrap" style="color:${p.color}">
      <img class="carousel-avatar" src="${AvatarSystem.getPlayerImgPath(p.id)}"
           onerror="this.src='${fb}'; this.onerror=null;"/>
    </div>
    <div class="carousel-char-name" style="color:${p.color}">${p.name}</div>
    <div class="carousel-stats">
      <div class="carousel-stat-row">
        <span>Puissance</span>
        <div class="carousel-stat-dots">${dotsPow}</div>
      </div>
      <div class="carousel-stat-row">
        <span>Vitesse</span>
        <div class="carousel-stat-dots">${dotsSpd}</div>
      </div>
    </div>
    <div class="carousel-char-desc">${p.desc}</div>
  `;
}

function renderCarousel(animDir) {
  const players = AvatarSystem.getAllPlayers();
  const total   = players.length;
  const cur     = players[_carouselIdx];
  const left    = players[(_carouselIdx - 1 + total) % total];
  const right   = players[(_carouselIdx + 1) % total];

  const centerEl = document.getElementById('card-center');
  const leftEl   = document.getElementById('card-left');
  const rightEl  = document.getElementById('card-right');

  // Carte gauche (aperçu)
  if (leftEl) {
    leftEl.innerHTML = makeCardHTML(left);
    leftEl.onclick = () => {
      document.getElementById('carousel-prev').click();
    };
  }

  // Carte centrale
  if (centerEl) {
    centerEl.innerHTML = makeCardHTML(cur);
    centerEl.classList.remove('anim-from-left', 'anim-from-right');
    void centerEl.offsetWidth; // reflow pour relancer animation
    if (animDir === 'right') centerEl.classList.add('anim-from-right');
    if (animDir === 'left')  centerEl.classList.add('anim-from-left');
    centerEl.onclick = null; // centre = rien (bouton VALIDER)
  }

  // Carte droite (aperçu)
  if (rightEl) {
    rightEl.innerHTML = makeCardHTML(right);
    rightEl.onclick = () => {
      document.getElementById('carousel-next').click();
    };
  }

  // Mise à jour des dots
  document.querySelectorAll('.carousel-dot').forEach((d, i) => {
    d.classList.toggle('active', i === _carouselIdx);
  });

  // Glow de fond selon couleur du personnage
  document.getElementById('screen-character').style.setProperty(
    '--char-glow', cur.color
  );
}

// Alias pour compatibilité avec le reste du code
function buildCharacterGrid() { buildCharacterCarousel(); }

function startGame() {
  const params = new URLSearchParams({
    mode: GameState.mode,
    p1id: GameState.p1Id || 1,
    p2id: GameState.p2Id || 2,
    opp:  GameState.opponentId || 1,
  });
  window.location.href = 'game.html?' + params.toString();
}


/* ══════════════════════════════════════
   Scores (localStorage)
══════════════════════════════════════ */
function getScores () {
  try { return JSON.parse(localStorage.getItem('bdf_scores') || '[]'); }
  catch { return []; }
}
function saveScore (data) {
  const arr = getScores();
  arr.unshift({ ...data, date: Date.now() });
  localStorage.setItem('bdf_scores', JSON.stringify(arr.slice(0, 60)));
}
window.saveScore = saveScore;

function buildScoresScreen () {
  const list = document.getElementById('scores-list');
  if (!list) return;

  const scores = getScores();
  if (!scores.length) {
    list.innerHTML = `<div class="empty-scores">
      Aucun score enregistré.<br>Lance ton premier combat !
    </div>`;
    return;
  }

  const rankColors = ['#ffcc00','#c0c0c0','#cd7f32'];

  list.innerHTML = scores.slice(0, 12).map((s, i) => {
    const rc = rankColors[i] || 'var(--text-muted)';
    const won = s.won;
    return `
      <div class="score-item">
        <div class="score-rank" style="color:${rc}">${i + 1}</div>
        <div class="score-info">
          <div class="score-name">${s.p1} vs ${s.opp}</div>
          <div class="score-detail">${s.mode === 'pvp' ? '🤝 PvP' : '🤖 PvE'} · ${new Date(s.date).toLocaleDateString('fr-FR')}</div>
        </div>
        <div class="score-result" style="color:${won ? 'var(--gold)' : 'var(--p1)'}">
          ${s.score}
        </div>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════
   INIT — Event Listeners
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* Particules */
  spawnParticles('particles-main', 30);
  spawnParticles('particles-opp',  20);
  spawnParticles('particles-char', 20);
  spawnParticles('particles-scores',20);

  /* ── Boutons menu principal ── */
  document.getElementById('btn-pve').addEventListener('click', () => {
    GameState.mode = 'pve';
    GameState.selecting = 1;
    buildCharacterGrid();
    showScreen('screen-character');
  });

  document.getElementById('btn-pvp').addEventListener('click', () => {
    GameState.mode = 'pvp';
    GameState.selecting = 1;
    buildCharacterGrid();
    showScreen('screen-character');
  });

  document.getElementById('btn-scores').addEventListener('click', () => {
    buildScoresScreen();
    showScreen('screen-scores');
  });

  /* ── Retours ── */
  document.getElementById('back-opp').addEventListener('click', () => {
    // Retour à la sélection de personnage J1
    GameState.selecting = 1;
    _carouselIdx = 0;
    buildCharacterGrid();
    showScreen('screen-character');
  });
  
  document.getElementById('back-char').addEventListener('click', () => {
    if (GameState.selecting === 2) {
      GameState.selecting = 1;
      _carouselIdx = 0;
      buildCharacterGrid();
    } else {
      showScreen('screen-main');
    }
  });
  
  document.getElementById('back-scores').addEventListener('click', () => showScreen('screen-main'));

  /* ── Effacer scores ── */
  document.getElementById('btn-clear').addEventListener('click', () => {
    if (confirm('Effacer tous les scores ?')) {
      localStorage.removeItem('bdf_scores');
      buildScoresScreen();
    }
  });
});
