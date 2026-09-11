# Compétitions — consultation et création

L’implémentation utilise exclusivement `04_FEBACO_COMPETITIONS`, feuille `COMPETITIONS` (A:J). Les libellés du type, de la discipline et de la saison sont résolus à partir de `00_FEBACO_REFERENTIEL` ; seuls leurs identifiants sont enregistrés. Le pays est conservé en texte dans `pays`. Aucune structure organisatrice n’est stockée.

- Consultation : tout utilisateur authentifié.
- Création : rôle `federal` uniquement.
- Identifiant généré : `BKB-COMP-AAAA-###`, conformément à `FORMATS_ID`.
- Périmètre exclu : modification, suppression, programmes, participants, unités, phases, groupes, matchs, résultats et classements.

La fiche détaillée ne charge que la compétition sélectionnée. Le formulaire contrôle les références, les champs obligatoires, le statut et la cohérence de la période avant l’écriture d’une ligne unique.
