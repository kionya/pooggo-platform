"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveText } from "@/lib/i18n/text";
import { compareHospitalsByTier } from "@/lib/hospital/tier";
import { auth } from "@/auth";
import { canWriteReview } from "@/lib/reviews/access";
import { validateReviewInput } from "@/lib/reviews/validation";

// 1. 상담 신청 저장하기
export async function createConsultation(formData: FormData) {
  const phone = formData.get("phone") as string;
  const content = formData.get("content") as string;
  const customerName = (formData.get("customerName") as string) || "익명 고객";
  
  if (!phone) return;

  try {
    await db.consultation.create({
      data: {
        phone,
        content,
        customerName,
      },
    });
    revalidatePath("/admin");
  } catch (error) {
    console.error("상담 신청 에러:", error);
  }
  
  redirect("/");
}

// 2. 병원 목록 가져오기 (안전 모드)
export async function getHospitals() {
  try {
    const hospitals = await db.hospital.findMany({
      where: { isPublished: true },
    });
    return hospitals
      .map((h) => ({
        id: h.id,
        name: resolveText(h.name, "ko"),
        location: `${h.city}, ${h.district}`,
        tags: h.tags || "",
        rating: h.rating,
        reviews: h.reviews,
        image: h.image || "",
        desc: resolveText(h.intro, "ko"),
        tier: h.tier,
        nameI18n: h.name,
        introI18n: h.intro,
      }))
      .sort(compareHospitalsByTier);
  } catch (error) {
    console.error("병원 목록 로딩 실패:", error);
    return [];
  }
}

// 3. 병원 상세 정보 가져오기 (상세 페이지용)
export async function getHospitalById(id: string) {
  try {
    const hospital = await db.hospital.findUnique({
      where: { id },
      include: {
        userReviews: { orderBy: { createdAt: 'desc' } },
        doctors: true,
        menus: true,   // 👈 ⭐ 이 줄이 없으면 가격표가 절대 안 나옵니다! 꼭 확인하세요!
      },
    });
    return hospital;
  } catch (error) {
    console.error("상세 정보 로딩 실패:", error);
    return null;
  }
}

// 4. 리뷰 작성하기 (로그인 필수, 계정 귀속)
export async function addReview(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  const session = await auth();
  if (!canWriteReview(session?.user?.role)) {
    return { ok: false, errors: ["로그인이 필요합니다."] };
  }

  const hospitalId = String(formData.get("hospitalId") || "");
  const rating = Number(formData.get("rating") || 0);
  const content = String(formData.get("content") || "");

  const errors = validateReviewInput({ rating, content });
  if (errors.length) return { ok: false, errors };

  const userName = session!.user.name || session!.user.email?.split("@")[0] || "회원";

  try {
    await db.review.create({
      data: { hospitalId, userName, rating, content: content.trim(), authorUserId: session!.user.id },
    });
    revalidatePath(`/hospitals/${hospitalId}`);
  } catch (error) {
    console.error("리뷰 작성 실패:", error);
    return { ok: false, errors: ["후기 등록에 실패했습니다."] };
  }
  return { ok: true, errors: [] };
}

