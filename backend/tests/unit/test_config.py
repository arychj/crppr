"""Unit tests for the Settings config and database_url property."""

from api.config import Settings


def test_default_sqlite_url():
    s = Settings(db_type="sqlite", db_name="test")
    assert s.database_url == "sqlite:///test.db"


def test_postgres_url():
    s = Settings(
        db_type="postgresql",
        db_host="db.example.com",
        db_port=5432,
        db_name="mydb",
        db_user="user",
        db_password="pass",
    )
    assert s.database_url == "postgresql://user:pass@db.example.com:5432/mydb"


def test_custom_port():
    s = Settings(
        db_type="postgresql",
        db_host="localhost",
        db_port=15432,
        db_name="crppr",
        db_user="u",
        db_password="p",
    )
    assert ":15432/" in s.database_url
