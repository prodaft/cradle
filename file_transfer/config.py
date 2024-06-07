import os

minio_config = {
    "endpoint": os.environ.get("MINIO_ENDPOINT", "localhost:9000"),
    "access_key": os.environ.get("MINIO_ROOT_USER", "admin"),
    "secret_key": os.environ.get("MINIO_ROOT_PASSWORD", "admin"),
    "secure": (
        True if os.environ.get("MINIO_SECURE", "false").lower() == "true" else False
    ),
}
