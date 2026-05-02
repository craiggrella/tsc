import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <Link href="/login">
        <img
          src="/images/shuman-logo.svg"
          alt="The Shuman Company"
          className="w-auto max-w-[400px] sm:max-w-[500px] cursor-pointer"
        />
      </Link>
    </div>
  );
}
