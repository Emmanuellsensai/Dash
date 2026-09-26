---
description: Review a student's day submission from their GitHub repo
argument-hint: <student> <day number>
---

Review the submission for the student and day given here: $ARGUMENTS

1. Get the student's repo link from @students.md, then clone or pull it into repos/<student>/ as described in CLAUDE.md.
2. Read that day's section in @curriculum/curriculum.md (and its teaching note in curriculum/teaching-notes/ if one exists).
3. Find the day's folder in their repo and read every file in it. Report the last commit date for those files.
4. Run the code with node where it is a Node task.
5. Follow the review process, scope rule and output format in CLAUDE.md exactly.
6. Save the review to reviews/<student>/day-XX.md (day padded to two digits).
7. Update progress/<student>.md, including any recurring mistakes.
8. Finish by showing me the MESSAGE TO STUDENT section so I can copy it.
