"""Create the first admin account interactively."""
from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def main() -> None:
    import getpass

    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.core.config import settings
    from app.core.security import hash_password
    from app.db.models import Admin, Base

    engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)

    username = input("Admin username: ").strip()
    if not username:
        print("Username cannot be empty.")
        sys.exit(1)

    password = getpass.getpass("Admin password: ")
    if len(password) < 6:
        print("Password must be at least 6 characters.")
        sys.exit(1)

    with Session(engine) as session:
        existing = session.query(Admin).filter_by(username=username).first()
        if existing:
            print(f"Admin '{username}' already exists.")
            sys.exit(1)

        admin = Admin(username=username, password_hash=hash_password(password))
        session.add(admin)
        session.commit()
        print(f"Admin '{username}' created successfully (id={admin.id}).")


if __name__ == "__main__":
    main()
