export const TITLE_MIN_LENGTH = 5;
export const TITLE_MAX_LENGTH = 80;
export const DESCRIPTION_MIN_LENGTH = 20;
export const DESCRIPTION_MAX_LENGTH = 2000;

export type TitleDescriptionValidationResult = {
  normalizedTitle: string;
  normalizedDescription: string;
  titleError: string | null;
  descriptionError: string | null;
};

function normalize(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateTitleAndDescription(
  title: string | null | undefined,
  description: string | null | undefined
): TitleDescriptionValidationResult {
  const normalizedTitle = normalize(title);
  const normalizedDescription = normalize(description);

  let titleError: string | null = null;
  if (normalizedTitle.length < TITLE_MIN_LENGTH) {
    titleError = `Title must be at least ${TITLE_MIN_LENGTH} characters.`;
  } else if (normalizedTitle.length > TITLE_MAX_LENGTH) {
    titleError = `Title must be at most ${TITLE_MAX_LENGTH} characters.`;
  }

  let descriptionError: string | null = null;
  if (normalizedDescription.length < DESCRIPTION_MIN_LENGTH) {
    descriptionError = `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters.`;
  } else if (normalizedDescription.length > DESCRIPTION_MAX_LENGTH) {
    descriptionError = `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`;
  }

  return {
    normalizedTitle,
    normalizedDescription,
    titleError,
    descriptionError,
  };
}
