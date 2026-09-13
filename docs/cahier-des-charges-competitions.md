# Cahier des charges détaillé — Section Compétitions FEBACO

> Mise à jour SNDS : le document d’implémentation canonique est [competitions-snds-implementation.md](./competitions-snds-implementation.md). La compétition est créée directement dans `COMPETITIONS`; `numero_edition` est facultatif et aucune entité « compétition permanente » n’existe. Les groupes sont réservés au mode `MPH001`.

## 1. Objet du document

Ce document décrit le périmètre fonctionnel et technique de la section **Compétitions** de la plateforme FEBACO. Il formalise le comportement actuellement attendu pour la création et l’administration d’une compétition, depuis sa fiche générale jusqu’aux résultats, qualifications et classements.

Le cycle métier de référence est le suivant :

1. créer une compétition ;
2. créer ses phases ;
3. créer les groupes nécessaires et les rattacher aux phases concernées ;
4. engager les équipes et les affecter à une phase, puis à un groupe lorsque le mode de la phase l’exige ;
5. inscrire les participants personnes physiques ;
6. programmer les matchs ;
7. enregistrer les résultats ;
8. calculer les classements des seules phases de groupes ;
9. qualifier manuellement les équipes vers les phases ultérieures.

## 2. Objectifs métier

La section doit permettre à la FEBACO de :

- centraliser les informations officielles d’une compétition ;
- séparer clairement une compétition, ses phases, ses groupes et ses équipes ;
- empêcher qu’une équipe soit engagée deux fois dans une même compétition ;
- gérer indépendamment le type sportif d’une phase et son mode de fonctionnement ;
- garantir que seuls les acteurs et équipes réellement référencés peuvent être inscrits ;
- assurer la traçabilité des matchs, résultats, qualifications et classements ;
- conserver les identifiants comme clés techniques tout en affichant des libellés compréhensibles ;
- limiter toute écriture métier au rôle fédéral ;
- rester compatible avec les anciennes affectations de groupes sans continuer à les utiliser comme destination d’écriture.

## 3. Périmètre fonctionnel

### 3.1 Fonctions couvertes

- consultation de la liste des compétitions ;
- création et modification d’une compétition ;
- consultation de la fiche détaillée ;
- création de phases et de groupes ;
- engagement d’équipes ;
- inscription des athlètes, arbitres, officiels, médecins et autres intervenants ;
- affectation manuelle d’une équipe à une phase ultérieure ;
- programmation des matchs ;
- saisie d’un résultat unique par match ;
- calcul du classement des phases de groupes ;
- affichage des équipes qualifiées dans les phases hors groupes ;
- consultation globale des équipes engagées, résultats et classements.

### 3.2 Fonctions non couvertes actuellement

- suppression d’une compétition ou de ses éléments ;
- modification ou suppression d’une phase, d’un groupe, d’un match ou d’un résultat ;
- génération automatique d’un calendrier complet ;
- génération graphique automatique d’un tableau à élimination directe ;
- qualification automatique selon le rang ;
- classement pour les phases à élimination directe ou de mode `AUTRE` ;
- barème automatique particulier pour forfait, abandon ou disqualification ;
- gestion des matchs nuls pour un résultat joué ;
- désinscription ou transfert d’une équipe déjà engagée ;
- désactivation d’un participant depuis l’interface de compétition.

## 4. Utilisateurs, droits et sécurité

### 4.1 Utilisateur authentifié

Tout utilisateur authentifié peut :

- consulter les compétitions ;
- ouvrir une fiche compétition ;
- consulter les sept onglets ;
- consulter les équipes engagées et les participants ;
- consulter les phases, groupes et équipes affectées ;
- consulter les matchs, résultats, classements et équipes qualifiées.

### 4.2 Rôle fédéral

Seul un utilisateur dont le rôle est `federal` peut :

- créer une compétition ;
- modifier ses informations générales ;
- créer une phase ou un groupe ;
- engager des équipes ;
- ajouter des participants personnes physiques ;
- programmer un match ;
- enregistrer un résultat ;
- qualifier une équipe vers une autre phase.

### 4.3 Réponses d’autorisation

- absence de session : HTTP `401` ;
- session présente sans rôle fédéral pour une écriture : HTTP `403` ;
- donnée métier invalide : HTTP `422` ;
- ressource inexistante : HTTP `404` ;
- doublon métier : HTTP `409` ;
- indisponibilité d’un classeur ou échec non maîtrisé : HTTP `503`.

## 5. Modèle métier et terminologie

### 5.1 Compétition

Événement sportif identifié, rattaché à un type, une discipline et une saison. Il possède une période, un pays, un statut et des observations.

### 5.2 Équipe engagée et unité de compétition

Une équipe engagée est une équipe de club inscrite à la compétition. L’inscription génère :

- une **participation**, qui porte l’engagement administratif ;
- une **unité de compétition**, utilisée dans les phases et les matchs ;
- une **affectation phase-unité**, qui place l’unité dans sa première phase et, si nécessaire, dans un groupe.

### 5.3 Phase

Étape ordonnée d’une compétition. Une phase possède deux caractéristiques indépendantes :

- le **type de phase**, qui exprime sa signification sportive : qualification, quart de finale, finale, etc. ;
- le **mode de phase**, qui gouverne son fonctionnement technique.

### 5.4 Modes de phase

| Identifiant | Mode | Groupe | Classement |
| --- | --- | --- | --- |
| `MPH001` | Groupes | obligatoire | oui |
| `MPH002` | Élimination directe | interdit | non |
| `MPH099` | Autre | interdit | non |

Le système ne doit jamais déduire le mode depuis le nom ou le type de la phase.

### 5.5 Groupe

Sous-ensemble d’une phase :

- obligatoire dans une phase de groupes ;
- interdit dans une phase à élimination directe ;
- interdit dans tout mode autre que `MPH001`.

### 5.6 Qualification

La qualification est une nouvelle affectation active d’une unité de compétition à une phase ultérieure. Elle est toujours déclenchée manuellement par un utilisateur fédéral. Le classement ou la victoire d’un match peut guider la décision, mais ne crée jamais automatiquement l’affectation.

### 5.7 Participant personne physique

Personne explicitement inscrite à une compétition dans l’une des catégories suivantes : athlète, arbitre, officiel, médecin ou autre acteur. Ce concept ne doit pas être confondu avec l’équipe engagée.

## 6. Navigation et organisation de la fiche

La fiche d’une compétition comprend sept onglets pleine largeur :

1. `Général` ;
2. `Équipes engagées` ;
3. `Participants` ;
4. `Phases et groupes` ;
5. `Matchs` ;
6. `Résultats` ;
7. `Classement`.

L’onglet actif est conservé dans l’URL avec le paramètre `tab` :

`general`, `equipes`, `participants`, `phases`, `matchs`, `resultats` ou `classement`.

Cette navigation doit :

- autoriser un lien direct vers chaque onglet ;
- respecter l’historique précédent/suivant du navigateur ;
- rester utilisable sur mobile sans débordement horizontal ;
- masquer les commandes d’écriture aux utilisateurs non fédéraux.

## 7. Exigences par écran

### 7.1 Liste des compétitions

La liste présente les compétitions triées de la date de début la plus récente à la plus ancienne. Les libellés de type, discipline et saison sont résolus depuis les référentiels.

Une saison dont l’identifiant n’existe plus dans le référentiel doit être affichée comme `Saison non référencée`, sans perdre l’identifiant stocké.

### 7.2 Création d’une compétition

Le formulaire contient :

| Champ | Obligatoire | Source ou règle |
| --- | --- | --- |
| Nom | oui | texte libre non vide |
| Type | oui | `TYPES_COMPETITIONS` |
| Discipline | oui | `DISCIPLINES` |
| Saison | oui | `SAISON` |
| Statut | oui | `PLANIFIEE`, `EN_COURS`, `TERMINEE`, `ANNULEE` |
| Date de début | oui | date ISO `AAAA-MM-JJ` |
| Date de fin | oui | date ISO, supérieure ou égale au début |
| Pays | oui | texte libre |
| Observations | non | texte libre |

L’identifiant est généré automatiquement au format `BKB-COMP-AAAA-###`, où l’année provient du libellé de la saison.

### 7.3 Onglet Général

L’onglet affiche : identifiant, nom, type, discipline, saison, statut, dates, pays et observations.

Le volet de modification :

- est réservé au rôle fédéral ;
- réutilise les règles de création ;
- ne permet jamais de modifier l’identifiant ;
- cible exclusivement la ligne correspondant à l’identifiant de route.

### 7.4 Onglet Équipes engagées

#### Prérequis

Au moins une phase doit avoir été créée. Sans phase, le bouton d’ajout est désactivé et l’interface demande de créer une phase.

#### Parcours d’ajout

1. rechercher un club ;
2. sélectionner le club ;
3. sélectionner une équipe réelle de ce club ;
4. répéter l’opération pour plusieurs clubs si nécessaire ;
5. choisir la phase initiale ;
6. choisir le groupe selon le mode de phase ;
7. saisir la date d’inscription ;
8. choisir `INSCRIT` ou `EN_ATTENTE` ;
9. enregistrer.

#### Politique anti-doublon

- l’unicité porte sur `id_equipe` dans la compétition ;
- une équipe déjà engagée disparaît des choix ;
- un club reste disponible s’il possède une autre équipe non engagée ;
- une équipe doit appartenir au club sélectionné ;
- le serveur répète le contrôle et retourne `409` en cas de tentative concurrente.

#### Atomicité

Pour chaque équipe, l’enregistrement crée dans un même lot Google Sheets :

1. une ligne `COMPETITIONS_PARTICIPANTS` ;
2. une ligne `COMPETITIONS_UNITES` ;
3. une ligne `COMPETITIONS_PHASES_UNITES`.

La confirmation n’est affichée que si les trois écritures réussissent.

### 7.5 Onglet Participants

L’onglet regroupe les personnes par catégorie avec compteur, moteur de recherche et vue responsive.

| Catégorie | Source de sélection | Conditions | Informations affichées |
| --- | --- | --- | --- |
| Athlètes | affiliations d’athlètes | acteur actif, affiliation active, équipe engagée | ID, nom, club, équipe, rôle |
| Arbitres | registre `ARBITRES` | acteur actif et non déjà inscrit | ID, nom, grade/rôle |
| Officiels | registre `OFFICIELS` | acteur actif, non déjà inscrit, rôle de compétition obligatoire | ID, nom, structure, rôle saisi |
| Médecins | registre `MEDECINS` | acteur actif et non déjà inscrit | ID, nom, spécialité/rôle |
| Autres | registre `AUTRES` | acteur actif et non déjà inscrit | ID, nom, type/rôle, entité |

Une affiliation d’athlète est active si :

- son statut est vide, `SAF001` ou `ACTIF` ;
- sa date de début est vide ou antérieure/égale à la date courante ;
- sa date de fin est vide ou postérieure/égale à la date courante.

Une personne déjà inscrite dans la même catégorie n’est plus proposée. Les anciennes compositions de `COMPETITIONS_PARTICIPANTS_MEMBRES` restent consultables pour compatibilité.

### 7.6 Onglet Phases et groupes

#### Création d’une phase

Champs : type, mode, numéro, nom. Le type, le mode et le nom sont obligatoires. La phase créée est active.

#### Création d’un groupe

Champs : phase parente et nom. Les deux sont obligatoires. Une phase à élimination directe est exclue du sélecteur et le serveur refuse également toute tentative.

#### Consultation

Chaque phase affiche : numéro, nom, type, mode, statut, nombre d’unités actives et groupes associés. Une phase à élimination directe affiche explicitement qu’aucun groupe n’est requis.

### 7.7 Onglet Matchs

Le formulaire est compact et organisé en trois colonnes sur écran large :

- phase puis groupe ;
- équipe A puis équipe B ;
- date puis heure.

Règles :

- la phase doit appartenir à la compétition et être active ;
- les deux équipes doivent être différentes ;
- les deux unités doivent être actives et affectées à la phase ;
- dans une phase de groupes, elles doivent appartenir au groupe choisi ;
- le groupe est obligatoire en `MPH001`, interdit en `MPH002`, facultatif en `MPH099` ;
- la date suit `AAAA-MM-JJ` et l’heure `HH:MM` ;
- une même confrontation ne peut être programmée deux fois dans le même groupe ou la même phase ;
- un match créé reçoit le statut `PROGRAMME`.

La liste des matchs affiche la phase, le groupe éventuel, les deux équipes face à face, la date, l’heure et le statut joué/programmé.

### 7.8 Onglet Résultats

Le formulaire propose uniquement les matchs sans résultat. Dès qu’un résultat est enregistré :

- le match disparaît immédiatement de la liste déroulante ;
- le match sélectionné est effacé ;
- le statut revient à `STR001` ;
- tous les champs de score reviennent à zéro ou à leur état initial.

Pour un résultat `STR001 / JOUE`, le formulaire saisit côte à côte les scores A et B pour : QT1, QT2, QT3, QT4 et prolongation.

Le système :

- exige des entiers supérieurs ou égaux à zéro ;
- calcule les totaux ;
- refuse une égalité ;
- détermine l’unité gagnante ;
- interdit un deuxième résultat pour le même match.

Pour un autre statut référencé, les scores et le vainqueur restent vides et aucun barème spécial n’est calculé.

Les cartes de résultats utilisent toute la largeur disponible de leur grille et affichent les équipes, score total, détail des périodes, phase, groupe éventuel, date, heure et statut.

### 7.9 Onglet Classement et qualifications

#### Phases de groupes

Le classement est un tableau comportant :

- rang ;
- équipe ;
- matchs joués ;
- victoires ;
- défaites ;
- points marqués ;
- points encaissés ;
- différence ;
- points de classement ;
- statut de qualification ;
- action de qualification pour le rôle fédéral.

Barème : victoire = 2 points, défaite = 1 point. Ordre de départage :

1. points de classement décroissants ;
2. différence de points décroissante ;
3. points marqués décroissants ;
4. identifiant d’unité comme dernier ordre stable.

Le statut de qualification est calculé depuis les affectations actives de l’équipe vers une phase de numéro supérieur :

- `Qualifiée`, avec le nom de la ou des phases de destination ;
- `Non qualifiée`, lorsqu’aucune affectation ultérieure n’existe.

#### Phases hors groupes

Une phase `MPH002` ou `MPH099` ne présente aucun rang, score de classement ou statistique. Elle affiche uniquement :

- le nom de la phase ;
- le titre `Équipes qualifiées` ;
- le nombre d’équipes ;
- la liste des unités affectées activement à cette phase ;
- un état vide si aucune équipe n’est encore qualifiée.

#### Action de qualification

La sélection de la phase de destination s’effectue dans une fenêtre modale, et non dans un onglet principal. Si la destination est une phase de groupes, le groupe est obligatoire. Une phase inactive ne peut pas recevoir de qualification et une affectation active identique ne peut pas être créée deux fois.

## 8. Règles métier transversales

1. Toute ressource manipulée doit appartenir à la compétition de l’URL.
2. Toute phase utilisée en écriture doit être active.
3. Toute unité utilisée doit être active et appartenir à la compétition.
4. Les libellés ne remplacent jamais les relations par identifiant.
5. Club, catégorie et sexe d’une équipe sont résolus depuis `EQUIPES` et les référentiels.
6. Une qualification n’est jamais déduite automatiquement.
7. Un classement n’est produit que pour `MPH001`.
8. Un résultat ne peut exister qu’une fois par match.
9. Une confrontation ne peut être dupliquée dans un même périmètre sportif.
10. Les écritures multiples cohérentes sont regroupées dans un lot atomique.

## 9. Identifiants métier

| Objet | Format |
| --- | --- |
| Compétition | `BKB-COMP-AAAA-###` |
| Phase | `BKB-PHA-{contexte compétition}-###` |
| Groupe | `BKB-GRP-{contexte compétition}-###` |
| Participation | `BKB-PAR-{contexte compétition}-###` |
| Intervenant | `BKB-INV-{contexte compétition}-###` |
| Unité | `BKB-UNI-{contexte compétition}-###` |
| Affectation canonique | `BKB-PHU-{contexte compétition}-###` |
| Match | `BKB-MAT-{contexte compétition}-###` |
| Résultat | `BKB-RES-{contexte compétition}-###` |
| Classement | `BKB-CLA-{contexte compétition}-###` |

Les identifiants historiques numériques ou `BKB-AFG-*` restent lisibles. Ils ne pilotent pas les nouvelles séquences canoniques.

## 10. Modèle de données Google Sheets

Le bloc métier principal est le classeur logique `competitions` (`04_FEBACO_COMPETITIONS`).

| Feuille | Colonnes utilisées | Finalité |
| --- | --- | --- |
| `COMPETITIONS` | `id_competition`, `nom_competition`, `id_type_competition`, `id_discipline`, `id_saison`, `date_debut`, `date_fin`, `pays`, `statut`, `observations` | fiche générale |
| `COMPETITIONS_PHASES` | `id_phase_competition`, `id_competition`, `id_type_phase`, `id_mode_phase`, `numero_phase`, `nom_phase`, `statut`, `observations` | structure des phases |
| `COMPETITIONS_GROUPES` | `id_groupe`, `id_phase_competition`, `nom_groupe` | groupes des phases |
| `COMPETITIONS_PARTICIPANTS` | `id_participation`, `id_competition`, `id_equipe`, `date_inscription`, `statut_participation`, `observations` | engagement administratif des équipes |
| `COMPETITIONS_UNITES` | `id_unite_competition`, `id_competition`, `id_equipe`, `id_participation`, `statut`, `observations` | représentation sportive de l’équipe |
| `COMPETITIONS_PHASES_UNITES` | `id_phase_unite`, `id_phase_competition`, `id_groupe`, `id_unite_competition`, `statut`, `observations` | affectation canonique aux phases/groupes |
| `COMPETITIONS_DISTINCTIONS` | `id_distinction_competition`, `id_competition`, `id_epreuve_competition`, `id_type_distinction`, `id_unite_competition`, `id_acteur`, `id_type_acteur`, `id_phase_competition`, `id_match`, `date_attribution`, `statut`, `observations` | palmarès collectif et distinctions individuelles |
| `COMPETITIONS_GROUPES_UNITES` | en-têtes historiques d’affectation | lecture de compatibilité uniquement |
| `COMPETITIONS_INTERVENANTS` | `id_intervenant_competition`, `id_competition`, `type_participant`, `id_acteur`, `id_equipe`, `id_club`, `role_participant`, `statut`, `observations` | participants personnes physiques |
| `COMPETITIONS_PARTICIPANTS_MEMBRES` | composition historique | lecture de compatibilité des athlètes |
| `COMPETITIONS_MATCHS` | `id_match`, `id_competition`, `id_phase_competition`, `id_groupe`, `id_unite_a`, `id_unite_b`, `date_match`, `heure_match`, `statut_match`, `observations` | programmation |
| `COMPETITIONS_RESULTATS` | `id_resultat`, `id_match`, scores par période, totaux, `id_unite_vainqueur`, `id_statut_resultat`, `observations` | résultats |
| `COMPETITIONS_CLASSEMENT` | `id_classement`, `id_competition`, `id_phase_competition`, `id_groupe`, `id_unite_competition`, statistiques, `rang`, `observations` | classement matérialisé |

### 10.1 Sources externes

- `00_FEBACO_REFERENTIEL` : types de compétition, disciplines, saisons, types et modes de phases, statuts de résultats, catégories d’âge, sexes, fonctions, grades, spécialités et types d’autres acteurs ;
- `01_FEBACO_STRUCTURE_TERRITORIALE` : clubs et équipes ;
- `03_FEBACO_ACTEURS` : athlètes, arbitres, officiels, médecins et autres ;
- `03_FEBACO_AFFILIATIONS` : affiliations actives des athlètes.

### 10.2 Compatibilité historique

`COMPETITIONS_PHASES_UNITES` est l’unique destination des nouvelles affectations. Les lignes de `COMPETITIONS_GROUPES_UNITES` sont fusionnées à la lecture, rattachées à leur phase via leur groupe et dédupliquées, avec priorité à la source canonique.

## 11. Contrats API

| Méthode et route | Lecture/écriture | Usage |
| --- | --- | --- |
| `GET /api/competitions` | lecture | liste ou filtrage par `competitionId` |
| `POST /api/competitions` | écriture fédérale | création |
| `PUT /api/competitions/[id]` | écriture fédérale | modification générale |
| `GET /api/competitions/[id]/structure` | lecture | phases, groupes et référentiels associés |
| `POST /api/competitions/[id]/structure` | écriture fédérale | création `phase` ou `groupe` |
| `GET /api/competitions/[id]/participants` | lecture | équipes engagées et choix disponibles |
| `POST /api/competitions/[id]/participants` | écriture fédérale | engagement atomique d’équipes |
| `GET /api/competitions/[id]/people` | lecture | personnes inscrites et candidats |
| `POST /api/competitions/[id]/people` | écriture fédérale | inscription d’une personne |
| `GET /api/competitions/[id]/play` | lecture | phases, unités, matchs, résultats, classements |
| `POST /api/competitions/[id]/play` | écriture fédérale | action `match`, `resultat` ou `phase-unit` |

Une écriture réussie renvoie les données actualisées nécessaires à l’interface afin d’éviter un état local périmé.

## 12. Gestion des erreurs et retours utilisateur

L’interface doit :

- associer une erreur de validation au champ concerné ;
- afficher une erreur générale lisible sans exposer de secret technique ;
- empêcher les doubles soumissions ;
- conserver les données saisies lorsqu’une écriture échoue ;
- vider le formulaire uniquement après une réussite confirmée ;
- proposer une nouvelle tentative après une erreur de lecture ;
- ne jamais annoncer un succès si une écriture atomique a échoué.

Principaux codes métier : `VALIDATION`, `REFERENCE_INVALIDE`, `COMPETITION_INTROUVABLE`, `PHASE_INVALIDE`, `PHASE_INACTIVE`, `MODE_PHASE_INVALIDE`, `GROUPE_REQUIS`, `GROUPE_INTERDIT`, `GROUPE_INVALIDE`, `PARTICIPATION_DUPLIQUEE`, `AFFECTATION_DUPLIQUEE`, `UNITES_INVALIDES`, `MATCH_DUPLIQUE`, `MATCH_INVALIDE`, `RESULTAT_DUPLIQUE`, `STATUT_INVALIDE`, `ECRITURE_INCOMPLETE`.

## 13. Exigences d’interface et d’accessibilité

- mise en page responsive mobile, tablette et bureau ;
- tableaux réservés aux données réellement tabulaires ;
- cartes compactes proportionnées à leur contenu ;
- libellés métier plutôt qu’identifiants bruts lorsque la référence existe ;
- identifiants conservés comme information secondaire utile ;
- champs associés à des libellés ;
- erreurs signalées avec `role="alert"` lorsque nécessaire ;
- états de chargement explicites ;
- boutons désactivés pendant une sauvegarde ou lorsque les prérequis manquent ;
- scores adverses présentés côte à côte ;
- modale dédiée à la qualification ;
- absence de débordement horizontal sur les onglets et listes mobiles.

## 14. Intégrité, performance et fiabilité

- les lectures parallélisent les feuilles indépendantes ;
- le cache partagé Google Sheets doit être réutilisé entre lectures rapprochées ;
- une lecture ne doit pas forcer inutilement le rafraîchissement de toutes les feuilles ;
- les écritures de résultat et de classement sont regroupées dans un unique lot ;
- les écritures d’engagement sont regroupées dans un unique lot ;
- la relation résultat-compétition passe par le match ;
- les relations sont contrôlées côté serveur même si l’interface filtre déjà les choix ;
- les anciennes données restent lisibles sans affaiblir les règles appliquées aux nouvelles écritures.

## 15. Critères d’acceptation globaux

Le module est accepté si :

1. un utilisateur fédéral peut réaliser le cycle complet sans saisir d’identifiant technique ;
2. un utilisateur non fédéral peut consulter mais ne voit aucune commande d’écriture ;
3. une équipe déjà engagée ne peut plus être sélectionnée, sauf si le club possède une autre équipe ;
4. les modes de phases appliquent correctement leurs règles de groupe ;
5. seuls les participants éligibles sont proposés ;
6. un match n’utilise que des unités affectées à son périmètre ;
7. un match ayant un résultat n’est plus proposé à la saisie ;
8. le formulaire de résultat est réinitialisé après succès ;
9. un seul résultat existe par match ;
10. les classements sont calculés uniquement pour les groupes ;
11. la colonne de qualification reflète les affectations vers des phases ultérieures ;
12. les phases hors groupes affichent seulement leurs équipes qualifiées ;
13. la qualification s’effectue dans une modale et respecte le mode de destination ;
14. les identifiants créés sont contextualisés et lisibles ;
15. les opérations atomiques ne laissent pas l’interface annoncer un état partiel.

## 16. Scénarios de recette prioritaires

### Scénario A — Phase de groupes

Créer une compétition, une phase `MPH001`, un groupe A, engager deux équipes dans ce groupe, programmer un match, saisir un score joué et vérifier que les deux lignes de classement sont créées avec les points et rangs attendus.

### Scénario B — Qualification vers une élimination directe

Depuis le classement du groupe, ouvrir la modale, sélectionner une phase `MPH002`, confirmer puis vérifier que l’équipe apparaît comme `Qualifiée — Vers [phase]` et dans la liste `Équipes qualifiées` de la phase de destination.

### Scénario C — Match à élimination directe

Programmer un match entre deux unités affectées à une phase `MPH002`, sans groupe, saisir le résultat et vérifier qu’aucune ligne de classement n’est produite.

### Scénario D — Anti-doublon d’équipe

Engager l’équipe senior masculine d’un club, rouvrir le formulaire et vérifier qu’elle a disparu. Vérifier que le club reste sélectionnable s’il possède une autre équipe disponible.

### Scénario E — Athlète admissible

Engager une équipe, vérifier qu’un athlète avec affiliation active vers cette équipe apparaît, l’ajouter, puis vérifier qu’il disparaît des candidats et apparaît dans la catégorie Athlètes.

### Scénario F — Sécurité

Avec un rôle non fédéral, vérifier la consultation des sept onglets puis tenter directement chaque route POST/PUT et obtenir `403`.

## 17. Documentation de l’implémentation

La logique métier est répartie dans :

- `lib/competitions.ts` pour la fiche générale ;
- `lib/competition-structure.ts` pour les phases et groupes ;
- `lib/competition-participants.ts` pour les équipes engagées ;
- `lib/competition-people.ts` pour les personnes participantes ;
- `lib/competition-play.ts` pour les affectations, matchs, résultats et classements ;
- `lib/competition-phase.ts` pour les modes ;
- `lib/competition-phase-units.ts` pour la compatibilité des affectations ;
- `lib/competition-ids.ts` pour les identifiants métier.

Les composants de fiche correspondants sont `competition-edit-sheet`, `competition-participants-panel`, `competition-people-panel`, `competition-structure-panel` et `competition-play-panel`. Les règles critiques disposent de tests automatisés dans les fichiers `tests/competition-*.test.ts`.

---

**État du document :** description de référence de l’implémentation au 12 septembre 2026.
