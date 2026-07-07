# KickerBoard

Intelligentes Scoreboard zum Erfassen, Auswerten und Vergleichen von Kicker-Ergebnissen.

## Produktziel

KickerBoard soll Spielern erlauben, sich selbst zu registrieren, Turniere zu erstellen, Turnieren per Passwort beizutreten und innerhalb eines Turniers Matches sowie Rankings zu verwalten. Globale Admins verwalten Accounts und Turniere.

## Architekturentscheidung

### Frontend

- Next.js mit App Router
- TypeScript
- Responsive Web UI, optimiert fuer mobile Nutzung am Kickertisch
- Spaeter optional als PWA installierbar

### Backend

Das Backend soll als eigener Service auf dem Homeserver laufen.

Geplante Basis:

- Node.js mit TypeScript
- Fastify oder NestJS
- PostgreSQL als Datenbank
- Prisma als ORM
- Docker Compose fuer lokalen und Homeserver-Betrieb

Empfehlung fuer den Start: Fastify.

Fastify passt gut, wenn das Backend schlank bleiben soll: Auth, Spieler, Matches, Rankings, Admin-Funktionen. NestJS ist sinnvoll, falls sehr frueh viele Module, komplexe Business-Logik, Event-Systeme oder groessere Team-Strukturen erwartet werden. Fuer KickerBoard ist Fastify zum Start pragmatischer und laesst sich sauber strukturieren.

## Geplanter MVP

### Spielerfunktionen

- Login
- Eigenes Spielerprofil
- Turnier erstellen
- Turnier per Passwort beitreten
- Match im Turnier erfassen
- Turnier-Ranking ansehen
- Match-Historie im Turnier ansehen

### Admin-Funktionen

- Accounts verwalten
- Turniere verwalten
- Ergebnisse korrigieren oder loeschen

### Spielmodi

Startumfang:

- 1v1
- 2v2

## Ranking

Erste Version:

- Sieg/Niederlage
- Anzahl Spiele
- Gewinnquote
- erzielte und kassierte Punkte

Spaetere Erweiterung:

- Elo-Rating fuer 1v1
- angepasstes Team-Rating fuer 2v2
- Turnier-Rankings
- Formkurve und Serien

## Datenmodell

Voraussichtliche Kern-Entities:

- User
- Tournament
- TournamentParticipant
- Match
- MatchTeam
- MatchParticipant
- AuditLog

## Deployment-Ziel

Homeserver per Docker Compose:

- Next.js Frontend
- Fastify/NestJS API
- PostgreSQL
- Reverse Proxy, voraussichtlich Caddy
- Datenbank-Backups

## Naechste Schritte

1. Fastify-API fachlich ausbauen
2. Next.js-App fachlich ausbauen
3. PostgreSQL und Prisma einrichten
4. Auth-Konzept umsetzen
5. Match-Erfassung und Ranking-MVP bauen
6. Homeserver-Deployment mit Docker Compose erweitern

## Repository-Struktur

```text
apps/
  web/      # Next.js Frontend
  api/      # Fastify Backend
packages/
  shared/   # gemeinsame Types und Konstanten
```

## Lokale Entwicklung

Nach Installation der Dependencies:

```bash
npm install
npm run dev:web
```

Die API stellt initial `GET /health` bereit.

## Datenbank

Das initiale Prisma-Schema liegt unter `apps/api/prisma/schema.prisma`.

Nach Installation der Dependencies und gestarteter PostgreSQL-Datenbank:

```bash
cp apps/api/.env.example apps/api/.env
docker compose up -d postgres
npm run db:generate
npm run db:migrate
```

Das MVP-Ranking wird pro Turnier aus abgeschlossenen Matches berechnet. Primaere Sortierung ist die Siegquote, ergaenzt um eine Mindestanzahl an Spielen, Siege, Punktedifferenz und Anzahl gespielter Matches als Tie-Breaker.

## API MVP

Initiale Endpunkte:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /tournaments`
- `POST /tournaments`
- `GET /tournaments/:tournamentId`
- `POST /tournaments/:tournamentId/join`
- `GET /tournaments/:tournamentId/matches`
- `POST /tournaments/:tournamentId/matches`
- `GET /tournaments/:tournamentId/rankings`
- `GET /admin/users`

Die Authentifizierung nutzt serverseitige Sessions. Das Session-Token liegt im Browser als `HttpOnly`-Cookie, in der Datenbank wird nur der Hash des Tokens gespeichert.

Einen bestehenden User zum Admin machen:

```bash
npm run auth:set-role --workspace @kicker-board/api -- user@example.com ADMIN
```

Nach Aenderungen am Auth-Schema:

```bash
cd apps/api
npx prisma migrate dev --name add_auth_sessions
```

Beispiel fuer eine Registrierung:

```json
{
  "email": "spieler@example.com",
  "password": "mindestens12",
  "displayName": "Spieler 1"
}
```

Beispiel fuer ein Turnier:

```json
{
  "name": "Freitag Kicker",
  "password": "turnierpasswort"
}
```

Beispiel fuer ein 1v1-Match:

```json
{
  "mode": "ONE_VS_ONE",
  "teams": [
    {
      "side": "A",
      "score": 10,
      "participantIds": ["tournament-participant-id-a"]
    },
    {
      "side": "B",
      "score": 7,
      "participantIds": ["tournament-participant-id-b"]
    }
  ]
}
```
