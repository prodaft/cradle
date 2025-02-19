from rest_framework.exceptions import APIException


class MinioObjectNotFound(APIException):
    status_code = 404
    default_detail = "There exists no file at the specified path"


class IncorrectBucketException(APIException):
    status_code = 400
    default_detail = "The bucket name of the file reference is incorrect"
