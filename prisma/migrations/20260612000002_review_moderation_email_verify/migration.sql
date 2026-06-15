-- 후기 모더레이션(Review.isHidden + Report) + 이메일 인증 토큰(User)

-- AlterTable: Review 소프트숨김
ALTER TABLE "Review" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: User 인증 토큰
ALTER TABLE "User" ADD COLUMN "emailVerifyToken" TEXT,
ADD COLUMN "emailVerifyExpires" TIMESTAMP(3);

-- CreateTable: Report
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_reviewId_reporterUserId_key" ON "Report"("reviewId", "reporterUserId");
CREATE INDEX "Report_reviewId_idx" ON "Report"("reviewId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
