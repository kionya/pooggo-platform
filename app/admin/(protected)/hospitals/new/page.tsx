import HospitalForm from "@/components/admin/HospitalForm";
import { emptyHospitalInput } from "@/lib/hospital/empty";

export default function NewHospitalPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6">새 병원 등록</h1>
      <HospitalForm mode="create" initial={emptyHospitalInput()} />
    </div>
  );
}
