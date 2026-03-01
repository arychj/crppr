"""
Shared test fixtures.

Uses a file-based SQLite database so Alembic migrations can run.
"""

import os
import pytest
from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from api.models import Base
from api.database import get_db
from api.main import app

SQLALCHEMY_TEST_URL = "sqlite:///test_crppr.db"

engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

_BACKEND_DIR = Path(__file__).resolve().parent.parent


def _get_test_alembic_cfg():
    cfg = AlembicConfig(str(_BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", SQLALCHEMY_TEST_URL)
    return cfg


@pytest.fixture(autouse=True)
def setup_database():
    """Create all tables before each test via Alembic, drop after."""
    # Drop everything including alembic_version for a clean slate
    Base.metadata.drop_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conn.commit()
    # Run Alembic migrations against the test database
    command.upgrade(_get_test_alembic_cfg(), "head")
    yield
    Base.metadata.drop_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conn.commit()


@pytest.fixture()
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db):
    """FastAPI TestClient wired to the test database."""

    def _override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
