import os
import sys
import json
import uuid
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

# Ensure Windows terminal doesn't crash on standard UTF-8 characters
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Paths
BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
BACKEND_ENV = BACKEND_DIR / ".env"
ROOT_ENV = ROOT_DIR / ".env"
UPLOADS_DIR = ROOT_DIR / "public" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _load_env_files() -> None:
    """
    Loads environment variables from backend/.env and root .env without hardcoding credentials.
    """
    env_files = [ROOT_ENV, BACKEND_ENV]
    for env_path in env_files:
        if not env_path.exists():
            continue
        try:
            from dotenv import load_dotenv
            load_dotenv(env_path, override=True)
        except ImportError:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip().strip("'\"")
                        if k:
                            os.environ[k] = v


# Load environment variables at module import
_load_env_files()

try:
    from pymongo import MongoClient, ASCENDING, DESCENDING
    from pymongo.errors import PyMongoError, ConnectionFailure, ServerSelectionTimeoutError, OperationFailure
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False
    MongoClient = None

DB_NAME = os.environ.get("MONGODB_DB_NAME", "animal_disease_ai").strip() or "animal_disease_ai"


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA512 (10,000 iterations, 64-byte key)."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt.encode('utf-8'), 10000, dklen=64)
    return f"{salt}:{dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against salt:hash format."""
    if not stored_hash or ':' not in stored_hash:
        return False
    salt, orig_hash = stored_hash.split(':', 1)
    dk = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt.encode('utf-8'), 10000, dklen=64)
    return hmac.compare_digest(dk.hex(), orig_hash)


def clean_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Strips MongoDB internal _id field so documents are cleanly JSON serializable."""
    if not doc:
        return None
    d = dict(doc)
    d.pop("_id", None)
    return d


class MongoDatabase:
    def __init__(self, db_name: Optional[str] = None):
        self.db_name = db_name or os.environ.get("MONGODB_DB_NAME", "animal_disease_ai").strip() or "animal_disease_ai"
        self.client: Optional[Any] = None
        self.db: Optional[Any] = None
        self.is_connected = False
        self.last_error: Optional[str] = None
        self._initialize()

    def _get_uri(self) -> str:
        # Strictly read MONGODB_URI from environment (.env) - NEVER hardcoded
        _load_env_files()
        return os.environ.get("MONGODB_URI", "").strip()

    def _initialize(self) -> None:
        if not PYMONGO_AVAILABLE:
            self.last_error = "pymongo package is not installed. Please run: pip install pymongo dnspython"
            return

        uri = self._get_uri()
        if not uri or "<" in uri:
            self.last_error = "MONGODB_URI is not set or contains placeholders in backend/.env"
            return

        try:
            client_kwargs: Dict[str, Any] = {
                "serverSelectionTimeoutMS": 5000,
                "connectTimeoutMS": 5000,
                "socketTimeoutMS": 10000,
                "appname": "PashuDrishti-AI"
            }
            try:
                import certifi
                client_kwargs["tlsCAFile"] = certifi.where()
            except ImportError:
                pass

            self.client = MongoClient(uri, **client_kwargs)
            self.db_name = os.environ.get("MONGODB_DB_NAME", self.db_name).strip() or self.db_name
            self.db = self.client[self.db_name]
        except Exception as e:
            self.last_error = str(e)
            self.is_connected = False

    def connect(self) -> bool:
        """
        Tests the connection to MongoDB Atlas by pinging the admin database.
        Prints 'MongoDB Atlas connected successfully' on success.
        If connection fails, prints the actual connection error clearly.
        """
        if not PYMONGO_AVAILABLE:
            self.is_connected = False
            self.last_error = "pymongo is not installed. Run: pip install pymongo dnspython"
            print("\n" + "=" * 60)
            print("[MongoDB Atlas] Connection Error: pymongo package is not installed.")
            print("  Please run: pip install pymongo dnspython")
            print("=" * 60 + "\n")
            return False

        uri = self._get_uri()
        if not uri or "<" in uri:
            self.is_connected = False
            self.last_error = "MONGODB_URI is not configured in backend/.env"
            print("\n" + "=" * 60)
            print("[MongoDB Atlas] Connection Error: MONGODB_URI is not configured.")
            print("  Please add MONGODB_URI=<your_connection_string> in backend/.env")
            print("=" * 60 + "\n")
            return False

        if not self.client:
            self._initialize()

        if self.client is None:
            self.is_connected = False
            print("\n" + "=" * 60)
            print(f"[MongoDB Atlas] Connection Error: {self.last_error or 'Failed to create MongoClient'}")
            print("=" * 60 + "\n")
            return False

        try:
            # Ping admin database to verify active connection
            self.client.admin.command('ping')
            self.is_connected = True
            self.last_error = None

            print("\n" + "=" * 60)
            print("MongoDB Atlas connected successfully")
            print(f"Database:    {self.db_name}")
            print("Collections: users, analyses, sessions")
            print("=" * 60 + "\n")

            # Setup indexes
            self._setup_indexes()

            # One-time migration of seed users/analyses if database is brand new
            self._migrate_legacy_json_if_needed()

            return True

        except (ConnectionFailure, ServerSelectionTimeoutError) as conn_err:
            self.is_connected = False
            self.last_error = str(conn_err)
            print("\n" + "=" * 60)
            print("[MongoDB Atlas] Connection Error:")
            print(f"  {self.last_error}")
            if "SSL" in self.last_error or "tlsv1 alert internal error" in self.last_error or "Timeout" in self.last_error:
                print("\n  [Tip] MongoDB Atlas Network Access:")
                print("  Make sure your current IP address is whitelisted in MongoDB Atlas:")
                print("  1. Log in to https://cloud.mongodb.com")
                print("  2. Navigate to 'Network Access' -> 'IP Access List'")
                print("  3. Click 'Add IP Address' -> Add Current IP Address (or 0.0.0.0/0 for testing)")
            print("=" * 60 + "\n")
            return False

        except OperationFailure as op_err:
            self.is_connected = False
            self.last_error = str(op_err)
            print("\n" + "=" * 60)
            print("[MongoDB Atlas] Connection Error (Authentication):")
            print(f"  {self.last_error}")
            print("  [Tip] Verify your MongoDB Atlas username and password in backend/.env")
            print("=" * 60 + "\n")
            return False

        except Exception as err:
            self.is_connected = False
            self.last_error = str(err)
            print("\n" + "=" * 60)
            print(f"[MongoDB Atlas] Connection Error: {self.last_error}")
            print("=" * 60 + "\n")
            return False

    def _setup_indexes(self) -> None:
        """Ensures optimized unique indexes for users, analyses, and TTL for sessions."""
        if not self.is_connected or self.db is None:
            return
        try:
            users_col = self.db["users"]
            users_col.create_index("email", unique=True)
            users_col.create_index("id", unique=True)

            analyses_col = self.db["analyses"]
            analyses_col.create_index("id", unique=True)
            analyses_col.create_index("userId")
            analyses_col.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])

            sessions_col = self.db["sessions"]
            sessions_col.create_index("token", unique=True)
            sessions_col.create_index("expiresAt", expireAfterSeconds=0)
        except Exception as idx_err:
            print(f"[MongoDB Atlas] Note on index creation: {idx_err}")

    def _migrate_legacy_json_if_needed(self) -> None:
        """
        If MongoDB 'users' collection is empty and a legacy JSON database exists,
        migrates the existing users and records into Atlas so existing accounts continue working.
        """
        if not self.is_connected or self.db is None:
            return
        try:
            users_count = self.db["users"].count_documents({})
            if users_count > 0:
                return  # Database already has data, no migration needed

            legacy_json = ROOT_DIR / "data" / "pashu_drishti_db.json"
            if not legacy_json.exists():
                return

            with open(legacy_json, "r", encoding="utf-8") as f:
                data = json.load(f)

            legacy_users = data.get("users", [])
            legacy_analyses = data.get("analyses", [])

            if legacy_users:
                sanitized_users = []
                for u in legacy_users:
                    doc = dict(u)
                    doc.pop("_id", None)
                    sanitized_users.append(doc)
                self.db["users"].insert_many(sanitized_users)
                print(f"[MongoDB Atlas] Migrated {len(sanitized_users)} user accounts to 'users' collection.")

            if legacy_analyses:
                sanitized_analyses = []
                for a in legacy_analyses:
                    doc = dict(a)
                    doc.pop("_id", None)
                    sanitized_analyses.append(doc)
                self.db["analyses"].insert_many(sanitized_analyses)
                print(f"[MongoDB Atlas] Migrated {len(sanitized_analyses)} diagnostic history records to 'analyses' collection.")

        except Exception as mig_err:
            print(f"[MongoDB Atlas] Legacy data migration check note: {mig_err}")

    def get_status(self) -> Dict[str, Any]:
        """Diagnostic health information about the MongoDB Atlas connection."""
        if not self.is_connected:
            self.connect()

        if self.is_connected and self.db is not None:
            try:
                users_count = self.db["users"].count_documents({})
                analyses_count = self.db["analyses"].count_documents({})
                return {
                    "connected": True,
                    "database": "MongoDB Atlas",
                    "databaseName": self.db_name,
                    "collections": ["users", "analyses", "sessions"],
                    "counts": {
                        "users": users_count,
                        "analyses": analyses_count
                    },
                    "message": "MongoDB Atlas connected successfully"
                }
            except Exception as e:
                return {
                    "connected": False,
                    "database": "MongoDB Atlas",
                    "databaseName": self.db_name,
                    "error": str(e),
                    "message": "Connected but failed to fetch statistics"
                }

        return {
            "connected": False,
            "database": "MongoDB Atlas",
            "databaseName": self.db_name,
            "error": self.last_error or "Not connected to MongoDB Atlas. Check MONGODB_URI in backend/.env",
            "message": "Disconnected"
        }

    def _ensure_connected(self) -> None:
        """Helper to ensure DB is connected before operations."""
        if not self.is_connected:
            self.connect()
        if not self.is_connected or self.db is None:
            raise RuntimeError(f"MongoDB Atlas is not connected: {self.last_error or 'Check backend/.env connection string'}")

    # ---------------------------------------------------- User Operations
    def find_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        self._ensure_connected()
        target = email.strip().lower()
        doc = self.db["users"].find_one({"email": target})
        return clean_doc(doc)

    def find_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        self._ensure_connected()
        doc = self.db["users"].find_one({"id": user_id})
        return clean_doc(doc)

    def create_user(self, name: str, email: str, password_hash: str, role: str = "vet") -> Dict[str, Any]:
        self._ensure_connected()
        now = datetime.now(timezone.utc).isoformat()
        new_user = {
            "id": f"user-{uuid.uuid4()}",
            "name": name.strip(),
            "email": email.strip().lower(),
            "passwordHash": password_hash,
            "role": role if role in ["farmer", "researcher", "vet"] else "vet",
            "createdAt": now,
            "updatedAt": now
        }
        self.db["users"].insert_one(dict(new_user))
        return clean_doc(new_user)

    # ---------------------------------------------------- Session Operations
    def create_session(self, user_id: str, remember_me: bool = True) -> Dict[str, Any]:
        self._ensure_connected()
        now = datetime.now(timezone.utc)
        duration_days = 30 if remember_me else 1
        expires_at = now + timedelta(days=duration_days)

        session = {
            "token": secrets.token_hex(32),
            "userId": user_id,
            "createdAt": now.isoformat(),
            "expiresAt": expires_at.isoformat()
        }
        self.db["sessions"].insert_one(dict(session))
        return clean_doc(session)

    def get_session(self, token: str) -> Optional[Dict[str, Any]]:
        self._ensure_connected()
        doc = self.db["sessions"].find_one({"token": token})
        if not doc:
            return None

        now_iso = datetime.now(timezone.utc).isoformat()
        if doc.get("expiresAt", "") < now_iso:
            self.delete_session(token)
            return None
        return clean_doc(doc)

    def delete_session(self, token: str) -> None:
        self._ensure_connected()
        self.db["sessions"].delete_one({"token": token})

    # ---------------------------------------------------- Analyses Operations
    def get_analyses_by_user_id(self, user_id: str) -> List[Dict[str, Any]]:
        self._ensure_connected()
        cursor = self.db["analyses"].find({"userId": user_id}).sort("createdAt", DESCENDING)
        return [clean_doc(a) for a in cursor]

    def get_analysis_by_id(self, analysis_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        self._ensure_connected()
        doc = self.db["analyses"].find_one({"id": analysis_id, "userId": user_id})
        return clean_doc(doc)

    def create_analysis(self, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Stores animal disease analysis history in MongoDB Atlas 'analyses' collection.
        Guarantees required fields:
          - userId
          - animalType
          - predictedDisease
          - confidence
          - imageUrl
          - createdAt
        """
        self._ensure_connected()
        now = datetime.now(timezone.utc).isoformat()

        disease = (
            analysis_data.get("predictedDisease")
            or analysis_data.get("possibleDisease")
            or "Unknown Condition"
        )
        conf_val = float(analysis_data.get("confidence", 85.0))

        new_analysis = {
            **analysis_data,
            "id": analysis_data.get("id") or f"analysis-{uuid.uuid4()}",
            "userId": str(analysis_data.get("userId", "")),
            "animalType": str(analysis_data.get("animalType", "Cattle")),
            "predictedDisease": str(disease),
            "confidence": conf_val,
            "imageUrl": str(analysis_data.get("imageUrl", "")),
            "createdAt": analysis_data.get("createdAt") or now
        }
        self.db["analyses"].insert_one(dict(new_analysis))
        return clean_doc(new_analysis)

    def delete_analysis(self, analysis_id: str, user_id: str) -> bool:
        self._ensure_connected()
        res = self.db["analyses"].delete_one({"id": analysis_id, "userId": user_id})
        return res.deleted_count > 0

    # ---------------------------------------------------- Image Upload Operations
    def save_uploaded_image(self, base64_data: str, original_name: str = "scan.jpg") -> str:
        import base64
        ext = ".jpg"
        clean_base64 = base64_data

        if base64_data.startswith("data:"):
            header, clean_base64 = base64_data.split(",", 1)
            if "image/png" in header:
                ext = ".png"
            elif "image/webp" in header:
                ext = ".webp"
            elif "image/gif" in header:
                ext = ".gif"

        image_bytes = base64.b64decode(clean_base64)
        filename = f"scan-{int(datetime.now().timestamp() * 1000)}-{secrets.token_hex(6)}{ext}"
        filepath = UPLOADS_DIR / filename
        with open(filepath, "wb") as f:
            f.write(image_bytes)

        return f"/uploads/{filename}"


# Global database instance
db = MongoDatabase()
