"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        router.refresh();
      } else if (event === "SIGNED_OUT") {
        router.refresh();
        router.push("/auth/login");
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <>{children}</>;
}
