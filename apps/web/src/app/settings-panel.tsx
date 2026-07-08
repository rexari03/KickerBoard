"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Avatar } from "./avatar";
import type { AuthUser } from "./auth-panel";

export function SettingsPanel() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  useEffect(() => {
    void loadUser();
  }, []);

  async function loadUser() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/auth/me`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Account konnte nicht geladen werden.");
      }

      const nextUser = (await response.json()) as AuthUser;
      setUser(nextUser);
      setDisplayName(nextUser.displayName);
      setAvatarUrl(nextUser.avatarUrl ?? "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Account konnte nicht geladen werden."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const normalizedAvatarUrl = normalizeAvatarUrlInput(avatarUrl);

      if (normalizedAvatarUrl) {
        const isValidAvatarImage = await canLoadImage(normalizedAvatarUrl);

        if (!isValidAvatarImage) {
          setAvatarUrl(normalizedAvatarUrl);
          throw new Error(
            "Der Avatar-Link muss direkt auf eine Bilddatei zeigen. Alternativ kannst du das Bild als Datei hochladen."
          );
        }
      }

      const response = await fetch(`${apiUrl}/auth/me`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          displayName,
          avatarUrl: normalizedAvatarUrl
        })
      });

      if (!response.ok) {
        throw new Error("Account konnte nicht gespeichert werden.");
      }

      const nextUser = (await response.json()) as AuthUser;
      setUser(nextUser);
      setDisplayName(nextUser.displayName);
      setAvatarUrl(nextUser.avatarUrl ?? "");
      setMessage("Account gespeichert.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Account konnte nicht gespeichert werden."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Bitte eine Bilddatei auswählen.");
      return;
    }

    if (file.size > 500_000) {
      setError("Das Avatar-Bild darf maximal 500 KB groß sein.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsChangingPassword(true);
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== newPasswordConfirmation) {
      setPasswordError("Die neuen Passwörter stimmen nicht überein.");
      setIsChangingPassword(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/auth/me/password`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(
          payload?.error === "invalid current password"
            ? "Das aktuelle Passwort ist nicht korrekt."
            : "Passwort konnte nicht geändert werden."
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setPasswordMessage("Passwort geändert.");
    } catch (changeError) {
      setPasswordError(
        changeError instanceof Error
          ? changeError.message
          : "Passwort konnte nicht geändert werden."
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border border-[#d5ddd1] bg-white p-4 sm:p-6">
        <p className="m-0 text-[#667064]">Account wird geladen...</p>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <form
        className="grid min-w-0 gap-5 rounded-lg border border-[#d5ddd1] bg-white p-4 sm:p-6"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-1.5">
          <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">Profil</p>
          <h2 className="m-0 min-w-0 break-words text-xl font-extrabold sm:text-2xl">
            {user?.email}
          </h2>
        </div>

        <div className="flex items-center gap-4 rounded-lg border border-[#e2e8df] bg-[#fbfcfa] p-3">
          <Avatar
            avatarUrl={avatarUrl || null}
            displayName={displayName || user?.displayName || ""}
            size="lg"
          />
          <div className="min-w-0">
            <strong className="block truncate">
              {displayName || user?.displayName}
            </strong>
            <small className="block truncate text-[#667064]">
              {avatarUrl ? "Avatar-Bild aktiv" : "Initialen werden angezeigt"}
            </small>
          </div>
        </div>

        <label className="grid gap-2 font-bold">
          <span>Anzeigename</span>
          <input
            className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
            minLength={2}
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>

        <label className="grid gap-2 font-bold">
          <span>Avatar-Bild</span>
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] file:mr-3 file:rounded-md file:border-0 file:bg-[#265c42] file:px-3 file:py-2 file:font-bold file:text-white focus:border-[#2f6f4e] focus:outline-3"
            type="file"
            onChange={handleAvatarFileChange}
          />
        </label>

        <label className="grid gap-2 font-bold">
          <span>Avatar-Bild URL</span>
          <input
            className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
            inputMode="url"
            type="url"
            value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            onBlur={() => setAvatarUrl((current) => normalizeAvatarUrlInput(current))}
            placeholder={
              avatarUrl.startsWith("data:")
                ? "Lokales Bild ausgewählt"
                : "https://example.com/avatar.jpg"
            }
          />
        </label>

        {avatarUrl ? (
          <button
            className="min-h-11 w-full cursor-pointer rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-5 py-3 font-extrabold text-[#172018] sm:w-fit"
            type="button"
            onClick={() => setAvatarUrl("")}
          >
            Avatar entfernen
          </button>
        ) : null}

        <button
          className="min-h-11 w-full cursor-pointer rounded-lg bg-[#265c42] px-5 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-65 sm:w-fit"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Speichert..." : "Speichern"}
        </button>

        {message ? (
          <p className="m-0 font-bold text-[#2f6f4e]">{message}</p>
        ) : null}
        {error ? <p className="m-0 font-bold text-[#9f2f24]">{error}</p> : null}
      </form>

      <form
        className="grid min-w-0 gap-5 rounded-lg border border-[#d5ddd1] bg-white p-4 sm:p-6"
        onSubmit={handlePasswordSubmit}
      >
        <div className="grid gap-1.5">
          <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">
            Sicherheit
          </p>
          <h2 className="m-0 text-2xl font-extrabold">Passwort ändern</h2>
        </div>

        <label className="grid gap-2 font-bold">
          <span>Aktuelles Passwort</span>
          <input
            autoComplete="current-password"
            className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
            minLength={12}
            required
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>

        <label className="grid gap-2 font-bold">
          <span>Neues Passwort</span>
          <input
            autoComplete="new-password"
            className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
            minLength={12}
            required
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Mindestens 12 Zeichen"
          />
        </label>

        <label className="grid gap-2 font-bold">
          <span>Neues Passwort wiederholen</span>
          <input
            autoComplete="new-password"
            className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
            minLength={12}
            required
            type="password"
            value={newPasswordConfirmation}
            onChange={(event) => setNewPasswordConfirmation(event.target.value)}
          />
        </label>

        <button
          className="min-h-11 w-full cursor-pointer rounded-lg bg-[#265c42] px-5 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-65 sm:w-fit"
          disabled={isChangingPassword}
          type="submit"
        >
          {isChangingPassword ? "Ändert..." : "Passwort ändern"}
        </button>

        {passwordMessage ? (
          <p className="m-0 font-bold text-[#2f6f4e]">{passwordMessage}</p>
        ) : null}
        {passwordError ? (
          <p className="m-0 font-bold text-[#9f2f24]">{passwordError}</p>
        ) : null}
      </form>
    </div>
  );
}

function normalizeAvatarUrlInput(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.startsWith("data:image/")) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);
    const forwardedUrl = url.searchParams.get("url");

    if (url.hostname.endsWith("google.com") && forwardedUrl) {
      return forwardedUrl;
    }

    return url.toString();
  } catch {
    return trimmedValue;
  }
}

function canLoadImage(src: string) {
  return new Promise<boolean>((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve(false), 5000);

    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(true);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(false);
    };
    image.src = src;
  });
}
