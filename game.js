/* game.js — version optimisée (commentaires conservés) */

/* Éléments DOM */
const zone = document.getElementById('zone-jeu'); // Récupère la zone principale où le joueur clique pour toucher la cible.
const accueil = document.getElementById('accueil');// Section de l’écran d’accueil (menu principal).
const accueilDemarrer = document.getElementById('accueil-demarrer');// Bouton "Démarrer" de l’écran d’accueil.
const accueilScores = document.getElementById('accueil-scores');// Bouton "Scores" de l’écran d’accueil.
const infosElt = document.getElementById('infos');// Conteneur qui affiche les infos pendant la partie (score, temps, etc.).
const scoreElt = document.getElementById('score');// Élément qui affiche le nombre de cibles touchées.
const touchesElt = document.getElementById('touches');// Élément qui affiche le nombre total de clics et les erreurs.
const tempsElt = document.getElementById('temps');// Élément qui affiche le temps restant.
const messageCentreElt = document.getElementById('message-centre');// Message centré (compte à rebours, messages flash, etc.).
const finContainer = document.getElementById('fin-container');// Conteneur de l’écran de fin de partie / tableau des scores.
const finResultatElt = document.getElementById('fin-resultat');// Zone de texte qui affiche le résultat de la dernière partie.
const finMessageInfo = document.getElementById('fin-message-info');// Petit message d’info sous les boutons de fin (ex : confirmation d’enregistrement).
const boutonEnregistrerScore = document.getElementById('enregistrer-score');// Bouton pour enregistrer le score après une partie.
const boutonRecommencerFin = document.getElementById('recommencer-fin');// Bouton pour relancer une nouvelle partie depuis l’écran de fin.
const boutonMenuFin = document.getElementById('menu-fin');// Bouton pour retourner au menu d’accueil depuis l’écran de fin ou le tableau des scores.
const scoresTbody = document.getElementById('scores-tbody');// <tbody> du tableau de scores, où les lignes des scores sont ajoutées dynamiquement.
const scoresContainer = document.getElementById('scores-container');// Conteneur scrollable autour du tableau des scores.
const cible = document.getElementById('cible');// Élément DOM qui représente la cible à toucher.

/* Variables de jeu */
let score = 0;// Nombre de cibles correctement touchées.
let nbTouches = 0;// Nombre total de clics/touches du joueur (réussis + ratés).
let erreurs = 0;// Nombre d’erreurs, calculé comme nbTouches - score.
const dureeJeu = 30;// Durée d’une partie en secondes.
let tempsRestant = dureeJeu;// Temps restant avant la fin de la partie (décrémenté chaque seconde).
let timerId = null;// Identifiant du setInterval pour le compte à rebours du temps de jeu (pour pouvoir l’arrêter).
let compteAReboursId = null;// Identifiant du setInterval pour le compte à rebours "3, 2, 1" avant le début du jeu.
let jeuActif = false;// Indique si la partie est en cours (true) ou non (false).
const nbZones = 6;// Nombre de zones logiques possibles où la cible peut apparaître (grille 2 colonnes x 3 lignes).
let zonePrecedente = null;// Mémorise l’index de la zone précédente pour éviter de placer la cible deux fois de suite au même endroit.
let cibleTaille = null; // Cache la taille de la cible pour éviter des recalculs inutiles à chaque déplacement.

/* Gestion scores */
let scores = [];// Tableau des scores enregistrés (objets {pseudo, cibles, erreurs}).
let indexDernierScore = -1;// Index du dernier score (ou score courant virtuel) dans la liste triée, -1 si aucun.

/* Chargement des scores depuis le localStorage */
const scoresJson = localStorage.getItem('scoresJeu1'); // Récupère une chaîne JSON des scores précédemment sauvegardés (si elle existe).

envoyerTrigger();

if (scoresJson) {
  try { scores = JSON.parse(scoresJson) || []; } catch (e) { scores = []; }
  // Si on a trouvé une chaîne, on essaie de la parser en tableau.
  // Si le JSON est invalide ou vide, on retombe sur un tableau vide pour éviter les erreurs.
}
let dernierPseudo = localStorage.getItem('dernierPseudo') || '';// Dernier pseudo utilisé par le joueur (pour préremplir le champ lors de l’enregistrement).

/* utilitaires d'affichage */
function majStats() {// Met à jour les statistiques affichées (score, touches, erreurs).
  erreurs = nbTouches - score;// Recalcule le nombre d’erreurs en fonction du total de touches et de cibles touchées.
  scoreElt.textContent = 'Cibles touchées : ' + score;// Met à jour le texte du score.
  touchesElt.textContent = 'Touches totales : ' + nbTouches + ' (Erreurs : ' + erreurs + ')';// Met à jour l’affichage du nombre total de clics et du nombre d’erreurs.
}

function majTemps() {// Met à jour l’affichage du temps restant.
  tempsElt.textContent = 'Temps restant : ' + tempsRestant + ' s';// Affiche le temps restant au format "Temps restant : X s".
}

/* Choisir zone différente de la précédente */
function choisirZoneAleatoireDiff() {// Choisit aléatoirement une zone parmi nbZones, différente de la précédente.
  let index;// Variable locale pour stocker l’index choisi.
  do {
    index = Math.floor(Math.random() * nbZones);// Tire un nombre aléatoire entre 0 et nbZones-1.
  } while (index === zonePrecedente);// Répète tant qu’on tombe sur la même zone que précédemment (pour éviter les répétitions immédiates).

  zonePrecedente = index;// Met à jour la zone précédente avec la nouvelle zone choisie.
  return index;// Renvoie l’index de la zone choisie.
}

/* Placer la cible dans zone choisie */
function placerCibleDansZone(indexZone) {// Place la cible au centre de la zone indiquée par indexZone (dans la grille 2x3).
  const largeur = zone.clientWidth;// Largeur visible de la zone de jeu (en pixels).
  const hauteur = zone.clientHeight;// Hauteur visible de la zone de jeu.
  const zoneLargeur = largeur / 2;// Largeur d’une colonne (2 colonnes donc on divise par 2).
  const zoneHauteur = hauteur / 3;// Hauteur d’une ligne (3 lignes donc on divise par 3).
  const colonne = indexZone % 2;// Calcule la colonne : 0 pour la première colonne, 1 pour la deuxième (modulo 2).
  const ligne = Math.floor(indexZone / 2);// Calcule la ligne de la zone : 0, 1 ou 2 (division entière par 2).
  const centreX = colonne * zoneLargeur + zoneLargeur / 2;// Coordonnée X du centre de la zone (milieu de la colonne choisie).
  const centreY = ligne * zoneHauteur + zoneHauteur / 2;// Coordonnée Y du centre de la zone (milieu de la ligne choisie).

  // Récupère/calcule la largeur de la cible une seule fois par taille d'écran pour limiter les recalculs coûteux.
  if (cibleTaille === null) {
    const rectCible = cible.getBoundingClientRect();// Récupère la taille actuelle de la cible dans la page (bounding box).
    cibleTaille = rectCible.width || parseFloat(getComputedStyle(cible).width);// Récupère la largeur de la cible. Si getBoundingClientRect ne donne rien (au chargement), on lit le style calculé.
  }

  const w = cibleTaille;// Largeur de la cible utilisée pour la centrer.
  cible.style.left = (centreX - w / 2) + 'px';// Place la cible horizontalement pour qu’elle soit centrée sur centreX.
  cible.style.top = (centreY - w / 2) + 'px';// Place la cible verticalement pour qu’elle soit centrée sur centreY (on suppose la cible carrée).
}

/* Nouvelle position (sans animation) */
function placerCibleNouvelleZone() {// Choisit une nouvelle zone aléatoire (différente de la précédente) et y place la cible.
  const index = choisirZoneAleatoireDiff();// Récupère un index de zone aléatoire différent de la dernière.
  placerCibleDansZone(index);// Place la cible dans cette nouvelle zone.
}

/* Démarrer le jeu */
function demarrerJeu() {// Lance réellement la partie (après le compte à rebours).
  jeuActif = true;// Indique que le jeu est en cours.
  cible.style.display = 'flex';// Affiche la cible (en utilisant flex, probablement pour centrer son contenu).
  placerCibleNouvelleZone();// Place la cible au départ dans une première zone aléatoire.
  timerId = setInterval(function () { // Lance un intervalle qui s’exécute toutes les 1000 ms (1 seconde).
    tempsRestant--;// Décrémente le temps restant.

    if (tempsRestant <= 0) {  // Si le temps est écoulé ou inférieur à 0.
      tempsRestant = 0;// On force à 0 pour éviter les valeurs négatives.
      majTemps();// Met à jour l’affichage du temps.
      terminerJeu(); // Termine la partie (affiche l’écran de fin, etc.).
    } else {
      majTemps();// Sinon, on met simplement à jour le temps à l’écran.
    }
  }, 1000);// Intervalle de 1 seconde.
}

/* Réinitialiser et lancer compte à rebours */
function lancerNouvellePartie() {// Prépare une nouvelle partie (reset des stats) et lance un compte à rebours "3,2,1".
  if (timerId !== null) { clearInterval(timerId); timerId = null; }// Si un timer de partie existe, on l’arrête et on réinitialise son identifiant.
  if (compteAReboursId !== null) { clearInterval(compteAReboursId); compteAReboursId = null; }// Si un compteur de démarrage existe, on l’arrête aussi.
  score = 0; nbTouches = 0; erreurs = 0;// On réinitialise score, nombre de touches et erreurs.
  tempsRestant = dureeJeu;// On remet le temps restant à la durée de jeu initiale.
  zonePrecedente = null;// On oublie la dernière zone pour que le choix reprenne à zéro.
  cibleTaille = null; // Réinitialise la taille en cas de changement de viewport ou de style.
  jeuActif = false;// La partie n’est pas encore en cours (le compte à rebours n’est pas le jeu).
  majStats(); majTemps();// On met à jour l’affichage des statistiques et du temps avec les valeurs réinitialisées.
  infosElt.style.display = 'block';// Affiche le panneau d’infos pendant la phase de démarrage.
  finContainer.style.display = 'none';// Cache l’écran de fin (au cas où on venait d’une partie précédente).
  messageCentreElt.style.display = 'block';// Affiche le message central (pour montrer le compte à rebours).
  cible.style.display = 'none';// Cache la cible pendant le compte à rebours.
  let secondesAvantDepart = 3;// Compteur pour le compte à rebours avant le début de la partie.
  messageCentreElt.textContent = 'Le jeu commence dans ' + secondesAvantDepart + '…';// Affiche le message "Le jeu commence dans 3…".

  compteAReboursId = setInterval(function () {// Intervalle qui gère le compte à rebours.
    secondesAvantDepart--;// Décrémente le nombre de secondes restantes avant le départ.

    if (secondesAvantDepart > 0) {// Tant qu’il reste plus de 0 secondes.
      messageCentreElt.textContent = 'Le jeu commence dans ' + secondesAvantDepart + '…';// Met à jour le texte du compte à rebours.
    } else {// Quand le compte à rebours arrive à 0.
      clearInterval(compteAReboursId);// Arrête l’intervalle de compte à rebours.
      compteAReboursId = null;// Réinitialise l’identifiant.
      messageCentreElt.style.display = 'none';// Cache le message central (plus besoin du compte à rebours).
      demarrerJeu();// Lance la partie.
    }
  }, 1000);// Intervalle de 1 seconde.
}

/* Fin de partie */
function terminerJeu() {// Gère la fin d’une partie : arrêt du jeu et affichage de l’écran de résultat.
  jeuActif = false;// La partie n’est plus active.
  if (timerId !== null) { clearInterval(timerId); timerId = null; }// Si le timer de jeu tourne encore, on l’arrête.
  cible.style.display = 'none';// On cache la cible puisque la partie est terminée.
  infosElt.style.display = 'none';// Cache les infos de jeu (score, temps, etc.).
  finContainer.style.display = 'block';// Affiche le conteneur de fin (résultats + scores).
  finContainer.setAttribute('aria-hidden','false');// Accessibilité : indique que le conteneur de fin est désormais visible.
  const texteResultat = 'Cibles touchées : ' + score + '\n' + 'Erreurs : ' + erreurs;// Prépare le texte du résultat à afficher (sur plusieurs lignes).
  finResultatElt.textContent = texteResultat;// Affiche le résultat de la partie.
  boutonEnregistrerScore.style.display = 'inline-block';// Affiche le bouton pour enregistrer le score.
  finMessageInfo.textContent = '';// Efface tout message d’info précédent.
  indexDernierScore = -1;// Réinitialise l’index du dernier score.
  rafraichirAffichageScoresAvecPerformanceCourante();// Met à jour le tableau des scores en y incluant la performance courante (pseudo '...' virtuel).

  // Afficher boutons fin classiques
  boutonRecommencerFin.style.display = 'inline-block';// Affiche le bouton "Recommencer" sur l’écran de fin.
  boutonMenuFin.style.display = 'inline-block';// Affiche le bouton "Menu" sur l’écran de fin.
  const btnDemarrer = document.getElementById('demarrer-score');// Cherche un éventuel bouton "Démarrer" spécifique à l’écran des scores.

  if (btnDemarrer) btnDemarrer.remove();// S’il existe, on le supprime pour éviter d’avoir un bouton inadapté après une vraie partie.
}

/* Interaction pointerdown */
zone.addEventListener('pointerdown', function (e) {// Gestion du clic/touch dans la zone de jeu : validation ou erreur.
  if (!jeuActif) return; // Si le jeu n’est pas actif, on ignore le clic (ne rien faire).
  e.preventDefault();// Empêche le comportement par défaut (utile sur mobile pour éviter scroll, sélection, etc.).
  nbTouches++;// Incrémente le nombre total de touches (réussies ou non).

  const rect = cible.getBoundingClientRect();// Récupère la position et taille de la cible à l’écran.
  const x = e.clientX;// Coordonnée X du clic par rapport à la fenêtre.
  const y = e.clientY;// Coordonnée Y du clic.
  const dansCible =
    x >= rect.left && x <= rect.right &&
    y >= rect.top  && y <= rect.bottom;// Vérifie si le clic (x,y) se trouve dans le rectangle de la cible.

  if (dansCible) {// Si le joueur a cliqué sur la cible…
    score++;// Incrémente le score (une cible touchée).
    playTone(880, 0.06);// Joue un son plus aigu pour un clic réussi.
    placerCibleNouvelleZone();// Déplace la cible dans une nouvelle zone.
  } else {// Sinon, le clic est raté.
    playTone(220, 0.05);// Joue un son plus grave pour signaler l’erreur.
    flashMessage('-1', '#ff6b6b');// Affiche un petit message "-1" en rouge au centre de l’écran.
  }

  majStats();// Met à jour les statistiques affichées une seule fois après avoir traité le clic.
});

/* Tri & sauvegarde */
function trierScores(a) {// Trie un tableau de scores selon le nombre de cibles (descendant), puis erreurs (ascendant).
  a.sort((x, y) => {// Utilise la méthode sort avec une fonction de comparaison personnalisée.
    if (y.cibles !== x.cibles) return y.cibles - x.cibles;// Priorité : plus de cibles => meilleur score (classement décroissant).
    return x.erreurs - y.erreurs;// En cas d’égalité sur les cibles, le plus petit nombre d’erreurs est mieux (classement croissant).
  });
}

function sauvegarderScores() {// Sauvegarde le tableau des scores dans le localStorage.
  localStorage.setItem('scoresJeu1', JSON.stringify(scores));// Convertit le tableau de scores en JSON et l’enregistre sous la clé "scoresJeu1".
}

/* Classement avec perf virtuelle */
function getClassementAvecCourantVirtuel() {// Construit une liste de scores incluant la performance courante comme une entrée virtuelle '...'.
  const temp = scores.slice();// Copie superficielle du tableau de scores (pour ne pas modifier l’original).
  const perfVirtuelle = { pseudo: '...', cibles: score, erreurs: erreurs };// Crée un objet représentant la performance courante, avec pseudo provisoire '…'.
  const existe = temp.some(s =>
    s.pseudo === perfVirtuelle.pseudo &&
    s.cibles === perfVirtuelle.cibles &&
    s.erreurs === perfVirtuelle.erreurs
  );// Vérifie si cette performance virtuelle n’est pas déjà présente dans la liste.

  if (!existe) temp.push(perfVirtuelle);// Si elle n’existe pas, on l’ajoute à la liste temporaire.

  trierScores(temp); // Trie la liste temporaire avec la performance virtuelle incluse.

  const index = temp.findIndex(s =>
    s.pseudo === perfVirtuelle.pseudo &&
    s.cibles === perfVirtuelle.cibles &&
    s.erreurs === perfVirtuelle.erreurs
  ); // Recherche l’index de la performance virtuelle dans la liste triée.

  return { liste: temp, index };// Renvoie la liste triée et l’index de la performance courante.
}

/* Affichage classement */
function afficherListeScores(liste, indexPerf) {// Affiche une liste de scores dans le tableau, en surlignant éventuellement une ligne particulière.
  scoresTbody.innerHTML = '';// Efface toutes les lignes existantes du tableau.

  if (liste.length === 0) return;// Si la liste est vide, on ne fait rien.

  for (let i = 0; i < liste.length; i++) { // Parcourt tous les scores de la liste.
    const s = liste[i];// Score courant.
    const tr = document.createElement('tr');// Crée une nouvelle ligne <tr>.
    const tdRang = document.createElement('td');
    const tdPseudo = document.createElement('td');
    const tdCibles = document.createElement('td');
    const tdErreurs = document.createElement('td');// Crée les 4 cellules : rang, pseudo, cibles, erreurs.
    tdRang.textContent = i + 1;// Affiche la position dans le classement (index + 1).
    tdCibles.textContent = s.cibles;// Nombre de cibles touchées pour ce score.
    tdErreurs.textContent = s.erreurs;// Nombre d’erreurs pour ce score.
    tdPseudo.textContent = s.pseudo || 'Anonyme';// Pseudo du joueur ou "Anonyme" si la valeur est vide/falsy.

    tr.appendChild(tdRang);
    tr.appendChild(tdPseudo);
    tr.appendChild(tdCibles);
    tr.appendChild(tdErreurs);
    // Ajoute les cellules dans la ligne.

    if (i === 0) tr.classList.add('ligne-meilleur');// Ajoute une classe spéciale à la première ligne (meilleur score).
    if (i === indexPerf) tr.classList.add('ligne-dernier');// Ajoute une classe spéciale à la ligne correspondant à la performance courante (ou dernier score).
    scoresTbody.appendChild(tr);// Ajoute la ligne complète au tableau.
  }

  if (indexPerf >= 0) {// Si on a un index de performance à mettre en avant.
    const ligne = scoresTbody.children[indexPerf];// Récupère la ligne correspondante dans le tbody.

    if (ligne) {
      const offsetTop = ligne.offsetTop;// Position verticale de la ligne dans le conteneur.

      scoresContainer.scrollTop = Math.max(0, offsetTop - scoresContainer.clientHeight / 2);// Scroll pour centrer la ligne mise en avant dans le conteneur des scores.
    }
  } else {
    scoresContainer.scrollTop = 0;// Si pas d’index spécifique, on remonte tout en haut de la liste.
  }
}

/* Rafraîchir affichage avec perf virtuelle */
function rafraichirAffichageScoresAvecPerformanceCourante() {// Met à jour l’affichage des scores en incluant la performance courante (pseudo '...').
  const { liste, index } = getClassementAvecCourantVirtuel();// Récupère la liste triée avec la perf courante et l’index de cette perf.
  indexDernierScore = index;// Stocke l’index de la performance courante pour un usage ultérieur.
  afficherListeScores(liste, indexDernierScore);// Affiche la liste en surlignant la ligne de la perf courante.
}

/* Enregistrer score : transformer '...' en input */
function enregistrerScoreActuel() {// Prépare l’interface pour saisir le pseudo du score courant (remplace la ligne '...' par un champ input).
  const { liste, index } = getClassementAvecCourantVirtuel();// Récupère la liste triée avec perf virtuelle et son index.
  indexDernierScore = index;// Mémorise l’index de la perf courante.
  scoresTbody.innerHTML = '';// Efface l’affichage actuel du tableau des scores.

  for (let i = 0; i < liste.length; i++) {// Parcourt tous les scores de la liste.
    const s = liste[i]; // Score courant.
    const tr = document.createElement('tr');// Crée une nouvelle ligne.

    const tdRang = document.createElement('td');
    const tdPseudo = document.createElement('td');
    const tdCibles = document.createElement('td');
    const tdErreurs = document.createElement('td');// Crée les cellules de la ligne.

    tdRang.textContent = i + 1;// Rang du score.
    tdCibles.textContent = s.cibles;// Nombre de cibles pour ce score.
    tdErreurs.textContent = s.erreurs;// Nombre d’erreurs pour ce score.

    if (i === indexDernierScore && s.pseudo === '...') {// Si c’est la performance courante (pseudo '...'), on va remplacer la cellule pseudo par un champ de saisie.
      tr.classList.add('ligne-dernier');// Ajoute une classe spéciale pour cette ligne.

      const input = document.createElement('input');// Crée l’input pour saisir le pseudo.
      input.type = 'text';// Type texte.
      input.className = 'pseudo-input';// Classe CSS pour le styliser.
      input.placeholder = 'Pseudo';// Placeholder pour l’input.
      input.value = dernierPseudo;// Préremplit avec le dernier pseudo utilisé si disponible.
      const btnValider = document.createElement('button');// Bouton pour valider le pseudo.
      btnValider.textContent = 'Valider';// Texte du bouton.
      btnValider.className = 'valider-btn';// Classe CSS pour le styliser.
      tdPseudo.appendChild(input);// Ajoute l’input dans la cellule pseudo.
      tdPseudo.appendChild(btnValider);// Ajoute le bouton dans la même cellule.
      btnValider.addEventListener('click', function () {// Quand on clique sur "Valider", on récupère le pseudo saisi et on enregistre le score.
        const pseudo = input.value.trim() || 'Anonyme';// Pseudo = contenu de l’input (trim), ou "Anonyme" si vide.
        validerEnregistrementScore(pseudo, s.cibles, s.erreurs);// Appelle la fonction qui va vraiment valider et sauvegarder ce score.
      });
    } else {
      tdPseudo.textContent = s.pseudo || 'Anonyme';// Pour les autres lignes, on affiche simplement le pseudo ou "Anonyme".
    }

    tr.appendChild(tdRang);
    tr.appendChild(tdPseudo);
    tr.appendChild(tdCibles);
    tr.appendChild(tdErreurs);
    // Ajoute toutes les cellules à la ligne.

    if (i === 0) tr.classList.add('ligne-meilleur');// Met en évidence le meilleur score.

    if (i === indexDernierScore) tr.classList.add('ligne-dernier');// Met en évidence la ligne correspondant à la performance courante.

    scoresTbody.appendChild(tr);// Ajoute la ligne au tableau.
  }

  if (indexDernierScore >= 0) {// Si on a un index de perf courant.
    const ligne = scoresTbody.children[indexDernierScore];// Récupère la ligne correspondante.

    if (ligne) {
      const offsetTop = ligne.offsetTop;// Position verticale de cette ligne dans le conteneur.
      scoresContainer.scrollTop = Math.max(0, offsetTop - scoresContainer.clientHeight / 2);// Scroll pour centrer cette ligne dans la zone visible.
    }
  }

  boutonEnregistrerScore.style.display = 'none';// Cache le bouton "Enregistrer score" puisqu’on est maintenant dans la phase de saisie du pseudo.
}

/* Valider enregistrement */
function validerEnregistrementScore(pseudo, cibles, erreursPerf) {// Valide vraiment l’enregistrement du score (avec un pseudo réel) et le sauvegarde.
  const perf = { pseudo, cibles, erreurs: erreursPerf };// Crée un objet score à partir des paramètres.
  scores = scores.filter(s =>
    !(s.pseudo === '...' && s.cibles === cibles && s.erreurs === erreursPerf)
  ); // On nettoie les scores existants en supprimant l’éventuelle entrée virtuelle '...' correspondant à cette perf.

  const existeIndex = scores.findIndex(s =>
    s.pseudo === perf.pseudo &&
    s.cibles === perf.cibles &&
    s.erreurs === perf.erreurs
  );// Vérifie si le score exact avec ce pseudo et ces stats existe déjà.

  if (existeIndex === -1) scores.push(perf);// S’il n’existe pas encore, on l’ajoute au tableau des scores.

  trierScores(scores);// Trie les scores selon les règles définies.
  sauvegarderScores();// Sauvegarde dans le localStorage.

  dernierPseudo = pseudo;// Mémorise le pseudo utilisé comme dernier pseudo.
  localStorage.setItem('dernierPseudo', dernierPseudo);// Sauvegarde ce dernier pseudo dans le localStorage.

  indexDernierScore = scores.findIndex(s =>
    s.pseudo === perf.pseudo &&
    s.cibles === perf.cibles &&
    s.erreurs === perf.erreurs
  );// Recherche l’index du score que l’on vient d’enregistrer dans la liste triée.

  afficherListeScores(scores, indexDernierScore);// Réaffiche les scores et met en évidence ce score enregistré.

  finMessageInfo.textContent = ''; // Efface un éventuel message d’info (tu peux y afficher un "Score enregistré !" si tu veux).
}

function envoyerTrigger() {
  const url = "http://192.168.126.68:9100/";
  console.log("Envoi de 'trigger' vers", url);

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: "trigger"
  })
  .then(r => r.ok ? r.text() : Promise.reject(new Error("HTTP " + r.status)))
  .then(txt => console.log("Réponse serveur :", txt))
  .catch(err => console.error("Erreur fetch :", err));
}


/* --- Gestion accueil et boutons --- */
accueilDemarrer.addEventListener('click', () => {// Quand on clique sur "Démarrer" depuis l’accueil.
  envoyerTrigger();
  accueil.style.display = 'none';// On cache l’écran d’accueil.
  lancerNouvellePartie();// On lance une nouvelle partie (avec compte à rebours).
});

// Tableau des scores depuis accueil
accueilScores.addEventListener('click', () => {// Quand on clique sur "Scores" depuis l’accueil.
  accueil.style.display = 'none';// Cache l’écran d’accueil.
  infosElt.style.display = 'none';// Cache les infos de jeu (inutile en mode scores).
  finContainer.style.display = 'block';// Affiche le conteneur de fin, qui sert aussi de tableau des scores.
  messageCentreElt.style.display = 'none';// Cache le message central.
  cible.style.display = 'none';// Cache la cible (on n’est pas en partie).
  finResultatElt.textContent = '';// Efface le texte de résultat (pas de partie en cours).
  finMessageInfo.textContent = '';// Efface les messages d’info.
  boutonEnregistrerScore.style.display = 'none';// On ne propose pas d’enregistrer un score dans ce cas (on ne sort pas d’une partie).

  // Remplacer bouton Recommencer par Démarrer + Menu
  boutonRecommencerFin.style.display = 'none';// Cache le bouton "Recommencer" sur le tableau des scores (pas logique ici).
  boutonMenuFin.style.display = 'inline-block';// Affiche le bouton "Menu" pour revenir à l’accueil.

  // Créer bouton démarrer si pas déjà présent
if (!document.getElementById('demarrer-score')) { // Si le bouton "Démarrer" spécifique au tableau des scores n’existe pas encore…
  const btnDemarrer = document.createElement('button'); // On le crée.
  btnDemarrer.id = 'demarrer-score'; // On lui donne un id pour pouvoir le retrouver.
  btnDemarrer.textContent = 'Démarrer'; // Texte du bouton.
  btnDemarrer.className = 'btn'; // Classe CSS (probablement la même que les autres boutons).
  finContainer.querySelector('#fin-boutons').prepend(btnDemarrer); // On insère ce bouton en premier dans le conteneur des boutons de fin.

  btnDemarrer.addEventListener('click', () => { // Quand on clique sur ce bouton…

  envoyerTrigger();

    // --- COMPORTEMENT EXISTANT (INCHANGÉ) ---
    btnDemarrer.remove();                 // Supprime le bouton
    boutonMenuFin.style.display = 'none'; // Cache le menu
    lancerNouvellePartie();               // Lance la partie
  });
}


  indexDernierScore = -1;// On ne met en avant aucun score particulier.

  afficherListeScores(scores, indexDernierScore);// On affiche le tableau des scores sauvegardés.
});

// Recommencer depuis fin de partie
boutonRecommencerFin.addEventListener('click', () => { // Quand on clique sur "Recommencer" depuis l’écran de fin, on relance simplement une nouvelle partie.
  envoyerTrigger();
  lancerNouvellePartie();
});


/* Menu depuis fin ou tableau des scores */
function retourAccueil() {// Fonction utilitaire pour revenir à l’écran d’accueil.
  finContainer.style.display = 'none';// Cache le conteneur de fin / scores.
  accueil.style.display = 'flex';// Affiche l’écran d’accueil (souvent en flex pour centrer le contenu).
  infosElt.style.display = 'none';// Cache le panneau d’informations de jeu.
  messageCentreElt.style.display = 'block';// Affiche de nouveau le message central (prêt à afficher instructions, etc.).
  cible.style.display = 'none';// Cache la cible.
}
boutonMenuFin.addEventListener('click', retourAccueil);// Le bouton "Menu" utilise cette fonction pour revenir à l’accueil.

// Enregistrer score
boutonEnregistrerScore.addEventListener('click', enregistrerScoreActuel);// Quand on clique sur "Enregistrer score" après une partie, on lance la saisie du pseudo.

/* Message flash court */
let flashTimeout = null;// Identifiant du timeout pour gérer la durée d’affichage des messages flash.

function flashMessage(txt, color) {// Affiche un message court au centre de l’écran, puis le cache automatiquement.
  messageCentreElt.style.display = 'block';// Affiche la zone de message central.
  messageCentreElt.textContent = txt;// Met le texte du message flash (ex: "-1").
  messageCentreElt.style.background = `linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.45))`;// Applique un fond sombre dégradé derrière le message.
  messageCentreElt.style.color = color || '#fff';// Couleur du texte, ou blanc si aucune couleur n’est fournie.

  if (flashTimeout) clearTimeout(flashTimeout);// Si un message flash était déjà en cours, on annule son timeout pour éviter des conflits.

  flashTimeout = setTimeout(() => {// Programme la disparition du message après 420 ms.
    messageCentreElt.style.display = 'none';// Cache le message.
    flashTimeout = null;// Réinitialise l’identifiant de timeout.
  }, 420);
}

/* Son WebAudio simple */
const audioCtx = (typeof window.AudioContext !== 'undefined') ? new window.AudioContext() : null;// Crée un contexte audio WebAudio si disponible (sinon null). Permet de générer des sons programmatiques.

function playTone(freq=440, time=0.08) {// Joue une note simple de fréquence freq pendant time secondes.
  if (!audioCtx) return;// Si pas de contexte audio (navigateur incompatible), on ne fait rien.
  const o = audioCtx.createOscillator();// Crée un oscillateur (source de son).
  const g = audioCtx.createGain();// Crée un gain (contrôle du volume).
  o.type = 'sine';// Type d’onde : sinusoïdale.
  o.frequency.value = freq;// Définit la fréquence de la note.
  g.gain.value = 0.0001;// Volume initial très faible (pour éviter les pops).
  o.connect(g);// Connecte l’oscillateur au gain.
  g.connect(audioCtx.destination); // Connecte le gain à la sortie audio (haut-parleurs).
  const now = audioCtx.currentTime;// Temps audio actuel.
  g.gain.exponentialRampToValueAtTime(0.12, now + 0.01);// Fait monter le volume de manière exponentielle jusqu’à 0.12 rapidement (0.01s).
  o.start(now);// Démarre la lecture tout de suite.
  g.gain.exponentialRampToValueAtTime(0.0001, now + time);// Redescend le volume vers un niveau très bas sur la durée indiquée.
  o.stop(now + time + 0.02);// Arrête l’oscillateur un peu après (pour s’assurer que le son est bien coupé).
}

/* Repositionner cible si resize */
window.addEventListener('resize', () => {// Quand la fenêtre est redimensionnée…
  cibleTaille = null; // Invalide la taille pour qu’elle soit recalculée avec les nouvelles dimensions d’écran.
  if (jeuActif && zonePrecedente !== null) {// Si le jeu est en cours et qu’on connaît la zone actuelle de la cible…
    placerCibleDansZone(zonePrecedente);// On repositionne la cible au centre de la même zone avec les nouvelles dimensions.
  }
});

/* Afficher classement existant */
afficherListeScores(scores, -1);// Au chargement, on affiche les scores existants sans mettre en avant de performance spécifique.

/* Débloquer audio au premier geste */
document.addEventListener('pointerdown', function unlockAudio() {// Sur le premier geste de l’utilisateur, on tente de débloquer l’audio (certains navigateurs exigent une interaction).
  if (audioCtx && audioCtx.state === 'suspended') {// Si le contexte audio existe mais est en pause/suspendu…
    audioCtx.resume().catch(()=>{});// On le reprend (resume), et on ignore toute erreur éventuelle.
  }

  document.removeEventListener('pointerdown', unlockAudio);// On enlève cet écouteur, car cette opération n’est à faire qu’une seule fois.
});

