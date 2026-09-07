import { useEffect, useState } from "react";

import { getStudents } from "../services/api";
import "./StudentList.css";

const PAGE_SIZE = 10;
const EMPTY_PAGINATION = {
  total: 0,
  page: 1,
  page_size: PAGE_SIZE,
  total_pages: 0,
};

function statusLabel(status) {
  if (!status) {
    return "";
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function StudentList({ onEdit, onDelete, onAdd, refreshKey = 0 }) {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchStudents() {
      setLoading(true);
      setError(null);
      setStudents([]);
      setPagination(EMPTY_PAGINATION);

      try {
        const response = await getStudents({
          page,
          pageSize: PAGE_SIZE,
          ...(status ? { status } : {}),
        });
        if (cancelled) {
          return;
        }
        setStudents(response.data ?? []);
        setPagination(response.pagination ?? EMPTY_PAGINATION);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setStudents([]);
        setError(err.message || "Failed to load students.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchStudents();

    return () => {
      cancelled = true;
    };
  }, [page, status, refreshIndex, refreshKey]);

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setPage(1);
  }

  const totalPages = pagination.total_pages ?? 0;
  const canGoPrevious = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;

  return (
    <section className="student-list">
      <header className="student-list__header">
        <div>
          <h2>Directory</h2>
          <p className="student-list__meta">
            {loading ? "Loading records..." : `${pagination.total} student${pagination.total === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="student-list__controls">
          <label className="student-list__filter">
            Status
            <select value={status} onChange={handleStatusChange}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="graduated">Graduated</option>
              <option value="dropped">Dropped</option>
            </select>
          </label>
          {onAdd && (
            <button type="button" className="student-list__add" onClick={onAdd}>
              Add Student
            </button>
          )}
        </div>
      </header>

      {loading && (
        <div className="student-list__panel student-list__status" aria-live="polite">
          <span className="student-list__spinner" aria-hidden="true" />
          Loading students...
        </div>
      )}

      {error && !loading && (
        <div className="student-list__panel student-list__error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setRefreshIndex((value) => value + 1)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && students.length === 0 && (
        <div className="student-list__panel student-list__empty">
          <h3>No students found</h3>
          <p>
            {status
              ? "No records match this enrollment status."
              : "Add a student to get started."}
          </p>
          {!status && onAdd && (
            <button type="button" className="student-list__add" onClick={onAdd}>
              Add Student
            </button>
          )}
        </div>
      )}

      {!loading && !error && students.length > 0 && (
        <>
          <div className="student-list__table-wrap">
            <table className="student-list__table">
              <thead>
                <tr>
                  <th>First name</th>
                  <th>Last name</th>
                  <th>Email</th>
                  <th>Date of birth</th>
                  <th>Enrollment status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.first_name}</td>
                    <td>{student.last_name}</td>
                    <td>{student.email}</td>
                    <td>{student.date_of_birth}</td>
                    <td>
                      <span className={`status-badge status-badge--${student.enrollment_status}`}>
                        {statusLabel(student.enrollment_status)}
                      </span>
                    </td>
                    <td className="student-list__actions">
                      <button type="button" onClick={() => onEdit(student)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="student-list__delete"
                        onClick={() => onDelete(student.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="student-list__pagination" aria-label="Student list pagination">
            <button
              type="button"
              disabled={!canGoPrevious}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span>
              Page {pagination.page ?? page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
