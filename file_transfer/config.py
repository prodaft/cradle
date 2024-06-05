import os

minio_config = {
    "endpoint": os.environ["MINIO_ENDPOINT"],
    "access_key": os.environ["MINIO_ROOT_USER"],
    "secret_key": os.environ["MINIO_ROOT_PASSWORD"],
    "secure": False,  # the connection does not use HTTPS!
}
