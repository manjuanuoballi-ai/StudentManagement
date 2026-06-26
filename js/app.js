/*
 * Main application: hash-based routing, views, and event handling.
 */
(function () {
  "use strict";

  const { Students, Courses, Enrollments } = window.Store;
  const app = document.getElementById("app");

  /* ------------------------------ Helpers ------------------------------- */
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fullName(student) {
    return `${student.firstName} ${student.lastName}`.trim();
  }

  function initials(student) {
    return (
      (student.firstName[0] || "") + (student.lastName[0] || "")
    ).toUpperCase();
  }

  function badge(status) {
    const cls = status === "Active" ? "badge badge--active" : "badge badge--inactive";
    return `<span class="${cls}">${esc(status || "Unknown")}</span>`;
  }

  function emptyState(message, actionLabel, actionHref) {
    const action = actionHref
      ? `<a class="btn btn--primary" href="${actionHref}">${esc(actionLabel)}</a>`
      : "";
    return `<div class="empty">
      <div class="empty__icon">📭</div>
      <p>${esc(message)}</p>
      ${action}
    </div>`;
  }

  /* -------------------------------- Modal ------------------------------- */
  const modalRoot = document.getElementById("modal-root");

  function openModal(title, bodyHtml, onMount) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-close>
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal__header">
            <h3>${esc(title)}</h3>
            <button class="modal__close" data-close aria-label="Close">&times;</button>
          </div>
          <div class="modal__body">${bodyHtml}</div>
        </div>
      </div>`;
    modalRoot.classList.add("is-open");
    modalRoot.querySelectorAll("[data-close]").forEach((el) =>
      el.addEventListener("click", (e) => {
        if (e.target === el) closeModal();
      })
    );
    if (typeof onMount === "function") onMount(modalRoot);
  }

  function closeModal() {
    modalRoot.classList.remove("is-open");
    modalRoot.innerHTML = "";
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  /* ------------------------------ Toasts -------------------------------- */
  const toastRoot = document.getElementById("toast-root");
  function toast(message, type) {
    const el = document.createElement("div");
    el.className = `toast toast--${type || "info"}`;
    el.textContent = message;
    toastRoot.appendChild(el);
    setTimeout(() => el.classList.add("toast--show"), 10);
    setTimeout(() => {
      el.classList.remove("toast--show");
      setTimeout(() => el.remove(), 300);
    }, 2600);
  }

  /* ------------------------------ Routing ------------------------------- */
  const routes = {
    "/": renderDashboard,
    "/students": renderStudents,
    "/courses": renderCourses,
    "/enrollments": renderEnrollments,
    "/assistant": renderAssistant,
  };

  function currentPath() {
    const hash = window.location.hash.replace(/^#/, "");
    return hash || "/";
  }

  function router() {
    const path = currentPath();
    const view = routes[path] || routes["/"];
    setActiveNav(path);
    view();
  }

  function setActiveNav(path) {
    document.querySelectorAll(".nav__link").forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + path);
    });
  }

  /* ----------------------------- Dashboard ------------------------------ */
  function renderDashboard() {
    const students = Students.all();
    const courses = Courses.all();
    const enrollments = Enrollments.all();
    const active = students.filter((s) => s.status === "Active").length;

    const recent = [...students]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, 5);

    // Most enrolled courses
    const counts = {};
    enrollments.forEach((e) => {
      counts[e.courseId] = (counts[e.courseId] || 0) + 1;
    });
    const popular = courses
      .map((c) => ({ course: c, count: counts[c.id] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    app.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Dashboard</h1>
          <p class="muted">Overview of your institution at a glance.</p>
        </div>
      </header>

      <section class="stats">
        ${statCard("Total Students", students.length, "👨‍🎓", "#/students")}
        ${statCard("Active Students", active, "✅", "#/students")}
        ${statCard("Courses", courses.length, "📚", "#/courses")}
        ${statCard("Enrollments", enrollments.length, "📝", "#/enrollments")}
      </section>

      <div class="grid-2">
        <section class="card">
          <div class="card__head"><h2>Recently Added Students</h2></div>
          <div class="card__body">
            ${
              recent.length
                ? `<ul class="list">${recent
                    .map(
                      (s) => `<li class="list__row">
                        <span class="avatar">${esc(initials(s))}</span>
                        <div class="list__main">
                          <strong>${esc(fullName(s))}</strong>
                          <span class="muted">${esc(s.email || "—")}</span>
                        </div>
                        ${badge(s.status)}
                      </li>`
                    )
                    .join("")}</ul>`
                : `<p class="muted">No students yet.</p>`
            }
          </div>
        </section>

        <section class="card">
          <div class="card__head"><h2>Popular Courses</h2></div>
          <div class="card__body">
            ${
              popular.length
                ? `<ul class="list">${popular
                    .map(
                      (p) => `<li class="list__row">
                        <span class="course-code">${esc(p.course.code)}</span>
                        <div class="list__main">
                          <strong>${esc(p.course.title)}</strong>
                          <span class="muted">${esc(p.course.instructor || "—")}</span>
                        </div>
                        <span class="pill">${p.count} enrolled</span>
                      </li>`
                    )
                    .join("")}</ul>`
                : `<p class="muted">No courses yet.</p>`
            }
          </div>
        </section>
      </div>`;
  }

  function statCard(label, value, icon, href) {
    return `<a class="stat" href="${href}">
      <div class="stat__icon">${icon}</div>
      <div class="stat__meta">
        <span class="stat__value">${value}</span>
        <span class="stat__label">${esc(label)}</span>
      </div>
    </a>`;
  }

  /* ------------------------------ Students ------------------------------ */
  let studentSearch = "";
  let studentStatusFilter = "All";

  function renderStudents() {
    let students = Students.all();
    if (studentStatusFilter !== "All") {
      students = students.filter((s) => s.status === studentStatusFilter);
    }
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      students = students.filter(
        (s) =>
          fullName(s).toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q) ||
          (s.phone || "").toLowerCase().includes(q)
      );
    }
    students.sort((a, b) => fullName(a).localeCompare(fullName(b)));

    app.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Students</h1>
          <p class="muted">${Students.all().length} total</p>
        </div>
        <button class="btn btn--primary" id="add-student">+ Add Student</button>
      </header>

      <div class="toolbar">
        <input type="search" id="student-search" class="input" placeholder="Search by name, email, phone…" value="${esc(studentSearch)}" />
        <select id="student-filter" class="input input--select">
          ${["All", "Active", "Inactive"]
            .map(
              (o) =>
                `<option ${o === studentStatusFilter ? "selected" : ""}>${o}</option>`
            )
            .join("")}
        </select>
      </div>

      ${
        students.length
          ? `<div class="card">
              <table class="table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Courses</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  ${students
                    .map((s) => {
                      const count = Enrollments.for(s.id).length;
                      return `<tr>
                        <td>
                          <div class="cell-name">
                            <span class="avatar avatar--sm">${esc(initials(s))}</span>
                            <strong>${esc(fullName(s))}</strong>
                          </div>
                        </td>
                        <td>${esc(s.email || "—")}</td>
                        <td>${esc(s.phone || "—")}</td>
                        <td>${badge(s.status)}</td>
                        <td>${count}</td>
                        <td class="actions">
                          <button class="icon-btn" data-view="${s.id}" title="View">👁</button>
                          <button class="icon-btn" data-edit="${s.id}" title="Edit">✏️</button>
                          <button class="icon-btn icon-btn--danger" data-del="${s.id}" title="Delete">🗑</button>
                        </td>
                      </tr>`;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>`
          : emptyState("No students match your search.")
      }`;

    document.getElementById("add-student").addEventListener("click", () => studentForm());
    const search = document.getElementById("student-search");
    search.addEventListener("input", (e) => {
      studentSearch = e.target.value;
      const pos = e.target.selectionStart;
      renderStudents();
      const next = document.getElementById("student-search");
      next.focus();
      next.setSelectionRange(pos, pos);
    });
    document.getElementById("student-filter").addEventListener("change", (e) => {
      studentStatusFilter = e.target.value;
      renderStudents();
    });

    app.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => studentForm(b.getAttribute("data-edit")))
    );
    app.querySelectorAll("[data-view]").forEach((b) =>
      b.addEventListener("click", () => studentDetail(b.getAttribute("data-view")))
    );
    app.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => {
        const s = Students.get(b.getAttribute("data-del"));
        if (confirm(`Delete ${fullName(s)}? This also removes their enrollments.`)) {
          Students.remove(s.id);
          toast("Student deleted", "success");
          renderStudents();
        }
      })
    );
  }

  function studentForm(id) {
    const editing = id ? Students.get(id) : null;
    const s = editing || { firstName: "", lastName: "", email: "", phone: "", gender: "", dob: "", status: "Active" };
    openModal(
      editing ? "Edit Student" : "Add Student",
      `<form id="student-form" class="form">
        <div class="form__row">
          <label>First name<input name="firstName" class="input" required value="${esc(s.firstName)}" /></label>
          <label>Last name<input name="lastName" class="input" required value="${esc(s.lastName)}" /></label>
        </div>
        <label>Email<input name="email" type="email" class="input" value="${esc(s.email)}" /></label>
        <div class="form__row">
          <label>Phone<input name="phone" class="input" value="${esc(s.phone)}" /></label>
          <label>Date of birth<input name="dob" type="date" class="input" value="${esc(s.dob)}" /></label>
        </div>
        <div class="form__row">
          <label>Gender
            <select name="gender" class="input input--select">
              ${["", "Male", "Female", "Other"]
                .map((g) => `<option ${g === s.gender ? "selected" : ""} value="${g}">${g || "Prefer not to say"}</option>`)
                .join("")}
            </select>
          </label>
          <label>Status
            <select name="status" class="input input--select">
              ${["Active", "Inactive"]
                .map((g) => `<option ${g === s.status ? "selected" : ""}>${g}</option>`)
                .join("")}
            </select>
          </label>
        </div>
        <div class="form__actions">
          <button type="button" class="btn" data-cancel>Cancel</button>
          <button type="submit" class="btn btn--primary">${editing ? "Save changes" : "Add student"}</button>
        </div>
      </form>`,
      (root) => {
        const form = root.querySelector("#student-form");
        root.querySelector("[data-cancel]").addEventListener("click", closeModal);
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(form).entries());
          if (editing) {
            Students.update(id, data);
            toast("Student updated", "success");
          } else {
            Students.create(data);
            toast("Student added", "success");
          }
          closeModal();
          renderStudents();
        });
      }
    );
  }

  function studentDetail(id) {
    const s = Students.get(id);
    if (!s) return;
    const enrolled = Enrollments.for(id).map((e) => ({
      enrollment: e,
      course: Courses.get(e.courseId),
    }));

    openModal(
      fullName(s),
      `<div class="detail">
        <div class="detail__head">
          <span class="avatar avatar--lg">${esc(initials(s))}</span>
          <div>
            <h3>${esc(fullName(s))}</h3>
            ${badge(s.status)}
          </div>
        </div>
        <dl class="detail__grid">
          <div><dt>Email</dt><dd>${esc(s.email || "—")}</dd></div>
          <div><dt>Phone</dt><dd>${esc(s.phone || "—")}</dd></div>
          <div><dt>Gender</dt><dd>${esc(s.gender || "—")}</dd></div>
          <div><dt>Date of birth</dt><dd>${esc(s.dob || "—")}</dd></div>
        </dl>
        <h4>Enrolled Courses (${enrolled.length})</h4>
        ${
          enrolled.length
            ? `<ul class="list">${enrolled
                .map(
                  (x) => `<li class="list__row">
                    <span class="course-code">${esc(x.course ? x.course.code : "?")}</span>
                    <div class="list__main"><strong>${esc(x.course ? x.course.title : "Unknown course")}</strong></div>
                    <span class="pill">${esc(x.enrollment.grade || "No grade")}</span>
                  </li>`
                )
                .join("")}</ul>`
            : `<p class="muted">Not enrolled in any courses.</p>`
        }
        <div class="form__actions">
          <button class="btn" data-cancel>Close</button>
        </div>
      </div>`,
      (root) => root.querySelector("[data-cancel]").addEventListener("click", closeModal)
    );
  }

  /* ------------------------------- Courses ------------------------------ */
  let courseSearch = "";

  function renderCourses() {
    let courses = Courses.all();
    if (courseSearch) {
      const q = courseSearch.toLowerCase();
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.instructor || "").toLowerCase().includes(q)
      );
    }
    courses.sort((a, b) => a.code.localeCompare(b.code));

    app.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Courses</h1>
          <p class="muted">${Courses.all().length} total</p>
        </div>
        <button class="btn btn--primary" id="add-course">+ Add Course</button>
      </header>

      <div class="toolbar">
        <input type="search" id="course-search" class="input" placeholder="Search courses…" value="${esc(courseSearch)}" />
      </div>

      ${
        courses.length
          ? `<div class="cards-grid">
              ${courses
                .map((c) => {
                  const count = Enrollments.all().filter((e) => e.courseId === c.id).length;
                  return `<div class="course-card">
                    <div class="course-card__top">
                      <span class="course-code course-code--lg">${esc(c.code)}</span>
                      <span class="pill">${c.credits} cr</span>
                    </div>
                    <h3>${esc(c.title)}</h3>
                    <p class="muted">${esc(c.instructor || "Staff")}</p>
                    <div class="course-card__foot">
                      <span class="pill pill--ghost">${count} enrolled</span>
                      <div class="actions">
                        <button class="icon-btn" data-edit="${c.id}" title="Edit">✏️</button>
                        <button class="icon-btn icon-btn--danger" data-del="${c.id}" title="Delete">🗑</button>
                      </div>
                    </div>
                  </div>`;
                })
                .join("")}
            </div>`
          : emptyState("No courses yet.")
      }`;

    document.getElementById("add-course").addEventListener("click", () => courseForm());
    const search = document.getElementById("course-search");
    search.addEventListener("input", (e) => {
      courseSearch = e.target.value;
      const pos = e.target.selectionStart;
      renderCourses();
      const next = document.getElementById("course-search");
      next.focus();
      next.setSelectionRange(pos, pos);
    });
    app.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => courseForm(b.getAttribute("data-edit")))
    );
    app.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => {
        const c = Courses.get(b.getAttribute("data-del"));
        if (confirm(`Delete ${c.code} - ${c.title}? This also removes its enrollments.`)) {
          Courses.remove(c.id);
          toast("Course deleted", "success");
          renderCourses();
        }
      })
    );
  }

  function courseForm(id) {
    const editing = id ? Courses.get(id) : null;
    const c = editing || { code: "", title: "", instructor: "", credits: 3 };
    openModal(
      editing ? "Edit Course" : "Add Course",
      `<form id="course-form" class="form">
        <div class="form__row">
          <label>Course code<input name="code" class="input" required value="${esc(c.code)}" placeholder="CS101" /></label>
          <label>Credits<input name="credits" type="number" min="0" max="12" class="input" value="${esc(c.credits)}" /></label>
        </div>
        <label>Title<input name="title" class="input" required value="${esc(c.title)}" /></label>
        <label>Instructor<input name="instructor" class="input" value="${esc(c.instructor)}" /></label>
        <div class="form__actions">
          <button type="button" class="btn" data-cancel>Cancel</button>
          <button type="submit" class="btn btn--primary">${editing ? "Save changes" : "Add course"}</button>
        </div>
      </form>`,
      (root) => {
        const form = root.querySelector("#course-form");
        root.querySelector("[data-cancel]").addEventListener("click", closeModal);
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(form).entries());
          if (editing) {
            Courses.update(id, data);
            toast("Course updated", "success");
          } else {
            Courses.create(data);
            toast("Course added", "success");
          }
          closeModal();
          renderCourses();
        });
      }
    );
  }

  /* ----------------------------- Enrollments ---------------------------- */
  function renderEnrollments() {
    const enrollments = Enrollments.all().map((e) => ({
      e,
      student: Students.get(e.studentId),
      course: Courses.get(e.courseId),
    }));
    enrollments.sort((a, b) => (b.e.enrolledAt || "").localeCompare(a.e.enrolledAt || ""));

    const students = Students.all();
    const courses = Courses.all();
    const canEnroll = students.length && courses.length;

    app.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Enrollments</h1>
          <p class="muted">${Enrollments.all().length} total</p>
        </div>
        <button class="btn btn--primary" id="add-enroll" ${canEnroll ? "" : "disabled"}>+ Enroll Student</button>
      </header>

      ${
        !canEnroll
          ? `<div class="notice">Add at least one student and one course to create enrollments.</div>`
          : ""
      }

      ${
        enrollments.length
          ? `<div class="card">
              <table class="table">
                <thead>
                  <tr><th>Student</th><th>Course</th><th>Grade</th><th>Enrolled</th><th></th></tr>
                </thead>
                <tbody>
                  ${enrollments
                    .map(
                      (x) => `<tr>
                        <td>${x.student ? esc(fullName(x.student)) : "<em>Unknown</em>"}</td>
                        <td>${x.course ? `<span class="course-code">${esc(x.course.code)}</span> ${esc(x.course.title)}` : "<em>Unknown</em>"}</td>
                        <td>${x.e.grade ? `<span class="pill">${esc(x.e.grade)}</span>` : '<span class="muted">—</span>'}</td>
                        <td class="muted">${esc((x.e.enrolledAt || "").slice(0, 10))}</td>
                        <td class="actions">
                          <button class="icon-btn" data-grade="${x.e.id}" title="Set grade">🎓</button>
                          <button class="icon-btn icon-btn--danger" data-del="${x.e.id}" title="Remove">🗑</button>
                        </td>
                      </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>`
          : emptyState("No enrollments yet.")
      }`;

    const addBtn = document.getElementById("add-enroll");
    if (canEnroll) addBtn.addEventListener("click", enrollForm);

    app.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => {
        Enrollments.remove(b.getAttribute("data-del"));
        toast("Enrollment removed", "success");
        renderEnrollments();
      })
    );
    app.querySelectorAll("[data-grade]").forEach((b) =>
      b.addEventListener("click", () => gradeForm(b.getAttribute("data-grade")))
    );
  }

  function enrollForm() {
    const students = Students.all().sort((a, b) => fullName(a).localeCompare(fullName(b)));
    const courses = Courses.all().sort((a, b) => a.code.localeCompare(b.code));
    openModal(
      "Enroll Student",
      `<form id="enroll-form" class="form">
        <label>Student
          <select name="studentId" class="input input--select" required>
            ${students.map((s) => `<option value="${s.id}">${esc(fullName(s))}</option>`).join("")}
          </select>
        </label>
        <label>Course
          <select name="courseId" class="input input--select" required>
            ${courses.map((c) => `<option value="${c.id}">${esc(c.code)} — ${esc(c.title)}</option>`).join("")}
          </select>
        </label>
        <label>Grade (optional)
          <select name="grade" class="input input--select">
            ${["", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"].map((g) => `<option value="${g}">${g || "No grade yet"}</option>`).join("")}
          </select>
        </label>
        <div class="form__actions">
          <button type="button" class="btn" data-cancel>Cancel</button>
          <button type="submit" class="btn btn--primary">Enroll</button>
        </div>
      </form>`,
      (root) => {
        const form = root.querySelector("#enroll-form");
        root.querySelector("[data-cancel]").addEventListener("click", closeModal);
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(form).entries());
          const created = Enrollments.create(data);
          if (!created) {
            toast("That student is already enrolled in this course", "error");
            return;
          }
          toast("Student enrolled", "success");
          closeModal();
          renderEnrollments();
        });
      }
    );
  }

  function gradeForm(id) {
    const enrollment = Enrollments.all().find((e) => e.id === id);
    if (!enrollment) return;
    const student = Students.get(enrollment.studentId);
    const course = Courses.get(enrollment.courseId);
    openModal(
      "Set Grade",
      `<form id="grade-form" class="form">
        <p class="muted">${esc(student ? fullName(student) : "Unknown")} · ${esc(course ? course.code : "?")}</p>
        <label>Grade
          <select name="grade" class="input input--select">
            ${["", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"]
              .map((g) => `<option ${g === enrollment.grade ? "selected" : ""} value="${g}">${g || "No grade"}</option>`)
              .join("")}
          </select>
        </label>
        <div class="form__actions">
          <button type="button" class="btn" data-cancel>Cancel</button>
          <button type="submit" class="btn btn--primary">Save</button>
        </div>
      </form>`,
      (root) => {
        const form = root.querySelector("#grade-form");
        root.querySelector("[data-cancel]").addEventListener("click", closeModal);
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(form).entries());
          Enrollments.update(id, data);
          toast("Grade saved", "success");
          closeModal();
          renderEnrollments();
        });
      }
    );
  }

  /* ------------------------------ Assistant ----------------------------- */
  // Conversation history kept in memory for the session.
  let chatLog = [
    {
      role: "bot",
      html:
        `<p>👋 Hi! I'm your data assistant. Ask me about students, courses, or enrollments.</p>` +
        window.Assistant.suggestionsHtml(),
    },
  ];

  function renderAssistant() {
    app.innerHTML = `
      <header class="page-head">
        <div>
          <h1>AI Assistant</h1>
          <p class="muted">Ask questions in plain English — answers come from your data.</p>
        </div>
        <button class="btn" id="chat-clear">Clear chat</button>
      </header>

      <div class="chat">
        <div class="chat__log" id="chat-log">
          ${chatLog.map(chatBubble).join("")}
        </div>
        <form class="chat__form" id="chat-form">
          <input
            type="text"
            id="chat-input"
            class="input"
            placeholder="e.g. Who is enrolled in CS101?"
            autocomplete="off"
          />
          <button type="submit" class="btn btn--primary">Ask</button>
        </form>
      </div>`;

    const log = document.getElementById("chat-log");
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    input.focus();
    log.scrollTop = log.scrollHeight;

    function send(question) {
      const q = question.trim();
      if (!q) return;
      chatLog.push({ role: "user", html: esc(q) });
      const response = window.Assistant.answer(q);
      chatLog.push({ role: "bot", html: response.html });
      log.insertAdjacentHTML("beforeend", chatBubble(chatLog[chatLog.length - 2]));
      log.insertAdjacentHTML("beforeend", chatBubble(chatLog[chatLog.length - 1]));
      bindChips(log);
      log.scrollTop = log.scrollHeight;
      input.value = "";
      input.focus();
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      send(input.value);
    });

    document.getElementById("chat-clear").addEventListener("click", () => {
      chatLog = [
        {
          role: "bot",
          html:
            `<p>Chat cleared. Ask me anything about your data.</p>` +
            window.Assistant.suggestionsHtml(),
        },
      ];
      renderAssistant();
    });

    bindChips(log);
  }

  function chatBubble(msg) {
    return `<div class="chat__msg chat__msg--${msg.role}">
      ${msg.role === "bot" ? '<span class="chat__avatar">🤖</span>' : ""}
      <div class="chat__bubble">${msg.html}</div>
    </div>`;
  }

  function bindChips(scope) {
    scope.querySelectorAll(".ai-chip").forEach((chip) => {
      if (chip.dataset.bound) return;
      chip.dataset.bound = "1";
      chip.addEventListener("click", () => {
        const input = document.getElementById("chat-input");
        if (input) {
          input.value = chip.getAttribute("data-q");
          document
            .getElementById("chat-form")
            .dispatchEvent(new Event("submit", { cancelable: true }));
        }
      });
    });
  }

  /* ------------------------------ Bootstrap ----------------------------- */
  window.Store.seedIfEmpty();

  document.getElementById("reset-data").addEventListener("click", () => {
    if (confirm("Reset all data back to the sample data set?")) {
      window.Store.resetAll();
      window.Store.seedIfEmpty();
      toast("Data reset", "success");
      router();
    }
  });

  window.addEventListener("hashchange", router);
  router();
})();
