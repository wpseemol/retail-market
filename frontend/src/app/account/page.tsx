import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AccountProfile from "@/components/account/AccountProfile";

/**
 * Account page reads the Auth.js httpOnly cookie on the server.
 * No client “Loading account…” wait — middleware already requires login.
 */
export default async function AccountPage() {
  const session = await auth();
  const user = session?.backendUser;

  if (!user || session.error === "RefreshTokenError") {
    redirect("/login");
  }

  return <AccountProfile initialUser={user} />;
}
