from .models import BaseSettingsSection


class NotesSettings(BaseSettingsSection):
    prefix = "notes"

    @property
    def min_entries(self):
        return self.get("min_entries", 2)

    @property
    def min_entities(self):
        return self.get("min_entities", 1)

    @property
    def max_clique_size(self):
        return self.get("max_clique_size", 4)

    @property
    def allow_dynamic_entry_class_creation(self):
        return self.get("allow_dynamic_entry_class_creation", False)


class UserSettings(BaseSettingsSection):
    prefix = "users"

    @property
    def require_admin_confirmation(self):
        return self.get("require_admin_confirmation", True)

    @property
    def require_email_confirmation(self):
        return self.get("require_email_confirmation", False)

    @property
    def allow_registration(self):
        return self.get("allow_registration", False)


class FileSettings(BaseSettingsSection):
    prefix = "files"

    @property
    def autoprocess_files(self):
        return self.get("autoprocess_files", True)

    @property
    def md5_subtype(self):
        return self.get("md5_subtype", "hash/md5")

    @property
    def sha1_subtype(self):
        return self.get("sha1_subtype", "hash/sha1")

    @property
    def sha256_subtype(self):
        return self.get("sha256_subtype", "hash/sha256")

    @property
    def mimetype_patterns(self):
        default_patterns = [
            "application/x-pie-executable",
            "application/vnd.microsoft.portable-executable",
            "application/x-dosexec",
            "application/x-msdownload",
            "application/x-executable",
            "application/pdf",
            "application/msword",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
        ]
        return self.get("mimetype_patterns", default_patterns)


class CradleSettings:
    def __init__(self):
        self.notes = NotesSettings()
        self.users = UserSettings()
        self.files = FileSettings()


cradle_settings = CradleSettings()
