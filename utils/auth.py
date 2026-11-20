from functools import wraps

from flask import abort, redirect, request, session, url_for
from bson import ObjectId

from utils.db import get_db


def current_user():
    user_id = session.get("user_id")
    if not user_id or not ObjectId.is_valid(user_id):
        return None
    user = get_db().users.find_one(
        {"_id": ObjectId(user_id), "is_active": True},
        {"password_hash": 0},
    )
    return user


def login_required(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        if not current_user():
            session.clear()
            if request.path.startswith("/api/"):
                return {"success": False, "message": "Authentication required."}, 401
            return redirect(url_for("login_page", next=request.path))
        return function(*args, **kwargs)

    return wrapped


def admin_required(function):
    @wraps(function)
    @login_required
    def wrapped(*args, **kwargs):
        user = current_user()
        if not user or user.get("role") != "admin":
            abort(403)
        return function(*args, **kwargs)

    return wrapped
