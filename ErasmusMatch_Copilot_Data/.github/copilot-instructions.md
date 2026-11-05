# ErasmusMatch AUEB — Copilot rules

- App: React/Vite, mobile-first. Existing tabs Explore, Matches, Saved, Profile; do not break them or tests.
- Work sequentially: (1) official partner catalog discovery for all 46 rows, (2) extraction of courses, ECTS and semester, (3) only then potential AUEB equivalencies.
- Read `README.md` and `data/catalogs/catalog_master.csv` before making changes. Partner data is not course data.
- Never invent URLs, ECTS, syllabus, language, semester, eligibility, or approvals. Represent unknown explicitly and preserve official source URL and verification timestamp.
- Filter host courses STRICTLY by student's selected Erasmus semester, academic year, exchange access, degree level and language. Winter-only must never appear for spring and vice versa. Unknown semester must never be marked confirmed.
- Student can choose any eligible AUEB course not passed yet, including owed/failed or future semester courses, subject to coordinator approval.
- AUEB Learning Agreement should cover >=30 ECTS at host and >=30 ECTS at AUEB separately; validate each, not a combined total. Coordinator approves official recognition; algorithms only suggest potential matches.
- Distinguish source discovery, catalog verification, course verification, and proposed equivalency with separate statuses.
- Historical sample/candidate course CSVs are NOT approved or complete datasets. Do not load them as verified production matches.
- Add automated tests for semester restrictions, unknown ECTS, unknown availability, 30+30 threshold, and pending approval.
- For every added source, record university Erasmus code, academic year, term, official URL, last checked date and any exchange restrictions.
- Before code edits, describe files changed and preserve existing project conventions. Do not replace project package.json or unrelated app files.
