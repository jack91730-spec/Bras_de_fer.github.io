/**
 * AVATAR SYSTEM
 * Charge les images depuis le serveur selon la convention de nommage.
 * - avatars/joueur1.png      → Joueur 1
 * - avatars/joueur2.png      → Joueur 2 (PvP)
 * - avatars/adversaire1.png  → Adversaire niveau 1
 * - …
 * - avatars/adversaire5.png  → Adversaire niveau 5
 * Fallback : SVG généré avec initiales si l'image est absente.
 */
const AvatarSystem = (function () {

  const BASE = 'avatars/';

  const PLAYERS = [
    {
      id: 1,
      name: "Le vieux",
      file: "joueur1.png",
      color: "#ff3b4e",
      puissance: 5,
      vitesse: 3,
      desc: "A plus d'arthrose que de force, mais l'expérience (et sa canne) frappent étonnamment fort. Ne vous fiez pas à ses tremblements !"
    },
    {
      id: 2,
      name: "Le cerveau",
      file: "joueur2.png",
      color: "#1e8fff",
      puissance: 2,
      vitesse: 5,
      desc: "A déjà calculé l'angle exact pour gagner. Malheureusement, la théorie n'a pas musclé ses bras en spaghettis."
    },
    {
      id: 3,
      name: "La stratège",
      file: "joueur3.png",
      color: "#00e676",
      puissance: 3,
      vitesse: 4,
      desc: "Analyse vos faiblesses en temps réel. Elle gagne à l'usure psychologique autant qu'à la force."
    },
    {
      id: 4,
      name: "Le révolutionnaire",
      file: "joueur4.png",
      color: "#ff8800",
      puissance: 4,
      vitesse: 3,
      desc: "Lutte contre le système, le capitalisme, et accessoirement ton poignet. Toujours prêt à tout casser."
    },
    {
      id: 5,
      name: "La rebelle",
      file: "joueur5.png",
      color: "#cc44ff",
      puissance: 3,
      vitesse: 4,
      desc: "Ne respecte absolument aucune règle. Attention, elle pourrait te mordre le bras en plein match."
    }
  ];

  const PATHS = {
    ai1: BASE + 'adversaire1.png',
    ai2: BASE + 'adversaire2.png',
    ai3: BASE + 'adversaire3.png',
    ai4: BASE + 'adversaire4.png',
    ai5: BASE + 'adversaire5.png',
  };

  /**
   * Génère un SVG base64 avec initiales
   * @param {string} initials  - 1 ou 2 caractères
   * @param {string} bgColor   - couleur de fond (#hex)
   * @param {string} textColor - couleur du texte (#hex)
   */
  function makeFallback(initials = '?', bgColor = '#1a1a3a', textColor = '#ffffff') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bgColor}"/>
          <stop offset="100%" stop-color="${bgColor}88"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg)"/>
      <text x="50" y="67" text-anchor="middle"
            font-size="${initials.length > 1 ? 30 : 40}"
            font-family="Arial Black, Arial" font-weight="900"
            fill="${textColor}" opacity="0.92">${initials.toUpperCase()}</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  /**
   * Retourne le chemin d'un avatar joueur par ID
   */
  function getPlayerImgPath(id) {
    const p = getPlayer(id);
    return BASE + p.file;
  }

  /**
   * Retourne le chemin de l'adversaire IA par niveau (1-5)
   */
  function getAiPath(level) {
    return PATHS['ai' + level] || null;
  }

  /**
   * Retourne les données d'un joueur par son ID (1-5)
   */
  function getPlayer(id) {
    return PLAYERS.find(p => p.id === id) || PLAYERS[0];
  }

  function getAllPlayers() {
    return PLAYERS;
  }

  /**
   * Initialise un <img> avec chemin + fallback automatique
   * @param {HTMLImageElement} img
   * @param {string}  src           - chemin principal
   * @param {string}  initials      - initiales fallback
   * @param {string}  bgColor       - couleur bg fallback
   * @param {string}  [textColor]   - couleur texte fallback
   */
  function setAvatar(img, src, initials, bgColor, textColor = '#ffffff') {
    if (!img) return;
    const fb = makeFallback(initials, bgColor, textColor);
    if (!src) { img.src = fb; return; }
    img.src = src;
    img.onerror = function () {
      this.src = fb;
      this.onerror = null;
    };
  }

  return { getPlayerImgPath, getAiPath, getPlayer, getAllPlayers, setAvatar, makeFallback };
})();

window.AvatarSystem = AvatarSystem;
