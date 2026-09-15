# Validité des intervenants d’une compétition

La validité est une information calculée à la lecture. Elle n’est pas enregistrée dans Google Sheets et ne bloque jamais l’ajout d’un intervenant.

## Règles

- Athlète (`TAC001`) : une licence de la même saison que la compétition est requise.
- Coach, officiel, arbitre et médecin (`TAC002` à `TAC005`) : la période de licence doit couvrir intégralement les dates de la compétition, bornes incluses.
- Autre acteur (`TAC099`) : la licence est non applicable.
- Une saison ou des dates de compétition absentes produisent un statut indéterminé.
- Une licence suspendue, clôturée ou annulée n’est pas valide.
- Plusieurs licences compatibles sont départagées de manière déterministe et signalées comme anomalie de qualité.

## Architecture et données

`lib/competition-participation-validity.ts` porte le calcul pur et les index de licences. `lib/competition-people.ts` charge une fois `ATHLETE_LICENCES` et `ACTEURS_LICENCES`, construit les index en mémoire, puis enrichit les inscrits et les candidats. La route `/api/competitions/[id]/people` reste l’unique source de l’interface.

Les colonnes utilisées sont celles déjà présentes : identifiants acteur/type/saison, numéro et statut de licence, dates de délivrance et de validité. Aucune colonne ni écriture dérivée n’a été ajoutée aux classeurs.

Les en-têtes ont été contrôlés directement dans les classeurs `07_FEBACO_COMPETITIONS` et `04_FEBACO_LICENCE` le 15 septembre 2026. Ils correspondent aux mappings de `COMPETITIONS`, `COMPETITIONS_INTERVENANTS`, `ATHLETE_LICENCES` et `ACTEURS_LICENCES` utilisés ici.

## Interface

L’onglet Intervenants affiche le numéro de licence, la période utile, le statut calculé et son motif. Les champs et colonnes sont adaptés au type d’acteur, un filtre de validité est disponible et l’avertissement reste strictement informatif.

## Coût Google Sheets

Le chargement ajoute les deux feuilles de licences au lot existant. Elles appartiennent au même classeur et sont donc regroupées en une requête batch à froid. Le nombre de lectures ne dépend pas du nombre d’intervenants : aucun appel N+1 n’est effectué.
