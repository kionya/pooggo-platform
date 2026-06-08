import HospitalForm, { emptyHospitalInput } from "@/components/admin/HospitalForm";

export default function NewHospitalPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">새 병원 등록</h1>
      <HospitalForm mode="create" initial={emptyHospitalInput()} />
    </div>
  );
}
