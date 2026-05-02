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
      <Link href="/login" className="block">
        <img
          src="/images/shuman-logo.svg"
          alt="The Shuman Company"
          width={500}
          height={500}
          className="h-auto w-[200px] sm:w-[240px] cursor-pointer"
        />
      </Link>
    </div>
  );
}
