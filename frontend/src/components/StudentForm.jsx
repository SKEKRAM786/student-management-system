import { useEffect, useState } from "react";

import "./StudentForm.css";

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const FIELD_NAMES = [
  "first_name",
  "last_name",
  "email",
  "date_of_birth",
  "enrollment_status",
];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  date_of_birth: "",
  enrollment_status: "",
};

function todayLocalISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formFromInitial(initialData) {
  if (!initialData) {
    return { ...EMPTY_FORM };
  }

  return {
    first_name: initialData.first_name ?? "",
    last_name: initialData.last_name ?? "",
    email: initialData.email ?? "",
    date_of_birth: initialData.date_of_birth ?? "",
    enrollment_status: initialData.enrollment_status ?? "",
  };
}

function validate(values) {
  const errors = {};

  if (!values.first_name.trim()) {
    errors.first_name = "First name is required";
  }
  if (!values.last_name.trim()) {
    errors.last_name = "Last name is required";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Email is required";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (!values.date_of_birth) {
    errors.date_of_birth = "Date of birth is required";
  } else if (values.date_of_birth > todayLocalISO()) {
    errors.date_of_birth = "Date of birth must not be in the future";
  }

  if (!values.enrollment_status) {
    errors.enrollment_status = "Enrollment status is required";
  }

  return errors;
}

export default function StudentForm({ initialData, onSubmit, onCancel }) {
  const isEdit = Boolean(initialData);
  const [values, setValues] = useState(() => formFromInitial(initialData));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValues(formFromInitial(initialData));
    setFieldErrors({});
    setFormError("");
  }, [initialData]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validate(values);
    setFieldErrors(errors);
    setFormError("");

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim(),
        date_of_birth: values.date_of_birth,
        enrollment_status: values.enrollment_status,
      });
      setFieldErrors({});
      setFormError("");
      if (!isEdit) {
        setValues({ ...EMPTY_FORM });
      }
    } catch (err) {
      const message = err.message || "Unable to save student.";
      if (err.field && FIELD_NAMES.includes(err.field)) {
        setFieldErrors({ [err.field]: message });
      } else {
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="student-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEdit ? "Edit student" : "Add student"}</h2>

      {formError && (
        <p className="student-form__form-error" role="alert">
          {formError}
        </p>
      )}

      <label className="student-form__field">
        First name
        <input
          name="first_name"
          value={values.first_name}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.first_name)}
          aria-describedby={fieldErrors.first_name ? "first_name-error" : undefined}
        />
        {fieldErrors.first_name && (
          <span id="first_name-error" className="student-form__error">
            {fieldErrors.first_name}
          </span>
        )}
      </label>

      <label className="student-form__field">
        Last name
        <input
          name="last_name"
          value={values.last_name}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.last_name)}
          aria-describedby={fieldErrors.last_name ? "last_name-error" : undefined}
        />
        {fieldErrors.last_name && (
          <span id="last_name-error" className="student-form__error">
            {fieldErrors.last_name}
          </span>
        )}
      </label>

      <label className="student-form__field">
        Email
        <input
          type="email"
          name="email"
          value={values.email}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
        {fieldErrors.email && (
          <span id="email-error" className="student-form__error">
            {fieldErrors.email}
          </span>
        )}
      </label>

      <label className="student-form__field">
        Date of birth
        <input
          type="date"
          name="date_of_birth"
          value={values.date_of_birth}
          onChange={handleChange}
          max={todayLocalISO()}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.date_of_birth)}
          aria-describedby={fieldErrors.date_of_birth ? "date_of_birth-error" : undefined}
        />
        {fieldErrors.date_of_birth && (
          <span id="date_of_birth-error" className="student-form__error">
            {fieldErrors.date_of_birth}
          </span>
        )}
      </label>

      <label className="student-form__field">
        Enrollment status
        <select
          name="enrollment_status"
          value={values.enrollment_status}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.enrollment_status)}
          aria-describedby={
            fieldErrors.enrollment_status ? "enrollment_status-error" : undefined
          }
        >
          <option value="">Select status</option>
          <option value="active">active</option>
          <option value="graduated">graduated</option>
          <option value="dropped">dropped</option>
        </select>
        {fieldErrors.enrollment_status && (
          <span id="enrollment_status-error" className="student-form__error">
            {fieldErrors.enrollment_status}
          </span>
        )}
      </label>

      <div className="student-form__actions">
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create student"}
        </button>
      </div>
    </form>
  );
}
