-- 주의: 신규 NOT NULL 컬럼에 default 없음 → 비어있는 테이블에서만 적용 가능. 비어있지 않은 환경은 'prisma migrate reset --force' 필요.
-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL,
DROP COLUMN "specialty",
ADD COLUMN     "specialty" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Hospital" DROP COLUMN "desc",
DROP COLUMN "location",
ADD COLUMN     "about" JSONB NOT NULL,
ADD COLUMN     "address" JSONB NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "cautions" JSONB NOT NULL,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "district" TEXT NOT NULL,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "intro" JSONB NOT NULL,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "messengers" JSONB NOT NULL,
ADD COLUMN     "operatingHours" JSONB NOT NULL,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL,
ALTER COLUMN "rating" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'ETC',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'KRW',
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priceText" JSONB NOT NULL,
DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL,
DROP COLUMN "price",
ADD COLUMN     "price" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_slug_key" ON "Hospital"("slug");
