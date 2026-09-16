"""FastAPI Authentication Dependency & Clerk User Mapping."""

from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, DeveloperProfile


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Extract Clerk User ID from Authorization Bearer token or X-Clerk-User-Id header, and map to PostgreSQL User."""
    clerk_id = request.headers.get("X-Clerk-User-Id")
    
    # Also check Authorization header Bearer token
    auth_header = request.headers.get("Authorization")
    if not clerk_id and auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        if token and token != "undefined" and token != "null":
            clerk_id = token

    if not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Clerk User ID or Authorization token.",
        )

    # Find existing user in PostgreSQL
    user = db.query(User).filter(User.clerk_user_id == clerk_id).first()

    if not user:
        # Create new PostgreSQL User for first-time Clerk login
        user = User(
            clerk_user_id=clerk_id,
            email=f"{clerk_id.lower()}@knowledgemesh.ai",
            full_name="Knowledge Mesh Developer",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        profile = DeveloperProfile(user_id=user.id)
        db.add(profile)
        db.commit()

    return user
