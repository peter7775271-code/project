'use client';

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function VerifyContent() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.get("token");

    if (!token) return;

    fetch(`/api/auth/verify?token=${token}`)
      .then(() => {
        alert('Email verified successfully! You can now log in.');
        router.push("/login");
      })
      .catch(() => alert("Verification failed. Please try again."));
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg font-semibold">Verifying your email...</p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <VerifyContent />
    </Suspense>
  );
}
