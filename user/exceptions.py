from rest_framework.exceptions import APIException


class DuplicateUserException(APIException):
    status_code = 409
    default_detail = "There exists another user with the same username."
    default_code = "unique"


class InvalidPasswordException(APIException):
    status_code = 400
    default_detail = "The password is invalid."
    default_code = "unique"


class DisallowedActionException(APIException):
    status_code = 403
    default_code = "unique"

    def __init__(self, detail: str, *args, **kwargs) -> None:
        self.detail = detail
        super().__init__(*args, **kwargs)
