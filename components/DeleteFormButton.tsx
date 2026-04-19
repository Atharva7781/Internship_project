"use client";

import { useRouter } from "next/navigation";
import { deleteForm } from "@/app/actions";

export default function DeleteFormButton({ formId }: { formId: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this form?");
    if (!confirmDelete) return;
    const res = await deleteForm(formId);
    if (res.success) {
      router.push("/teacher-dashboard");
    } else {
      alert(res.message || "Failed to delete form");
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="mb-4 px-4 py-2 bg-red-600 text-white rounded"
    >
      Delete Form
    </button>
  );
}

