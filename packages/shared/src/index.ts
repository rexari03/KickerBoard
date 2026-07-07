export const APP_NAME = "KickerBoard";

export type MatchMode = "ONE_VS_ONE" | "TWO_VS_TWO";

export type UserRole = "USER" | "ADMIN";

export type TournamentStatus = "ACTIVE" | "ARCHIVED";

export type TournamentParticipantRole = "PLAYER" | "MANAGER";

export type MatchStatus =
  | "PENDING_CONFIRMATION"
  | "PENDING_COUNTER_CONFIRMATION"
  | "COMPLETED"
  | "CANCELLED";

export type TeamSide = "A" | "B";
