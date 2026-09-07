from pathlib import Path

from flask import Flask
from flask_cors import CORS

from database import init_db
from students import students_bp

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "students.db"


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH.as_posix()}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    CORS(app)
    init_db(app)
    app.register_blueprint(students_bp, url_prefix="/api/students")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
