-- Hospital.tags: text(콤마구분) → jsonb I18nText 변환. 기존 값은 한국어(ko)로 보존.
ALTER TABLE "Hospital"
  ALTER COLUMN "tags" TYPE JSONB USING jsonb_build_object('ko', COALESCE("tags", ''), 'en', '', 'zh', '', 'ja', ''),
  ALTER COLUMN "tags" SET DEFAULT '{}';
