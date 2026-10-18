# Registre des versions, mesures et limites

Édition du 19 octobre 2026 Europe/Paris (UTC+02:00). Ne pas remplacer les lignes historiques : ajouter une nouvelle observation datée avec son SHA et son protocole. Les données ci-dessous sont agrégées, sans noms, IDs métier, cookies, valeurs d'environnement ni contenu de classeur.

## Provenance Git / production

| Statut | Référence | Source / date et portée |
|---|---|---|
| Observé en production | `dc467a62d747cc13cb5c7a561216f1ac50b14bdb`, `dpl_H9WAncS6iWwnyvJHNjapafWt75nH`, READY, iad1 | MCP get_alias + get_deployment, audit 18 octobre UTC / 19 octobre Paris ; ready `2026-10-18T21:18:25.129Z` ; alias saas-febaco.vercel.app |
| Observé en production lors de la publication précédente | `b1b481ba155c91004a44f7d6c3c74c4939b9a1bc`, `dpl_Bfy5ZmM1QmEuZMo53wo51ogsbysf` | ready `2026-10-18T21:09:25.170Z` ; harmonisation acteurs **et** projection déjà incluse. Ne pas décrire la publication comme un déploiement exclusivement view=table |
| Référence vérifiée précédemment, ancêtre du code courant | `4375438db107f49b44b7d8cbf4459412de54a5f2`, `dpl_CTtpK4ak6YWW8fXA9EbrKfzvxSkQ` | correctif CPU individuel ; date de création de ce déploiement `2026-10-18T13:02:56.175Z` d'après les métadonnées lues précédemment, pas l'heure d'observation utilisateur |
| Confirmé dans Git | `23fa79a`, `880f675`, `143a392`, `4375438`, `b1b481b`, `dc467a6` | chaîne conservée ; Collator, licences/saison, nettoyage env, filtre individuel, acteurs/projection, suppression qualité |
| Confirmé dans Git | `a17459e8e4a3acb331463eab8414b1e603c2fe58`, branche perf/athletes-table-projection | patch isolé poussé auparavant ; huit fichiers identiques à ceux intégrés dans b1b481b. Son déploiement preview n'est pas la référence production |
| Confirmé dans le code local | workspace principal HEAD `880f675`, modifications nombreuses ; worktree audit HEAD `dc467a6` | la comparaison audit/production repose sur le worktree, pas sur l'état sale du workspace. Ne pas publier la totalité des modifications locales |

## Historique communiqué — fenêtres non comparables

| Statut | Source | Valeur | Date/période/environnement et limite |
|---|---|---|---|
| Communiqué par l'utilisateur | captures Vercel décrites dans la demande | FEBACO ≈97 % du CPU équipe ; fonctions ≈95 % du CPU FEBACO | captures non relues ici, bornes/version/mix trafic inconnus |
| Communiqué par l'utilisateur | ancien relevé /api/athletes | 541 appels, 30 min CPU | période et ratio liste/fiche inconnus ; environnement exact non revalidé |
| Communiqué par l'utilisateur | nouveau relevé /api/athletes | 220 appels, 5 min CPU | mêmes limites ; pas une expérience contrôlée |
| Calcul indicatif sur données communiquées | 1800/541 et 300/220 | ≈3,33 s puis ≈1,36 s par appel ; écart relatif ≈59 % | valide seulement si chaque couple CPU/compteur décrit la même sélection ; aucune causalité isolée ni économie mensuelle déduite |
| Communiqué par l'utilisateur | activité affiliations | ≈6 000 →14 000 en une semaine, 6 000 issus sauvegarde | contexte métier, pas comptage vérifié ; dimensions utilisées comme scénarios synthétiques |

L'[audit dashboard du 17 octobre](../audits/vercel-cpu-dashboard-2026-10-17.md) conserve ses 3 invocations/2,22 s communiqués et les deux requêtes CSV de 7 030/6 547 ms. Ces durées écoulées incluent attente/concurrence, ce ne sont pas des CPU individuels. Le SHA de son CSV était non vérifié ; ne pas l'assimiler au déploiement courant.

## Volume Athlètes — historique local conservé

**[Mesuré localement lors de l'intervention view=table]** `2026-10-18T19:19:18.869Z` (21:19 Paris), code de référence 4375438 + patch projection, reconstruction en lecture seule du jeu fédéral via configuration Sheets locale. 26 199 lignes, 44 champs →13 présents (clé __key optionnelle non présente dans ce jeu).

| Sérialisation | Complète | Table | Réduction locale |
|---|---:|---:|---:|
| JSON UTF-8 | 23 245 074 octets | 6 414 390 octets | 72,41 % |
| gzip niveau 6 | 1 025 408 | 579 259 | 43,51 % |
| Brotli qualité 4 | 944 860 | 539 242 | 42,93 % |

Nombre/ordre/valeurs retenues/enveloppe identiques lors de cette mesure. Aucun nouveau chargement réel de classeur pour le présent audit. Source : rapport local de l'intervention et [script reproductible](../../scripts/measure-athlete-table-response.ts). Ce n'est ni une capture HTTP authentifiée en production, ni le taux de compression CDN effectivement servi, ni une économie CPU Vercel mesurée. La projection est terminale ; normalisations/enrichissements de liste restent exécutés.

## Nouvelle baseline synthétique des parcours individuels

**[Mesuré localement]** `2026-10-18T22:02:05.540Z` (19 octobre 00:02:05 Paris), SHA dc467a6, Node 24.16.0 / ICU 78.3, win32. [Échantillons et métadonnées complets](mesures-synthetiques-2026-10-19.json). [Script](../../scripts/diagnose-affiliation-processing.ts) : 26 199 acteurs synthétiques, 100 équipes, trois populations affiliation/licence ; 3 échauffements et 9 passages par scénario ; aucune requête concurrente dans ce processus, aucune lecture Google, aucune mutation. Contrôle d'égalité exacte de la réponse entre passages et du nombre de lectures logiques.

| Service publié, filtre un athlète | Population synthétique | Lignes retournées | Lectures logiques | JSON réponse, octets | Médiane écoulée ms | Médiane CPU processus ms |
|---|---:|---:|---:|---:|---:|---:|
| affiliations | 6 000 | 1 | 7 | 524 | 12,95 | 16 |
| affiliations | 14 000 | 1 | 7 | 524 | 19,22 | 16 |
| affiliations | 28 000 | 2 | 7 | 1 041 | 43,60 | 94 |
| licences | 6 000 | 1 | 10 | 484 | 5,63 | 0 |
| licences | 14 000 | 1 | 10 | 484 | 9,45 | 0 |
| licences | 28 000 | 2 | 10 | 972 | 23,20 | 31 |

Inclus : services réels, index, enrichissement, filtres et tri. Exclus du chronométrage : génération des jeux, conversion cellules Sheets, construction du scope/auth, réseau Google, sérialisation HTTP, navigateur. Volumes synthétiques mesurés séparément après traitement. CPU process.cpuUsage de Windows est grossier/bruité : **0 ms ne signifie pas absence de consommation**, et la médiane CPU peut dépasser la durée écoulée (threads/GC/background). Les p95 à neuf passages ne sont pas des SLA. Aucun gain avant/après n'est affirmé : aucune optimisation proposée implémentée dans ce diagnostic. Aucun RSS attribué à une seule requête.

Le résultat établit une baseline qui croît avec les populations ; le constat map avant filtre vient du code. Il ne prouve pas la part de CPU de ces services dans l'ensemble FEBACO. Les 28 000 licences synthétiques ne constituent pas un comptage réel ni une prévision de croissance.

## Surfaces production accessibles pendant cet audit

**[Observé en production — surface de logs]** CLI Vercel 64.5.0, projet/équipe/déploiement explicitement ciblés :

| Lecture | Fenêtre UTC | Résultat et limites |
|---|---|---|
| requêtes récentes, limit 100 | 2026-10-18 21:57:53 →22:02:53 | 0 records, hasMore false, pas d'intervalle exclu annoncé ; pas de classement des routes possible |
| runtime error/fatal, limit 20 | 2026-10-18 21:58:48.508 →22:03:48.508 | 0 records, hasMore false ; fenêtre courte potentiellement sans activité, pas preuve d'absence globale d'erreurs |

Aucune requête CPU avancée ni commande métrique Observability Plus retentée. La rétention courte suffit à ces lectures mais pas à un audit de consommation hebdomadaire. Ne pas inférer zéro invocation facturée à partir de zéro record retourné.

**[Mesuré localement]** Tests existants exécutés sur le worktree publié : 79/79 succès (affiliations, licences, territorial, guard/security, projection API/UI, Sheets/quota, tri et catégorie fiche). Fixtures synthétiques, pas exercice d'un compte fédéral/ligue/entente réel. La suite complète antérieure affichait trois échecs Ligue préexistants ; elle n'a pas été relancée pour attribuer une régression à ce travail documentaire.

**[Observé en production]** Vérification sans session terminée à `2026-10-18T22:08:12Z` : les six GET API (table, défaut, détail inconnu, affiliations acteur inconnu, référentiels affiliations, historique licences acteur inconnu) répondent 401 ; `/dashboard/athletes` répond 307. Aucun corps métier enregistré. Alias revérifié ensuite : même déploiement dc467a6. Cela vérifie le refus anonyme, pas les permissions d'une session réelle.

**[Vérifié localement]** `npm run typecheck` terminé avec code 0 pour le dépôt et le nouveau diagnostic ; tous les liens Markdown locaux du dossier résolus ; diff applicatif et dépendances vide par rapport à dc467a6. Sources applicatives inchangées : aucun nouveau build lancé pour cet audit documentaire. 79 tests ciblés réussis. Aucun push ni déploiement.

**[Non réalisé à la fin de l'audit initial]** Navigation authentifiée, comptage Network réel des étapes, HAR expurgé, mesure de volumes affiliations réels, profil CPU actif Vercel par route, tests de charge, écriture métier de test. Aucun navigateur disponible. Les trois priorités étaient encore proposées à ce stade ; l'intervention P1 ultérieure est enregistrée ci-dessous.

## Intervention P1 — filtrage avant enrichissement

### Références et périmètre

**[Observé en production]** Avant l'intervention, get_alias/get_deployment confirment encore `dc467a62d747cc13cb5c7a561216f1ac50b14bdb`, READY, `dpl_H9WAncS6iWwnyvJHNjapafWt75nH`, alias saas-febaco.vercel.app. Worktree isolé `C:/Users/HP/AppData/Local/Temp/febaco-affiliations-p1`, branche `perf/affiliations-filter-before-enrichment`, créé depuis ce SHA ; aucun changement du workspace principal. Le canevas est repris du commit documentaire local `18c2f38`, historiques et mesures initiales conservés.

**[Confirmé dans le code]** Seul fichier applicatif modifié : `lib/affiliations.ts` (4 insertions, 1 suppression). `actorId` compare déjà `clean(row[config.actor])` dans la vue finale : le même prédicat est appliqué aux lignes autorisées avant map. Le critère n'est ni trimé ni mis en minuscules par le service, comme avant ; critère vide/falsy → population inchangée. Les lectures et index sont conservés avant cette sélection ; filtres dérivés et tri final restent identiques. La relecture de confirmation et la branche create idempotente appellent ce chemin sans modification de `mutateAffiliation`.

Commit local d'implémentation : `9cb58263219acc93d6a0e449b2f7048d9865aa5e`, [diff applicatif conservé](p1-application.patch). Le commit documentaire suivant ne change pas ce code. Aucun commit n'est poussé.

La [baseline figée](../../tests/fixtures/affiliations-before-p1.ts) est identique au blob publié `21264d5770105407f26d3bb25d48c58d4dc45212` (vérifié par git hash-object avec les filtres du chemin d'origine). Empreintes SHA-256 des sources réellement chronométrées : avant `72dd7b29d5ab28fe5d34626ddac40f82575e3183a243b96dc883a6e6780ab150`, après `7a58d7371dd18efcb144297df7a7a9612cf5b21d793d1dddbba0ea7dbb07c52e`. L'empreinte byte-à-byte dépend des fins de lignes ; le blob Git vérifie la baseline indépendamment de cette différence.

Les caches/invalidation, droits, routes/enveloppes, règles de mutation, licences et navigation ne sont pas modifiés. Les trois optimisations Athlètes publiées restent intactes. La recherche ID système non publiée demeure dans son worktree séparé : elle n'est ni écrasée ni intégrée à P1. Pas de lecture/écriture métier en production pendant l'implémentation.

### Équivalence et travail évité

**[Vérifié localement]** [Tests P1](../../tests/affiliations-p1.test.ts) : comparaison exacte des JSON avant/après, erreurs normalisées (message/code/status/fields), séquence de lectures et flags fresh. Matrice de 4 familles ×6 scopes (fédéral, L1/L2, E1/E2/E3) ×13 filtres, plus assertions explicites sur affiliations croisées et ordre des doublons ; fixtures avec feuille vide, acteur/équipe/champs manquants, statut inconnu, espaces/casse, filtres combinés directs/dérivés et ID inconnu. Les fonctions réelles buildScopeIndex/scopeReadRows sont utilisées sur sources synthétiques injectées, pas sur des comptes de production.

Confirmations : create, update partiel, create idempotent sans écriture supplémentaire, tentative de réaffectation, chevauchement, date invalide et écriture non confirmée comparées pour les quatre familles. Compteurs d'enrichissement injectés **uniquement dans les tests compilés**, absents de l'application et du benchmark. Avec un critère actorId, après = nombre de lignes de cet acteur dans le scope, avant = population autorisée entière. Sans critère, même population ; aucun match/feuille vide = 0 après. Aucune erreur source n'est masquée lorsque le filtre ne trouve rien.

### Mesures appariées

**[Mesuré localement]** `2026-10-18T22:22:24.369Z` (19 octobre 00:22:24 Paris), Node 24.16.0 / ICU 78.3, Windows, source dc467a6 + diff P1. [Échantillons complets](mesures-p1-2026-10-19.json), [benchmark](../../scripts/benchmark-affiliations-p1.ts). Trois paires d'échauffement, neuf paires mesurées à ordre alterné, mêmes objets d'entrée par paire ; 20 appels par échantillon ciblé pour atténuer la granularité CPU, 3 pour le contrôle sans filtre. Aucune autre requête dans le processus. Réponses sérialisées strictement égales et sept lectures logiques par appel dans les deux variantes.

Inclus : services compilés sans sondes, index, enrichissement, filtres, tri et sérialisation JSON de l'enveloppe affiliations. Exclus : réseau Google, conversion des cellules complètes, garde/scope de requête, HTTP/navigateur et mutations. Jeu : 26 199 acteurs synthétiques, 100 équipes, populations affiliation 6k/14k/28k ; ce ne sont pas des comptages de production. Les temps ne sont pas comparables directement à la baseline initiale de ce registre (autre protocole, compilation et sérialisation incluse ici).

| Population | Affiliations retournées / enrichies après | Médiane écoulée avant → après, ms | Réduction écoulée locale | Médiane CPU processus avant → après, ms | Réduction CPU locale |
|---|---:|---:|---:|---:|---:|
| 6 000 | 1 /1 | 30,48 →5,17 | 83,02 % | 29,70 →5,45 | 81,65 % |
| 14 000 | 1 /1 | 46,10 →3,99 | 91,34 % | 47,60 →5,45 | 88,55 % |
| 28 000 | 2 /2 | 74,29 →4,14 | 94,43 % | 84,40 →4,70 | 94,43 % |

Avant, 6 000/14 000/28 000 affiliations enrichies pour ces consultations. Après, il reste un scan des lignes et des index acteurs/structures complets : ce n'est pas un accès Sheets par ID.

| Contrôle | Population | Écoulée médiane avant → après, ms | CPU processus médian avant → après, ms |
|---|---:|---:|---:|
| ID inconnu, 0 résultat | 6 000 | 34,20 →6,06 | 34,35 →5,50 |
| ID inconnu, 0 résultat | 14 000 | 37,06 →3,92 | 46,15 →3,90 |
| ID inconnu, 0 résultat | 28 000 | 71,67 →4,37 | 76,55 →4,65 |
| Sans filtre, toute la population | 6 000 | 49,56 →51,10 | 46,67 →47,00 |
| Sans filtre, toute la population | 14 000 | 54,44 →56,55 | 57,33 →57,33 |
| Sans filtre, toute la population | 28 000 | 115,24 →114,56 | 125,00 →135,67 |

**Limites et résultats défavorables conservés :** aucun gain constant sans filtre ; écoulée +3,11 %/+3,87 %/−0,59 %, CPU jusqu'à +8,53 % sur le contrôle 28k. Ce contrôle conserve tout l'enrichissement ; sa variation ne prouve ni bénéfice ni absence de tout surcoût. Pas de répétition sélective destinée à améliorer les chiffres. Les compteurs CPU Windows sont de résolution limitée ; le lot atténue mais n'élimine pas les erreurs de quantification, GC et travail de fond du runtime. CPU processus peut dépasser durée écoulée. Aucun CPU d'un processus concurrent n'est attribué à une requête.

Les confirmations de mutation bénéficient du même chemin optimisé, mais leur gain total (validation, lecture fresh, écriture et confirmation) **n'est pas benchmarké** : seuls équivalence et compteurs ont été vérifiés. Aucun gain Vercel, économie mensuelle, suppression de lectures Sheets ou amélioration de cache revendiqué. Aucun push/déploiement.

### Contrôles de livraison

Suite complète exécutée : 313 tests, 310 succès, 3 échecs Ligue. Les mêmes 3 échecs ont été reproduits séparément sur dc467a6 non modifié (`ligue-athlete-indicator`, `ligue-detail-ville`, `team-name-refresh` ; 5 tests dont 2 succès). Pas de régression attribuée à P1 sur ces fichiers. Après ajout explicite de la feuille vide à la matrice, 42/42 tests ciblés réussis (P1, affiliations, territorial et auth guard/security).

`npm run typecheck` : code 0. `npm run build -- --webpack` avec plafond local Node 4 Go : code 0, compilation, TypeScript intégré et 47 pages générées. Le premier build avait compilé puis signalé une annotation absente dans le tableau d'échantillons du benchmark ; elle a été corrigée, puis TypeScript et le build relancés avec succès. Correction uniquement typée, service mesuré et ses empreintes inchangés ; pas de nouvelle mesure sélective.

Liens du canevas et git diff --check validés. Comparaison avec dc467a6 : seul fichier applicatif modifié `lib/affiliations.ts` ; aucun changement dans app/components, auth, Sheets/cache, licences, saison, actors, Collator ou projection Athlètes. L'alias production a été revérifié en fin d'intervention : toujours `dpl_H9WAncS6iWwnyvJHNjapafWt75nH`. Aucun contrôle navigateur authentifié, aucune mesure CPU Vercel, aucune écriture métier ni publication.

## Intégration combinée du 19 octobre 2026 — validation avant publication

Cette livraison réunit P1 et des changements fonctionnels, dont la recherche par ID système masqué et les changements Compétitions déjà implémentés. Les mesures appariées P1 ci-dessus restent historiques et inchangées. Aucun gain CPU Vercel isolé de P1 ne peut être déduit des mesures globales de cette publication ; aucune requête Observability Plus n'est relancée.

Sur la base distante `dc467a6`, intégration `release/p1-app-current` : suite complète 319 tests, 316 réussites et 3 échecs ; tests ciblés P1/identification/projection/permissions/Compétitions : 133/133 réussis. Les trois échecs Ligue/Club sont reproduits sur `dc467a6` non modifié (5 tests, 2 réussites et 3 échecs). Il s'agit de `ligue-athlete-indicator`, `ligue-detail-ville` et `team-name-refresh`. Pas de nouvelle régression détectée. TypeScript et build sont consignés après leur résultat final dans le canevas.

Aucune écriture métier de production ni nouveau benchmark n'a été nécessaire pendant l'intégration. Les nouvelles vérifications de publication seront distinguées des observations historiques ; le déploiement antérieur de retour arrière reste `dpl_H9WAncS6iWwnyvJHNjapafWt75nH`.
