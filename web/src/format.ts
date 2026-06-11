import type { Basis } from "./types";

export function basisLabel(b: Basis): string {
  if (b === "Z") {
    return "Z (+)";
  }
  return "X (\u00d7)";
}
