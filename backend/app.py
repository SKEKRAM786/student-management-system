from flask import Flask
from flask_cors import CORS

from database import init_db
from students import students_bp

import models  # noqa: F401  # register models with SQLAlchemy


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///students.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    CORS(app)
    init_db(app)
    app.register_blueprint(students_bp, url_prefix="/api/students")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
