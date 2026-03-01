from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from .config import get_settings

settings = get_settings()

connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.database_url,
    echo=False,
    connect_args=connect_args,
)

# For PostgreSQL: ensure schema exists and set search_path
if settings.database_url.startswith("postgresql"):

    @event.listens_for(engine, "connect")
    def set_search_path(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("CREATE SCHEMA IF NOT EXISTS crppr")
        cursor.execute("SET search_path TO crppr, public")
        cursor.close()
        dbapi_connection.commit()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
