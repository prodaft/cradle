from django.db import models


class BitStringField(models.Field):
    description = "A field to store a fixed-length bit string as an integer"

    def __init__(self, *args, **kwargs):
        self.max_length = kwargs.get("max_length", None)

        if self.max_length is None:
            raise ValueError("max_length is required for BitStringField")
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        return name, path, args, kwargs

    def db_type(self, connection):
        return f"bit({self.max_length})"

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        return int(value, 2)

    def to_python(self, value):
        if value is None:
            return value
        if isinstance(value, int):
            return value
        try:
            return int(value, 2)
        except ValueError:
            return int(value)

    def get_prep_value(self, value):
        if value is None:
            return value
        int_value = int(value)
        bit_str = bin(int_value)[2:]
        if len(bit_str) > self.max_length:
            raise ValueError("Value exceeds fixed bit length")
        return bit_str.zfill(self.max_length)
