# BRAS DE FER INSOUMIS — Le Duel Ultime

Un jeu de bras de fer en duel où la vitesse de clic décide du vainqueur. Affrontez l'ordinateur ou un ami dans des combats endiablés !

## Modes de jeu

- **Joueur vs Ordinateur (PvE)** : Choisissez votre combattant puis affrontez l'IA sur 5 niveaux de difficulté.
- **Joueur vs Joueur (PvP)** : Deux joueurs s'affrontent sur le même clavier.

## Mécanique

Chaque clic applique une force à votre bras. Les forces diminuent naturellement avec le temps (décroissance). Le premier à plaquer le bras adverse remporte le round. Match en 3 rounds (best of 3). Si le chronomètre de 30 secondes expire, le meneur gagne le round. Un K.O. est possible si le round dure moins de 10 secondes.

## Comment jouer


1. Sélectionnez un mode de jeu.
2. Choisissez votre personnage (et éventuellement celui du 2ᵉ joueur).
3. En mode PvE, choisissez votre adversaire parmi 5 niveaux.
4. Cliquez sur **COMBATTRE !**
5. Pendant le combat :
   - **Joueur 1** : clic gauche, **Espace** ou **Z**
   - **Joueur 2** (PvP seulement) : clic gauche sur le bouton bleu, **Entrée** ou **M**
6. Gagnez 2 rounds sur 3 pour remporter le match.

## Personnages jouables

| Personnage      | Puissance | Vitesse |
|----------------|-----------|---------|
| Le vieux       | ⚡⚡⚡⚡⚡   | ⚡⚡⚡    |
| Le cerveau     | ⚡⚡       | ⚡⚡⚡⚡⚡ |
| La stratège    | ⚡⚡⚡     | ⚡⚡⚡⚡   |
| Le révolutionnaire | ⚡⚡⚡⚡ | ⚡⚡⚡    |
| La rebelle     | ⚡⚡⚡     | ⚡⚡⚡⚡   |

## Adversaires IA

| Adversaire       | Difficulté | Puissance | Vitesse |
|-----------------|------------|-----------|---------|
| Le Zébutant     | Facile     | ⚡        | ⚡⚡     |
| L'amateur(X)    | Moyen      | ⚡⚡      | ⚡⚡     |
| J.de Monaco     | Difficile  | ⚡⚡⚡⚡   | ⚡⚡     |
| La Truand       | Expert     | ⚡⚡⚡     | ⚡⚡⚡⚡  |
| Le Borgne       | Impossible | ⚡⚡⚡⚡⚡ | ⚡⚡⚡   |

## Structure du projet

```
├── index.html          # Menu principal
├── game.html           # Arène de combat
├── css/
│   ├── style.css       # Styles globaux
│   ├── menu.css        # Styles du menu
│   └── game.css        # Styles du jeu
├── js/
│   ├── main.js         # Navigation, carrousels, scores
│   ├── game.js         # Moteur de combat
│   ├── ai.js           # Intelligence artificielle (5 niveaux)
│   └── avatar.js       # Système d'avatars et personnages
├── avatars/            # Images des personnages et adversaires
├── assets/avatars/     # Copies des avatars
└── sons/
    └── musique.mp3     # Musique de fond
```

## Exigences

Navigateur moderne (Chrome, Firefox, Safari, Edge). Aucune installation ni connexion Internet requise.
