# Licences des autres acteurs

Le module `/dashboard/licences/entourage` gère les licences individuelles des coachs, officiels, arbitres et médecins. Il lit les personnes depuis leurs référentiels respectifs et persiste les licences dans `ACTEURS_LICENCES`, avec les dix colonnes définies par le classeur.

Une licence est indépendante des saisons, équipes et affiliations. Sa création exige un cycle non permanent, un numéro officiel et trois dates cohérentes. Le service bloque un numéro utilisé par un autre acteur ainsi que tout chevauchement de période. Un renouvellement crée une nouvelle ligne ; une modification conserve l’identifiant, le type, l’acteur et le statut.

Le statut affiché est calculé à partir du statut enregistré et des dates. Une licence active est « À venir », « Valide » ou « Expirée » selon la date du jour. Les statuts manuels suspendue, clôturée et annulée sont prioritaires.

Tous les utilisateurs authentifiés peuvent consulter la liste, les indicateurs et l’historique. Les écritures et changements de statut sont réservés au rôle fédéral. Les identifiants techniques suivent provisoirement le format `BKB-ACL-AAAA-NNNNNN`, car aucun format dédié n’existe encore dans `FORMATS_ID`.
