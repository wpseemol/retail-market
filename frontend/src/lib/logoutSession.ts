import { logoutAction } from "@/app/actions/auth";
import { logout as clearClientAuth } from "@/store/authSlice";
import type { AppDispatch } from "@/store/store";

/** Server Action clears httpOnly cookies; then wipe Redux auth state. */
export async function logoutSession(dispatch: AppDispatch) {
  try {
    await logoutAction();
  } catch {
    // Still clear client state if the action fails.
  }
  dispatch(clearClientAuth());
}
