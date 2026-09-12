# Compétitions — consultation et création

L’implémentation utilise exclusivement `04_FEBACO_COMPETITIONS`, feuille `COMPETITIONS` (A:J). Les libellés du type, de la discipline et de la saison sont résolus à partir de `00_FEBACO_REFERENTIEL` ; seuls leurs identifiants sont enregistrés. Le pays est conservé en texte dans `pays`. Aucune structure organisatrice n’est stockée.

- Consultation : tout utilisateur authentifié.
- Création : rôle `federal` uniquement.
- Identifiant généré : `BKB-COMP-AAAA-###`, conformément à `FORMATS_ID`.
- Périmètre exclu : suppression des compétitions, participations, phases, groupes, matchs ou résultats, et composition nominative des équipes.

## Ajout des clubs participants

- La fiche compétition expose un onglet `Équipes engagées`; le rôle `federal` peut y ouvrir un volet d’ajout, les autres rôles restent en lecture seule.
- L’interface sélectionne un club puis une équipe réelle de ce club. Seul `id_equipe` est enregistré ; club, catégorie et sexe sont résolus à la lecture.
- Les groupes sont filtrés par `COMPETITIONS_GROUPES → COMPETITIONS_PHASES.id_competition`.
- Une commande crée la participation, l’unité et l’affectation au groupe dans un unique `values.batchUpdate` Google Sheets. Un échec du lot ne produit aucune confirmation de succès.
- Les nouvelles lignes utilisent des identifiants métier contextualisés par la compétition : `BKB-PHA-*`, `BKB-GRP-*`, `BKB-PAR-*`, `BKB-UNI-*`, `BKB-PHU-*`, `BKB-MAT-*`, `BKB-RES-*` et `BKB-CLA-*`. Les anciens `BKB-AFG-*` et les clés numériques restent lisibles pour préserver leurs relations existantes.
- `COMPETITIONS_PHASES_UNITES` est la destination canonique des affectations. `COMPETITIONS_GROUPES_UNITES` reste uniquement une source de compatibilité historique, fusionnée et dédupliquée par identifiants.
- `id_type_phase` décrit la phase tandis que `id_mode_phase` gouverne son fonctionnement. Aucun mode n’est déduit du type ou du nom.

## Navigation et modification

- La fiche expose sept onglets pleine largeur. L’onglet actif est conservé dans `?tab=general|equipes|participants|phases|matchs|resultats|classement`, ce qui autorise l’accès direct et l’historique du navigateur.
- Le nouvel onglet `Participants` regroupe les personnes explicitement inscrites par catégorie. Les anciennes compositions d’athlètes de `COMPETITIONS_PARTICIPANTS_MEMBRES` restent visibles pour compatibilité.
- Les nouveaux ajouts sont enregistrés dans `COMPETITIONS_INTERVENANTS`. Les athlètes proposés doivent avoir une affiliation active vers une équipe engagée; arbitres, officiels, médecins et autres sont recherchés dans leurs registres actifs. Le rôle saisi est obligatoire pour un officiel et propre à la compétition. Une personne déjà active dans une catégorie n’est plus proposée.
- `PUT /api/competitions/[id]` modifie exclusivement la ligne portant cet `id_competition`; l’identifiant n’est jamais repris depuis le formulaire.
- Le formulaire de modification réutilise les champs, validations et référentiels du formulaire de création dans un volet latéral réservé au rôle `federal`.
- `SAISON` est la source unique (`id_saison` stocké, `nom_saison` affiché). Sa lecture utilise `fresh: true`, ciblé uniquement sur cet onglet, puis les options sont triées du libellé le plus récent au plus ancien.
- Un identifiant absent de `SAISON` est affiché comme `Saison non référencée` et reste conservé dans `saisonId` pour permettre sa correction.

La fiche détaillée ne charge que la compétition sélectionnée. Le formulaire contrôle les références, les champs obligatoires, le statut et la cohérence de la période avant l’écriture d’une ligne unique.

## Matchs, résultats et classement

- `GET /api/competitions/[id]/play` expose les phases, groupes, unités affectées, matchs, résultats, statuts et classements de la compétition. La lecture est ouverte à tout utilisateur authentifié.
- `POST /api/competitions/[id]/play` est réservé au rôle `federal`. L’action `match` programme deux unités distinctes, actives et affectées au groupe sélectionné dans `COMPETITIONS_MATCHS`.
- L’action `resultat` enregistre au plus un résultat par match. Pour le statut référentiel `STR001 / JOUE`, les totaux et le vainqueur sont calculés depuis les quatre quart-temps et les prolongations; une égalité est refusée.
- Après chaque résultat joué, le classement de la phase et du groupe est recalculé : victoire = 2 points, défaite = 1 point, puis départage par différence de points et points marqués. Les autres statuts (`FORFAIT`, `ABANDON`, `DISQUALIFICATION`, `ANNULE`, `AUTRE`) sont conservés mais exclus du calcul tant qu’un barème spécifique n’est pas défini.
- Le résultat et toutes les créations/mises à jour de `COMPETITIONS_CLASSEMENT` sont envoyés dans un seul `values.batchUpdate`. Les libellés d’équipe, phase, groupe et statut sont toujours résolus depuis leurs identifiants.
- Les routes globales `/api/competitions-resultats` et `/api/competitions-classement` réutilisent le même module métier; la relation résultat → compétition passe obligatoirement par `id_match`.
