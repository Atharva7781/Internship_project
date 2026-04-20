"use client";

import { useRouter } from "next/navigation";
import { deleteForm } from "@/app/actions";
import { useState } from "react";

export default function DeleteFormButton({ formId }: { formId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (loading) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this form?");
    if (!confirmDelete) return;
    setLoading(true);
    const res = await deleteForm(formId);
    if (res.success) {
      router.push("/teacher-dashboard");
    } else {
      alert(res.message || "Failed to delete form");
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white shadow-sm hover:bg-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
        {loading ? "sync" : "delete"}
      </span>
      Delete Form
    </button>
  );
}

