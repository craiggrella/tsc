import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
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
        <Image
          src="/images/The Shuman Company Logo.jpeg"
          alt="The Shuman Company"
          width={500}
          height={150}
          className="w-auto max-w-[400px] sm:max-w-[500px] cursor-pointer"
          priority
        />
      </Link>
    </div>
  );
}
