"""Custom Django model fields.

Provides BitStringField for PostgreSQL bit/bit varying columns
with integer representation in Python.
"""

from django.db import models


class BitStringField(models.Field):
    """A custom field that represents a PostgreSQL bit field as an integer.

    - When varying=False, the field is created as a fixed-length bit field (e.g. bit(8)).
      The value will be padded with zeros on the left to reach the specified length.
    - When varying=True, it becomes a varying bit field (e.g. bit varying(8)),
      meaning that values can have any length up to the maximum.
    """

    description = (
        "A bit field that can be either fixed-length or varying with a max length, "
        "with integer representation in Python."
    )

    def __init__(self, max_length, varying=False, *args, **kwargs):
        """Initialize the bit field.

        Args:
            max_length: Maximum number of bits (e.g. 8 for bit(8)).
            varying: If True, use bit varying (variable length up to max_length).
        """
        self.varying = varying
        kwargs["max_length"] = max_length
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        """Return deconstructed field args/kwargs for Django migrations."""
        name, path, args, kwargs = super().deconstruct()
        # max_length is our first positional arg
        args = [kwargs.pop("max_length", self.max_length)] + list(args)
        if self.varying:
            kwargs["varying"] = self.varying
        return name, path, args, kwargs

    def db_type(self, connection):
        """Return PostgreSQL column type: bit(n) or bit varying(n)."""
        if self.varying:
            return f"bit varying({self.max_length})"
        return f"bit({self.max_length})"

    def from_db_value(self, value, _expression, connection):
        """Convert the database value (a bit string) to an integer."""
        if value is None:
            return value
        # Assume value is a bit string, e.g., '1010'
        return int(value, 2)

    def to_python(self, value):
        """Convert the input value into an integer.

        Used during deserialization and when assigning a value on a model.
        """
        if value is None:
            return value
        if isinstance(value, int):
            if value < 0:
                raise ValueError("BitStringField does not support negative values.")
            return value
        if isinstance(value, str):
            return int(value, 2)
        raise ValueError("Invalid value type for BitStringField. Expected int or bit string.")

    def get_prep_value(self, value):
        """Prepare the Python integer value for insertion into the database.

        Converts to a bit string; fixed-length fields are zero-padded on the left.
        """
        if value is None:
            return value
        if not isinstance(value, int):
            value = int(value, 2)
        if value < 0:
            raise ValueError("BitStringField does not support negative values.")

        bit_str = format(value, f"0{self.max_length}b" if not self.varying else "b")
        if len(bit_str) > self.max_length:
            raise ValueError(f"Value exceeds maximum of {self.max_length} bits.")
        return bit_str
