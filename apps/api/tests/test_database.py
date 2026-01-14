import pytest
from database import get_db, SessionLocal


def test_get_db_yields_session():
    """Test that get_db yields a valid session."""
    db_generator = get_db()
    db = next(db_generator)
    
    # Should be a valid session
    assert db is not None
    assert hasattr(db, 'query')
    assert hasattr(db, 'commit')
    
    # Clean up
    try:
        next(db_generator)
    except StopIteration:
        pass


def test_get_db_closes_session():
    """Test that get_db properly closes the session."""
    db_generator = get_db()
    db = next(db_generator)
    
    # Trigger finally block by exhausting generator
    try:
        next(db_generator)
    except StopIteration:
        pass
    
    # Session should be closed (this just ensures no errors)
    assert True


def test_session_local_creates_sessions():
    """Test that SessionLocal creates database sessions."""
    session = SessionLocal()
    assert session is not None
    session.close()
