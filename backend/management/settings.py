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


class GraphSettings(BaseSettingsSection):
    prefix = "graph"

    @property
    def K(self):
        return self.get("K", 300)

    @property
    def p(self):
        return self.get("p", 2)

    @property
    def theta(self):
        return self.get("theta", 0.9)

    @property
    def max_level(self):
        return self.get("max_level", 10)

    @property
    def epsilon(self):
        return self.get("epsilon", 1e-3)

    @property
    def r(self):
        return self.get("r", 5)

    @property
    def max_iter(self):
        return self.get("max_iter", 2000)


class CradleSettings:
    def __init__(self):
        self.notes = NotesSettings()
        self.graph = GraphSettings()
        self.users = UserSettings()


cradle_settings = CradleSettings()
