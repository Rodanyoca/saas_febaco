# Implémentation du cycle Compétitions SNDS

## Modèle retenu

`COMPÉTITION → ÉPREUVE → PHASE → GROUPE FACULTATIF → MATCH → RÉSULTAT`.

`COMPETITIONS` porte directement chaque compétition opérationnelle. `numero_edition` reste une information facultative sans entité parente. Une épreuve est un tableau homogène par discipline, catégorie et sexe. Une unité sportive est engagée dans une épreuve puis affectée à ses phases. Le type de compétition ne détermine jamais le moteur sportif : le fonctionnement vient du mode explicite de chaque phase.

## Feuilles et responsabilités

- `COMPETITIONS` : identifiant de compétition, numéro d’édition facultatif, saison, dates, pays, lieu et statut.
- `COMPETITIONS_EPREUVES` : tableaux sportifs.
- `COMPETITIONS_PARTICIPANTS` et `COMPETITIONS_UNITES` : engagement administratif et unité jouable.
- `COMPETITIONS_INTERVENANTS` : personnes inscrites ; les nouvelles écritures renseignent `id_type_acteur`, `id_unite_competition` et `id_fonction` lorsqu’ils sont résolus.
- `COMPETITIONS_PHASES` et `COMPETITIONS_GROUPES` : structure sportive. Un groupe est permis uniquement pour `MPH001`.
- `COMPETITIONS_PHASES_UNITES` : source canonique des engagements initiaux et qualifications.
- `COMPETITIONS_MATCHS`, `COMPETITIONS_RESULTATS`, `COMPETITIONS_CLASSEMENT` : programmation, scores et classement des seules phases `MPH001`.

`COMPETITIONS_GROUPES_UNITES` et `COMPETITIONS_PARTICIPANTS_MEMBRES` restent lisibles pour l’historique, mais ne sont plus les destinations canoniques.

## Cycle opérationnel et interfaces

La liste présente directement les lignes de `COMPETITIONS` et propose une seule action « Créer une compétition ». La fiche de compétition conserve `?tab=` et expose ses onglets métier. Un indicateur rappelle le cycle jusqu’à la clôture.

Les épreuves filtrent la compatibilité des équipes et des phases. Les matchs de groupes exigent un groupe commun ; les autres modes utilisent directement les unités de phase. Un résultat joué calcule les totaux et le vainqueur. Seul `MPH001` recalcule `COMPETITIONS_CLASSEMENT`.

## Qualification

Une qualification est une ligne `COMPETITIONS_PHASES_UNITES` avec un identifiant `BKB-PHU-*`, un type `TAP*`, une phase source, un match source facultatif, une date, un statut et une observation. La destination doit être ultérieure et appartenir à la même épreuve. Si un match source est fourni, il doit appartenir à la source et l’unité doit être son vainqueur joué. Une unité ne peut être active deux fois dans la destination. La sélection reste une modale ; aucun passage n’est automatique.

## Identifiants

Les nouvelles clés utilisent `BKB-COMP-AAAA-###` puis les préfixes contextualisés `EPR`, `PAR`, `UNI`, `PHA`, `GRP`, `PHU`, `MAT`, `RES`, `CLA` et `INV`. Elles sont générées côté serveur et ne sont jamais reprises d’un corps de modification. Les identifiants numériques et `BKB-AFG-*` historiques restent lisibles.

## Autorisations et clôture

La lecture exige une session. Toutes les mutations exigent le rôle `federal` côté route. Une édition `TERMINEE` masque les commandes et les services refusent les mutations ordinaires avec `EDITION_CLOTUREE`. La clôture écrit uniquement le statut de la ligne ciblée ; aucune réouverture implicite n’est prévue.

## Google Sheets et atomicité

### Distinctions

L’onglet `Distinctions` s’appuie exclusivement sur `COMPETITIONS_DISTINCTIONS` et le référentiel `TYPES_DISTINCTIONS`. Une distinction collective renseigne `id_unite_competition`; une distinction individuelle renseigne `id_acteur` et `id_type_acteur`. Les libellés d’épreuve, de type, d’équipe, d’acteur, de phase et de match sont résolus à la lecture et ne sont jamais enregistrés dans la feuille métier.

Les identifiants sont générés côté serveur au format `BKB-DST-AAAA-CCC-###` et restent immuables. Les cibles `ATHLETE` et `COACH` exigent respectivement `TAC001` et `TAC002`; `DST099` exige une observation. Une phase doit appartenir à l’épreuve, un match à la phase et ses équipes à la même épreuve. Un doublon actif strict est refusé.

Routes :

- `GET /api/competitions/[id]/distinctions` : lecture authentifiée ;
- `POST /api/competitions/[id]/distinctions` : création fédérale ;
- `PUT /api/competitions/[id]/distinctions/[distinctionId]` : modification fédérale et partielle.

L’interface propose quatre indicateurs imposés, cinq filtres, un tableau desktop, des cartes mobiles et un volet partagé création/modification. Les écritures sont masquées en lecture seule, protégées contre les doubles soumissions et confirmées uniquement après la réponse Sheets enrichie.

Les accès résolvent les colonnes par en-tête. Les ajouts multi-feuilles d’un engagement et les écritures résultat/classement utilisent un unique `values.batchUpdate`. Les colonnes inconnues des lignes existantes sont préservées lors des mises à jour. Les tests utilisent des adaptateurs injectés et n’écrivent jamais dans les classeurs réels.

## Contrôle de la compétition test

Lecture du 12 septembre 2026 pour `BKB-COMP-2026-002` : 2 épreuves, 36 unités, 7 phases, 45 affectations, 19 matchs, 19 résultats, 36 classements et 7 intervenants. `BKB-PHU-2026-002-009` relie bien le quart `BKB-PHA-2026-002-002` à la demi `BKB-PHA-2026-002-005`, via `BKB-MAT-2026-002-019`, avec le vainqueur `BKB-UNI-2026-002-021`. Aucune migration de données n’a été exécutée : les en-têtes et relations étaient déjà conformes.

## Routes et composants principaux

Routes : `/api/competitions`, `/api/competitions/[id]/epreuves`, `participants`, `people`, `structure`, `play` et `close`. Les routes historiques globales de résultats et classements réutilisent les mêmes services de lecture.

Composants : `competition-create-modal`, `competition-events-panel`, `competition-participants-panel`, `competition-people-panel`, `competition-structure-panel` et `competition-play-panel`.

## Vérifications

- Tests : 109 réussis lors de la dernière suite complète.
- TypeScript et lint : réussis.
- Build Next.js : réussi ; routes et pages dynamiques détectées.
- Contrôle HTTP sans session : redirection de la page vers `/login` et `401` de l’API.
- Contrôle visuel authentifié : à refaire si la session navigateur locale a expiré.

## Limites conservées

Le calendrier complet et le tableau graphique à élimination directe ne sont pas générés automatiquement. Les qualifications restent des décisions fédérales explicites. La correction administrative après clôture devra faire l’objet d’un flux séparé et audité.
