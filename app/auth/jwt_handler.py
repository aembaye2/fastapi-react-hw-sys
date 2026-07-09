from jose import jwt, JWTError, ExpiredSignatureError
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from typing import Optional, Dict, Any, Set
from ..utils.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class JWTHandler:
    def __init__(self):
        self.settings = get_settings()
        self.secret_key = getattr(self.settings, 'secret_key', 'your-secret-key-change-in-production')
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
        self.refresh_token_expire_days = 7
        # In-memory blacklist (in production, use Redis or database)
        self.blacklisted_tokens: Set[str] = set()

    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)

        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access",
            "jti": f"{data.get('sub')}_{datetime.now(timezone.utc).timestamp()}"
        })
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)

        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "refresh",
            "jti": f"{data.get('sub')}_refresh_{datetime.now(timezone.utc).timestamp()}"
        })
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode JWT token, checking blacklist"""
        try:
            # First check if token is blacklisted
            if self.is_token_blacklisted(token):
                return None

            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            # Check if the JTI is blacklisted
            jti = payload.get('jti')
            if jti and jti in self.blacklisted_tokens:
                return None

            return payload
        except ExpiredSignatureError:
            return None
        except JWTError:
            return None

    def blacklist_token(self, token: str) -> bool:
        """Add token to blacklist"""
        try:
            # Decode token to get JTI
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            jti = payload.get('jti')

            if jti:
                self.blacklisted_tokens.add(jti)
                return True
            return False
        except (JWTError, ExpiredSignatureError):
            # Even if token is expired or invalid, we can try to blacklist the raw token
            self.blacklisted_tokens.add(token)
            return True

    def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            jti = payload.get('jti')
            return jti in self.blacklisted_tokens if jti else token in self.blacklisted_tokens
        except (JWTError, ExpiredSignatureError):
            return token in self.blacklisted_tokens

    def cleanup_expired_tokens(self):
        """Remove expired tokens from blacklist (should be run periodically)"""
        # This is a simple cleanup - in production, you'd want more sophisticated cleanup
        # For now, we'll keep all tokens in blacklist until server restart
        pass

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)


# Create a global instance
jwt_handler = JWTHandler()
