import { useEffect, useState } from "react";

import StudentForm from "./components/StudentForm";
import StudentList from "./components/StudentList";
import { createStudent, deleteStudent, updateStudent } from "./services/api";
import "./App.css";

function getInitialTheme() {
  try {
    return localStorage.getItem("theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!notice || notice.type !== "success") {
      return undefined;
    }
    const timeoutId = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Ignore storage errors in private browsing.
    }
  }, [theme]);

  useEffect(() => {
    document.body.style.overflow = showForm ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showForm]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  function refreshList() {
    setListRefreshKey((current) => current + 1);
  }

  function handleAdd() {
    setEditingStudent(null);
    setShowForm(true);
  }

  function handleEdit(student) {
    setEditingStudent(student);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingStudent(null);
  }

  async function handleFormSubmit(formData) {
    if (editingStudent) {
      await updateStudent(editingStudent.id, formData);
      setNotice({ type: "success", message: "Student updated." });
    } else {
      await createStudent(formData);
      setNotice({ type: "success", message: "Student created." });
    }

    setShowForm(false);
    setEditingStudent(null);
    refreshList();
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this student?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteStudent(id);
      if (editingStudent?.id === id) {
        setShowForm(false);
        setEditingStudent(null);
      }
      setNotice({ type: "success", message: "Student deleted." });
      refreshList();
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to delete student.",
      });
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <p className="app__eyebrow">Records</p>
          <h1>Student Management</h1>
          <p>Create, search, update, and track enrollment.</p>
        </div>
        <button
          type="button"
          className="app__theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Light theme" : "Dark theme"}
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path
                strokeLinecap="round"
                d="M12 3v1.5M12 19.5V21M4.93 4.93l1.06 1.06M18.01 18.01l1.06 1.06M3 12h1.5M19.5 12H21M4.93 19.07l1.06-1.06M18.01 5.99l1.06-1.06"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z"
              />
            </svg>
          )}
        </button>
      </header>

      {notice && (
        <div className={`app__notice app__notice--${notice.type}`} role="status">
          <p>{notice.message}</p>
          <button type="button" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className="app__backdrop" onClick={handleCancel}>
          <div
            className="app__modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-form-title"
          >
            <StudentForm
              initialData={editingStudent}
              onSubmit={handleFormSubmit}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      <StudentList
        refreshKey={listRefreshKey}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default App;
