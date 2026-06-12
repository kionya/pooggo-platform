-- Review에 작성자 계정 연결(authorUserId) 추가 — 기존 익명 후기는 NULL 유지(하위호환)

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "authorUserId" TEXT;

-- CreateIndex
CREATE INDEX "Review_authorUserId_idx" ON "Review"("authorUserId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
