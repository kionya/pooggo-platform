-- CreateTable
CREATE TABLE "CompetitorKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "monthlySearchVol" INTEGER NOT NULL,
    "relatedContentCnt" INTEGER NOT NULL,
    "competitorAdCnt" INTEGER NOT NULL,
    "avgViewCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "monthlySearchVol" INTEGER NOT NULL,
    "parentKeywordId" TEXT NOT NULL,

    CONSTRAINT "RelatedKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorContent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL,
    "url" TEXT,
    "thumbnailUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "keywordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "hospitalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPerformance" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "adSpend" INTEGER NOT NULL,
    "conversions" INTEGER NOT NULL,
    "cac" INTEGER NOT NULL,
    "conversionRate" DOUBLE PRECISION NOT NULL,
    "roi" DOUBLE PRECISION NOT NULL,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedurePerformance" (
    "id" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "revenue" INTEGER NOT NULL,
    "patientCount" INTEGER NOT NULL,
    "repeatRate" DOUBLE PRECISION NOT NULL,
    "trendPct" DOUBLE PRECISION NOT NULL,
    "aiRecommendation" TEXT,
    "periodMonth" INTEGER NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcedurePerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorKeyword_keyword_key" ON "CompetitorKeyword"("keyword");

-- AddForeignKey
ALTER TABLE "RelatedKeyword" ADD CONSTRAINT "RelatedKeyword_parentKeywordId_fkey" FOREIGN KEY ("parentKeywordId") REFERENCES "CompetitorKeyword"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorContent" ADD CONSTRAINT "CompetitorContent_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "CompetitorKeyword"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdChannel" ADD CONSTRAINT "AdChannel_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPerformance" ADD CONSTRAINT "AdPerformance_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "AdChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedurePerformance" ADD CONSTRAINT "ProcedurePerformance_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
