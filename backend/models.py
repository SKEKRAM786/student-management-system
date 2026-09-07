import re
from datetime import date, datetime, timezone

from sqlalchemy.orm import validates

from database import db

EMAIL_PATTERN = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
VALID_ENROLLMENT_STATUSES = ("active", "graduated", "dropped")


def utc_now():
    return datetime.now(timezone.utc)


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    date_of_birth = db.Column(db.Date, nullable=False)
    enrollment_status = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        db.CheckConstraint(
            "enrollment_status IN ('active', 'graduated', 'dropped')",
            name="ck_student_enrollment_status",
        ),
    )

    @validates("first_name", "last_name")
    def validate_required_name(self, key, value):
        if value is None or not str(value).strip():
            raise ValueError(f"{key} is required and cannot be empty")
        return str(value).strip()

    @validates("email")
    def validate_email(self, key, value):
        if value is None or not str(value).strip():
            raise ValueError("email is required and cannot be empty")
        email = str(value).strip()
        if not EMAIL_PATTERN.match(email):
            raise ValueError("email must be a valid email format")
        return email

    @validates("date_of_birth")
    def validate_date_of_birth(self, key, value):
        if value is None:
            raise ValueError("date_of_birth is required")
        if isinstance(value, str):
            try:
                value = date.fromisoformat(value)
            except ValueError as exc:
                raise ValueError("date_of_birth must be a valid date") from exc
        if value > date.today():
            raise ValueError("date_of_birth must not be in the future")
        return value

    @validates("enrollment_status")
    def validate_enrollment_status(self, key, value):
        if value is None or not str(value).strip():
            raise ValueError("enrollment_status is required")
        status = str(value).strip().lower()
        if status not in VALID_ENROLLMENT_STATUSES:
            raise ValueError(
                'enrollment_status must be one of: "active", "graduated", "dropped"'
            )
        return status

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "enrollment_status": self.enrollment_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
