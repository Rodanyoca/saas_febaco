# Médias FEBACO

Le dossier Drive canonique est `MEDIAS` (`1JcriwiWNAn2lRKO7vQNp6wGBjgXC1y6B`). Il contient :

- `AVATAR` (`10Qiw5NzAJK1wv2jAPxYhAI29RbsIBMWr`) et ses sous-dossiers par type d’acteur ;
- `LOGO CLUB` (`1NMS2f9Qt5MGzlBQnZ6N7bKmmFT-M8KRD`) pour les logos des clubs.

Variables à configurer dans Vercel :

```text
GOOGLE_DRIVE_CLUB_LOGO_FOLDER_ID=1NMS2f9Qt5MGzlBQnZ6N7bKmmFT-M8KRD
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_DRIVE_REFRESH_TOKEN=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
GOOGLE_SHEETS_STRUCTURE_ID=12LqY0pqxuGns5Imc3kI2X2_aMYzu4Je3bUxUnjmfp7Q
```

Les cinq variables Google/OAuth et Sheets existent déjà pour les avatars et la structure territoriale. Seule `GOOGLE_DRIVE_CLUB_LOGO_FOLDER_ID` est nouvelle si ces variables sont déjà configurées.

Le fichier est nommé `LOGO_CLUB_<ID_CLUB>.<extension>`. Une modification remplace le contenu du fichier Drive existant lorsque `logo_drive_id` est présent. La feuille `CLUBS` conserve seulement `logo_drive_id` et `logo_drive_url`.
