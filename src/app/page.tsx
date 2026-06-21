import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTestUserSelectorEnabled } from "@/lib/test-users";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    if (isTestUserSelectorEnabled()) {
      redirect("/test-users");
    }

    redirect("/dashboard");
  }

  redirect("/login");
}
