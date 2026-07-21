/**
 * AI ENGINE — 5 niveaux de difficulté
 * Simule un joueur humain avec des intervalles de clics,
 * des bursts agressifs et des micro-pauses aléatoires.
 */
const AIEngine = (function () {

  /* ── Définition des niveaux ── */
  const LEVELS = [
    {
      id: 1,
      name: 'Le Zébutant',
      tag: 'Facile',
      color: '#00e676',
      difficulty: 1,
      puissance: 1,
      vitesse: 2,
      avgInterval:   380, // ms entre chaque clic
      jitter:        0.3, // variabilité ±30 %
      burstProb:     0.05,
      burstCount:    2,
      burstInterval: 220,
      restProb:      0.08,
      restMin:       600,
      restMax:      1400,
      reactionBoost: 0,   // accélération si le joueur mène
    },
    {
      id: 2,
      name: "L'amateur(X)",
      tag: 'Moyen',
      color: '#ffcc00',
      difficulty: 2,
      puissance: 2,
      vitesse: 2,
      avgInterval:   240,
      jitter:        0.25,
      burstProb:     0.12,
      burstCount:    3,
      burstInterval: 160,
      restProb:      0.06,
      restMin:       350,
      restMax:       900,
      reactionBoost: 0.12,
    },
    {
      id: 3,
      name: 'J.de Monaco',
      tag: 'Difficile',
      color: '#ff8800',
      difficulty: 3,
      puissance: 4,
      vitesse: 2,
      avgInterval:   180,
      jitter:        0.2,
      burstProb:     0.20,
      burstCount:    4,
      burstInterval: 120,
      restProb:      0.04,
      restMin:       200,
      restMax:       550,
      reactionBoost: 0.20,
    },
    {
      id: 4,
      name: 'La Truand',
      tag: 'Expert',
      color: '#ff3b4e',
      difficulty: 4,
      puissance: 3,
      vitesse: 4,
      avgInterval:    120,
      jitter:         0.15,
      burstProb:      0.25,
      burstCount:     5,
      burstInterval:  85,
      restProb:       0.02,
      restMin:        120,
      restMax:        320,
      reactionBoost:  0.30,
    },
    {
      id: 5,
      name: 'Le Borgne',
      tag: 'IMPOSSIBLE',
      color: '#cc44ff',
      difficulty: 5,
      puissance: 5,
      vitesse: 3,
      avgInterval:    85,
      jitter:         0.10,
      burstProb:      0.35,
      burstCount:     6,
      burstInterval:  60,
      restProb:       0.008,
      restMin:        60,
      restMax:        180,
      reactionBoost:  0.40,
    },
  ];

  /* ── État interne ── */
  let _handle       = null;
  let _restHandle   = null;
  let _resting      = false;
  let _level        = null;
  let _onClic       = null;
  let _getPlayerF   = null;
  let _getAiF       = null;

  /* ── Planifier le prochain clic ── */
  function _schedule () {
    if (!_onClic || !_level) return;

    /* Pauses aléatoires */
    if (!_resting && Math.random() < _level.restProb) {
      _resting = true;
      const dur = _level.restMin + Math.random() * (_level.restMax - _level.restMin);
      _restHandle = setTimeout(() => { _resting = false; _schedule(); }, dur);
      return;
    }
    if (_resting) return;

    /* Intervalle de base + jitter */
    let interval = _level.avgInterval;

    /* Réactivité : accélérer si le joueur humain domine */
    if (_level.reactionBoost > 0 && _getPlayerF && _getAiF) {
      const diff = _getPlayerF() - _getAiF();
      if (diff > 0) {
        interval = Math.max(28, interval * (1 - _level.reactionBoost * (diff / 100)));
      }
    }

    /* Jitter aléatoire */
    const j = 1 + (_level.jitter * (Math.random() * 2 - 1));
    interval = Math.max(25, interval * j);

    _handle = setTimeout(() => {
      if (!_onClic) return;

      /* Burst de clics */
      if (Math.random() < _level.burstProb) {
        let i = 0;
        const doBurst = () => {
          if (i < _level.burstCount && _onClic) {
            _onClic();
            i++;
            setTimeout(doBurst, _level.burstInterval * (0.85 + Math.random() * 0.3));
          } else {
            _schedule();
          }
        };
        doBurst();
      } else {
        _onClic();
        _schedule();
      }
    }, interval);
  }

  /* ── API publique ── */

  /**
   * Démarre l'IA
   * @param {number}   levelId      - 1 à 5
   * @param {Function} onClic       - appelé à chaque clic IA
   * @param {Function} getPlayerF   - retourne la force courante du joueur
   * @param {Function} getAiF       - retourne la force courante de l'IA
   */
  function start (levelId, onClic, getPlayerF, getAiF) {
    stop();
    _level      = LEVELS.find(l => l.id === levelId) || LEVELS[0];
    _onClic     = onClic;
    _getPlayerF = getPlayerF;
    _getAiF     = getAiF;
    _resting    = false;
    _schedule();
  }

  function stop () {
    if (_handle)     { clearTimeout(_handle);    _handle     = null; }
    if (_restHandle) { clearTimeout(_restHandle); _restHandle = null; }
    _resting    = false;
    _onClic     = null;
    _getPlayerF = null;
    _getAiF     = null;
  }

  function getLevel (id) { return LEVELS.find(l => l.id === id); }
  function getLevels ()  { return LEVELS; }

  return { start, stop, getLevel, getLevels };
})();

window.AIEngine = AIEngine;
