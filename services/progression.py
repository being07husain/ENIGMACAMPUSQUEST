from datetime import date, datetime, timezone

from bson import ObjectId
from pymongo import ReturnDocument

from utils.db import get_db


LEVEL_THRESHOLDS = [0, 500, 1200, 2000, 3000, 4500, 6500, 9000, 12000, 16000]


def calculate_level(xp):
    level = 1
    for index, threshold in enumerate(LEVEL_THRESHOLDS, start=1):
        if xp >= threshold:
            level = index
    if xp >= LEVEL_THRESHOLDS[-1]:
        level += (xp - LEVEL_THRESHOLDS[-1]) // 5000
    return level


def level_progress(xp):
    level = calculate_level(xp)
    if level <= len(LEVEL_THRESHOLDS):
        current_floor = LEVEL_THRESHOLDS[level - 1]
        next_floor = (
            LEVEL_THRESHOLDS[level]
            if level < len(LEVEL_THRESHOLDS)
            else current_floor + 5000
        )
    else:
        current_floor = LEVEL_THRESHOLDS[-1] + (level - len(LEVEL_THRESHOLDS)) * 5000
        next_floor = current_floor + 5000
    return {
        "level": level,
        "current_xp": max(0, xp - current_floor),
        "needed_xp": max(1, next_floor - current_floor),
        "total_xp": xp,
    }


def update_streak(stats):
    today = date.today().isoformat()
    previous = stats.get("last_activity_date")
    if previous != today:
        if previous == date.fromordinal(date.today().toordinal() - 1).isoformat():
            stats["current_streak"] = stats.get("current_streak", 0) + 1
        else:
            stats["current_streak"] = 1
        stats["longest_streak"] = max(
            stats.get("longest_streak", 0), stats["current_streak"]
        )
        stats["last_activity_date"] = today


def add_rewards(user_id, xp=0, coins=0, reason="Reward", reward_key=None):
    db = get_db()
    stats = db.player_stats.find_one({"user_id": ObjectId(user_id)})
    if not stats:
        raise LookupError("Player stats are missing.")
    xp_reward = max(0, int(xp))
    coin_reward = max(0, int(coins))
    query = {"_id": stats["_id"]}
    update = {"$inc": {"xp": xp_reward, "coins": coin_reward}}
    if reward_key:
        query["reward_keys"] = {"$ne": reward_key}
        update["$addToSet"] = {"reward_keys": reward_key}
        update["$inc"]["completed_quests"] = 1
    updated_stats = db.player_stats.find_one_and_update(
        query, update, return_document=ReturnDocument.AFTER
    )
    if not updated_stats:
        return False
    today = date.today().isoformat()
    previous = stats.get("last_activity_date")
    if previous != today:
        yesterday = date.fromordinal(date.today().toordinal() - 1).isoformat()
        streak = stats.get("current_streak", 0) + 1 if previous == yesterday else 1
        db.player_stats.update_one(
            {"_id": stats["_id"], "last_activity_date": previous},
            {"$set": {
                "current_streak": streak,
                "longest_streak": max(stats.get("longest_streak", 0), streak),
                "last_activity_date": today,
            }},
        )
    new_level = calculate_level(updated_stats.get("xp", 0))
    level_update = db.player_stats.update_one(
        {"_id": stats["_id"]}, {"$max": {"level": new_level}}
    )
    if level_update.modified_count and new_level > stats.get("level", 1):
        db.notifications.insert_one(
            {
                "user_id": ObjectId(user_id),
                "title": f"You reached Level {new_level}!",
                "message": "Your next campus adventure awaits.",
                "created_at": datetime.now(timezone.utc),
                "read": False,
            }
        )
    db.activity_log.insert_one(
        {
            "user_id": ObjectId(user_id),
            "message": reason,
            "xp": xp_reward,
            "created_at": datetime.now(timezone.utc),
        }
    )
    return True
