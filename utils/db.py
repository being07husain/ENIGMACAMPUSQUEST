from functools import lru_cache

from pymongo import MongoClient

from config import Config


@lru_cache(maxsize=1)
def _client():
    return MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=3000)


def get_db():
    return _client()[Config.MONGO_DB_NAME]


def check_connection():
    get_db().command("ping")


def close_connection():
    if _client.cache_info().currsize:
        _client().close()
        _client.cache_clear()
