import { useEffect, useState } from "react";

import StudentForm from "./components/StudentForm";
import StudentList from "./components/StudentList";
import { createStudent, deleteStudent, updateStudent } from "./services/api";
import "./App.css";

function App() {
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
      {notice && (
        <div className={`app__notice app__notice--${notice.type}`} role="status">
          <p>{notice.message}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className="app__form">
          <StudentForm
            initialData={editingStudent}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
          />
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
