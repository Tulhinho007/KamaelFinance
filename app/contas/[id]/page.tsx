"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function BankAccountPageRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const id = params?.id;
    if (id) {
      router.replace(`/contas?adjust=${id}`);
    } else {
      router.replace("/contas");
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19]">
      <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="font-medium">Redirecionando para Contas Correntes...</p>
      </div>
    </div>
  );
}
