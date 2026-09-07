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







