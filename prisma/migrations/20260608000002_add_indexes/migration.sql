-- 인덱스 추가: FK(hospitalId) + 리스트 필터(city/category, isPublished)
-- CreateIndex
CREATE INDEX "Doctor_hospitalId_idx" ON "Doctor"("hospitalId");

-- CreateIndex
CREATE INDEX "Hospital_city_category_idx" ON "Hospital"("city", "category");

-- CreateIndex
CREATE INDEX "Hospital_isPublished_idx" ON "Hospital"("isPublished");

-- CreateIndex
CREATE INDEX "Menu_hospitalId_idx" ON "Menu"("hospitalId");
