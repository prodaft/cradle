from rest_framework.exceptions import APIException


class DuplicateUserException(APIException):
    status_code = 409
    default_detail = "There exists another user with the same username."
    default_code = "unique"


class InvalidPasswordException(APIException):
    status_code = 400
    default_detail = "The password is invalid."
    default_code = "unique"
