# Authentification FEBACO : adaptation FEVOCO et bascule

État du lot : 16 octobre 2026. Seul FEBACO est modifié. Aucun déploiement, aucune migration ni purge des comptes réels n'est effectué par ce lot. Les commandes `plan` et l'inspection du classeur sont en lecture seule.

## Écarts vérifiés avant adaptation

| Sujet | FEBACO historique | FEVOCO et adaptation FEBACO |
| --- | --- | --- |
| Mot de passe | Comparaison directe de la colonne historique `password` | scrypt v1, paramètres strictement vérifiés, politique 12–128 caractères |
| Session | Cookie signé portant e-mail/rôle/rattachements, 12 h | Cookie signé portant uniquement identifiant, version et instants, 8 h |
| Révocation | Pas de contrôle du compte après émission du cookie | Statut, version, expiration temporaire et autorisations recontrôlés |
| Permissions | Rôle fédéral pour les mutations ; contrôles territoriaux partiels en lecture | ADMIN/VIEWER + affectations explicites AUT-SPT/AUT-ADM + périmètre territorial FEBACO |
| Superadministration | Aucun modèle distinct | Aucun rôle historique n'est automatiquement promu |
| Tentatives | Compteur en mémoire | Tentatives persistées et pseudonymisées, blocage progressif FEVOCO |
| Journaux | Absence de journal d'authentification homogène | Connexion, changement du secret, déconnexion, demandes/résultats des mutations |
| Protection des écritures | Contrôles variables selon la route | Garde commune de session, droits, périmètre et origine, puis validations métier existantes |

Les feuilles réelles `USERS`, `USER_AUTORISATIONS`, `AUTH_TENTATIVES` et `JOURNAL_OPERATIONS` ont été lues. Les en-têtes correspondent au schéma annoncé. `ROLES` est conservée, sans recours à cette feuille pour accorder des droits nouveaux.

## Comptes historiques et périmètres

Les trois comptes ont des champs d'authentification nouveaux vides. Le format historique est celui comparé en clair par l'ancien login ; les trois valeurs nécessitent une réinitialisation selon la politique actuelle. Aucun secret, hash ou e-mail de ces comptes n'a été imprimé.

| id_user conservé | Ancien rôle | Profil prévu | Périmètre conservé dans USERS |
| --- | --- | --- | --- |
| 1 | federal | ADMIN, superadministrateur FALSE | Aucun rattachement : niveau fédéral |
| 2 | ligue | VIEWER, superadministrateur FALSE | id_ligue `1` |
| 3 | entente | VIEWER, superadministrateur FALSE | id_ligue `1`, id_entente `101` |

Les structures réelles portent `01` et `0101`. La résolution autorise une équivalence numérique avec zéros initiaux seulement lorsqu'elle identifie une ligne unique et respecte le parent. Les valeurs de USERS ne sont jamais réécrites. Si plusieurs lignes correspondent, l'accès est refusé. Aucun rapprochement par nom ou approximation n'est utilisé.

Les rôles connus reçoivent les blocs historiques déjà utilisés AUT-SPT et AUT-ADM. AUT-COM n'est pas ajouté faute de fonctionnalité historique correspondante. Un profil inconnu, un parent incohérent ou une correspondance ambiguë reçoit zéro affectation et reste BLOQUE. Les comptes ligue/entente restent en lecture seule même si leur type est changé en ADMIN sans modification explicite du périmètre.

Les contrôles de lecture filtrent structures, acteurs affiliés, affiliations, licences, activités et documents rattachés au périmètre avant les présentations métier. Une licence d'athlète doit appartenir à une affiliation du périmètre. Les arbitres/autres acteurs sans rattachement territorial démontré ne sont pas automatiquement visibles aux profils territoriaux. Les catalogues globaux de compétitions et d'équipes nationales conservent leur consultation historique avec le bloc sportif ; cela n'accorde pas de nouvelle permission d'écriture. Les corrections des anciens retours d'acteurs globaux doivent être validées avec les représentants des trois profils.

## Sessions, caches et instances Vercel

- Les anciens cookies sont rejetés par le nouveau format strict ; aucun fallback au mot de passe ou au rôle historiques dans l'application.
- USERS et USER_AUTORISATIONS sont lus par lot puis indexés par identifiant/e-mail/utilisateur. Cache local de 10 secondes depuis le début de la lecture, déduplication en vol, aucune prolongation sur erreur.
- Chaque requête vérifie signature, expiration du cookie, statut, session_version, accès temporaire, droits et dates des affectations. Les échéances déjà chargées sont comparées au temps courant à chaque requête.
- Les écritures de comptes/droits par l'adaptateur invalident immédiatement l'instance locale. Les autres instances n'ont pas de bus d'invalidation : elles observent le changement au plus tard à l'expiration de leur snapshot de 10 secondes, puis attendent une nouvelle lecture. Une lecture dépassant cette fenêtre est refusée. Les requêtes déjà autorisées ne sont pas annulées rétroactivement.
- Après expiration du cache, une source inaccessible entraîne un refus (503), pas une autorisation fondée indéfiniment sur d'anciens droits. Les lectures d'authentification ont un timeout 15 s, sans retry SDK ni fallback périmé.
- Les relations territoriales utilisent le cache métier existant (2 minutes par défaut, configurable). Une modification d'affiliation dans Sheets peut donc prendre ce délai pour modifier la visibilité d'un acteur. Ce délai est distinct des 10 secondes pour la révocation du compte ou d'un bloc d'autorisation.
- La déconnexion efface le cookie et augmente session_version pour révoquer les copies de sessions du compte. Si la source est indisponible, le cookie local est toujours supprimé ; la réponse indique que la révocation serveur n'a pas été confirmée.

## Protections réutilisées et limites vérifiées

Les fonctions de hash, signature, politique de mot de passe, autorisation, pseudonymisation, tentatives et mapping par en-têtes proviennent de FEVOCO. L'adaptateur FEBACO réutilise les clients Google existants et écrit uniquement les cellules nommées ; il préserve lignes vides et colonnes historiques.

Les corps JSON d’authentification sont limités à 8 Kio, y compris en transfert fragmenté. Les réponses JSON ne contiennent aucun mot de passe, hash ou token. Seul le cookie HttpOnly de session transporte le token dans l'en-tête HTTP nécessaire. HTTPS/Secure en production, SameSite=Lax. Les journaux ont une liste blanche de détails primitifs ; aucun corps de requête n'y est stocké.

Une mutation métier nécessite l'écriture de son intention dans le journal avant exécution. Une panne du journal bloque alors la mutation. Si le journal du résultat échoue après une écriture métier, une erreur 503 est retournée mais l'écriture peut avoir eu lieu : contrôler les données avant de réessayer. Sheets ne fournit pas une transaction entre les feuilles métier et le journal.

Le retour automatique à l'ancien hash après une panne du journal FEVOCO n'est pas repris : il pourrait réactiver des sessions révoquées. Une modification du secret confirmée dans USERS n'est pas annulée automatiquement.

Les tentatives persistées sont communes aux instances. Leur lecture puis écriture ne constitue toutefois pas un compteur atomique distribué : des tentatives simultanées peuvent se chevaucher. Il en va de même pour des modifications administratives simultanées de session_version. Pour des garanties transactionnelles strictes, il faudra une source d'authentification transactionnelle ; aucune fausse garantie n'est annoncée avec Sheets.

## Procédure opérateur : préparer, migrer, valider, purger

1. Configurer les variables de `.env.example` dans l'environnement prévu. AUTH_SECRET (ou l'alias historique AUTH_SESSION_SECRET) et AUTH_TELEMETRY_HMAC_KEY doivent être longs et indépendants. Ne pas copier de secret d'un autre dépôt. Le classeur utilisateurs est `1Lunm88A0nKU3LtZ_4GggPTZ4Oh3BAYpSFMP2XgNZHnU`.
2. Exécuter la simulation :

   `npm.cmd run auth:migrate -- plan`

3. Prévoir une fenêtre sans écritures administratives concurrentes. Générer et conserver hors Git une clé AES indépendante de 64 caractères hexadécimaux dans AUTH_MIGRATION_BACKUP_KEY. Créer le dossier local privé `.auth-backups` et en restreindre l'accès Windows à l'opérateur.
4. Exécuter seulement après validation du plan :

   `npm.cmd run auth:migrate -- apply --backup .auth-backups/avant-migration.enc --confirm MIGRER-FEBACO`

   Le fichier chiffré est créé avant les écritures, avec refus d'écraser un fichier existant. Pour les trois comptes présents, la migration conserve id_user/id_ligue/id_entente et laisse les comptes BLOQUE jusqu'à leur réinitialisation. Le hash aléatoire jeté associé à un compte bloqué n'est pas un mot de passe par défaut utilisable.

   Une conversion d'une ancienne valeur en clair ne serait possible qu'avec `--approve-legacy-clear`, format identifié et politique satisfaite. Un digest inconnu, bcrypt/argon2 non supporté, scrypt mal formé ou valeur faible impose une réinitialisation. Un compte déjà migré valide est ignoré ; une ligne partiellement migrée invalide bloque la reprise pour intervention explicite. Les affectations ont des identifiants déterministes et sont confirmées avant de rendre le compte utilisable.
5. Réinitialiser chaque compte, avec un secret temporaire distinct choisi par l'opérateur et saisi sans écho dans le terminal. Ne jamais fournir ce secret dans les arguments de commande, les logs ou ce document :

   `npm.cmd run auth:migrate -- reset --id 1 --enable --backup .auth-backups/avant-reset-1.enc --confirm REINITIALISER-FEBACO`

   Répéter pour 2 et 3 avec des fichiers de sauvegarde distincts. L'accès temporaire expire en 24 h. Sa communication au titulaire se fait par un canal contrôlé hors application. La variante `--password-stdin` exige une source d'entrée protégée, jamais un `echo` contenant le secret.
6. Relancer `plan`, vérifier les métadonnées migrées et tester la version de préproduction. La nouvelle application n'accepte pas les anciens secrets tant que la migration n'est pas terminée : ne pas déployer avant cette étape. Tester première connexion → activation → déconnexion → reconnexion, puis les droits et refus hors périmètre pour chaque profil.
7. Pour révoquer ou désactiver : commandes `revoke`/`disable`, `--id`, une nouvelle sauvegarde et confirmation `REVOQUER-FEBACO`/`DESACTIVER-FEBACO`. Vérifier dans deux instances que l'accès cesse dans la fenêtre documentée.
8. Après activation réussie et validation explicite, purger compte par compte :

   `npm.cmd run auth:migrate -- purge --id 1 --validated --backup .auth-backups/avant-purge-1.enc --confirm PURGER-HISTORIQUE`

   La purge exige un hash supporté, une connexion enregistrée et un compte dont l'activation n'est plus requise. Elle vide uniquement la colonne sensible `password`. Les colonnes et `role` restent conservées pour traçabilité ; l'application n'en dépend déjà plus. Contrôler la relecture après purge. Les sauvegardes chiffrées restent sensibles : définir leur durée de conservation et détruire la clé et les copies lorsqu'elles ne sont plus nécessaires.

## Retour arrière contrôlé

Avant purge : suspendre les accès et les écritures administratives, conserver la version déployée précédente et les sauvegardes chiffrées. Restaurer explicitement le snapshot :

`npm.cmd run auth:migrate -- restore --from .auth-backups/avant-migration.enc --backup .auth-backups/avant-restauration.enc --confirm RESTAURER-FEBACO`

La restauration retrouve les comptes par id_user et noms de colonnes ; elle ne réattribue pas les lignes à leur position. Elle conserve les journaux et désactive les affectations MIG nouvelles absentes du snapshot. Elle ne supprime pas les autres utilisateurs. Faire tourner explicitement AUTH_SESSION_SECRET dans l’environnement de retour arrière pour ne pas réactiver les anciens cookies de 12 h. Vérifier les rattachements, puis seulement rétablir l'ancienne version de l'application. Les nouveaux cookies ne sont pas compatibles avec l'ancien format.

Après purge, ne pas rétablir implicitement l'authentification en clair : privilégier la correction de la nouvelle version. Une restauration de secrets historiques depuis une sauvegarde serait une opération de sécurité explicite, suivie de leur nouvelle rotation.

## Validation

La suite complète a réussi : 285 tests, aucun échec. Après les derniers ajustements, les 19 tests ciblés ont également réussi ; ils couvrent notamment les deux nouveaux cas de filtrage administratif et de protection du dernier superadministrateur. Le contrôle TypeScript a réussi. `git diff --check` ne signale aucune erreur de contenu.

La compilation de production reste à valider : le premier essai Turbopack a révélé une réexportation de configuration de route incompatible, corrigée dans `auth/session`. L'essai Webpack suivant est resté sans progression pendant plus de vingt minutes et a été interrompu ; aucune réussite de build n'est revendiquée. Le serveur de développement préexistant est conservé.

Les types de routes générés ont aussi révélé un export utilitaire préexistant interdit par Next.js dans l'upload des logos. Cette fonction a été déplacée dans `lib/club-logo-error.ts`, en conservant son comportement ; les quatre tests des logos passent après déplacement. Le journal de cette route n'affiche plus l'objet d'erreur Google.

La simulation du classeur réel est strictement en lecture seule : trois profils valides, identifiants et rattachements conservés, trois réinitialisations requises. Aucun `apply`, `reset`, `purge`, `restore`, déploiement ou écriture de compte réel n'a été exécuté.

Une affectation déjà présente pour un utilisateur et un bloc est conservée, même inactive ou expirée : la migration ne la réactive pas et n'ajoute pas d'affectation concurrente. Le compte rendu du plan décrit les blocs proposés ; vérifier aussi les affectations existantes avant la bascule. Lorsque la date de création historique est absente, la date inscrite correspond à la migration, pas à une date historique reconstituée.

Les changements manuels directement dans Google Sheets ne passent pas par les journaux applicatifs. Leur prise en compte suit la fenêtre du cache documentée ; l'historique Google et une procédure opérateur restent nécessaires pour les tracer.

Tests automatisés : format et signature des sessions, expiration, compte supprimé/désactivé, session révoquée, accès temporaire, grants actifs/expirés, ADMIN/VIEWER, superadministration non implicite, scopes ligue/entente, zéros initiaux et ambiguïtés, mapping avec colonnes réordonnées/lignes vides, cache et deux instances simulées, origine des mutations, pseudonymisation des tentatives, filtre des journaux, couverture des exports HTTP par la garde commune.

Restent à valider après bascule explicite : connexions des trois comptes réels avec leurs nouveaux accès, réception hors application des accès temporaires, matrice métier complète sur préproduction, observation de la révocation entre instances Vercel réelles, comportement sur panne Google et journal après écriture. Aucun compte réel n'est modifié pour fabriquer une preuve de test.

Configuration locale vérifiée sans affichage des valeurs : secret de session de longueur suffisante ; clé de télémétrie indépendante valide et clé de sauvegarde de migration non configurées. Aucun fichier .env existant n’a été modifié.
