-- Standardize public contact email to info@orthodoxmetrics.com (was support@)

UPDATE translations_source
SET english_text = 'info@orthodoxmetrics.com',
    updated_at = NOW()
WHERE translation_key IN ('contact.info1_value', 'contact.info1_detail')
  AND english_text = 'support@orthodoxmetrics.com';

UPDATE ui_translations
SET translation_text = 'info@orthodoxmetrics.com'
WHERE translation_key IN ('contact.info1_value', 'contact.info1_detail')
  AND translation_text = 'support@orthodoxmetrics.com';

UPDATE translations_localized
SET translated_text = 'info@orthodoxmetrics.com',
    updated_at = NOW()
WHERE translation_key IN ('contact.info1_value', 'contact.info1_detail')
  AND translated_text = 'support@orthodoxmetrics.com';
