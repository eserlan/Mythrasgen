export function tryOpenCharacter(
  id: string,
  selectCharacter: (id: string) => boolean,
  onOpen: () => void,
): string {
  try {
    if (!selectCharacter(id)) {
      return "This character could not be selected. It may have been removed. Please refresh the library and try again.";
    }
    onOpen();
    return "";
  } catch (error) {
    return error instanceof Error ? `Could not open this character: ${error.message}` : "Could not open this character.";
  }
}
