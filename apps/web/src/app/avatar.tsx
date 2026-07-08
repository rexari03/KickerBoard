"use client";

import { useEffect, useState } from "react";

type AvatarProps = {
  displayName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-11 w-11",
  lg: "h-16 w-16"
};

export function Avatar({ displayName, avatarUrl, size = "sm" }: AvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const initial = displayName.slice(0, 1).toUpperCase();

  useEffect(() => {
    setHasImageError(false);
  }, [avatarUrl]);

  if (avatarUrl && !hasImageError) {
    return (
      <img
        alt=""
        className={`${sizeClasses[size]} shrink-0 rounded-full object-cover`}
        src={avatarUrl}
        onError={() => setHasImageError(true)}
      />
    );
  }

  return (
    <span
      className={`${sizeClasses[size]} grid shrink-0 place-items-center rounded-full bg-[#2f6f4e] font-extrabold text-white`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
