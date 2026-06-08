"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteHospital } from "@/app/admin/hospital-actions";

export default function DeleteHospitalButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm(`'${name}' 병원을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    const res = await deleteHospital(id);
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      alert("삭제 실패: " + (res.error ?? "알 수 없는 오류"));
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="text-sm text-red-500 px-2 disabled:opacity-50"
    >
      {busy ? "삭제 중..." : "삭제"}
    </button>
  );
}
