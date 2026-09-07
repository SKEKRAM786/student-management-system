import math
import re
from datetime import date

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from database import db
from models import EMAIL_PATTERN, VALID_ENROLLMENT_STATUSES, Student, utc_now

students_bp = Blueprint("students", __name__)

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 10
UPDATABLE_FIELDS = (
    "first_name",
    "last_name",
    "email",
    "date_of_birth",
    "enrollment_status",
)


def json_error(field, message, status=400):
    return jsonify({"error": field, "message": message}), status


def _require_non_empty_string(data, field):
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        return None, json_error(field, f"{field} is required and cannot be empty")
    return value.strip(), None


def _parse_positive_int(raw, field):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None, json_error(field, f"{field} must be a positive integer")
    if value < 1:
        return None, json_error(field, f"{field} must be a positive integer")
    return value, None


def _validate_email(value, exclude_student_id=None):
    if not isinstance(value, str) or not value.strip():
        return None, json_error("email", "email is required and cannot be empty")
    email = value.strip()
    if not EMAIL_PATTERN.match(email):
        return None, json_error("email", "email must be a valid email format")

    query = Student.query.filter_by(email=email)
    if exclude_student_id is not None:
        query = query.filter(Student.id != exclude_student_id)
    if query.first():
        return None, json_error("email", "A student with this email already exists", 409)
    return email, None


def _validate_date_of_birth(value):
    if not isinstance(value, str) or not DATE_PATTERN.match(value):
        return None, json_error(
            "date_of_birth",
            "date_of_birth is required and must be a valid date in YYYY-MM-DD format",
        )
    try:
        date_of_birth = date.fromisoformat(value)
    except ValueError:
        return None, json_error(
            "date_of_birth",
            "date_of_birth is required and must be a valid date in YYYY-MM-DD format",
        )
    if date_of_birth > date.today():
        return None, json_error("date_of_birth", "date_of_birth must not be in the future")
    return date_of_birth, None


def _validate_enrollment_status(value):
    if value not in VALID_ENROLLMENT_STATUSES:
        return None, json_error(
            "enrollment_status",
            'enrollment_status is required and must be exactly one of: "active", "graduated", "dropped"',
        )
    return value, None


def _get_student_or_404(student_id):
    try:
        parsed_id = int(student_id)
    except (TypeError, ValueError):
        return None, json_error("id", "Student not found", 404)
    if parsed_id < 1:
        return None, json_error("id", "Student not found", 404)

    student = db.session.get(Student, parsed_id)
    if student is None:
        return None, json_error("id", "Student not found", 404)
    return student, None


@students_bp.route("/students", methods=["GET"])
def list_students():
    page_raw = request.args.get("page")
    if page_raw is None:
        page = DEFAULT_PAGE
    else:
        page, error = _parse_positive_int(page_raw, "page")
        if error:
            return error

    if "page_size" in request.args:
        page_size, error = _parse_positive_int(request.args.get("page_size"), "page_size")
        if error:
            return error
    elif "limit" in request.args:
        page_size, error = _parse_positive_int(request.args.get("limit"), "limit")
        if error:
            return error
    else:
        page_size = DEFAULT_PAGE_SIZE

    status = request.args.get("status")
    if status is not None:
        if status not in VALID_ENROLLMENT_STATUSES:
            return json_error(
                "status",
                'status must be one of: "active", "graduated", "dropped"',
            )

    query = Student.query
    if status is not None:
        query = query.filter_by(enrollment_status=status)

    total = query.count()
    total_pages = math.ceil(total / page_size) if total else 0
    students = (
        query.order_by(Student.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return jsonify(
        {
            "data": [student.to_dict() for student in students],
            "pagination": {
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
            },
        }
    ), 200


@students_bp.route("/students", methods=["POST"])
def create_student():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return json_error("body", "Request body must be valid JSON")

    first_name, error = _require_non_empty_string(data, "first_name")
    if error:
        return error

    last_name, error = _require_non_empty_string(data, "last_name")
    if error:
        return error

    email, error = _validate_email(data.get("email"))
    if error:
        return error

    date_of_birth, error = _validate_date_of_birth(data.get("date_of_birth"))
    if error:
        return error

    enrollment_status, error = _validate_enrollment_status(data.get("enrollment_status"))
    if error:
        return error

    student = Student(
        first_name=first_name,
        last_name=last_name,
        email=email,
        date_of_birth=date_of_birth,
        enrollment_status=enrollment_status,
    )

    try:
        db.session.add(student)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return json_error("email", "A student with this email already exists", 409)

    return jsonify(student.to_dict()), 201


@students_bp.route("/students/<student_id>", methods=["GET"])
def get_student(student_id):
    student, error = _get_student_or_404(student_id)
    if error:
        return error
    return jsonify(student.to_dict()), 200


@students_bp.route("/students/<student_id>", methods=["PUT", "PATCH"])
def update_student(student_id):
    student, error = _get_student_or_404(student_id)
    if error:
        return error

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return json_error("body", "Request body must be valid JSON")

    updates = {field: data[field] for field in UPDATABLE_FIELDS if field in data}
    if not updates:
        return json_error("body", "No updatable fields were provided")

    if "first_name" in updates:
        first_name, error = _require_non_empty_string(updates, "first_name")
        if error:
            return error
        student.first_name = first_name

    if "last_name" in updates:
        last_name, error = _require_non_empty_string(updates, "last_name")
        if error:
            return error
        student.last_name = last_name

    if "email" in updates:
        email, error = _validate_email(updates["email"], exclude_student_id=student.id)
        if error:
            return error
        student.email = email

    if "date_of_birth" in updates:
        date_of_birth, error = _validate_date_of_birth(updates["date_of_birth"])
        if error:
            return error
        student.date_of_birth = date_of_birth

    if "enrollment_status" in updates:
        enrollment_status, error = _validate_enrollment_status(updates["enrollment_status"])
        if error:
            return error
        student.enrollment_status = enrollment_status

    student.updated_at = utc_now()

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return json_error("email", "A student with this email already exists", 409)

    return jsonify(student.to_dict()), 200


@students_bp.route("/students/<student_id>", methods=["DELETE"])
def delete_student(student_id):
    student, error = _get_student_or_404(student_id)
    if error:
        return error

    db.session.delete(student)
    db.session.commit()
    return "", 204
