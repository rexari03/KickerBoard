# KickerBoard

Intelligentes Scoreboard zum Erfassen, Auswerten und Vergleichen von Kicker-Ergebnissen.

## Produktziel

KickerBoard soll Spielern erlauben, sich mit eigenen Login-Daten anzumelden, Spiele einzutragen und Rankings sowie persönliche Statistiken einzusehen. Admins sollen Spieler verwalten und fehlerhafte Ergebnisse korrigieren koennen.

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
- Match erfassen
- Match-Historie ansehen
- Ranking ansehen
- Persoenliche Statistiken ansehen

### Admin-Funktionen

- Spieler anlegen, bearbeiten und deaktivieren
- Ergebnisse korrigieren oder loeschen
- Spielmodi konfigurieren

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
- saisonale Rankings
- Formkurve und Serien

## Datenmodell

Voraussichtliche Kern-Entities:

- User
- PlayerProfile
- Match
- MatchParticipant
- Season
- RatingSnapshot
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
