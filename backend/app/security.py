from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from .config import get_settings
from .database import get_db
from .models import User


class SafePasswordHasher:
    def __init__(self):
        try:
            from pwdlib import PasswordHash
            self._pwdlib_hasher = PasswordHash.recommended()
        except Exception:
            self._pwdlib_hasher = None

    def hash(self, password: str) -> str:
        if self._pwdlib_hasher:
            try:
                return self._pwdlib_hasher.hash(password)
            except Exception:
                pass
        salt = os.urandom(16).hex()
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return f"pbkdf2:sha256:100000${salt}${dk.hex()}"

    def verify(self, password: str, hashed: str) -> bool:
        if hashed.startswith("pbkdf2:"):
            try:
                _, _, iterations, salt, key = hashed.split("$")
                dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iterations))
                return hmac.compare_digest(dk.hex(), key)
            except Exception:
                return False
        if self._pwdlib_hasher:
            try:
                return self._pwdlib_hasher.verify(password, hashed)
            except Exception:
                pass
        return False


password_hash = SafePasswordHasher()
bearer = HTTPBearer(auto_error=False)


def create_access_token(user_id: int) -> str:
    settings = get_settings()
    payload = {"sub": str(user_id), "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        user_id = int(jwt.decode(credentials.credentials, get_settings().jwt_secret, algorithms=[get_settings().jwt_algorithm])["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found")
    return user
