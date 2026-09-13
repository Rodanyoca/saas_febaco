# Licences des athlètes

La page `/dashboard/licences` lit `ATHLETE_LICENCES` et enrichit chaque ligne par les référentiels Athlète, Affiliation, Équipe, Club, Entente, Ligue, Saison, Sexe et Statut. La synthèse déduplique le couple athlète–saison avant de calculer les totaux.

## Parcours

- Enregistrement individuel : saison, équipe, athlète affilié actif, numéro officiel, date, statut et observations.
- Renouvellement collectif : sélection des affiliations renouvelables d’une équipe, conservation du numéro officiel antérieur et ajout d’une nouvelle ligne par saison.
- Consultation et modification : les relations métier restent immuables ; seuls le numéro, la date, le statut et les observations peuvent être modifiés.

## Garanties serveur

- mutations réservées au rôle fédéral ; lecture limitée au périmètre territorial de la session ;
- une seule licence par athlète et par saison ;
- affiliation existante, active et cohérente avec l’athlète et l’équipe ;
- validation complète du renouvellement collectif avant l’écriture atomique ;
- identifiant `BKB-LIC-AAAA-NNNNNN` généré selon la saison ;
- écritures limitées aux huit colonnes réelles de `ATHLETE_LICENCES`.

Les routes utilisées sont `GET /api/licences`, `GET /api/licences/eligibilite`, `POST /api/licences/renouveler` et `PUT /api/licences/[id]`.
