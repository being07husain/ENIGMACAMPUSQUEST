import re

from bson import ObjectId


USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,24}$")


def valid_object_id(value):
    return isinstance(value, str) and ObjectId.is_valid(value)


def valid_username(value):
    return isinstance(value, str) and USERNAME_RE.fullmatch(value) is not None


def clean_text(value, maximum=120):
    if not isinstance(value, str):
        return ""
    return value.strip()[:maximum]
