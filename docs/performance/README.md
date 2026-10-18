# Canevas de performance FEBACO

Mis à jour le 19 octobre 2026 (Europe/Paris, UTC+02:00). Les mesures portent un horodatage UTC explicite. Référence de code : `dc467a62d747cc13cb5c7a561216f1ac50b14bdb`.

Ce dossier est le point de reprise de la démarche. Il complète, sans remplacer, l'[audit historique du dashboard](../audits/vercel-cpu-dashboard-2026-10-17.md). Ne pas reprendre ses anciens constats de disponibilité d'outils comme une description de la situation actuelle.

## Livraison combinée autorisée le 19 octobre 2026

État : intégration locale validée sur `release/p1-app-current`, publication et vérifications en cours. Suite complète : 316/319, les trois échecs Ligue/Club reproduits sur la base publiée ; suite ciblée : 133/133. TypeScript réussi. Build webpack réussi (47 pages, journal npm `exit 0`) ; PowerShell a classé l'avertissement de racine multi-lockfiles comme NativeCommandError, sans échec du build Next. Cette section actualise l'état de livraison ; les observations et mesures ci-dessous restent historiques.

- Base distante et production vérifiées avant intervention : `dc467a62d747cc13cb5c7a561216f1ac50b14bdb`, alias `saas-febaco.vercel.app`, déploiement précédent `dpl_H9WAncS6iWwnyvJHNjapafWt75nH` (`saas-febaco-qr9fe044l-yoca-souleymane-s-projects.vercel.app`). Conserver ce déploiement pour un retour arrière.
- P1 : commits source `9cb5826` et `b4d31d9`, repris en `1153137` et `a524240` ; code, fixtures, benchmark et documentation intégrés ensemble. L'audit `18c2f38` est inclus dans la documentation P1, sans rapport parallèle.
- Identification : recherche locale du tableau Athlètes par ID système, exact ou partiel, sans affichage de cet ID ; réponse `view=table` maintenue sur ordinateur et mobile. Parcours et tests du worktree `fix/athletes-system-id-search` repris.
- Fonctionnel existant : filtres Compétitions, retrait progression/clôture et verrouillage par statut, édition/suppression des engagements et forfait 30–0 (+2/−1), déjà implémentés dans `feat/competition-editing`. Aucun développement supplémentaire Compétitions pour cette livraison.
- Évolutions déjà publiées conservées : acteurs et licences/saison (`b1b481b`, `880f675`), retrait qualité de données (`dc467a6`), Collator (`23fa79a`), sélection individuelle avant normalisation (`4375438`) et projection explicite Athlètes présente dans la base publiée. Les variantes CPU plus anciennes du workspace ne remplacent pas ces implémentations.
- Inventaire : workspace principal `main` à `880f675`, worktrees acteurs, détail CPU, projection, retrait qualité, audit, P1, identification et Compétitions examinés. Les changements acteurs/Sheets/modèles sont déjà représentés dans la version distante ; les fichiers non suivis équivalents ne sont pas des suppressions à rejouer. Les deux commits P1 et les modifications non committées identification/Compétitions sont les apports supplémentaires.
- Exclus : fichiers `.env` contenant des valeurs, secrets, données personnelles, scripts locaux d'activation/réinitialisation des utilisateurs, réglages `.code-workspace`, `next-env.d.ts` généré, caches/builds et journaux temporaires. Le modèle `.env.example` localement retiré reste supprimé. Les anciens tests/benchmarks de la variante CPU locale ne remplacent pas leurs versions publiées ; le benchmark P1 et ses données synthétiques documentées restent suivis.

La publication combine P1 et des changements fonctionnels. Les mesures globales de cette version ne permettent pas d'attribuer un gain CPU isolé à P1. Les [mesures locales](mesures.md) restent celles du protocole apparié historique, sans nouvelle revendication Vercel. Les lectures Sheets complètes et les limites des compteurs restent applicables. Aucun développement du chargement des licences ou de la navigation n'est ajouté par P1.

## Objectif et cadre

**[Communiqué par l'utilisateur]** Usage prioritaire : liste Athlètes → recherche → fiche → affiliations → création/modification → retour à la liste → athlète suivant. Environ 6 000 à 14 000 affiliations en une semaine ; les 6 000 premières provenaient d'une sauvegarde. Aucun recomptage du classeur n'a été effectué pendant cet audit.

Réduire le travail inutile par consultation et fluidifier ce parcours, sans gel du développement fonctionnel, changement des permissions, migration de stockage ou nouvelle couche de cache par principe. Audit initial : documentation et diagnostic local seulement. Étape suivante autorisée : P1 implémentée et vérifiée localement, sans push, déploiement, achat ou écriture métier en production ; voir le [registre P1](mesures.md#intervention-p1--filtrage-avant-enrichissement).

### Convention de preuve

Chaque constat porte un statut : **observé en production**, **confirmé dans le code**, **mesuré localement**, **communiqué par l'utilisateur**, **hypothèse**. Une hypothèse n'est jamais une mesure. Les procédures proposées ne sont pas des contrôles déjà exécutés.

## Documents de travail

- [Parcours, architecture et preuves de code](parcours.md).
- [Inventaire des caches et matrice d'invalidation](caches.md).
- [Registre des mesures et versions](mesures.md), [échantillons synthétiques](mesures-synthetiques-2026-10-19.json).
- [Procédure de mesure et de contrôle fonctionnel](procedure.md).
- [Diagnostic local sans Google](../../scripts/diagnose-affiliation-processing.ts).

## État vérifié et outils

**[Observé en production]** Alias `saas-febaco.vercel.app` → `dpl_H9WAncS6iWwnyvJHNjapafWt75nH`, SHA `dc467a62d747cc13cb5c7a561216f1ac50b14bdb`, état READY, région iad1. Métadonnées et alias lus via MCP Vercel le 18 octobre UTC / 19 octobre Paris. Le dernier changement supprime Qualité des données et ses calculs, pas les autres indicateurs.

**[Confirmé dans le code]** Branche d'audit `docs/performance-affiliations-audit`, worktree `C:/Users/HP/AppData/Local/Temp/febaco-performance-audit`, créé depuis `origin/main`. Aucun AGENTS.md applicable trouvé dans le dépôt ou ses parents inspectés ; les AGENTS.md des fédérations voisines ne s'appliquent pas. README et documentation acteurs/licences/Sheets consultés. Le README indique le déploiement automatique des changements de main : aucun push dans cette étape.

**Étape P1 locale :** branche `perf/affiliations-filter-before-enrichment`, worktree `C:/Users/HP/AppData/Local/Temp/febaco-affiliations-p1`, commit d'implémentation `9cb58263219acc93d6a0e449b2f7048d9865aa5e`. Le [diff applicatif](p1-application.patch) ne modifie que `lib/affiliations.ts`. Les références de production et les observations historiques ci-dessous restent celles effectivement vérifiées, pas une publication de P1.

Le workspace principal reste à `880f675` avec des modifications et fichiers non suivis : certaines évolutions publiées y figurent encore comme changements locaux, les fichiers projection Athlètes y sont absents et le chemin CPU individuel y diffère. Un `git diff` des seuls fichiers suivis exagère les suppressions quand les équivalents sont non suivis. Ne pas le traiter comme une base de publication ou réinitialiser ses fichiers. L'audit utilise exclusivement le SHA publié ; les changements locaux sont préservés.

**[Confirmé dans le code / inventaire local]** Next 16.2.0, React 19.2.4, TypeScript 5.7.3, Radix Tabs 1.1.13 ; diagnostic Node 24.16.0 / ICU 78.3, Windows. Les versions installées localement ne constituent pas un relevé du runtime exact de production.

Outils disponibles : Git/PowerShell/Node et tests locaux ; MCP Vercel (alias, métadonnées et listes accessibles), CLI Vercel 64.5.0 (logs récents accessibles), recherche Web officielle. Connecteurs Drive, Pages, Sites et contrôle documentaire exposés mais non nécessaires et non sollicités ; leur authentification n'est pas vérifiée. L'inventaire CUA retourne `apps: []`, `browsers: []` : aucun contrôle navigateur authentifié réalisé. Ne pas fabriquer de session.

Guides appliqués : `vercel:deployments-cicd`/`vercel-cli` pour provenance et logs ; `vercel:react-best-practices` pour effets et chargements ; `vercel:verification` pour la chaîne complète ; `vercel:runtime-cache` pour distinguer un cache partagé des Maps existantes, sans en installer. La documentation technique est enregistrée dans [parcours](parcours.md) et [caches](caches.md). Les rapports sont du Markdown natif du dépôt ; aucune connexion documentaire externe requise.

## Suivi des interventions

| Intervention | Proposée | Implémentée | Vérifiée localement | Publiée | Observée en production |
|---|---|---|---|---|---|
| Réutilisation Collator athlètes | oui | `23fa79a` | tests de tri historiques + réexécution ciblée | oui, ancêtre du SHA courant | présence confirmée par provenance ; économie isolée non mesurée |
| Filtrage individuel avant normalisation | oui | `4375438` | tests détail/permissions/équivalence | `dpl_CTtpK4ak6YWW8fXA9EbrKfzvxSkQ`, puis hérité | présence confirmée ; coût individuel actuel inconnu |
| Projection explicite view=table | oui | isolé `a17459e`, intégré `b1b481b` | équivalence, rendu ordinateur/mobile, volume local | `dpl_Bfy5ZmM1QmEuZMo53wo51ogsbysf`, puis hérité | présence confirmée ; réponses avec session non relues |
| Suppression Qualité des données | oui | `dc467a6` | 18 tests + TypeScript lors de l'intervention | `dpl_H9WAncS6iWwnyvJHNjapafWt75nH` | provenance READY ; gain non mesuré |
| P1 Filtrage affiliations en amont de l'enrichissement | oui | `9cb5826`, actorId uniquement | équivalence/scopes/mutations, mesures alternées, 42 tests ciblés, TypeScript et build ; 3 échecs Ligue préexistants dans la suite complète | non | non |
| P2 Historique des licences à la demande + chemin individuel dédié | oui, cet audit | non | baseline seulement | non | non |
| P3 Restauration de liste et rafraîchissement client maîtrisé | oui, cet audit | non | protocole seulement | non | non |

## Trois premières interventions proposées

| Priorité | Problème et preuve | Comportement attendu / bénéfice envisagé | Effort / risque | Validation / retour arrière |
|---|---|---|---|---|
| P1 | **[Confirmé dans le code]** `listAffiliations` mappe toutes les affiliations avant actorId ; même chemin pour confirmer une mutation | Filtrer les critères directs sûrs, dont actorId, après le périmètre et avant enrichissement ; conserver filtres dérivés après jointures. Réduire allocations, catégories d'âge et jointures ; Sheets peut rester intégralement lu | faible à moyen ; risque faible sans cache, attention ordre stable, doublons, anomalies, chaînes vides, casse | comparer toutes les réponses et erreurs, fédéral/ligue/entente, mutation confirmée, benchmark apparié ; revert du commit isolé |
| P2 | **[Confirmé dans le code]** effet licences déclenché par l'objet athlete dès la fiche ; service joint toute la population puis produit synthèses/references jetées par la route individuelle | Charger l'historique à l'ouverture de son onglet ; chemin athleteId qui évite les vues hors cible et les synthèses inutilisées. Bénéfice réseau/invocations/CPU possible sur fiches sans consultation licences | moyen ; fraîcheur lors des réouvertures, effets après édition/photo ; ne pas retirer le contrôle territorial fondé sur les affiliations | assertions aucun GET avant onglet, réponse identique, inconnus/non autorisés, erreur explicite, réouverture fraîche ; revert client/service séparables |
| P3 | **[Confirmé dans le code]** état liste local au montage, focus/visibilité/saison déclenchent le GET complet ; partage client absent | Restaurer recherche/filtres/tri/page/position et partager une requête en cours ; rafraîchir une fois par événement utile. Évaluer ensuite un snapshot client borné et invalidé par session/permissions/saison/mutation. Bénéfice UX et réseau attendu, fréquence actuelle inconnue | moyen à élevé si données conservées ; risque de données périmées ou visibles après révocation | protocole navigateur retour/focus/multi-onglets ; aucun cache sensible persistant au départ, effacement logout/changement session ; revert de la couche client |

P1 et P2 sont des optimisations internes. P3 sépare la restauration d'état d'interface et l'éventuel cache de données, ce dernier restant à concevoir. Un écran « affiliations successives / athlète suivant » serait une **évolution fonctionnelle**, à valider métier ; ce n'est pas une exigence déduite de cet audit.

## Backlog complémentaire

| Sujet | Impact attendu / preuve | Effort / risque | Validation avant décision |
|---|---|---|---|
| Préparer les catégories d'âge une fois par requête | CPU possible : map/filter/sort des catégories par athlète dans `resolveAthleteAgeCategory` | moyen / règles chevauchantes et dates | dates limites, catégories chevauchantes, stable-sort, benchmark isolé |
| Indexer les licences par athlète/saison dans l'éligibilité | CPU possible : find/filter/sort des licences pour chaque candidat | moyen / sélection du numéro précédent | doublons, ordre égal, saisons, renouvellement collectif équivalent |
| Référentiels affiliations ciblés par kind, au moment utile | réponse actuellement générique pour toutes les familles | faible à moyen / droits des lectures territoriales | conserver route par défaut, comparer options et comportement consultation/édition |
| Double chargement initial licences | `load()` choisit seasonId puis effet charge la saison : mécanisme confirmé, trafic réel inconnu | faible / saison choisie et état initial | Network/initiator avant/après, bonne synthèse à la première ouverture |
| Conversion Sheets répétée / cache objet brut versionné | confirmée même sur cache cellules chaud ; coût à isoler | élevé / invalidation et mélange de périmètres | profiler conversion seule ; cache brut immuable uniquement puis scope courant, tests courses mutation/lecture |
| Dashboard, compétitions, documents, équipes nationales | agrégations/jointures globales confirmées ; aucun classement CPU récent accessible | variable / usages différents | obtenir fenêtres comparables, ne pas optimiser une route sur seul nombre de logs |
| Cache partagé régional | non présent ; pas de besoin mesuré démontré | élevé / confidentialité, invalidation multi-instance | décision différée : P1/P2 puis mesure, aucun ajout de dépendance |

## Hypothèses, décisions et questions ouvertes

- **[Décision]** Optimiser d'abord le travail individuel inutile ; ne pas raccourcir les vérifications d'accès ni la confirmation d'une écriture.
- **[Hypothèse]** Le parcours affiliation représente une part importante du CPU actuel. Usage intensif communiqué, mais proportions liste/fiche/licences/affiliations et coût réel inconnus.
- **[Hypothèse]** focus + visibilitychange peuvent rapprocher deux rechargements ; mécanismes présents, pas de preuve d'un doublon facturé en production. React peut regrouper les updates ; abort ne prouve pas l'annulation serveur.
- **[Question]** Combien de retours restaurent le composant liste avec Next 16.2.0 et le navigateur utilisé ? La conservation réelle d'état/scroll n'a pas été observée.
- **[Question]** Quels TTL effectifs, taux de cache chaud, nombre d'instances, volumes affiliations/licences, proportions d'onglets consultés et fréquence des mutations ? Non mesurés ici.
- **[Décision]** Aucun recours aux requêtes CPU refusées « Observability Plus is required for this query », aucun changement d'offre.
- **[Prochaine action]** Examiner le diff P1 local et ses résultats avant une éventuelle autorisation de publication. P2/P3 restent proposées et ne sont pas incluses dans ce correctif.
