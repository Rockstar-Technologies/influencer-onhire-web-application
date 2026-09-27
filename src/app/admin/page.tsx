import { redirect } from "next/navigation";

// No dashboard yet; User Management is the admin landing page until one exists.
export default function Page() {
  redirect("/admin/users");
}
