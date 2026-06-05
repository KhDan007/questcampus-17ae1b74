// Substitute {name} placeholders in step titles/helpers/affirmations with the
// student's first name. Falls back to "there" so copy never reads "Hey {name}!".
export function personalize(text: string, name?: string): string {
  return text.replace(/\{name\}/g, name?.trim() || "there");
}
