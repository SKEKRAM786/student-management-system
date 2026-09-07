import math
import re
from datetime import date

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from database import db
from models import EMAIL_PATTERN, VALID_ENROLLMENT_STATUSES, Student

students_bp = Blueprint("students", __name__)

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 10


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

    email, error = _require_non_empty_string(data, "email")
    if error:
        return error
    if not EMAIL_PATTERN.match(email):
        return json_error("email", "email must be a valid email format")

    existing = Student.query.filter_by(email=email).first()
    if existing:
        return json_error("email", "A student with this email already exists", 409)

    date_of_birth_raw = data.get("date_of_birth")
    if not isinstance(date_of_birth_raw, str) or not DATE_PATTERN.match(date_of_birth_raw):
        return json_error(
            "date_of_birth",
            "date_of_birth is required and must be a valid date in YYYY-MM-DD format",
        )
    try:
        date_of_birth = date.fromisoformat(date_of_birth_raw)
    except ValueError:
        return json_error(
            "date_of_birth",
            "date_of_birth is required and must be a valid date in YYYY-MM-DD format",
        )
    if date_of_birth > date.today():
        return json_error("date_of_birth", "date_of_birth must not be in the future")

    enrollment_status = data.get("enrollment_status")
    if enrollment_status not in VALID_ENROLLMENT_STATUSES:
        return json_error(
            "enrollment_status",
            'enrollment_status is required and must be exactly one of: "active", "graduated", "dropped"',
        )

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
