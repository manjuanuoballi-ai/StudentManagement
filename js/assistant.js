/*
 * Mini offline "AI" assistant.
 * A lightweight natural-language query engine that interprets a question and
 * answers it from the local Store data. No network or API key required.
 */
(function () {
  "use strict";

  const { Students, Courses, Enrollments } = window.Store;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fullName(s) {
    return `${s.firstName} ${s.lastName}`.trim();
  }

  /* ----------------------------- Renderers ------------------------------ */
  function studentList(students) {
    if (!students.length) return `<p class="muted">No matching students.</p>`;
    return `<ul class="ai-list">${students
      .map(
        (s) =>
          `<li><strong>${esc(fullName(s))}</strong> <span class="muted">· ${esc(
            s.email || "no email"
          )} · ${esc(s.status)}</span></li>`
      )
      .join("")}</ul>`;
  }

  function courseList(courses) {
    if (!courses.length) return `<p class="muted">No matching courses.</p>`;
    return `<ul class="ai-list">${courses
      .map(
        (c) =>
          `<li><strong>${esc(c.code)}</strong> ${esc(c.title)} <span class="muted">· ${esc(
            c.instructor || "Staff"
          )}</span></li>`
      )
      .join("")}</ul>`;
  }

  /* ------------------------- Entity extraction -------------------------- */
  function findCourse(text) {
    const courses = Courses.all();
    let found = courses.find((c) => c.code && text.includes(c.code.toLowerCase()));
    if (found) return found;
    found = courses.find((c) => c.title && text.includes(c.title.toLowerCase()));
    if (found) return found;
    // Match on a significant word from the title (length > 3).
    for (const c of courses) {
      const words = (c.title || "").toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      if (words.some((w) => text.includes(w))) return c;
    }
    return null;
  }

  function findStudents(text) {
    const students = Students.all();
    const matches = students.filter((s) => {
      const full = fullName(s).toLowerCase();
      const first = (s.firstName || "").toLowerCase();
      const last = (s.lastName || "").toLowerCase();
      return (
        (full && text.includes(full)) ||
        (first.length > 2 && text.includes(first)) ||
        (last.length > 2 && text.includes(last))
      );
    });
    return matches;
  }

  function enrollmentsView() {
    return Enrollments.all().map((e) => ({
      e,
      student: Students.get(e.studentId),
      course: Courses.get(e.courseId),
    }));
  }

  /* ------------------------------ Intents ------------------------------- */
  function answer(rawQuestion) {
    const q = (rawQuestion || "").trim();
    const text = " " + q.toLowerCase().replace(/[?.!,]/g, " ").replace(/\s+/g, " ") + " ";

    if (!q) {
      return { html: `<p>Ask me something about your students, courses, or enrollments.</p>` };
    }

    const students = Students.all();
    const courses = Courses.all();
    const enrollments = Enrollments.all();

    // Help / greeting
    if (/\b(help|hi|hello|hey|what can you do|examples?)\b/.test(text)) {
      return {
        html: `<p>I can answer questions from your data. Try:</p>${suggestionsHtml()}`,
      };
    }

    const mentionsStudent = /student|people|pupil/.test(text);
    const mentionsCourse = /course|class|subject/.test(text);
    const mentionsEnroll = /enroll|enrolment|enrollment|registered|taking|signed up/.test(text);
    const asksCount = /\b(how many|count|number of|total)\b/.test(text);
    const asksList = /\b(list|show|all|display|who are)\b/.test(text);

    /* ---- Grade lookups ---- */
    const gradeMatch = text.match(/\bgrade[s]?\s+(of\s+)?([a-f][+-]?)\b/);
    if (/\bgrade\b/.test(text) && /\b([a-f][+-]?)\b/.test(text) && !findStudents(text).length) {
      const g = (text.match(/\b([a-f][+-]?)\b/) || [])[1];
      if (g) {
        const rows = enrollmentsView().filter(
          (x) => (x.e.grade || "").toLowerCase() === g
        );
        return {
          html: `<p>Found <strong>${rows.length}</strong> enrollment(s) with grade <strong>${esc(
            g.toUpperCase()
          )}</strong>:</p>${
            rows.length
              ? `<ul class="ai-list">${rows
                  .map(
                    (x) =>
                      `<li><strong>${esc(x.student ? fullName(x.student) : "?")}</strong> — ${esc(
                        x.course ? x.course.code : "?"
                      )}</li>`
                  )
                  .join("")}</ul>`
              : ""
          }`,
        };
      }
    }

    /* ---- Specific student questions ---- */
    const studentMatches = findStudents(text);
    if (studentMatches.length) {
      const s = studentMatches[0];
      const enrolled = Enrollments.for(s.id).map((e) => Courses.get(e.courseId)).filter(Boolean);

      // "what courses is X taking" / "X enrolled" / "courses for X"
      if (mentionsCourse || mentionsEnroll || /taking|enrolled|courses?/.test(text)) {
        return {
          html: `<p><strong>${esc(fullName(s))}</strong> is enrolled in <strong>${
            enrolled.length
          }</strong> course(s):</p>${courseList(enrolled)}`,
        };
      }
      // Otherwise show a profile card.
      return {
        html: `<p>Here's what I found for <strong>${esc(fullName(s))}</strong>:</p>
          <ul class="ai-list">
            <li>Email: ${esc(s.email || "—")}</li>
            <li>Phone: ${esc(s.phone || "—")}</li>
            <li>Status: ${esc(s.status)}</li>
            <li>Enrolled courses: ${enrolled.length}</li>
          </ul>
          ${enrolled.length ? courseList(enrolled) : ""}`,
      };
    }

    /* ---- Specific course questions ---- */
    const course = findCourse(text);
    if (course) {
      // Instructor
      if (/\b(who teaches|instructor|teacher|taught by)\b/.test(text)) {
        return {
          html: `<strong>${esc(course.code)} — ${esc(course.title)}</strong> is taught by <strong>${esc(
            course.instructor || "Staff"
          )}</strong>.`,
        };
      }
      // Who is enrolled
      if (mentionsStudent || mentionsEnroll || asksList || asksCount || /\bin\b/.test(text)) {
        const enrolledStudents = enrollments
          .filter((e) => e.courseId === course.id)
          .map((e) => Students.get(e.studentId))
          .filter(Boolean);
        return {
          html: `<p><strong>${enrolledStudents.length}</strong> student(s) enrolled in <strong>${esc(
            course.code
          )} — ${esc(course.title)}</strong>:</p>${studentList(enrolledStudents)}`,
        };
      }
      // Default course info
      const count = enrollments.filter((e) => e.courseId === course.id).length;
      return {
        html: `<strong>${esc(course.code)} — ${esc(course.title)}</strong><br/>
          Instructor: ${esc(course.instructor || "Staff")} · Credits: ${esc(
          course.credits
        )} · ${count} enrolled.`,
      };
    }

    /* ---- Popular / top courses ---- */
    if (/\b(popular|top|most enrolled|biggest)\b/.test(text) && (mentionsCourse || !mentionsStudent)) {
      const counts = {};
      enrollments.forEach((e) => (counts[e.courseId] = (counts[e.courseId] || 0) + 1));
      const ranked = courses
        .map((c) => ({ c, n: counts[c.id] || 0 }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 5);
      return {
        html: `<p>Most enrolled courses:</p><ul class="ai-list">${ranked
          .map((r) => `<li><strong>${esc(r.c.code)}</strong> ${esc(r.c.title)} — ${r.n} enrolled</li>`)
          .join("")}</ul>`,
      };
    }

    /* ---- Counts ---- */
    if (asksCount) {
      if (mentionsCourse) return { html: `You have <strong>${courses.length}</strong> course(s).` };
      if (mentionsEnroll)
        return { html: `There are <strong>${enrollments.length}</strong> enrollment(s).` };
      if (/inactive/.test(text)) {
        const n = students.filter((s) => s.status === "Inactive").length;
        return { html: `There are <strong>${n}</strong> inactive student(s).` };
      }
      if (/active/.test(text)) {
        const n = students.filter((s) => s.status === "Active").length;
        return { html: `There are <strong>${n}</strong> active student(s).` };
      }
      if (mentionsStudent || true)
        return { html: `You have <strong>${students.length}</strong> student(s).` };
    }

    /* ---- Lists ---- */
    if (asksList || mentionsStudent || mentionsCourse || mentionsEnroll) {
      if (mentionsCourse) {
        return { html: `<p>All courses (${courses.length}):</p>${courseList(courses)}` };
      }
      if (mentionsEnroll) {
        const rows = enrollmentsView();
        return {
          html: `<p>All enrollments (${rows.length}):</p><ul class="ai-list">${rows
            .map(
              (x) =>
                `<li><strong>${esc(x.student ? fullName(x.student) : "?")}</strong> → ${esc(
                  x.course ? x.course.code : "?"
                )} ${x.e.grade ? `(${esc(x.e.grade)})` : ""}</li>`
            )
            .join("")}</ul>`,
        };
      }
      // students, with optional status filter
      let list = students;
      let label = "All students";
      if (/inactive/.test(text)) {
        list = students.filter((s) => s.status === "Inactive");
        label = "Inactive students";
      } else if (/active/.test(text)) {
        list = students.filter((s) => s.status === "Active");
        label = "Active students";
      }
      return { html: `<p>${label} (${list.length}):</p>${studentList(list)}` };
    }

    /* ---- Fallback ---- */
    return {
      html: `<p>I'm not sure how to answer that yet. Here are some things I can do:</p>${suggestionsHtml()}`,
    };
  }

  const SUGGESTIONS = [
    "How many students do I have?",
    "List all active students",
    "Who is enrolled in CS101?",
    "What courses is Priya taking?",
    "Who teaches MATH201?",
    "Show the most popular courses",
    "How many enrollments are there?",
    "Find students with grade A",
  ];

  function suggestionsHtml() {
    return `<div class="ai-suggestions">${SUGGESTIONS.map(
      (s) => `<button class="ai-chip" data-q="${esc(s)}">${esc(s)}</button>`
    ).join("")}</div>`;
  }

  window.Assistant = { answer, SUGGESTIONS, suggestionsHtml };
})();
