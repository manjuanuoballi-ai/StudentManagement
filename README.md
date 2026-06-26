# 🎓 Student Management System

A clean, modern **Student Management System** built with plain JavaScript, HTML, and
CSS. No build step, no frameworks, no backend — it runs entirely in the browser and
stores all data in `localStorage`.

## Features

- **Dashboard** — live stats (students, active students, courses, enrollments),
  recently added students, and most popular courses.
- **Students** — add, edit, view, and delete students; search by name / email / phone;
  filter by status; per-student course list.
- **Courses** — add, edit, and delete courses (code, title, instructor, credits) with
  enrollment counts.
- **Enrollments** — enroll students into courses, assign grades, and remove
  enrollments. Duplicate enrollments are prevented and related records cascade on
  delete.
- **Sample data** — seeded on first load; reset anytime from the sidebar.
- **Responsive UI** — works on desktop and mobile, with modals and toast notifications.

## Running it

Because the app uses plain `<script>` tags, you can simply **open `index.html`** in your
browser. For the best experience (and to mirror how it would be hosted), serve it with a
tiny static server:

```bash
# from the project root
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Project structure

```
StudentManagement/
├── index.html        # App shell + layout
├── css/
│   └── styles.css    # All styling (modern, responsive)
└── js/
    ├── store.js      # Data layer (localStorage CRUD) + seed data
    └── app.js        # Routing, views, and UI logic
```

## Data & persistence

All data lives in your browser's `localStorage` under the `sms.*` keys. Nothing is sent
anywhere. Use **Reset sample data** in the sidebar to wipe and reseed the demo data.
