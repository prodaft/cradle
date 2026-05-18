from .models import BaseSettingsSection


class NotesSettings(BaseSettingsSection):
    """Note processing and linking settings."""

    prefix = "notes"

    @property
    def default_note_template(self):
        """Default template content for new notes."""
        return self.get("default_note_template", "")

    @property
    def min_entries(self):
        """Minimum entries required before a note is considered complete."""
        return self.get("min_entries", 2)

    @property
    def min_entities(self):
        """Minimum entities required before a note is considered complete."""
        return self.get("min_entities", 1)

    @property
    def max_clique_size(self):
        """Maximum clique size for smart linking."""
        return self.get("max_clique_size", 4)

    @property
    def allow_dynamic_entry_class_creation(self):
        """Whether to auto-create entry classes from note content."""
        return self.get("allow_dynamic_entry_class_creation", False)


class UserSettings(BaseSettingsSection):
    """User registration and confirmation settings."""

    prefix = "users"

    @property
    def require_admin_confirmation(self):
        """Whether new users need admin approval before access."""
        return self.get("require_admin_confirmation", True)

    @property
    def require_email_confirmation(self):
        """Whether new users must confirm their email."""
        return self.get("require_email_confirmation", False)

    @property
    def allow_registration(self):
        """Whether public registration is enabled."""
        return self.get("allow_registration", False)


class FileSettings(BaseSettingsSection):
    """File upload and processing settings."""

    prefix = "files"

    @property
    def upload_limit(self):
        """Max total upload size in bytes."""
        return self.get("upload_limit", 2**31)

    @property
    def autoprocess_files(self):
        """Whether to auto-process uploaded files."""
        return self.get("autoprocess_files", True)

    @property
    def md5_subtype(self):
        """MIME subtype for MD5 hashes."""
        return self.get("md5_subtype", "hash/md5")

    @property
    def sha1_subtype(self):
        """MIME subtype for SHA1 hashes."""
        return self.get("sha1_subtype", "hash/sha1")

    @property
    def sha256_subtype(self):
        """MIME subtype for SHA256 hashes."""
        return self.get("sha256_subtype", "hash/sha256")

    @property
    def max_file_size_for_hashing(self):
        """Max file size (bytes) to compute hashes for; larger files skip hashing."""
        return self.get("max_file_size_for_hashing", 10 * 1024 * 1024)  # 10MB


class CradleSettings:
    """Aggregate of all settings sections."""

    def __init__(self):
        self.notes = NotesSettings()
        self.users = UserSettings()
        self.files = FileSettings()


cradle_settings = CradleSettings()
