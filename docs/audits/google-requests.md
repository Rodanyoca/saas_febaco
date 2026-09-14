# Audit et centralisation des requêtes Google — FEBACO

Date de l’audit : 14 septembre 2026. Périmètre : 60 routes API, 45 fichiers client contenant des appels HTTP, tous les services `lib/`, Google Sheets et Google Drive. Aucun classeur, en-tête, mapping métier, droit fonctionnel ni écran n’a été modifié.

## Résultat exécutif

Toutes les requêtes SDK Google passent désormais par deux adaptateurs (`google-sheets.ts`, `google-drive.ts`), une fabrique de clients partagés (`google-clients.ts`) et une passerelle de résilience (`google-request.ts`). L’audit automatique recense 106 appels `fetch` côté application, 30 appels explicites de lecture simple, 7 appels explicites de lecture batch et 12 appels d’écriture. Il ne détecte aucun contournement du point d’entrée Google autorisé.

La cause structurelle des 429/500/503 était la combinaison suivante : nouveau client/authentification à presque chaque opération, grands `Promise.all` transformant une seule requête HTTP en 8 à 17 appels Sheets simultanés, relectures identiques entre routes, absence de retry central et cache unique peu différencié. Les erreurs visibles sur `COMPETITIONS_RESULTATS`, `COMPETITIONS_MATCHS`, `CATEGORIES_AGE` et les équipes nationales sont cohérentes avec ce profil.

## Graphe de dépendances

```text
Pages et composants (106 fetch statiques)
  -> 60 routes /api
    -> services métier (territorial, acteurs, affiliations, licences,
       compétitions, équipes nationales)
      -> readSheetRows / readSheetRowsBatch / écritures par en-têtes
        -> file de micro-batch + cache/coalescence
          -> executeGoogleRequest (retry, jitter, concurrence, métriques)
            -> clients Google partagés
              -> Sheets API / Drive API
```

Les appels `fetch` client restent dirigés vers l’API interne : aucun navigateur ne contacte directement Google. Les pages les plus bavardes statiquement sont le détail club (6), le détail ligue (5), le gestionnaire territorial (5) et la progression d’une compétition (4). Le tableau de bord charge 14 sources métier plus un agrégat unique pour les équipes nationales, avec une concurrence HTTP limitée à 3.

## Inventaire par bloc

| Bloc | Points d’entrée | Sources Sheets/Drive | Profil avant | Profil après à froid |
|---|---|---|---:|---:|
| Authentification | `/api/auth/login`, `/api/auth/me` | `users` | 1 lecture/login | 1, puis cache/coalescence |
| Structure territoriale | ligues, ententes, clubs, équipes, référentiels | `structure`, `referentiel` | jusqu’à 4–8 lectures concurrentes | 1 appel batch par classeur |
| Acteurs | athlètes, coachs, arbitres, officiels, médecins, autres | `acteurs`, `referentiel` | 1–3 | 1 par classeur, cache partagé |
| Affiliations | routes par type + référentiels | `affiliations`, `acteurs`, `structure`, `referentiel` | jusqu’à 8 | 2 batches explicites pour les référentiels ; micro-batch ailleurs |
| Licences | athlètes et entourage | 5 classeurs | 10 lectures | au plus 5 appels batch (un par classeur) |
| Compétitions catalogue | listes/épreuves | `competitions`, `referentiel` | 10 lectures | au plus 2 batch |
| Compétitions structure | phases/groupes | `competitions`, `referentiel` | 9 lectures + retry local | au plus 2 batch, retry central |
| Compétitions jeu | matchs/résultats/classement | `competitions`, `referentiel`, `structure` | 15 lectures | au plus 3 batch |
| Compétitions personnes | participants/intervenants | 5 classeurs | 17 lectures | au plus 5 batch |
| Compétitions distinctions | distinctions et acteurs | 4 classeurs | 16 lectures | au plus 4 batch |
| Équipes nationales | espace unifié | 5 classeurs | plusieurs endpoints et lectures répétées | 1 endpoint client ; 1 batch par classeur, secondaires dégradables |
| Médias | lecture/upload avatar/logo | Drive + ligne Sheets | 2+ appels Drive, clients recréés | clients partagés, appels sérialisés/limités, retry sûr |
| Transferts | supprimé du produit | aucune | absent | absent |
| Activités / documents | aucun module métier dédié trouvé | aucune source dédiée | non implémenté | non inventé |

Les nombres « après » sont des maxima à cache froid pour les appels lancés dans le même tour de boucle. Un cache chaud ramène une lecture identique à zéro appel Google. Le micro-batching est transparent pour les services et leurs règles métier.

## Classeurs et alias

| Alias | Variable | Usage |
|---|---|---|
| `structure` | `GOOGLE_SHEETS_STRUCTURE_ID` | provinces, ligues, ententes, clubs, équipes |
| `referentiel` | `GOOGLE_SHEETS_REFERENTIEL_ID` | listes de référence stables |
| `users` | `GOOGLE_SHEETS_USERS_ID` | authentification |
| `acteurs` | `GOOGLE_SHEETS_ACTEURS_ID` | personnes |
| `affiliations` | `GOOGLE_SHEETS_AFFILIATIONS_ID` | historiques d’affiliation |
| `competitions` | `GOOGLE_SHEETS_COMPETITIONS_ID` | cycle des compétitions |
| `licences` | `GOOGLE_SHEETS_LICENCES_ID` | licences athlètes/entourage |
| `equipeNationale` | `GOOGLE_SHEETS_EQUIPE_NATIONALE_ID` | équipes nationales |

Les identifiants de classeurs déjà présents et leurs fallback historiques sont conservés pour ne pas casser la production. Aucun secret n’est journalisé.

## Politiques techniques

- Clients : instances JWT/OAuth et clients Sheets/Drive mémorisés par processus, au lieu d’être recréés à chaque appel.
- Cache : 15 minutes par défaut pour `referentiel`, 2 minutes pour les données opérationnelles ; invalidation ciblée après écriture ; ancienne valeur utilisable lors d’un quota dépassé.
- Coalescence : deux lectures identiques en vol partagent la même promesse, y compris avec `fresh`; les lectures différentes mais simultanées d’un même classeur sont réunies dans un `batchGet`.
- Batching : `batchGet` pour les lectures groupées et les schémas multi-feuilles ; `batchUpdate` pour les écritures multi-lignes.
- Concurrence : 3 lectures et 1 écriture Google simultanées par instance par défaut.
- Retry : 2 nouvelles tentatives maximum, backoff exponentiel tronqué, jitter complet, respect de `Retry-After`; uniquement lecture ou opération explicitement idempotente.
- Écritures : les mises à jour Sheets ciblent une plage et un identifiant déterministes, donc une répétition ne crée pas de ligne supplémentaire. La création Drive n’est jamais retentée automatiquement. Le verrou d’écriture intra-instance réduit les collisions d’identifiants ; Google Sheets ne fournit toutefois pas de verrou distribué entre plusieurs instances serverless.
- Erreurs : codes normalisés (`QUOTA_EXCEEDED`, `TIMEOUT`, `UNAVAILABLE`, etc.), messages utilisateur sans contenu des réponses Google, causes conservées côté serveur.
- Observabilité : JSON structuré par fournisseur/module/opération, durée, tentative, statut et décision de retry ; métriques en mémoire pour volume, échecs, retries et cache hits/misses/coalescence/stale fallback.

## Configuration

| Variable | Défaut | Borne |
|---|---:|---:|
| `GOOGLE_REQUEST_TIMEOUT_MS` | 10000 ms | timeout SDK |
| `GOOGLE_MAX_RETRIES` | 2 | 0–5 |
| `GOOGLE_RETRY_BASE_DELAY_MS` | 200 ms | 25–5000 |
| `GOOGLE_RETRY_MAX_DELAY_MS` | 2000 ms | jusqu’à 30000 |
| `GOOGLE_READ_CONCURRENCY` | 3 | 1–20 |
| `GOOGLE_WRITE_CONCURRENCY` | 1 | 1–5 |
| `GOOGLE_REFERENTIAL_CACHE_TTL_MS` | 900000 ms | ≥ 0 |
| `GOOGLE_OPERATIONAL_CACHE_TTL_MS` | 120000 ms | ≥ 0 |
| `GOOGLE_REQUEST_LOG_LEVEL` | erreurs seules | `debug` journalise aussi les succès |

## Vérification et exploitation

`npm run audit:google-requests` reproduit l’inventaire et échoue si un appel SDK apparaît hors des adaptateurs. Les tests couvrent 429, 503, `Retry-After`, absence de retry d’une création non idempotente, centralisation, cache/coalescence existants et budgets de concurrence. Avant déploiement, exécuter `npm test`, `npm run lint` et `npm run build`.

Après déploiement, surveiller par opération : appels/minute, ratio cache hit/miss, retries, 429, 5xx, p95/p99. Alerter si les 429 dépassent 1 % sur 5 minutes ou si les retries dépassent 5 % ; revenir au commit précédent si la latence ou les erreurs fonctionnelles régressent. Les TTL et limites de concurrence permettent un ajustement par variables d’environnement sans modifier le code.

## Limites et risques résiduels

- Le cache mémoire est propre à chaque instance serverless ; Redis n’est pas nécessaire pour corriger la rafale actuelle, mais devient pertinent si le nombre d’instances rend le taux global encore trop élevé.
- Les 106 `fetch` sont des occurrences statiques, pas 106 appels par navigation. Plusieurs sont des actions utilisateur exclusives.
- Les grands endpoints historiques renvoient encore des objets agrégés volumineux. Le batching corrige la pression de quota sans changer leurs contrats ; une pagination/agrégation serveur plus poussée peut être menée ultérieurement avec validation métier.
- Les optimisations Next.js supplémentaires (Cache Components) ne sont pas activées, car ce serait un changement global distinct. Voir le rapport de sources primaires associé.

