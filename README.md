# CampusQuest

CampusQuest turns a college campus into a story-driven game world. Students can discover campus quests, earn XP and coins, track streaks, collect achievements, explore a location map, play mini-games, join squads, find campus activities, and spend rewards. The interface uses a purple-and-gold night-sky theme and is responsive across desktop and mobile.

## Stack

- Python 3.10+
- Flask, Jinja2, Fetch API, and vanilla JavaScript
- MongoDB through PyMongo
- Three.js WebGL, OrbitControls, HTML, CSS, and JavaScript for the virtual campus map

## Project layout

```text
app.py                   Flask routes, API, and application factory
config.py                Environment configuration
database/seed.py         Sample accounts and game content
database/indexes.py      MongoDB indexes
services/progression.py  XP, levels, streaks, and rewards
utils/                   Database, validation, and authorization helpers
templates/               Jinja pages
static/css/style.css     Theme and responsive layout
static/js/main.js        Fetch API and interactive page/game behavior
static/js/campus-world.js  Procedural 3D campus scene and orbit camera
static/vendor/           Locally served Three.js 0.128.0 and OrbitControls
scripts/vendor-three.cjs Copies the pinned Three.js distribution into static/vendor
```

## MongoDB setup

Install and start MongoDB locally, or use a MongoDB Atlas connection string. The default database is `campusquest` on `mongodb://localhost:27017/`.

Copy `.env.example` to `.env` and set a private secret key:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```dotenv
MONGO_URI=mongodb://localhost:27017/
MONGO_DB_NAME=campusquest
SECRET_KEY=replace-with-a-long-random-value
FLASK_ENV=development
```

The app reports database availability at `/health`. It does not switch to an in-memory or file-based database if MongoDB is unavailable.

## Windows installation and run

From the project directory in PowerShell:

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set the `SECRET_KEY` in `.env`, then seed the database and start Flask:

```powershell
python database/seed.py
python app.py
```

Open <http://127.0.0.1:5000>. `database/seed.py` refreshes seeded quests, locations, achievements, games, rewards, and activities; it does not overwrite an existing account's password or player stats.

Run the included core checks with:

```powershell
python -m unittest discover -s tests -v
```

## Sample accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@campusquest.local` | `Admin@123` |
| Student | `student@campusquest.local` | `Student@123` |

Change or remove these development credentials before exposing a deployment to other users.

## Features

- Student signup, login, logout, password hashing, sessions, CSRF checks, and admin authorization
- Player XP, levels, coins, streaks, profile editing, achievements, and activity history
- Quest board with filters, story/daily/tech/exploration quests, server-validated quest completion, and one-time quest rewards
- Fictional 3D virtual campus with procedural buildings, paths, landscaping, an orbit camera, and manual exploration progress
- Location quests started from a selected map landmark; no device GPS, real-world coordinates, external map tiles, or location permission is used
- Global, department, weekly, and monthly leaderboards
- Five interactive vanilla-JavaScript mini-games with saved best scores and a first-game achievement
- Squad create/join/leave, campus activities, notifications, and coin reward shop
- Admin dashboard and content creation/edit/archive for quests, activities, locations, rewards, achievements, plus account activation and role management

## API overview

All player APIs are under `/api` and require a signed-in session. Mutating requests require the session CSRF token in the `X-CSRF-Token` header (or a form's `csrf_token`). The UI sends the token automatically.

- `GET /api/profile`, `PUT /api/profile`
- `GET /api/quests`, `GET /api/quests/<id>`, `POST /api/quests/<id>/start`, `POST /api/quests/<id>/complete`
- `GET /api/map/locations`, `POST /api/map/locations/<location_id>/explore`
- `GET /api/leaderboard?scope=global|department|weekly|monthly`
- `GET /api/achievements`, `GET /api/rewards`, `POST /api/rewards/<id>/claim`
- `GET /api/games`, `POST /api/games/<id>/play`
- `GET /api/squad`, `POST /api/squad/create|join|leave`
- `GET /api/activities`, `POST /api/activities/<id>/join`
- `GET /api/notifications`, `POST /api/notifications/<id>/read`, `POST /api/notifications/read-all`
- `GET /api/admin/users` and `/api/admin/<collection>` plus create/update/archive routes for admin-managed content

Responses use `{ "success": true, "message": "...", "data": ... }` or `{ "success": false, "message": "..." }`.

## Campus configuration and deployment notes

CampusQuest does not use browser or device geolocation. Its fictional campus is built locally from Three.js meshes: terrain and boundary, connected paved routes, distinct buildings, a central plaza, gardens, sports grounds, trees, lamps, quest markers, a virtual player, and small student-life amenities. Clickable amenities such as the Nescafé kiosk, food street, bookstore, shuttle stop, notice boards, and reward shop open information popups; reward and achievement displays link to the existing rewards and achievements pages. These props are visual campus features and do not create a second rewards or purchasing system. Three.js and OrbitControls are served from `static/vendor`, so the map does not require a CDN, external map tiles, a real-world blueprint, coordinates, or location permission. Drag with the left mouse button to orbit, right-drag to pan, use the wheel to zoom, and use Fit Campus, Reset View, Top View, and Isometric controls to adjust the camera. Select a building to open its location drawer and quests; Explore Location saves the virtual visit in MongoDB. The player marker begins at the virtual campus gate and moves to an explored landmark during the current map visit. A location quest requires the player to explore its matching landmark, start the quest, and then complete it; the server awards quest rewards once only.

The local renderer uses the Three.js 0.128.0 distribution. To refresh its checked-in browser assets, run `npm install` and `npm run vendor:three` from the project directory. Flask serves `static/vendor` directly and does not need Node.js at runtime.

Use HTTPS, a strong secret key, production MongoDB credentials, and `FLASK_ENV=production` for deployment. The default sample admin credentials are for local development only. Joining an activity records interest only; it does not grant its displayed attendance XP. This project does not include password reset/email delivery, verified attendance for events, third-party SSO, or deployment infrastructure.
