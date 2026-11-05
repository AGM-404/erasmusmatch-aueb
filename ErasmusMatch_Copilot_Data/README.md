# ErasmusMatch AUEB — Research data for GitHub Copilot

This is a **research starter dataset, NOT a completed verified course database**. Use with the React/Vite ErasmusMatch project.

## Required sequence
1. **Catalog discovery:** cover every row in `data/catalogs/catalog_master.csv`, verify university-specific OFFICIAL sources for 2026–2027, separately winter/spring. Do not treat a generic Erasmus page as a confirmed course catalog.
2. **Course extraction:** after catalog discovery, populate `data/courses/host_courses_template.csv` with official course codes, title, actual ECTS, semester, language, Bachelor eligibility, syllabus and provenance. Unknown != available.
3. **Potential matches:** only after extraction, compare eligible host courses to AUEB curriculum and produce *proposals*, not approved equivalencies.

## Contents
- `data/raw/`: original 46 partnership rows, 45 distinct Erasmus codes, plus historical semester audit.
- `data/catalogs/catalog_master.csv`: consolidated 46-row tracker derived from previous batches. **Catalog URLs have not all been revalidated in this run.**
- `data/catalogs/catalog_discovery_*.csv`: historical batch findings (may overlap).
- `data/courses/`: earlier samples/candidates (some ECTS missing) and blank verified extraction template. **Do not import samples as production verified records without reviewing sources.**
- `data/matches/`: blank proposed match template.
- `docs/`: historical batch notes.
- `.github/copilot-instructions.md`: instructions for GitHub Copilot.
- `scripts/validate_data.py`: schema, URL, duplicate, and integrity checks.

## React course import

The React app's validated course import schema is in `src/data/courseData.js`. Import a JSON array, `{ "courses": [...] }`, or CSV with the columns in `data/courses/host_courses_template.csv`. Use `current_verified`, `historical` or `unverified_candidate`; a current record requires positive ECTS, language, separate explicit Bachelor and exchange eligibility, HTTPS catalog and syllabus URLs, and an ISO `source_checked_at` timestamp.

Import validation checks structure and declared provenance; it does not independently authenticate a university website or certify the data. The backend/data maintainer must verify official sources before assigning `current_verified`. The React frontend does not scrape partner sites.

## Authoritative AUEB sources
- Partners: https://www.dept.aueb.gr/sites/default/files/mbc/ME_KinitikotitaSpoudes2026.2027.pdf
- Curriculum: https://www.dept.aueb.gr/el/mbc_courses
- Erasmus regulation: https://www.dept.aueb.gr/sites/default/files/mbc/Κανονισμός_ΠρόγραμμαERASMUS%2BΚινητικότηταΣΠΟΥΔΕΣ_17.01.25.pdf

## Using with VS Code
Copy the **contents** of this folder into your React/Vite project's root (merge `.github`, do not replace existing files). Run the data validation script and import only reviewed, source-backed rows through the React course-data importer. Never silently infer ECTS or course availability.

Run `python scripts/validate_data.py` in the project root.
