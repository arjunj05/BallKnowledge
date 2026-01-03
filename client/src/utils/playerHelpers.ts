import type { PlayerId } from "shared";

export function getOtherPlayer(playerId: PlayerId | null): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}

export function isMyTurn(awaitingAction: PlayerId | null, playerId: PlayerId | null): boolean {
  return awaitingAction === playerId;
}
