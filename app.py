import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

from bson import ObjectId
from flask import (
    Flask, abort, flash, jsonify, redirect, render_template, request, send_from_directory,
    session, url_for,
)
from pymongo.errors import DuplicateKeyError, PyMongoError
from werkzeug.security import check_password_hash, generate_password_hash

from config import Config
from services.progression import add_rewards, calculate_level, level_progress
from utils.auth import admin_required, current_user, login_required
from utils.db import check_connection, get_db
from utils.validators import clean_text, valid_object_id, valid_username


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)
    if not app.testing and os.getenv("FLASK_ENV") == "production" and app.config["SECRET_KEY"] == "local-only-change-me":
        raise RuntimeError("Set a strong SECRET_KEY before starting CampusQuest in production.")

    @app.before_request
    def establish_csrf_token():
        session.setdefault("csrf_token", secrets.token_urlsafe(32))
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            supplied = request.headers.get("X-CSRF-Token") or request.form.get("csrf_token")
            if not supplied or not secrets.compare_digest(
                supplied, session.get("csrf_token", "")
            ):
                if request.path in {"/login", "/signup"} and same_origin_request():
                    return None
                if request.path.startswith("/api/"):
                    return api_error("Your session token expired. Refresh and try again.", 400)
                flash("Your form session expired. Refresh the page and try again.", "error")
                destination = request.path if request.path in {"/login", "/signup"} else url_for("login_page")
                return redirect(destination)

    @app.context_processor
    def inject_player_state():
        user = current_user()
        stats = None
        unread_count = 0
        if user:
            db = get_db()
            stats = db.player_stats.find_one({"user_id": user["_id"]}) or {}
            unread_count = db.notifications.count_documents(
                {"user_id": user["_id"], "read": False}
            )
        return {
            "current_user": user,
            "player_stats": stats or {},
            "unread_count": unread_count,
            "csrf_token": session.get("csrf_token"),
        }

    @app.get("/health")
    def health():
        try:
            check_connection()
            return jsonify({"success": True, "message": "MongoDB is connected."})
        except PyMongoError:
            app.logger.exception("MongoDB health check failed")
            return jsonify({"success": False, "message": "MongoDB is unavailable."}), 503

    @app.get("/assets/<path:filename>")
    def asset_file(filename):
        return send_from_directory(
            os.path.join(app.root_path, "templates", "assets"),
            filename,
            max_age=86400,
        )

    @app.get("/")
    @login_required
    def home():
        db = get_db()
        user = current_user()
        stats = db.player_stats.find_one({"user_id": user["_id"]}) or {}
        season = db.seasons.find_one({"active": True})
        season_progress_record = db.season_progress.find_one({
            "user_id": user["_id"], "season_id": season["_id"]
        }) if season else {}
        return render_template(
            "home.html",
            page="home",
            quests=list(db.quests.find({"active": True}).limit(6)),
            activities=list(db.activities.find({"active": True}).limit(3)),
            level=level_progress(stats.get("xp", 0)),
            recent=list(db.activity_log.find({"user_id": user["_id"]}).sort("created_at", -1).limit(4)),
            season=season,
            season_completed=(season_progress_record or {}).get("fragments", []),
            page_title="Home",
        )

    @app.route("/login", methods=["GET", "POST"])
    def login_page():
        if session.get("user_id"):
            return redirect(url_for("home"))
        if request.method == "POST":
            email = clean_text(request.form.get("email"), 254).lower()
            password = request.form.get("password", "")
            user = get_db().users.find_one({"email": email, "is_active": True})
            if user and check_password_hash(user["password_hash"], password):
                session.clear()
                session["user_id"] = str(user["_id"])
                session["csrf_token"] = secrets.token_urlsafe(32)
                session.permanent = True
                get_db().users.update_one(
                    {"_id": user["_id"]}, {"$set": {"last_login": datetime.now(timezone.utc)}}
                )
                destination = request.args.get("next", "")
                return redirect(destination if destination.startswith("/") and not destination.startswith("//") else url_for("home"))
            flash("That email and password combination was not recognized.", "error")
        return render_template("auth.html", mode="login", page_title="Welcome back")

    @app.route("/signup", methods=["GET", "POST"])
    def signup_page():
        if session.get("user_id"):
            return redirect(url_for("home"))
        if request.method == "POST":
            form = {key: clean_text(request.form.get(key), 160) for key in (
                "full_name", "username", "email", "roll_number", "department",
                "year", "semester",
            )}
            password = request.form.get("password", "")
            confirm = request.form.get("confirm_password", "")
            errors = []
            if len(form["full_name"]) < 2:
                errors.append("Enter your full name.")
            if not valid_username(form["username"]):
                errors.append("Username must be 3–24 letters, numbers, or underscores.")
            email_parts = form["email"].rsplit("@", 1)
            if (
                len(email_parts) != 2
                or not email_parts[0]
                or "." not in email_parts[1]
                or any(char.isspace() for char in form["email"])
                or len(form["email"]) > 254
            ):
                errors.append("Enter a valid email address.")
            if not 8 <= len(password) <= 128:
                errors.append("Password must be between 8 and 128 characters.")
            if password != confirm:
                errors.append("Passwords do not match.")
            if not form["roll_number"] or not form["department"]:
                errors.append("Enter your roll number and department.")
            if form["year"] not in {"1", "2", "3", "4", "5"} or form["semester"] not in {str(value) for value in range(1, 11)}:
                errors.append("Choose your department, year, and semester.")
            if not errors:
                db = get_db()
                if db.users.find_one({"$or": [
                    {"email": form["email"].lower()},
                    {"username": form["username"]},
                    {"roll_number": form["roll_number"]},
                ]}):
                    errors.append("That email, username, or roll number is already registered.")
                else:
                    form["email"] = form["email"].lower()
                    form.update({
                        "password_hash": generate_password_hash(password),
                        "avatar": "", "role": "student", "is_active": True,
                        "created_at": datetime.now(timezone.utc), "last_login": None,
                    })
                    try:
                        user_id = db.users.insert_one(form).inserted_id
                    except DuplicateKeyError:
                        flash("That email, username, or roll number is already registered.", "error")
                        return render_template("auth.html", mode="signup", page_title="Create your player")
                    db.player_stats.insert_one({
                        "user_id": user_id, "xp": 0, "level": 1, "coins": 0,
                        "total_quests": 0, "completed_quests": 0,
                        "current_streak": 0, "longest_streak": 0,
                        "last_activity_date": None,
                    })
                    session["user_id"] = str(user_id)
                    session.permanent = True
                    return redirect(url_for("home"))
            for error in errors:
                flash(error, "error")
        return render_template("auth.html", mode="signup", page_title="Create your player")

    @app.post("/logout")
    @login_required
    def logout():
        session.clear()
        return redirect(url_for("login_page"))

    @app.get("/quests")
    @login_required
    def quests_page():
        return render_template("page.html", page="quests", page_title="Quest board")

    @app.get("/quests/<quest_id>")
    @login_required
    def quest_detail_page(quest_id):
        if valid_object_id(quest_id):
            quest = get_db().quests.find_one({"_id": ObjectId(quest_id), "active": True})
        else:
            quest = get_db().quests.find_one({"title": quest_id.replace("-", " "), "active": True})
        if not quest:
            abort(404)
        progress = get_db().quest_progress.find_one({
            "user_id": current_user()["_id"], "quest_id": quest["_id"]
        })
        return render_template(
            "page.html", page="quest-detail", quest=quest, progress=progress,
            page_title=quest["title"],
        )

    @app.get("/<page>")
    @login_required
    def content_page(page):
        supported = {
            "map", "season", "leaderboard", "profile", "achievements",
            "rewards", "squad", "games", "activities",
        }
        if page not in supported:
            abort(404)
        season_completed = []
        next_season_quest = None
        if page == "season":
            db, user_id = get_db(), current_user()["_id"]
            season = db.seasons.find_one({"active": True})
            if season:
                progress = db.season_progress.find_one({
                    "user_id": user_id, "season_id": season["_id"]
                }) or {}
                season_completed = progress.get("fragments", [])
                story_quests = list(db.quests.find({"active": True, "category": "story"}))
                for fragment in season.get("fragments", []):
                    if fragment in season_completed:
                        continue
                    next_season_quest = next(
                        (quest for quest in story_quests if fragment.casefold() in quest["title"].casefold()),
                        None,
                    )
                    if next_season_quest:
                        break
        return render_template(
            "page.html", page=page, page_title=page.replace("-", " ").title(),
            season_completed=season_completed, next_season_quest=next_season_quest,
        )

    @app.get("/activities/<activity_id>")
    @login_required
    def activity_detail_page(activity_id):
        activity = find_by_id(get_db().activities, activity_id)
        if not activity or not activity.get("active"):
            abort(404)
        return render_template(
            "page.html", page="activity-detail", activity=activity,
            page_title=activity["title"],
        )

    @app.get("/admin")
    @admin_required
    def admin_dashboard():
        db = get_db()
        return render_template(
            "admin.html",
            page="admin",
            totals={
                "users": db.users.count_documents({}),
                "active": db.users.count_documents({"is_active": True, "role": "student"}),
                "quests": db.quests.count_documents({}),
                "completed": db.quest_progress.count_documents({"completed": True}),
                "activities": db.activities.count_documents({}),
                "xp": sum(row.get("xp", 0) for row in db.player_stats.find({}, {"xp": 1})),
            },
            page_title="Admin dashboard",
        )

    @app.get("/api/profile")
    @login_required
    def profile_api():
        user = current_user()
        db = get_db()
        stats = db.player_stats.find_one({"user_id": user["_id"]}) or {}
        completed = list(db.quest_progress.find({"user_id": user["_id"], "completed": True}))
        achievements = list(db.user_achievements.find({"user_id": user["_id"]}))
        recent = list(db.activity_log.find({"user_id": user["_id"]}).sort("created_at", -1).limit(8))
        rank = list(db.player_stats.aggregate([
            {"$match": {"xp": {"$gt": stats.get("xp", 0)}}},
            {"$count": "ahead"},
        ]))
        data = {
            "user": {key: user.get(key) for key in (
                "full_name", "username", "email", "department", "year", "semester", "avatar"
            )},
            "stats": stats,
            "level_progress": level_progress(stats.get("xp", 0)),
            "completed_quests": len(completed),
            "rank": (rank[0]["ahead"] if rank else 0) + 1,
            "achievements": achievements,
            "recent_activity": recent,
        }
        return jsonify({"success": True, "data": serialize(data)})

    @app.put("/api/profile")
    @login_required
    def update_profile_api():
        payload = request.get_json(silent=True) or {}
        allowed = {}
        for field in ("full_name", "department", "year", "semester", "avatar"):
            if field in payload:
                value = clean_text(payload[field], 160)
                if not value:
                    return api_error(f"{field.replace('_', ' ').title()} cannot be empty.", 400)
                allowed[field] = value
        if not allowed:
            return api_error("No editable profile fields were provided.", 400)
        get_db().users.update_one({"_id": current_user()["_id"]}, {"$set": allowed})
        return jsonify({"success": True, "message": "Profile updated."})

    @app.get("/api/quests")
    @login_required
    def quests_api():
        category = request.args.get("category", "all").lower()
        query = {"active": True}
        if category in {"story", "daily", "exploration", "tech", "fun"}:
            query["category"] = category
        db = get_db()
        user_id = current_user()["_id"]
        quests = list(db.quests.find(query))
        progress = {
            str(item["quest_id"]): item
            for item in db.quest_progress.find({"user_id": user_id})
        }
        for quest in quests:
            item = progress.get(str(quest["_id"]), {})
            quest["status"] = "completed" if item.get("completed") else ("active" if item else "available")
            quest["progress"] = item.get("progress", 0)
        return jsonify({"success": True, "data": serialize(quests)})

    @app.get("/api/quests/<quest_id>")
    @login_required
    def quest_api(quest_id):
        quest = find_by_id(get_db().quests, quest_id)
        if not quest:
            return api_error("Quest not found.", 404)
        progress = get_db().quest_progress.find_one({
            "user_id": current_user()["_id"], "quest_id": quest["_id"]
        })
        quest["status"] = "completed" if progress and progress.get("completed") else ("active" if progress else "available")
        return jsonify({"success": True, "data": serialize(quest)})

    @app.post("/api/quests/<quest_id>/start")
    @login_required
    def start_quest_api(quest_id):
        db = get_db()
        quest = find_by_id(db.quests, quest_id)
        if not quest or not quest.get("active"):
            return api_error("Quest not found.", 404)
        user_id = current_user()["_id"]
        location_id = None
        if quest.get("type") == "location":
            payload = request.get_json(silent=True) or {}
            requested_location = payload.get("location_id")
            if requested_location:
                if not valid_object_id(requested_location):
                    return api_error("Choose a valid campus location.", 400)
                location_id = ObjectId(requested_location)
                target = db.locations.find_one({
                    "_id": location_id, "active": {"$ne": False}
                })
                if not target:
                    return api_error("Campus location not found.", 404)
                if quest.get("location", "").casefold() != "any campus location" and target["name"].casefold() != quest.get("location", "").casefold():
                    return api_error("This quest starts at a different campus location.", 409)
            else:
                target = None
                if quest.get("location", "").casefold() != "any campus location":
                    target = db.locations.find_one({
                        "name": {"$regex": f"^{re.escape(quest['location'])}$", "$options": "i"},
                        "active": {"$ne": False},
                    })
                visits = {"user_id": user_id}
                if target:
                    visits["location_id"] = target["_id"]
                latest_visit = db.user_location_visits.find_one(
                    visits, sort=[("visited_at", -1)]
                )
                if not latest_visit:
                    return api_error("Explore this quest's campus location from the map first.", 409)
                location_id = latest_visit["location_id"]
            if not db.user_location_visits.find_one({
                "user_id": user_id, "location_id": location_id
            }):
                return api_error("Explore this campus location from the map before starting its quest.", 409)
        result = db.quest_progress.update_one(
            {"user_id": user_id, "quest_id": quest["_id"]},
            {"$setOnInsert": {
                "user_id": user_id, "quest_id": quest["_id"],
                "started_at": datetime.now(timezone.utc), "completed": False,
                "progress": 0, "location_id": location_id,
                "location_name": (
                    db.locations.find_one({"_id": location_id})["name"]
                    if location_id else None
                ),
            }},
            upsert=True,
        )
        if location_id and result.upserted_id is None:
            db.quest_progress.update_one(
                {"user_id": user_id, "quest_id": quest["_id"], "location_id": {"$exists": False}},
                {"$set": {
                    "location_id": location_id,
                    "location_name": db.locations.find_one({"_id": location_id})["name"],
                }},
            )
        if result.upserted_id:
            db.player_stats.update_one({"user_id": user_id}, {"$inc": {"total_quests": 1}})
        return jsonify({"success": True, "message": "Quest started.", "data": {"quest_id": str(quest["_id"])}})

    @app.post("/api/quests/<quest_id>/complete")
    @login_required
    def complete_quest_api(quest_id):
        db = get_db()
        quest = find_by_id(db.quests, quest_id)
        if not quest:
            return api_error("Quest not found.", 404)
        user_id = current_user()["_id"]
        progress = db.quest_progress.find_one({"user_id": user_id, "quest_id": quest["_id"]})
        if not progress:
            return api_error("Start this quest before completing it.", 409)
        was_completed = progress.get("completed", False)
        if not was_completed:
            if quest.get("type") == "location" and (
                not progress.get("location_id")
                or not db.user_location_visits.find_one({
                    "user_id": user_id, "location_id": progress["location_id"]
                })
            ):
                return api_error("Explore the quest location from the campus map first.", 409)
            if quest.get("type") == "quiz":
                answer = clean_text((request.get_json(silent=True) or {}).get("answer"), 80)
                if answer.casefold() != quest.get("answer", "").casefold():
                    return api_error("Not quite. Try another answer.", 400)
            changed = db.quest_progress.update_one(
                {"_id": progress["_id"], "completed": False},
                {"$set": {"completed": True, "completed_at": datetime.now(timezone.utc), "progress": 100}},
            )
            if not changed.modified_count:
                progress = db.quest_progress.find_one({"_id": progress["_id"]}) or progress
                if not progress.get("completed"):
                    return api_error("Quest progress changed; refresh and try again.", 409)
        awarded = add_rewards(
            user_id, quest.get("xp", 0), quest.get("coins", 0),
            f"Completed {quest['title']}", reward_key=f"quest:{quest['_id']}",
        )
        if awarded:
            unlock_achievements(user_id)
            db.notifications.insert_one({
                "user_id": user_id, "title": "Quest completed!",
                "message": f"{quest['title']} — +{quest.get('xp', 0)} XP, +{quest.get('coins', 0)} coins",
                "created_at": datetime.now(timezone.utc), "read": False,
            })
            season_progress(db, user_id, quest)
            return jsonify({"success": True, "message": "Quest complete! Rewards added.", "data": {"xp": quest.get("xp", 0), "coins": quest.get("coins", 0)}})
        return jsonify({"success": True, "message": "Quest already completed.", "data": {"already_completed": True}})

    @app.get("/api/map/locations")
    @login_required
    def map_locations_api():
        db, user_id = get_db(), current_user()["_id"]
        locations = list(db.locations.find(
            {"active": {"$ne": False}},
            {"latitude": 0, "longitude": 0, "radius_m": 0},
        ))
        for location in locations:
            location["explored"] = bool(db.user_location_visits.find_one({
                "user_id": user_id, "location_id": location["_id"]
            }))
            quests = list(db.quests.find({
                "active": True,
                "$or": [
                    {"location": {"$regex": f"^{re.escape(location['name'])}$", "$options": "i"}},
                    {"location": {"$regex": "^any campus location$", "$options": "i"}},
                ],
            }))
            progress = {
                str(item["quest_id"]): item
                for item in db.quest_progress.find({"user_id": user_id})
            }
            location["quests"] = []
            for quest in quests:
                item = progress.get(str(quest["_id"]), {})
                quest["status"] = "completed" if item.get("completed") else ("active" if item else "available")
                location["quests"].append(quest)
        return jsonify({"success": True, "data": serialize(locations)})

    @app.post("/api/map/locations/<location_id>/explore")
    @login_required
    def explore_location_api(location_id):
        if not valid_object_id(location_id):
            return api_error("Campus location not found.", 404)
        db, user_id = get_db(), current_user()["_id"]
        target = db.locations.find_one({
            "_id": ObjectId(location_id), "active": {"$ne": False}
        })
        if not target:
            return api_error("Campus location not found.", 404)
        try:
            db.user_location_visits.insert_one({
                "user_id": user_id, "location_id": target["_id"],
                "visited_at": datetime.now(timezone.utc),
            })
            unlock_achievements(user_id)
            explored_now = True
        except DuplicateKeyError:
            explored_now = False
        return jsonify({
            "success": True,
            "message": f"You are exploring: {target['name']}" if explored_now else f"You've already explored {target['name']}.",
            "data": {"location_id": str(target["_id"]), "name": target["name"], "explored": True},
        })

    @app.get("/api/leaderboard")
    @login_required
    def leaderboard_api():
        mode = request.args.get("scope", "global")
        user = current_user()
        if mode not in {"global", "department", "weekly", "monthly"}:
            return api_error("Choose global, department, weekly, or monthly.", 400)
        db = get_db()
        if mode in {"weekly", "monthly"}:
            cutoff = datetime.now(timezone.utc) - timedelta(days=7 if mode == "weekly" else 30)
            pipeline = [
                {"$match": {"created_at": {"$gte": cutoff}}},
                {"$group": {"_id": "$user_id", "xp": {"$sum": "$xp"}}},
                {"$lookup": {"from": "users", "localField": "_id", "foreignField": "_id", "as": "user"}},
                {"$unwind": "$user"},
                {"$match": {"user.is_active": True}},
            ]
            pipeline.extend([
                {"$lookup": {"from": "player_stats", "localField": "_id", "foreignField": "user_id", "as": "stats"}},
                {"$unwind": {"path": "$stats", "preserveNullAndEmptyArrays": True}},
                {"$sort": {"xp": -1}},
                {"$limit": 100},
                {"$project": {"xp": 1, "level": {"$ifNull": ["$stats.level", 1]}, "username": "$user.username", "full_name": "$user.full_name", "department": "$user.department", "avatar": "$user.avatar"}},
            ])
            rows = list(db.activity_log.aggregate(pipeline))
            return jsonify({"success": True, "data": serialize(rows)})
        match = {}
        if mode == "department":
            match = {"department": user.get("department")}
        rows = list(db.player_stats.aggregate([
            {"$sort": {"xp": -1}},
            {"$lookup": {"from": "users", "localField": "user_id", "foreignField": "_id", "as": "user"}},
            {"$unwind": "$user"},
            {"$match": {"user.is_active": True, **({"user.department": match["department"]} if "department" in match else {}), **({"user._id": match["_id"]} if "_id" in match else {})}},
            {"$limit": 100},
            {"$project": {"xp": 1, "level": 1, "username": "$user.username", "full_name": "$user.full_name", "department": "$user.department", "avatar": "$user.avatar"}},
        ]))
        return jsonify({"success": True, "data": serialize(rows)})

    @app.get("/api/achievements")
    @login_required
    def achievements_api():
        db = get_db()
        unlocked = {str(row["achievement_id"]): row for row in db.user_achievements.find({"user_id": current_user()["_id"]})}
        entries = list(db.achievements.find({"active": {"$ne": False}}))
        for entry in entries:
            entry["unlocked"] = str(entry["_id"]) in unlocked
            entry["unlocked_at"] = unlocked.get(str(entry["_id"]), {}).get("unlocked_at")
        return jsonify({"success": True, "data": serialize(entries)})

    @app.get("/api/rewards")
    @login_required
    def rewards_api():
        db = get_db()
        claimed = {str(row["reward_id"]) for row in db.user_rewards.find({"user_id": current_user()["_id"]})}
        rewards = list(db.rewards.find({"active": True}))
        for reward in rewards:
            reward["claimed"] = str(reward["_id"]) in claimed
        return jsonify({"success": True, "data": serialize(rewards)})

    @app.post("/api/rewards/<reward_id>/claim")
    @login_required
    def claim_reward_api(reward_id):
        reward = find_by_id(get_db().rewards, reward_id)
        if not reward or not reward.get("active"):
            return api_error("Reward not found.", 404)
        db, user_id = get_db(), current_user()["_id"]
        try:
            db.user_rewards.insert_one({"user_id": user_id, "reward_id": reward["_id"], "claimed_at": datetime.now(timezone.utc)})
        except DuplicateKeyError:
            return api_error("You already claimed this reward.", 409)
        charged = db.player_stats.update_one(
            {"user_id": user_id, "coins": {"$gte": reward["cost"]}},
            {"$inc": {"coins": -reward["cost"]}},
        )
        if not charged.matched_count:
            db.user_rewards.delete_one({"user_id": user_id, "reward_id": reward["_id"]})
            return api_error("You do not have enough coins.", 409)
        db.reward_transactions.insert_one({
            "user_id": user_id, "reward_id": reward["_id"], "amount": reward["cost"],
            "created_at": datetime.now(timezone.utc),
        })
        return jsonify({"success": True, "message": f"{reward['name']} added to your collection."})

    @app.get("/api/games")
    @login_required
    def games_api():
        rows = list(get_db().games.find({"active": {"$ne": False}}))
        for game in rows:
            best = get_db().game_attempts.find_one(
                {"user_id": current_user()["_id"], "game_id": game["_id"]},
                sort=[("score", -1)],
            )
            game["best_score"] = best.get("score", 0) if best else 0
        return jsonify({"success": True, "data": serialize(rows)})

    @app.post("/api/games/<game_id>/play")
    @login_required
    def game_result_api(game_id):
        game = find_by_id(get_db().games, game_id)
        if not game or game.get("active") is False:
            return api_error("Game not found.", 404)
        payload = request.get_json(silent=True) or {}
        score = payload.get("score")
        if not isinstance(score, int) or isinstance(score, bool) or score < 0 or score > 100000:
            return api_error("Score must be a valid non-negative integer.", 400)
        db, user_id = get_db(), current_user()["_id"]
        db.game_attempts.insert_one({
            "user_id": user_id, "game_id": game["_id"], "score": score,
            "created_at": datetime.now(timezone.utc),
        })
        unlock_achievements(user_id)
        return jsonify({"success": True, "message": "Game result saved to your profile."})

    @app.get("/api/squad")
    @login_required
    def squad_api():
        db, user_id = get_db(), current_user()["_id"]
        membership = db.squad_members.find_one({"user_id": user_id})
        squad = db.squads.find_one({"_id": membership["squad_id"]}) if membership else None
        if not squad:
            return jsonify({"success": True, "data": None})
        members = list(db.squad_members.aggregate([
            {"$match": {"squad_id": squad["_id"]}},
            {"$lookup": {"from": "users", "localField": "user_id", "foreignField": "_id", "as": "user"}},
            {"$unwind": "$user"},
            {"$lookup": {"from": "player_stats", "localField": "user_id", "foreignField": "user_id", "as": "stats"}},
            {"$unwind": "$stats"},
            {"$project": {"username": "$user.username", "full_name": "$user.full_name", "role": 1, "level": "$stats.level", "xp": "$stats.xp"}},
        ]))
        squad["members"] = members
        squad["member_count"] = len(members)
        squad["xp"] = sum(member.get("xp", 0) for member in members)
        member_ids = [membership["user_id"] for membership in db.squad_members.find({"squad_id": squad["_id"]})]
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        weekly = list(db.activity_log.aggregate([
            {"$match": {"user_id": {"$in": member_ids}, "created_at": {"$gte": week_ago}}},
            {"$group": {"_id": None, "xp": {"$sum": "$xp"}}},
        ]))
        squad["weekly_xp"] = weekly[0]["xp"] if weekly else 0
        ranks = list(db.squad_members.aggregate([
            {"$lookup": {"from": "player_stats", "localField": "user_id", "foreignField": "user_id", "as": "stats"}},
            {"$unwind": "$stats"},
            {"$group": {"_id": "$squad_id", "xp": {"$sum": "$stats.xp"}}},
            {"$sort": {"xp": -1}},
            {"$project": {"_id": 1}},
        ]))
        squad["rank"] = next(
            (index for index, item in enumerate(ranks, start=1) if item["_id"] == squad["_id"]),
            len(ranks) + 1,
        )
        return jsonify({"success": True, "data": serialize(squad)})

    @app.post("/api/squad/create")
    @login_required
    def create_squad_api():
        name = clean_text((request.get_json(silent=True) or {}).get("name"), 32)
        if len(name) < 3:
            return api_error("Squad name must be at least 3 characters.", 400)
        db, user_id = get_db(), current_user()["_id"]
        if db.squad_members.find_one({"user_id": user_id}):
            return api_error("Leave your current squad before creating another.", 409)
        squad_id = db.squads.insert_one({
            "name": name, "leader_id": user_id, "xp": 0, "created_at": datetime.now(timezone.utc)
        }).inserted_id
        try:
            db.squad_members.insert_one({"squad_id": squad_id, "user_id": user_id, "role": "leader", "joined_at": datetime.now(timezone.utc)})
        except DuplicateKeyError:
            db.squads.delete_one({"_id": squad_id})
            return api_error("You already joined a squad.", 409)
        return jsonify({"success": True, "message": "Squad created."})

    @app.post("/api/squad/join")
    @login_required
    def join_squad_api():
        code = clean_text((request.get_json(silent=True) or {}).get("squad_id"), 32)
        if not valid_object_id(code):
            return api_error("Enter a valid squad invite ID.", 400)
        db, user_id = get_db(), current_user()["_id"]
        if db.squad_members.find_one({"user_id": user_id}):
            return api_error("Leave your current squad before joining another.", 409)
        if not db.squads.find_one({"_id": ObjectId(code)}):
            return api_error("Squad not found.", 404)
        try:
            db.squad_members.insert_one({"squad_id": ObjectId(code), "user_id": user_id, "role": "member", "joined_at": datetime.now(timezone.utc)})
        except DuplicateKeyError:
            return api_error("You already joined a squad.", 409)
        return jsonify({"success": True, "message": "You joined the squad."})

    @app.post("/api/squad/leave")
    @login_required
    def leave_squad_api():
        db, user_id = get_db(), current_user()["_id"]
        membership = db.squad_members.find_one({"user_id": user_id})
        if not membership:
            return api_error("You are not in a squad.", 409)
        members = list(db.squad_members.find({"squad_id": membership["squad_id"]}))
        if membership.get("role") == "leader" and len(members) > 1:
            return api_error("Transfer leadership before leaving your squad.", 409)
        db.squad_members.delete_one({"_id": membership["_id"]})
        if len(members) == 1:
            db.squads.delete_one({"_id": membership["squad_id"]})
        return jsonify({"success": True, "message": "You left the squad."})

    @app.get("/api/activities")
    @login_required
    def activities_api():
        category = clean_text(request.args.get("category", ""), 50)
        query = {"active": True}
        if category:
            query["category"] = category
        activities = list(get_db().activities.find(query))
        user_id = current_user()["_id"]
        for activity in activities:
            activity["joined"] = bool(get_db().activity_participants.find_one({
                "activity_id": activity["_id"], "user_id": user_id
            }))
        return jsonify({"success": True, "data": serialize(activities)})

    @app.get("/api/activities/<activity_id>")
    @login_required
    def activity_api(activity_id):
        activity = find_by_id(get_db().activities, activity_id)
        if not activity or not activity.get("active"):
            return api_error("Activity not found.", 404)
        activity["joined"] = bool(get_db().activity_participants.find_one({
            "activity_id": activity["_id"], "user_id": current_user()["_id"]
        }))
        return jsonify({"success": True, "data": serialize(activity)})

    @app.post("/api/activities/<activity_id>/join")
    @login_required
    def join_activity_api(activity_id):
        activity = find_by_id(get_db().activities, activity_id)
        if not activity or not activity.get("active"):
            return api_error("Activity not found.", 404)
        try:
            get_db().activity_participants.insert_one({
                "activity_id": activity["_id"], "user_id": current_user()["_id"],
                "joined_at": datetime.now(timezone.utc),
            })
        except DuplicateKeyError:
            return api_error("You already joined this activity.", 409)
        return jsonify({"success": True, "message": "You're on the attendee list."})

    @app.get("/api/notifications")
    @login_required
    def notifications_api():
        rows = list(get_db().notifications.find({"user_id": current_user()["_id"]}).sort("created_at", -1).limit(30))
        return jsonify({"success": True, "data": serialize(rows)})

    @app.post("/api/notifications/<notification_id>/read")
    @login_required
    def read_notification_api(notification_id):
        notification = find_by_id(get_db().notifications, notification_id)
        if not notification or notification.get("user_id") != current_user()["_id"]:
            return api_error("Notification not found.", 404)
        get_db().notifications.update_one({"_id": notification["_id"]}, {"$set": {"read": True}})
        return jsonify({"success": True})

    @app.post("/api/notifications/read-all")
    @login_required
    def read_all_notifications_api():
        get_db().notifications.update_many({"user_id": current_user()["_id"]}, {"$set": {"read": True}})
        return jsonify({"success": True})

    @app.get("/api/admin/<collection>")
    @admin_required
    def admin_list_api(collection):
        allowed = {"quests", "activities", "locations", "rewards", "achievements", "games"}
        if collection not in allowed:
            return api_error("Unsupported management resource.", 404)
        records = list(get_db()[collection].find({"active": {"$ne": False}}).limit(250))
        return jsonify({"success": True, "data": serialize(records)})

    @app.get("/api/admin/users")
    @admin_required
    def admin_users_api():
        users = list(get_db().users.find({}, {
            "email": 1, "username": 1, "full_name": 1,
            "department": 1, "role": 1, "is_active": 1, "created_at": 1,
        }).limit(250))
        return jsonify({"success": True, "data": serialize(users)})

    @app.put("/api/admin/users/<user_id>")
    @admin_required
    def admin_update_user_api(user_id):
        if not valid_object_id(user_id):
            return api_error("User not found.", 404)
        payload = request.get_json(silent=True) or {}
        updates = {}
        if isinstance(payload.get("is_active"), bool):
            updates["is_active"] = payload["is_active"]
        if payload.get("role") in {"student", "admin"}:
            updates["role"] = payload["role"]
        if not updates:
            return api_error("Provide a valid role or active status.", 400)
        target_id = ObjectId(user_id)
        if target_id == current_user()["_id"] and updates.get("is_active") is False:
            return api_error("You cannot deactivate your own admin account.", 409)
        result = get_db().users.update_one({"_id": target_id}, {"$set": updates})
        if not result.matched_count:
            return api_error("User not found.", 404)
        return jsonify({"success": True, "message": "User updated."})

    @app.post("/api/admin/<collection>")
    @admin_required
    def admin_create_api(collection):
        allowed = {"quests", "activities", "locations", "rewards", "achievements", "games"}
        if collection not in allowed:
            return api_error("Unsupported management resource.", 404)
        payload = request.get_json(silent=True) or {}
        document = sanitize_admin_document(collection, payload)
        if not document:
            return api_error("Required fields are missing or invalid.", 400)
        try:
            result = get_db()[collection].insert_one(document)
        except DuplicateKeyError:
            return api_error("A record with that key or name already exists.", 409)
        return jsonify({"success": True, "message": "Record created.", "data": {"id": str(result.inserted_id)}}), 201

    @app.put("/api/admin/<collection>/<record_id>")
    @admin_required
    def admin_update_api(collection, record_id):
        allowed = {"quests", "activities", "locations", "rewards", "achievements", "games"}
        if collection not in allowed or not valid_object_id(record_id):
            return api_error("Record not found.", 404)
        document = sanitize_admin_document(collection, request.get_json(silent=True) or {})
        if not document:
            return api_error("Required fields are missing or invalid.", 400)
        try:
            result = get_db()[collection].update_one({"_id": ObjectId(record_id)}, {"$set": document})
        except DuplicateKeyError:
            return api_error("A record with that key or name already exists.", 409)
        if not result.matched_count:
            return api_error("Record not found.", 404)
        return jsonify({"success": True, "message": "Record updated."})

    @app.delete("/api/admin/<collection>/<record_id>")
    @admin_required
    def admin_delete_api(collection, record_id):
        allowed = {"quests", "activities", "locations", "rewards", "achievements", "games"}
        if collection not in allowed or not valid_object_id(record_id):
            return api_error("Record not found.", 404)
        result = get_db()[collection].update_one({"_id": ObjectId(record_id)}, {"$set": {"active": False}})
        if not result.matched_count:
            return api_error("Record not found.", 404)
        return jsonify({"success": True, "message": "Record archived."})

    @app.errorhandler(403)
    def forbidden(_error):
        if request.path.startswith("/api/"):
            return api_error("Administrator access is required.", 403)
        return render_template("error.html", code=403, message="This area is for campus admins."), 403

    @app.errorhandler(404)
    def not_found(_error):
        if request.path.startswith("/api/"):
            return api_error("The requested resource was not found.", 404)
        return render_template("error.html", code=404, message="Looks like this path is off the map."), 404

    @app.errorhandler(500)
    def server_error(error):
        app.logger.error("Unhandled application error: %s", error)
        if request.path.startswith("/api/"):
            return api_error("An unexpected server error occurred.", 500)
        return render_template("error.html", code=500, message="Something went wrong on this expedition."), 500

    return app


def api_error(message, status=400):
    return jsonify({"success": False, "message": message}), status


def same_origin_request():
    origin = request.headers.get("Origin") or request.headers.get("Referer")
    if not origin:
        return False
    supplied = urlsplit(origin)
    expected = urlsplit(request.host_url)
    return (
        supplied.scheme in {"http", "https"}
        and supplied.scheme == expected.scheme
        and supplied.netloc.casefold() == expected.netloc.casefold()
    )


def find_by_id(collection, value):
    if not valid_object_id(value):
        return None
    return collection.find_one({"_id": ObjectId(value)})


def serialize(value):
    if isinstance(value, list):
        return [serialize(item) for item in value]
    if isinstance(value, dict):
        return {
            key: serialize(item) for key, item in value.items()
            if key != "password_hash"
        }
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def season_progress(db, user_id, quest):
    if quest.get("category") != "story":
        return
    season = db.seasons.find_one({"active": True})
    if not season:
        return
    fragment = next((item for item in season.get("fragments", []) if item.casefold() in quest.get("title", "").casefold()), None)
    if not fragment:
        return
    db.season_progress.update_one(
        {"user_id": user_id, "season_id": season["_id"]},
        {"$addToSet": {"fragments": fragment}},
        upsert=True,
    )


def unlock_achievements(user_id):
    db = get_db()
    stats = db.player_stats.find_one({"user_id": user_id}) or {}
    completed = stats.get("completed_quests", 0)
    quest_categories = list(db.quest_progress.aggregate([
        {"$match": {"user_id": user_id, "completed": True}},
        {"$lookup": {"from": "quests", "localField": "quest_id", "foreignField": "_id", "as": "quest"}},
        {"$unwind": "$quest"},
        {"$group": {"_id": "$quest.category", "count": {"$sum": 1}}},
    ]))
    tech_count = next((row["count"] for row in quest_categories if row["_id"] == "tech"), 0)
    season = db.seasons.find_one({"active": True})
    season_row = db.season_progress.find_one({"user_id": user_id, "season_id": season["_id"]}) if season else None
    visited = db.user_location_visits.count_documents({"user_id": user_id})
    campus_locations = db.locations.count_documents({"active": {"$ne": False}})
    tests = {
        "first-quest": completed >= 1,
        "explorer": visited >= 5,
        "quest-master": completed >= 10,
        "code-warrior": tech_count >= 5,
        "seven-day-streak": stats.get("current_streak", 0) >= 7,
        "mini-game-champion": db.game_attempts.count_documents({"user_id": user_id}) >= 1,
        "campus-explorer": campus_locations > 0 and visited >= campus_locations,
        "season-01-complete": bool(season_row and len(season_row.get("fragments", [])) >= 4),
    }
    for key, achieved in tests.items():
        if achieved:
            achievement = db.achievements.find_one({"key": key})
            if achievement:
                try:
                    db.user_achievements.insert_one({
                        "user_id": user_id, "achievement_id": achievement["_id"],
                        "unlocked_at": datetime.now(timezone.utc),
                    })
                    db.notifications.insert_one({
                        "user_id": user_id, "title": "Achievement unlocked!",
                        "message": achievement["name"], "created_at": datetime.now(timezone.utc), "read": False,
                    })
                except DuplicateKeyError:
                    pass


def sanitize_admin_document(collection, payload):
    def text(key, maximum=200):
        return clean_text(payload.get(key), maximum)

    def integer(key, default=None):
        value = payload.get(key, default)
        if isinstance(value, bool) or not isinstance(value, int):
            return None
        return value

    def make_key(value):
        return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:50]

    if collection == "quests":
        title, description = text("title"), text("description", 600)
        xp, coins = integer("xp"), integer("coins")
        category = text("category", 24).lower() or "fun"
        objectives = payload.get("objectives", [])
        is_quiz = payload.get("type") == "quiz"
        options = payload.get("options", [])
        answer = text("answer", 80)
        if (
            not title or not description or xp is None or coins is None
            or xp < 0 or coins < 0
            or category not in {"story", "daily", "exploration", "tech", "fun"}
            or not isinstance(objectives, list)
            or not isinstance(options, list)
            or (is_quiz and (not answer or answer not in options))
        ):
            return None
        return {
            "key": make_key(title), "title": title, "description": description, "category": category,
            "difficulty": text("difficulty", 24) or "Easy", "xp": min(xp, 5000),
            "coins": min(coins, 5000), "location": text("location", 100) or "Anywhere",
            "objectives": [clean_text(item, 120) for item in objectives[:10] if isinstance(item, str)],
            "type": "quiz" if is_quiz else "location",
            **({"answer": answer, "options": [clean_text(item, 80) for item in options[:8]]} if is_quiz else {}),
            "active": True,
        }
    if collection == "activities":
        xp = integer("xp", 0)
        if not text("title") or not text("organization") or xp is None or xp < 0:
            return None
        title = text("title", 180)
        return {"key": make_key(title), **{key: text(key, 180) for key in ("title", "organization", "category", "date", "time", "location")}, "xp": min(xp, 5000), "active": True}
    if collection == "locations":
        map_x, map_y = integer("map_x"), integer("map_y")
        if (
            not text("name") or map_x is None or map_y is None
            or not (0 <= map_x <= 100 and 0 <= map_y <= 100)
        ):
            return None
        return {
            "name": text("name"), "description": text("description", 300),
            "map_x": map_x, "map_y": map_y, "kind": text("kind", 30),
            "active": True,
        }
    if collection == "rewards":
        cost = integer("cost")
        if not text("name") or cost is None or cost < 0:
            return None
        name = text("name")
        return {"key": make_key(name), "name": name, "description": text("description", 300), "cost": cost, "icon": text("icon", 8), "active": True}
    if collection == "achievements":
        target = integer("target", 1)
        if not text("name") or not text("key", 50) or target is None:
            return None
        return {"key": text("key", 50), "name": text("name"), "description": text("description", 300), "icon": text("icon", 8), "target": min(max(target, 1), 100000), "active": True}
    if collection == "games":
        xp = integer("xp", 0)
        if not text("key", 50) or not text("name") or xp is None or xp < 0:
            return None
        return {
            "key": text("key", 50), "name": text("name"),
            "description": text("description", 300),
            "difficulty": text("difficulty", 24) or "Easy",
            "xp": min(xp, 5000),
            "icon": text("icon", 8), "active": True,
        }
    return None


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_ENV") != "production")
