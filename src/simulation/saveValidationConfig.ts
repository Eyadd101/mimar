/** Limits for untrusted browser saves, independent of gameplay balance. */
export const saveValidationConfig = {
  maximumSaveCharacters: 250_000,
  maximumSavedNumber: 1_000_000_000_000,
  maximumPositionMagnitude: 1_000_000,
  maximumResourceNameLength: 128,
  maximumResources: 9,
  maximumConnections: 16,
  maximumInventory: 6,
  maximumFailureIds: 16,
  maximumMessageVariables: 8,
  maximumVariableNameLength: 64,
} as const
