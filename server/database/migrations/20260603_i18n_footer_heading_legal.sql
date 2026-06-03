-- 20260603_i18n_footer_heading_legal.sql
--
-- Adds the missing `footer.heading_legal` UI translation key.
--
-- The public SiteFooter renders four column headings. Three of them
-- (Product / Company / Support) were seeded as i18n keys in
-- 20260316_i18n_phase2_nav_footer_keys.sql, but the "Legal" heading was
-- left hardcoded in the component. SiteFooter.tsx now resolves it via
-- t('footer.heading_legal') for consistency, so the key must exist or the
-- heading falls back to the humanized key ("Heading Legal").
--
-- Seeds en + el/ru/ro/ka to match the language coverage of the sibling
-- footer.heading_* keys. SAFE TO RE-RUN: INSERT IGNORE skips duplicates.

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('en', 'footer.heading_legal', 'Legal', 'footer'),
('el', 'footer.heading_legal', 'Νομικά', 'footer'),
('ru', 'footer.heading_legal', 'Правовая информация', 'footer'),
('ro', 'footer.heading_legal', 'Juridic', 'footer'),
('ka', 'footer.heading_legal', 'იურიდიული', 'footer');
