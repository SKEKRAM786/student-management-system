Design Notes

Brief notes on the data model, API design, component structure, and key decisions made across both layers.

## Student

| Field | Type | Rules |
| :--- | :--- | :--- |
| `id` | integer | Server-generated, primary key, auto-increment |
| `first_name` | string | Required, non-empty |
| `last_name` | string | Required, non-empty |
| `email` | string | Required, unique, valid email format |
| `date_of_birth` | date | Required, valid date, not in the future |
| `enrollment_status` | string | One of: `active`, `graduated`, `dropped` |
| `created_at` | datetime | Set once on creation, server-managed |
| `updated_at` | datetime | Updated on every write, server-managed |


Why this shape: the assignment's field list was already well-scoped, so I kept the model a direct 1:1 mapping rather than adding speculative fields (e.g. no middle_name, phone, or address — none were asked for, and adding them would go against the "don't over-build it" guidance). Validation is enforced primarily in the route layer rather than the model, so error messages can be tailored per-field and returned as clear JSON rather than raw SQLAlchemy exceptions.

## API Design

REST resource: `/students`

| Method | Route | Purpose | Success | Failure |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/students` | Create a student | 201 | 400 (validation), 409 (duplicate email) |
| GET | `/students` | List students (paginated, filterable) | 200 | 400 (bad query params) |
| GET | `/students/{id}` | Fetch one student | 200 | 404 |
| PUT | `/students/{id}` | Update a student | 200 | 400, 404, 409 |
| DELETE | `/students/{id}` | Delete a student | 204 | 404 |




Key decisions:

API layer is fully isolated in services/api.js. Components only ever call functions like getStudents(), createStudent() — never axios.get(...) directly. This was a hard requirement in the brief and keeps the components testable/swappable independent of the HTTP client.
Form is "dumb" about persistence — StudentForm only validates and calls onSubmit(data); it doesn't know whether that's a create or an edit. App.jsx decides which API call to make based on whether editingStudent is set. This keeps the form reusable for both flows without branching logic inside it.
List owns its own fetch state (loading/error/data) rather than lifting it all the way to App.jsx — since the list is the only thing that needs to react to page/filter changes, this avoids unnecessary re-renders and prop drilling.
Errors are surfaced, not swallowed — every API call that can fail (create, update, delete, list fetch) has a corresponding UI state: a loading indicator, an inline form error, or a list-level error banner with retry. This was explicitly required and tested manually against a stopped backend to confirm nothing fails silently.


