# ErasmusMatch — Batch 3 source audit (2026-10-30)

This batch verifies official catalog and registration rules, **not** a completed scrape of every university's course/ECTS records. Do not treat course availability as guaranteed or infer missing ECTS.

## WU Vienna
- Incoming course catalog: https://www.wu.ac.at/en/incoming-students/exchange-semester/academics/course-catalog/
- Current winter 2026 availability: https://www.wu.ac.at/en/incoming-students/exchange-semester/academics/available-courses-winter-semester-2026
- Official incoming catalog links individual courses to syllabi and schedules. Winter 2026/27 appears in catalog; spring 2027 is not yet confirmed in the available catalog evidence.
- Available-course list was last updated 2026-10-20 and does not guarantee a seat. Do not use availability alone as proof of enrollment.
- Per-course ECTS: **not verified in this batch**.

## Prague University of Economics and Business (VSE)
- Official source: https://exchange.vse.cz/students/accepted-students/course-registration/
- Fall 2026 course list is linked; provisional Spring 2027 list expected in November 2026 (not yet confirmed published as of this audit).
- Individual syllabi in InSIS public course catalog.
- Spring 2027 preregistration dates: 2027-01-04 to 2027-01-26.
- Exchange students must pre-register; course allocation is subject to capacity and registration procedures.
- VSE says students should choose at least 15 ECTS for preregistration; this is **not** a replacement for the separate AUEB Learning Agreement requirement.
- At most 2 intensive courses per semester.
- Courses outside the student's normal level require approvals from lecturer and home university and available capacity.
- Per-course ECTS: **not verified in this batch**.

## Data modeling implications
- Fields: institution_id, course_code, title, ects (nullable), academic_year, term (winter/spring), level, language, syllabus_url, source_url, verification_status, checked_at, incoming_access, enrollment_guaranteed (false unless documented), registration_notes.
- Home AUEB courses are not filtered by destination term; destination courses must be filtered by confirmed term.
- Never conflate course-offering, registration eligibility, seat availability, academic equivalence, and official recognition.
- This batch adds verified policy/catalog evidence, not invented course rows.
