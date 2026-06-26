/*
 * Data layer for the Student Management System.
 * Persists everything to localStorage and exposes a small CRUD API.
 */
(function () {
  "use strict";

  const KEYS = {
    students: "sms.students",
    courses: "sms.courses",
    enrollments: "sms.enrollments",
    seeded: "sms.seeded",
  };

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (err) {
      console.error("Failed to parse", key, err);
      return [];
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid(prefix) {
    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 7)
    );
  }

  /* ------------------------------- Students ------------------------------ */
  const Students = {
    all() {
      return read(KEYS.students);
    },
    get(id) {
      return this.all().find((s) => s.id === id) || null;
    },
    create(data) {
      const students = this.all();
      const student = {
        id: uid("stu"),
        firstName: (data.firstName || "").trim(),
        lastName: (data.lastName || "").trim(),
        email: (data.email || "").trim(),
        phone: (data.phone || "").trim(),
        gender: data.gender || "",
        dob: data.dob || "",
        status: data.status || "Active",
        createdAt: new Date().toISOString(),
      };
      students.push(student);
      write(KEYS.students, students);
      return student;
    },
    update(id, data) {
      const students = this.all();
      const idx = students.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      students[idx] = { ...students[idx], ...data, id };
      write(KEYS.students, students);
      return students[idx];
    },
    remove(id) {
      write(
        KEYS.students,
        this.all().filter((s) => s.id !== id)
      );
      // Cascade: drop this student's enrollments.
      write(
        KEYS.enrollments,
        Enrollments.all().filter((e) => e.studentId !== id)
      );
    },
  };

  /* ------------------------------- Courses ------------------------------- */
  const Courses = {
    all() {
      return read(KEYS.courses);
    },
    get(id) {
      return this.all().find((c) => c.id === id) || null;
    },
    create(data) {
      const courses = this.all();
      const course = {
        id: uid("crs"),
        code: (data.code || "").trim().toUpperCase(),
        title: (data.title || "").trim(),
        instructor: (data.instructor || "").trim(),
        credits: Number(data.credits) || 0,
        createdAt: new Date().toISOString(),
      };
      courses.push(course);
      write(KEYS.courses, courses);
      return course;
    },
    update(id, data) {
      const courses = this.all();
      const idx = courses.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      courses[idx] = { ...courses[idx], ...data, id };
      write(KEYS.courses, courses);
      return courses[idx];
    },
    remove(id) {
      write(
        KEYS.courses,
        this.all().filter((c) => c.id !== id)
      );
      write(
        KEYS.enrollments,
        Enrollments.all().filter((e) => e.courseId !== id)
      );
    },
  };

  /* ----------------------------- Enrollments ----------------------------- */
  const Enrollments = {
    all() {
      return read(KEYS.enrollments);
    },
    for(studentId) {
      return this.all().filter((e) => e.studentId === studentId);
    },
    exists(studentId, courseId) {
      return this.all().some(
        (e) => e.studentId === studentId && e.courseId === courseId
      );
    },
    create(data) {
      if (this.exists(data.studentId, data.courseId)) return null;
      const enrollments = this.all();
      const enrollment = {
        id: uid("enr"),
        studentId: data.studentId,
        courseId: data.courseId,
        grade: data.grade || "",
        enrolledAt: new Date().toISOString(),
      };
      enrollments.push(enrollment);
      write(KEYS.enrollments, enrollments);
      return enrollment;
    },
    update(id, data) {
      const enrollments = this.all();
      const idx = enrollments.findIndex((e) => e.id === id);
      if (idx === -1) return null;
      enrollments[idx] = { ...enrollments[idx], ...data, id };
      write(KEYS.enrollments, enrollments);
      return enrollments[idx];
    },
    remove(id) {
      write(
        KEYS.enrollments,
        this.all().filter((e) => e.id !== id)
      );
    },
  };

  function resetAll() {
    [KEYS.students, KEYS.courses, KEYS.enrollments, KEYS.seeded].forEach(
      (k) => localStorage.removeItem(k)
    );
  }

  function seedIfEmpty() {
    if (localStorage.getItem(KEYS.seeded)) return;

    const sampleCourses = [
      { code: "CS101", title: "Intro to Computer Science", instructor: "Dr. Alan Kay", credits: 4 },
      { code: "MATH201", title: "Linear Algebra", instructor: "Dr. Emmy Noether", credits: 3 },
      { code: "ENG110", title: "Academic Writing", instructor: "Prof. Jane Austen", credits: 2 },
      { code: "PHY150", title: "Classical Mechanics", instructor: "Dr. Isaac Newton", credits: 4 },
    ].map((c) => Courses.create(c));

    const sampleStudents = [
      { firstName: "Aarav", lastName: "Sharma", email: "aarav.sharma@example.com", phone: "555-0101", gender: "Male", dob: "2003-05-14", status: "Active" },
      { firstName: "Priya", lastName: "Patel", email: "priya.patel@example.com", phone: "555-0102", gender: "Female", dob: "2002-11-02", status: "Active" },
      { firstName: "Liam", lastName: "Johnson", email: "liam.johnson@example.com", phone: "555-0103", gender: "Male", dob: "2004-01-23", status: "Active" },
      { firstName: "Sofia", lastName: "Garcia", email: "sofia.garcia@example.com", phone: "555-0104", gender: "Female", dob: "2003-08-30", status: "Inactive" },
      { firstName: "Noah", lastName: "Williams", email: "noah.williams@example.com", phone: "555-0105", gender: "Male", dob: "2002-03-17", status: "Active" },
    ].map((s) => Students.create(s));

    const grades = ["A", "B+", "A-", "B", "", "C+"];
    Enrollments.create({ studentId: sampleStudents[0].id, courseId: sampleCourses[0].id, grade: grades[0] });
    Enrollments.create({ studentId: sampleStudents[0].id, courseId: sampleCourses[1].id, grade: grades[1] });
    Enrollments.create({ studentId: sampleStudents[1].id, courseId: sampleCourses[0].id, grade: grades[2] });
    Enrollments.create({ studentId: sampleStudents[1].id, courseId: sampleCourses[2].id, grade: grades[3] });
    Enrollments.create({ studentId: sampleStudents[2].id, courseId: sampleCourses[3].id, grade: grades[4] });
    Enrollments.create({ studentId: sampleStudents[4].id, courseId: sampleCourses[1].id, grade: grades[5] });

    localStorage.setItem(KEYS.seeded, "1");
  }

  window.Store = {
    Students,
    Courses,
    Enrollments,
    seedIfEmpty,
    resetAll,
  };
})();
