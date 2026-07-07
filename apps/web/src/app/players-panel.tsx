"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Player = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: "PLAYER" | "ADMIN";
    createdAt: string;
  };
};

type FormState = {
  displayName: string;
  email: string;
};

const initialFormState: FormState = {
  displayName: "",
  email: ""
};

export function PlayersPanel() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  useEffect(() => {
    void loadPlayers();
  }, []);

  async function loadPlayers() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/players`);

      if (!response.ok) {
        throw new Error("Spieler konnten nicht geladen werden.");
      }

      const nextPlayers = (await response.json()) as Player[];
      setPlayers(nextPlayers);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Spieler konnten nicht geladen werden."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/players`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          displayName: form.displayName,
          email: form.email
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? "Spieler konnte nicht angelegt werden.");
      }

      setForm(initialFormState);
      await loadPlayers();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Spieler konnte nicht angelegt werden."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="players-layout" aria-label="Spielerverwaltung">
      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="section-heading">
          <p className="eyebrow">Spieler</p>
          <h2>Neuen Spieler anlegen</h2>
        </div>

        <label className="field">
          <span>Name</span>
          <input
            required
            minLength={2}
            name="displayName"
            value={form.displayName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                displayName: event.target.value
              }))
            }
            placeholder="z. B. Calvin"
          />
        </label>

        <label className="field">
          <span>E-Mail</span>
          <input
            required
            name="email"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                email: event.target.value
              }))
            }
            placeholder="calvin@example.com"
          />
        </label>

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Speichert..." : "Spieler speichern"}
        </button>

        {error ? <p className="error-message">{error}</p> : null}
      </form>

      <section className="panel list-panel">
        <div className="section-heading">
          <p className="eyebrow">Roster</p>
          <h2>Aktive Spieler</h2>
        </div>

        {isLoading ? <p className="muted">Spieler werden geladen...</p> : null}

        {!isLoading && players.length === 0 ? (
          <p className="muted">Noch keine Spieler angelegt.</p>
        ) : null}

        <ul className="player-list">
          {players.map((player) => (
            <li className="player-row" key={player.id}>
              <span className="player-avatar" aria-hidden="true">
                {player.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>{player.displayName}</strong>
                <small>{player.user.email}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
