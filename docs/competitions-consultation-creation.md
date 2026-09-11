# Compétitions — consultation et création

L’implémentation utilise exclusivement `04_FEBACO_COMPETITIONS`, feuille `COMPETITIONS` (A:J). Les libellés du type, de la discipline et de la saison sont résolus à partir de `00_FEBACO_REFERENTIEL` ; seuls leurs identifiants sont enregistrés. Le pays est conservé en texte dans `pays`. Aucune structure organisatrice n’est stockée.

- Consultation : tout utilisateur authentifié.
- Création : rôle `federal` uniquement.
- Identifiant généré : `BKB-COMP-AAAA-###`, conformément à `FORMATS_ID`.
- Périmètre exclu : modification/suppression des compétitions ou participations, programmes, composition des équipes, administration des phases/groupes, matchs, résultats et classements.

## Ajout des clubs participants

- La fiche compétition expose un onglet `Participants`; le rôle `federal` peut y ouvrir un volet d’ajout, les autres rôles restent en lecture seule.
- L’interface sélectionne un club puis une équipe réelle de ce club. Seul `id_equipe` est enregistré ; club, catégorie et sexe sont résolus à la lecture.
- Les groupes sont filtrés par `COMPETITIONS_GROUPES → COMPETITIONS_PHASES.id_competition`.
- Une commande crée la participation, l’unité et l’affectation au groupe dans un unique `values.batchUpdate` Google Sheets. Un échec du lot ne produit aucune confirmation de succès.
- Les identifiants reprennent le motif numérique/préfixé déjà présent dans chaque feuille, avec `1` comme départ lorsque la feuille est vide.

## Navigation et modification

- La fiche expose six onglets pleine largeur. L’onglet actif est conservé dans `?tab=general|participants|phases|matchs|resultats|classement`, ce qui autorise l’accès direct et l’historique du navigateur.
- `PUT /api/competitions/[id]` modifie exclusivement la ligne portant cet `id_competition`; l’identifiant n’est jamais repris depuis le formulaire.
- Le formulaire de modification réutilise les champs, validations et référentiels du formulaire de création dans un volet latéral réservé au rôle `federal`.
- `SAISON` est la source unique (`id_saison` stocké, `nom_saison` affiché). Sa lecture utilise `fresh: true`, ciblé uniquement sur cet onglet, puis les options sont triées du libellé le plus récent au plus ancien.
- Un identifiant absent de `SAISON` est affiché comme `Saison non référencée` et reste conservé dans `saisonId` pour permettre sa correction.

La fiche détaillée ne charge que la compétition sélectionnée. Le formulaire contrôle les références, les champs obligatoires, le statut et la cohérence de la période avant l’écriture d’une ligne unique.
