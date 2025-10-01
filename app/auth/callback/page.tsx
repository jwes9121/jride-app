"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthCallback() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          alert("Authentication failed");
          return;
        }

        if (data?.session) {
          console.log("✅ User session:", data.session);
          router.push("/"); // Redirect back to homepage after login
        }
      } catch (err) {
        console.error("Unexpected callback error:", err);
      }
    };

    handleCallback();
  }, [router, supabase]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg">Finishing login...</p>
    </div>
  );
}
