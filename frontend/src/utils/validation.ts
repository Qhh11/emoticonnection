/**
 * Validation utilities.
 */

/**
 * Validate email format.
 * TODO: Implement email validation
 */
export function isValidEmail(email: string): boolean {
  // TODO: Use regex to validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength.
 * TODO: Implement password validation
 */
export function isValidPassword(password: string): boolean {
  // TODO: Check minimum length (e.g., 8 characters)
  // TODO: Check for required character types
  return password.length >= 8;
}

/**
 * Validate username format.
 * TODO: Implement username validation
 */
export function isValidUsername(username: string): boolean {
  // TODO: Check length and allowed characters
  return username.length >= 3 && username.length <= 20;
}

/**
 * Validate post content.
 * TODO: Implement content validation
 */
export function isValidPostContent(content: string): boolean {
  // TODO: Check minimum and maximum length
  return content.trim().length > 0 && content.length <= 5000;
}
