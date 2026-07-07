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
        credentials: "include",
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
    <section
      className="grid items-start gap-6 md:grid-cols-[minmax(280px,380px)_1fr]"
      aria-label="Spielerverwaltung"
    >
      <form
        className="grid gap-[18px] rounded-lg border border-[#d5ddd1] bg-white p-6"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-1.5">
          <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">Spieler</p>
          <h2 className="m-0 text-xl font-bold">Neuen Spieler anlegen</h2>
        </div>

        <label className="grid gap-2 font-bold">
          <span>Name</span>
          <input
            className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
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

        <label className="grid gap-2 font-bold">
          <span>E-Mail</span>
          <input
            className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
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

        <button
          className="min-h-11 cursor-pointer rounded-lg bg-[#265c42] px-4 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-65"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Speichert..." : "Spieler speichern"}
        </button>

        {error ? <p className="m-0 font-bold text-[#9f2f24]">{error}</p> : null}
      </form>

      <section className="min-h-[272px] rounded-lg border border-[#d5ddd1] bg-white p-6">
        <div className="grid gap-1.5">
          <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">Roster</p>
          <h2 className="m-0 text-xl font-bold">Aktive Spieler</h2>
        </div>

        {isLoading ? (
          <p className="m-0 mt-4 text-[#667064]">Spieler werden geladen...</p>
        ) : null}

        {!isLoading && players.length === 0 ? (
          <p className="m-0 mt-4 text-[#667064]">Noch keine Spieler angelegt.</p>
        ) : null}

        <ul className="mt-4 grid list-none gap-2.5 p-0">
          {players.map((player) => (
            <li
              className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-lg border border-[#e2e8df] bg-[#fbfcfa] p-3"
              key={player.id}
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-full bg-[#2f6f4e] font-extrabold text-white"
                aria-hidden="true"
              >
                {player.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong className="block">{player.displayName}</strong>
                <small className="mt-0.5 block text-[#667064]">
                  {player.user.email}
                </small>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
