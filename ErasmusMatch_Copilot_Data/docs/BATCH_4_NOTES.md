# ErasmusMatch — Batch 4 audit (2026-10-30)

This batch creates a **semester-by-semester audit for every existing partner row** in the official partner table, and records 15 WU Bachelor English Marketing course candidates from the official incoming catalog. **It does not claim to have crawled every course at every partner.**

- `university_semester_audit.csv`: one row per partner agreement and term, with explicit missing-data fields.
- `wu_winter_course_candidates.csv`: 15 course titles and codes visible in the WU incoming catalog; ECTS are blank until syllabus verification. Check semester availability and actual seat allocation before presenting as selectable.
- Previously collected `verified_courses_batch_2.csv`: Paris Dauphine examples; these are not AUEB equivalencies.

Official sources checked:
- https://www.wu.ac.at/en/incoming-students/exchange-semester/academics/course-catalog/
- https://www.wu.ac.at/en/incoming-students/exchange-semester/academics/available-courses-winter-semester-2026
- https://exchange.vse.cz/students/accepted-students/course-registration/

The WU winter 2026/27 catalog is listed, while the Spring 2027 offering is not confirmed; VSE lists Fall 2026 and says a provisional Spring 2027 list is expected in November. Course offerings, ECTS, registration access, seat availability and academic recognition are separate facts.

**Matching is intentionally deferred** until catalog and ECTS verification is complete. Home AUEB courses may be selected regardless of home semester if not already passed; destination courses must be offered in the selected Erasmus semester.
