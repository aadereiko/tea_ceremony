import hashlib
import secrets
import time
from collections import defaultdict, deque

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.config import get_settings

_hasher = PasswordHasher()
SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def new_slug() -> str:
    return "".join(secrets.choice(SLUG_ALPHABET) for _ in range(8))


def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    # Tokens are 256 random bits, so a fast hash is enough; it only has to stop a leaked
    # database from being usable as a list of live logins.
    return hashlib.sha256(token.encode()).hexdigest()


class FailedJoinLimiter:
    """Per-room count of wrong passwords, so a room password can't be guessed at full speed.

    In memory on purpose: it resets on restart and isn't shared between instances, which is
    acceptable for one small app process and keeps the deploy free of Redis.
    """

    def __init__(self) -> None:
        self._failures: dict[str, deque[float]] = defaultdict(deque)

    def _recent(self, key: str) -> deque[float]:
        window = get_settings().failed_join_window_seconds
        failures = self._failures[key]
        cutoff = time.monotonic() - window
        while failures and failures[0] < cutoff:
            failures.popleft()
        return failures

    def blocked(self, key: str) -> bool:
        return len(self._recent(key)) >= get_settings().max_failed_joins

    def record_failure(self, key: str) -> None:
        self._recent(key).append(time.monotonic())

    def reset(self) -> None:
        self._failures.clear()


failed_joins = FailedJoinLimiter()
