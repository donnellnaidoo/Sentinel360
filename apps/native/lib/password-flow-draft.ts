let resetDraft: { email: string; code: string } | null = null;
let currentPasswordDraft = "";

export function setPasswordResetDraft(email: string, code: string) {
  resetDraft = { email, code };
}

export function getPasswordResetDraft() {
  return resetDraft;
}

export function clearPasswordResetDraft() {
  resetDraft = null;
}

export function setCurrentPasswordDraft(password: string) {
  currentPasswordDraft = password;
}

export function getCurrentPasswordDraft() {
  return currentPasswordDraft;
}

export function clearCurrentPasswordDraft() {
  currentPasswordDraft = "";
}
