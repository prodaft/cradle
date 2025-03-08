from django.db import models


class BitStringField(models.Field):
    """
    A custom field that represents a PostgreSQL bit field,
    with its Python representation as an integer.

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
        self.max_length = max_length
        self.varying = varying

        kwargs["max_length"] = max_length
        super().__init__(*args, **kwargs)

    def db_type(self, connection):
        if self.varying:
            return f"bit varying({self.max_length})"
        return f"bit({self.max_length})"

    def from_db_value(self, value, expression, connection):
        """
        Convert the database value (a bit string) to an integer.
        """
        if value is None:
            return value
        # Assume value is a bit string, e.g., '1010'
        return int(value, 2)

    def to_python(self, value):
        """
        Convert the input value into an integer. This method is used
        during deserialization and when assigning a value on a model.
        """
        if value is None:
            return value
        if isinstance(value, int):
            return value
        if isinstance(value, str):
            # Convert the bit string to an integer.
            return int(value, 2)
        raise ValueError(
            "Invalid value type for BitStringField. Expected int or bit string."
        )

    def get_prep_value(self, value):
        """
        Prepare the Python integer value for insertion into the database
        by converting it to a bit string. For fixed-length fields the bit
        string is zero-padded on the left.
        """
        if value is None:
            return value
        if not isinstance(value, int):
            value = int(value, 2)

        bit_str = bin(value)[2:]
        if not self.varying:
            if len(bit_str) > self.max_length:
                raise ValueError(
                    f"Value {bit_str} exceeds maximum of {self.max_length} bits."
                )
            bit_str = bit_str.zfill(self.max_length)
        else:
            if len(bit_str) > self.max_length:
                raise ValueError(
                    f"Value length {len(bit_str)} exceeds maximum of {self.max_length} bits."
                )
        return bit_str
