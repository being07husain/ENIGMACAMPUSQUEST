from datetime import datetime, timezone
import re
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from werkzeug.security import generate_password_hash

from database.indexes import create_indexes
from utils.db import get_db


LOCATIONS = [
    ("Main Gate", 9, 47, "gateway"),
    ("Main Academic Block", 31, 42, "academic"),
    ("IT Block", 48, 27, "tech"),
    ("Library", 66, 37, "library"),
    ("Auditorium", 81, 48, "event"),
    ("Canteen", 67, 62, "food"),
    ("Management Block", 42, 55, "academic"),
    ("Sports Ground", 21, 76, "sports"),
    ("Hostel", 84, 78, "hostel"),
    ("Garden", 50, 83, "garden"),
    ("Administration", 17, 24, "academic"),
    ("Parking", 91, 22, "parking"),
]

QUESTS = [
    {"title": "The Missing Manuscript", "category": "story", "description": "A rare page vanished from the archives. Follow the clues to recover it.", "difficulty": "Medium", "xp": 150, "coins": 50, "location": "Library", "objectives": ["Explore the Library", "Find the hidden clue", "Solve the code"], "type": "location"},
    {"title": "Campus Explorer", "category": "daily", "description": "Explore a campus landmark and add it to your discoveries.", "difficulty": "Easy", "xp": 150, "coins": 30, "location": "Any campus location", "objectives": ["Choose a campus location", "Explore the landmark"], "type": "location"},
    {"title": "The Lost Code: Library Fragment", "category": "story", "description": "The first fragment is rumored to be hidden among the library stacks.", "difficulty": "Easy", "xp": 200, "coins": 75, "location": "Library", "objectives": ["Explore the Library", "Collect the first fragment"], "type": "location"},
    {"title": "The Lost Code: IT Lab Fragment", "category": "story", "description": "A strange sequence is blinking on a terminal in the IT Lab.", "difficulty": "Medium", "xp": 220, "coins": 80, "location": "IT Block", "objectives": ["Explore the IT Block", "Decode the sequence"], "type": "location"},
    {"title": "The Lost Code: Auditorium Fragment", "category": "story", "description": "The old stage lights reveal a hidden pattern after dusk.", "difficulty": "Medium", "xp": 240, "coins": 90, "location": "Auditorium", "objectives": ["Explore the Auditorium", "Find the hidden pattern"], "type": "location"},
    {"title": "The Lost Code: Canteen Fragment", "category": "story", "description": "The final fragment is closer than anyone expects.", "difficulty": "Hard", "xp": 300, "coins": 120, "location": "Canteen", "objectives": ["Explore the Canteen", "Recover the final fragment"], "type": "location"},
    {"title": "Style the Web", "category": "tech", "description": "Which language is primarily used for styling web pages?", "difficulty": "Easy", "xp": 50, "coins": 10, "location": "Anywhere", "objectives": ["Choose the correct answer"], "type": "quiz", "answer": "CSS", "options": ["HTML", "CSS", "Python", "SQL"]},
    {"title": "Markup Master", "category": "tech", "description": "Which HTML element creates a hyperlink?", "difficulty": "Easy", "xp": 60, "coins": 12, "location": "Anywhere", "objectives": ["Choose the correct answer"], "type": "quiz", "answer": "<a>", "options": ["<a>", "<p>", "<h1>", "<div>"]},
    {"title": "JavaScript Spark", "category": "tech", "description": "Which keyword declares a block-scoped variable that can be reassigned?", "difficulty": "Easy", "xp": 60, "coins": 12, "location": "Anywhere", "objectives": ["Choose the correct answer"], "type": "quiz", "answer": "let", "options": ["let", "const", "static", "final"]},
    {"title": "Data Trail", "category": "tech", "description": "Which MongoDB data format is used to represent documents?", "difficulty": "Medium", "xp": 80, "coins": 18, "location": "Anywhere", "objectives": ["Choose the correct answer"], "type": "quiz", "answer": "BSON", "options": ["BSON", "CSV", "XML only", "SQL rows"]},
    {"title": "Git Pathfinder", "category": "tech", "description": "Which command creates a new Git branch and switches to it?", "difficulty": "Medium", "xp": 80, "coins": 18, "location": "Anywhere", "objectives": ["Choose the correct answer"], "type": "quiz", "answer": "git switch -c", "options": ["git switch -c", "git branch --delete", "git status", "git merge"]},
    {"title": "Garden Wayfinder", "category": "exploration", "description": "Find a quiet corner of campus and explore the garden.", "difficulty": "Easy", "xp": 100, "coins": 25, "location": "Garden", "objectives": ["Explore the Garden"], "type": "location"},
    {"title": "Quick Brain Teaser", "category": "fun", "description": "Complete a short challenge and keep your streak alive.", "difficulty": "Easy", "xp": 40, "coins": 10, "location": "Anywhere", "objectives": ["Complete today's challenge"], "type": "quiz", "answer": "CSS", "options": ["HTML", "CSS", "Python", "SQL"]},
]

ACHIEVEMENTS = [
    ("first-quest", "First Quest", "Complete your first quest.", "✦", 1),
    ("explorer", "Explorer", "Visit 5 unique campus locations.", "⌖", 5),
    ("quest-master", "Quest Master", "Complete 10 quests.", "♛", 10),
    ("code-warrior", "Code Warrior", "Complete 5 tech challenges.", "⌘", 5),
    ("seven-day-streak", "7 Day Streak", "Keep your streak going for a week.", "◷", 7),
    ("campus-explorer", "Campus Explorer", "Discover every campus location.", "◎", 12),
    ("mini-game-champion", "Mini Game Champion", "Play your first mini-game.", "✧", 1),
    ("season-01-complete", "Season 01 Complete", "Recover all four story fragments.", "◇", 4),
]

GAMES = [
    ("code-rush", "Code Rush", "Race the clock through rapid-fire tech questions.", "Medium", 50, "⌘"),
    ("memory-match", "Memory Match", "Pair the symbols before your moves run out.", "Easy", 40, "▦"),
    ("cyber-escape", "Cyber Escape", "Crack a sequence to unlock the exit.", "Hard", 80, "⌁"),
    ("quick-tap", "Quick Tap", "Hit the target before the timer fades.", "Easy", 30, "◉"),
    ("pattern-breaker", "Pattern Breaker", "Remember the sequence. Repeat it perfectly.", "Medium", 60, "⌗"),
]

REWARDS = [
    ("mystery-badge", "Mystery Badge", "A little proof that you went off the map.", 120, "✧"),
    ("exclusive-avatar", "Astral Avatar", "A limited portrait for your player card.", 250, "◉"),
    ("special-title", "Title: Night Scholar", "Let the campus know your late-night legend.", 180, "✦"),
    ("campusquest-badge", "CampusQuest Badge", "The emblem of a true campus explorer.", 400, "◇"),
    ("season-badge", "The Lost Code", "A keepsake from Season 01.", 300, "⌘"),
]

ACTIVITIES = [
    {"title": "Puzzle Night: Decode the Archive", "organization": "Enigma IT Club", "category": "Tech events", "date": "2026-10-02", "time": "17:30", "location": "IT Block", "xp": 80},
    {"title": "Build for Good", "organization": "E-Cell", "category": "Competitions", "date": "2026-10-05", "time": "10:00", "location": "Auditorium", "xp": 120},
    {"title": "Innovation Open House", "organization": "IIC", "category": "Workshops", "date": "2026-10-08", "time": "14:00", "location": "Management Block", "xp": 60},
    {"title": "Campus Green Hour", "organization": "NSS", "category": "Community activities", "date": "2026-10-11", "time": "08:00", "location": "Garden", "xp": 70},
    {"title": "Rotaract Welcome Mixer", "organization": "Rotaract", "category": "Club activities", "date": "2026-10-14", "time": "16:00", "location": "Canteen", "xp": 50},
    {"title": "Prabhandhan Leadership Lab", "organization": "Prabhandhan", "category": "College events", "date": "2026-10-17", "time": "11:00", "location": "Main Academic Block", "xp": 90},
]


def seed():
    create_indexes()
    db = get_db()
    now = datetime.now(timezone.utc)
    for email, username, name, role, password, roll in [
        ("admin@campusquest.local", "questadmin", "CampusQuest Admin", "admin", "Admin@123", "ADMIN"),
        ("student@campusquest.local", "starlight", "Aarav Mehta", "student", "Student@123", "CQ2026001"),
    ]:
        db.users.update_one(
            {"email": email},
            {"$setOnInsert": {
                "full_name": name, "username": username, "email": email,
                "password_hash": generate_password_hash(password), "roll_number": roll,
                "department": "Computer Science", "year": "2", "semester": "4",
                "avatar": "", "role": role, "is_active": True,
                "created_at": now, "last_login": None,
            }},
            upsert=True,
        )
        user = db.users.find_one({"email": email})
        db.player_stats.update_one(
            {"user_id": user["_id"]},
            {"$setOnInsert": {
                "xp": 0 if role == "admin" else 420, "level": 1, "coins": 0 if role == "admin" else 160,
                "total_quests": 0, "completed_quests": 0, "current_streak": 0,
                "longest_streak": 0, "last_activity_date": None,
            }},
            upsert=True,
        )
    for name, map_x, map_y, kind in LOCATIONS:
        db.locations.update_one(
            {"name": name},
            {"$set": {
                "name": name, "map_x": map_x, "map_y": map_y, "kind": kind,
                "description": f"Discover {name} on the CampusQuest campus map.",
                "active": True,
            }, "$unset": {"latitude": "", "longitude": "", "radius_m": ""}},
            upsert=True,
        )
    for quest in QUESTS:
        key = re.sub(r"[^a-z0-9]+", "-", quest["title"].lower()).strip("-")
        db.quests.update_one(
            {"key": key},
            {"$set": {**quest, "key": key, "active": True}},
            upsert=True,
        )
    for key, name, description, icon, target in ACHIEVEMENTS:
        db.achievements.update_one(
            {"key": key},
            {"$set": {
                "key": key, "name": name, "description": description,
                "icon": icon, "target": target, "active": True,
            }},
            upsert=True,
        )
    for key, name, description, difficulty, xp, icon in GAMES:
        db.games.update_one(
            {"key": key},
            {"$set": {
                "key": key, "name": name, "description": description,
                "difficulty": difficulty, "xp": xp, "icon": icon, "active": True,
            }},
            upsert=True,
        )
    for key, name, description, cost, icon in REWARDS:
        db.rewards.update_one(
            {"key": key},
            {"$set": {
                "key": key, "name": name, "description": description,
                "cost": cost, "icon": icon, "active": True,
            }},
            upsert=True,
        )
    for activity in ACTIVITIES:
        key = re.sub(r"[^a-z0-9]+", "-", activity["title"].lower()).strip("-")
        db.activities.update_one(
            {"key": key},
            {"$set": {**activity, "key": key, "active": True}},
            upsert=True,
        )
    db.seasons.update_one(
        {"key": "season-01"},
        {"$set": {"name": "The Lost Code", "number": 1, "fragments": ["Library", "IT Lab", "Auditorium", "Canteen"], "active": True}},
        upsert=True,
    )
    print("CampusQuest sample data is ready.")


if __name__ == "__main__":
    seed()
