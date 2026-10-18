# Caches et invalidations

Référence `dc467a6`, 19 octobre 2026 Europe/Paris. Tous les états existants ci-dessous sont **[Confirmés dans le code]** ; TTL déployés et taux de hit ne sont pas mesurés. Aucun nouveau cache implémenté.

**Étape P1 locale :** cette matrice et tous les mécanismes décrits restent inchangés. Seul le filtrage `actorId` du service affiliations passe avant enrichissement ; il ne supprime ni conversion complète des cellules, ni lectures, ni construction des index, ni contrôles de scope. Aucune modification des plages, TTL, promesses ou invalidations.

| Mécanisme | Clé / données | Durée et portée | Partage / invalidation |
|---|---|---|---|
| États React liste/panel/formulaire | instance composant ; lignes, recherches, filtres, page, options | durée du montage ; aucun cache client partagé identifié | aucun partage entre onglets ; affiliations mises à jour depuis réponse mutation ; liste revision/focus/visibilité/saison ; pas de garantie de restauration retour |
| HTTP API métier | URL, réponse complète/projetée | guard et proxy imposent `private, no-store` ; fetch client principal no-store | pas de résultat API privé stocké par ce mécanisme ; n'invalide pas un Map serveur |
| Router Cache Next | segments/payload RSC de navigation | mécanique Next/navigateur, non configurée explicitement ici | peut aider retour/scroll, pas un cache garanti du tableau JSON ; pas de persistance explicite de ses useState par l'application |
| Next Data Cache / Full Route Cache | aucune couche explicite de résultat métier trouvée | routes principales force-dynamic ou droits dynamiques ; pas de use cache/unstable_cache/revalidateTag/revalidatePath applicatif trouvé | ne pas confondre Google SDK avec fetch Next étendu ; pas de tags actuels à auditer |
| `readCache` Sheets | classeur + feuille minuscules + plage canonique ; tableaux bruts de cellules | TTL par défaut référentiel 15 min, opérationnel 2 min ; Map du processus | toutes plages de la feuille supprimées après write/update/batch ; autres instances inchangées jusqu'au TTL/lecture fresh. Lecture simple : purge d'expirés puis clear si ≥100 ; batch écrit directement sans cette limite |
| `pendingReads` et microbatch | même clé feuille/plage ; promesse cellules ; file par classeur+bloc | jusqu'à résolution ; microtask pour regrouper les reads simultanés | seulement même processus ; fresh saute valeur cache mais rejoint une promesse en cours ; références A:F/A:ZZ canoniques, licences A:H/A:ZZ **distinctes** |
| `pendingBatchReads` | classeur + noms triés des feuilles manquantes ; promesse batch | durée lecture batch | pas de fusion des lots partiellement communs ni entre pendingReads et pendingBatchReads ; magasin de cellules commun. fresh saute cache mais peut rejoindre même batch en cours |
| Conversion/indices métier | objets rows, maps acteurs/structures/licences, catégories | par appel, reconstruits | pas de cache résultat affiliations/licences/dashboard ; scopeReadRows appliqué après conversion du cache brut |
| DirectoryCache auth | singleton annuaire USERS+USER_AUTORISATIONS, maps par id/email et grants | 10 s depuis début de lecture ; valeur + promesse + génération, processus local | invalidé par mutations locales utilisateurs/grants ; pas de stale fallback ; refresh trop lent refusé ; autre instance peut conserver ancienne autorisation jusqu'à son TTL |
| Adaptateur Users | table par nom dans instance d'adaptateur ; pending global par classeur+ensemble trié | tables durant vie adaptateur ; promesse jusqu'à réponse | mutations suppriment table de l'adaptateur et invalident annuaire pour USERS/USER_AUTORISATIONS ; audits/tentatives empruntent aussi cet adaptateur |
| Saison courante | aucun cache de résultat ; SAISON/PARAMETRES_SYSTEME fresh | chaque chargement liste relit via batch fresh | saveCurrentSeason sérialise écritures du processus et invalide PARAMETRES_SYSTEME localement ; événement client/BroadcastChannel saison. Pas de verrou distribué |
| Clients Google | instances SDK/credentials réutilisables | processus local | ce n'est pas un cache de données métier ; aucun contenu de credential relevé |
| Vercel Runtime Cache / Redis | absent des chemins audités | sans objet | aucun getCache ni dépendance ajoutée ; un Map mémoire n'est pas partagé régionalement |

Sources : [Sheets](../../lib/google-sheets.ts), [annuaire](../../lib/auth/directory-cache.ts), [Users](../../lib/users/google-adapter.ts), [saison](../../lib/current-season.ts), [guard](../../lib/auth/guard.ts).

### Limites de fraîcheur confirmées

- Les écritures invalident le cache cellules de leur feuille **dans l'instance courante**. Elles ne diffusent pas une invalidation aux autres instances Vercel, ni aux autres clients.
- `clearSheetCache` ne retire pas les promesses en cours et ne porte pas de génération : **[Hypothèse]** une lecture ancienne résolue après mutation peut repeupler une ancienne valeur. Course à reproduire localement, pas incident observé.
- Sur quota, une lecture simple peut servir des cellules périmées ; le batch a un fallback quand toutes les entrées manquantes disposent d'un ancien cache. Ce mécanisme est absent de l'annuaire auth. Ne pas étendre le fallback aux autorisations ou mettre en cache un résultat filtré en oubliant le scope.
- Les plages différentes `ATHLETE_LICENCES!A:H` (historique) et `A:ZZ` (liste) empêchent une même clé, même pour une feuille commune. Une harmonisation nécessite un contrat de colonnes et des tests, pas juste une modification du TTL.

## Matrice mutation → dépendances → écran

Toutes les invalidations actuelles indiquées sont **[Confirmées dans le code]**. Les clés/tags sont des **[Propositions]**, non des mécanismes déjà installés.

| Mutation | Données affectées | Invalidation actuelle | Clés/tags logiques proposés si cache ultérieur | Attendu à l'écran |
|---|---|---|---|---|
| Affiliation POST/PUT | histoire acteur, équipe/club, éligibilité, portée territoriale des acteurs et licences ; synthèses dashboard | feuille affiliation locale, réponse enrichie réinjectée dans panel ; pas d'événement client global | affiliations:athlete, affiliation:id, athlete:id:affiliations, structure:team:id, eligibility:team:id, scope:affiliations, dashboard | mutation visible immédiatement, options licences et accès recalculés au prochain GET ; autres clients selon politique de fraîcheur explicite |
| Identité athlète PUT / création | fiche, nom/tri/liste, libellés affiliation/licences, catégorie/sexe | ATHLETES locale ; liste reload lors onSaved, fiche remplace objet | athletes, athlete:id, affiliations:athlete, licences:athlete, dashboard | nom/photo/catégorie cohérents ; ne pas modifier IDs |
| Photo POST upload | Drive + champs ATHLETES | invalidation feuille lors mise à jour média ; URL locale + reloadAthletes | athlete:id, athletes, media:entity:id | photo immédiate puis persistée ; contrôler HTTP cache de l'URL à part |
| Licence POST/renouvellement/PUT | licence saison, cellule licence liste, historique/éligibilité et synthèses | ATHLETE_LICENCES locale ; page licences load(seasonId), pas événement global licence trouvé | licences, licences:season:id, athlete:id:licences, athletes:table:season:id, eligibility:team:id | affichage immédiatement dans page mutante ; liste/fiches d'autres onglets ont besoin d'actualisation définie |
| Saison courante | projection licence liste et vues dépendantes | PARAMETRES_SYSTEME locale, read fresh, événement/BroadcastChannel client | settings:season, athletes:table (toutes saisons ou clé incluant saison), eligibility | aucune licence ancienne sous le libellé nouvelle saison ; inclure saison courante/révision dans clé résultat |
| Référentiel catégories/statuts | catégories d'âge, options, libellés et validité | feuille locale sur écriture par adaptateur ; modification externe Google seulement TTL/fresh | refs:sheet, athletes, affiliations, licences selon dépendances | option/libellé cohérents après actualisation ; pas besoin de recharger tout le classeur |
| Structure équipe/club/entente/ligue | jointures, équipes proposées, périmètre | feuille modifiée locale ; buildScopeIndex reconstruit | structures:sheet, scope:structure, affiliation/licence views, refs:affiliations, dashboard | rattachements et refus d'accès à jour ; ne jamais réutiliser l'ancien résultat filtré |
| Révocation grant/désactivation/sessionVersion/rattachement utilisateur | accès et toutes données privées visibles | DirectoryCache invalidé localement ; autres instances TTL 10 s ; validation à chaque requête | auth:directory:generation ; invalider/vider toute donnée client de session | refus serveur ; cache client vide au logout/401/403/changement identité, politique explicite pour révocation sans nouveau GET |

## Stratégie proposée, sans implémentation

1. P1/P2 n'ont pas besoin de cache supplémentaire : diminuer d'abord les transformations inutiles.
2. Si P3 conserve des données, commencer par partage d'une requête en cours et restauration d'état non sensible. Une clé résultat doit inclure identité/sessionVersion, type/rôle, grants/révision de droits, scope territorial **et ses dépendances structure/affiliations**, saison, paramètres et version de contrat table. Une clé par simple rôle ou idLigue n'est pas suffisante.
3. Toute lecture privée reste autorisée avant de servir un résultat serveur. Le cache brut doit être immuable et filtré avec le scope de la requête courante. Aucun résultat privé fédéral ne doit être servi en ligue/entente.
4. Révocation et fraîcheur demandent une borne et un mécanisme de vérification de droits ; un cache client « instantané au retour » sans revalidation prolonge potentiellement l'affichage après révocation. Ne pas le présenter comme strictement équivalent sans décision explicite.
5. Si un cache partagé devient nécessaire, adopter un modèle versionné et une matrice de dépendances avant toute intégration. Définir régions/environnements, génération anti-course, invalidation après écriture confirmée et comportement sur panne. Pas d'allongement général des TTL pour réduire artificiellement les lectures.

[Next revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) agit sur le cache de données concerné, pas sur les Maps ni useState de ce dépôt. [Vercel Runtime Cache](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package) est un mécanisme distinct, régional. [Caching Next sans Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components) explique les couches ; la version courante de documentation est plus récente que Next 16.2.0. Ne pas adopter de nouveaux comportements sans vérifier la version installée.
