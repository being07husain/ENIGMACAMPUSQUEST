from utils.db import get_db


def create_indexes():
    db = get_db()
    db.users.create_index("email", unique=True)
    db.users.create_index("username", unique=True)
    db.users.create_index("roll_number", unique=True, sparse=True)
    db.quests.create_index("key", unique=True)
    db.locations.create_index("name", unique=True)
    db.achievements.create_index("key", unique=True)
    db.games.create_index("key", unique=True)
    db.rewards.create_index("key", unique=True)
    db.activities.create_index("key", unique=True)
    db.player_stats.create_index("user_id", unique=True)
    db.quest_progress.create_index(
        [("user_id", 1), ("quest_id", 1)], unique=True
    )
    db.notifications.create_index([("user_id", 1), ("read", 1)])
    db.user_achievements.create_index(
        [("user_id", 1), ("achievement_id", 1)], unique=True
    )
    db.game_attempts.create_index([("user_id", 1), ("created_at", -1)])
    db.squad_members.create_index("user_id", unique=True)
    db.activity_log.create_index([("user_id", 1), ("created_at", -1)])
    db.user_rewards.create_index([("user_id", 1), ("reward_id", 1)], unique=True)
    db.activity_participants.create_index([("activity_id", 1), ("user_id", 1)], unique=True)
    db.season_progress.create_index([("user_id", 1), ("season_id", 1)], unique=True)
    db.user_location_visits.create_index([("user_id", 1), ("location_id", 1)], unique=True)
