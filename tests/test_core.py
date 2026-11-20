import unittest
from pathlib import Path

from app import app
from services.progression import calculate_level, level_progress
from utils.validators import valid_object_id, valid_username


class CampusQuestCoreTests(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True, SECRET_KEY="test-secret")
        self.client = app.test_client()

    def test_login_and_signup_pages_render(self):
        self.assertEqual(self.client.get("/login").status_code, 200)
        self.assertEqual(self.client.get("/signup").status_code, 200)

    def test_auth_pages_use_the_campus_background_asset(self):
        response = self.client.get("/login")
        self.assertIn(b"/assets/campus_desktop_bg.jpg", response.data)
        image = self.client.get("/assets/campus_desktop_bg.jpg")
        self.assertEqual(image.status_code, 200)
        self.assertEqual(image.mimetype, "image/jpeg")

    def test_player_api_requires_authentication(self):
        response = self.client.get("/api/profile")
        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.get_json()["success"])

    def test_mutating_requests_require_csrf_token(self):
        response = self.client.post("/api/notifications/read-all")
        self.assertEqual(response.status_code, 400)
        self.assertIn("session token expired", response.get_json()["message"].lower())

    def test_signup_with_expired_form_token_shows_recoverable_message(self):
        response = self.client.post("/signup", data={
            "full_name": "Expired Token",
            "username": "expired_token",
            "email": "expired@example.edu",
        }, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Your form session expired", response.data)

    def test_auth_form_with_stale_token_accepts_same_origin_submission(self):
        response = self.client.post("/login", data={
            "email": "missing@example.edu",
            "password": "not-the-password",
            "csrf_token": "stale-form-token",
        }, headers={"Origin": "http://localhost/"}, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"not recognized", response.data)
        self.assertNotIn(b"form session expired", response.data)

    def test_auth_form_with_stale_token_rejects_cross_origin_submission(self):
        response = self.client.post("/login", data={
            "email": "missing@example.edu",
            "password": "not-the-password",
            "csrf_token": "stale-form-token",
        }, headers={"Origin": "https://attacker.invalid"}, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"form session expired", response.data)

    def test_progression_thresholds_and_overflow_levels(self):
        self.assertEqual(calculate_level(0), 1)
        self.assertEqual(calculate_level(500), 2)
        self.assertEqual(calculate_level(21_000), 11)
        self.assertEqual(level_progress(26_500), {
            "level": 12, "current_xp": 500, "needed_xp": 5000, "total_xp": 26_500,
        })

    def test_identifiers_and_usernames_are_validated(self):
        self.assertTrue(valid_username("night_owl7"))
        self.assertFalse(valid_username("x!"))
        self.assertTrue(valid_object_id("507f1f77bcf86cd799439011"))
        self.assertFalse(valid_object_id("not-an-id"))

    def test_map_is_virtual_and_has_no_gps_verification_route(self):
        frontend = Path("static/js/main.js").read_text(encoding="utf-8")
        routes = {rule.rule for rule in app.url_map.iter_rules()}
        self.assertNotIn("navigator.geolocation", frontend)
        self.assertNotIn("/api/map/verify-location", routes)
        self.assertIn("/api/map/locations/<location_id>/explore", routes)

    def test_campus_map_uses_local_threejs_world_and_keeps_location_flows(self):
        template = Path("templates/page.html").read_text(encoding="utf-8")
        base = Path("templates/base.html").read_text(encoding="utf-8")
        frontend = Path("static/js/main.js").read_text(encoding="utf-8")
        world = Path("static/js/campus-world.js").read_text(encoding="utf-8")
        self.assertIn('id="campus-3d-world"', template)
        self.assertIn('id="map-3d-tooltip"', template)
        self.assertNotIn('<svg class="map-scenery"', template)
        self.assertIn("vendor/three.min.js", base)
        self.assertIn("vendor/OrbitControls.js", base)
        self.assertTrue(Path("static/vendor/three.min.js").is_file())
        self.assertTrue(Path("static/vendor/OrbitControls.js").is_file())
        for asset in ("three.min.js", "OrbitControls.js"):
            response = self.client.get(f"/static/vendor/{asset}")
            try:
                self.assertEqual(response.status_code, 200)
            finally:
                response.close()
        self.assertIn('id="map-detail-panel" aria-live="polite" aria-hidden="true"', template)
        self.assertIn('id="map-open-hint"', template)
        for control in ("map-zoom-in", "map-zoom-out", "map-reset", "map-fit", "map-top-view", "map-isometric", "map-panel-toggle"):
            self.assertIn(f'id="{control}"', template)
        for label in (
            "MAIN GATE", "ACADEMIC HALL", "INNOVATION LAB", "DIGITAL LIBRARY",
            "AUDITORIUM", "CAMPUS CAFÉ", "GAME ARENA", "SPORTS GROUND",
            "MYSTERY GARDEN", "KNOWLEDGE TOWER", "STUDENT HUB", "QUEST BOARD",
        ):
            self.assertIn(f'label: "{label}"', world)
        self.assertIn("/api/map/locations", frontend)
        self.assertIn("/api/map/locations/${button.dataset.locationId}/explore", frontend)
        self.assertIn("OrbitControls", world)
        self.assertIn("THREE.PerspectiveCamera", world)
        self.assertIn("THREE.WebGLRenderer", world)
        self.assertIn("THREE.Scene", world)
        self.assertIn('ground: makeMaterial("#142c25"', world)
        self.assertIn('groundTop: makeMaterial("#18382c"', world)
        self.assertIn('wall: makeMaterial("#d8c79f"', world)
        self.assertIn('roof: makeMaterial("#182652"', world)
        self.assertIn('x: 0, z: 59, kind: "gate"', world)
        self.assertIn('x: -27, z: -38, kind: "library"', world)
        self.assertIn('x: 60, z: 44, kind: "sports"', world)
        self.assertIn("campusShape.lineTo(77, 39)", world)
        self.assertIn('points: [[0, 59], [1, 49], [0, 40]', world)
        self.assertIn('points: [[45, 22], [48, 28], [51, 36]', world)
        self.assertIn('courtyard.position.set(20, 0.11, 29)', world)
        self.assertIn("renderer.toneMapping = THREE.NoToneMapping", world)
        self.assertIn("const gateApproach", world)
        self.assertIn('case "sports":\n          makeSportsGround(group);', world)
        self.assertIn('new THREE.RingGeometry(7.2, 8.7, 56)', world)
        self.assertIn("materials.courtBlue", world)
        self.assertIn("materials.courtPurple", world)
        self.assertIn('"SPORTS COMPLEX"', world)
        self.assertIn('"CAMPUS EVENTS"', world)
        self.assertIn("makeSocialCourtyard", world)
        self.assertIn("makeParkingArea();", world)
        self.assertIn("makeCricketNet();", world)
        self.assertIn("CAMPUS PARKING", world)
        self.assertIn("CRICKET PRACTICE NET", world)
        self.assertIn('onAmenitySelect: renderAmenity', frontend)
        self.assertIn('id="map-amenity-popup"', template)
        for amenity_id in (
            "nescafe", "food-street", "campus-stationery", "print-copy",
            "bookstore", "shuttle-stop", "information-kiosk", "atm",
            "charge-study", "notice-gate", "notice-hub", "notice-academic",
            "notice-library", "notice-sports", "quest-board", "reward-shop",
            "achievement-wall", "photo-spot", "sports-shed",
        ):
            self.assertIn(f'"{amenity_id}"', world)
        self.assertIn("makeWaterStation", world)
        self.assertIn("makeVendingMachine", world)
        self.assertIn('"Campus Stationery"', world)
        self.assertIn('"Print & Copy"', world)
        self.assertIn("amenityGroups.forEach", world)
        self.assertIn("amenityStopPoints", world)
        self.assertIn("const pedestrianLoops", world)
        self.assertIn("Array.from({ length: 14 }", world)
        self.assertIn("pointBlocked(moveX, moveZ)", world)
        self.assertIn('state = "FADING"', world)
        self.assertIn("respawnPedestrian(pedestrian)", world)
        self.assertIn("updatePedestrians(elapsed, delta)", world)
        self.assertIn("new THREE.Raycaster()", world)
        self.assertIn("selectGroup(group)", world)
        self.assertIn("focusOnGroup(group)", world)
        self.assertIn("applyBuildingHighlight", world)
        self.assertIn("controls.addEventListener(\"start\", onControlStart)", world)
        self.assertIn("fitCampusToView", world)
        self.assertIn("new THREE.Box3().setFromObject(ground)", world)
        self.assertIn("controls.minPolarAngle = 15 * DEG", world)
        self.assertIn("controls.maxPolarAngle = 85 * DEG", world)
        self.assertIn("camera.position.distanceTo(controls.target)", world)
        self.assertNotIn("controls.getDistance()", world)
        self.assertIn("setTopView", world)
        self.assertIn("makeRibbon", world)
        for first, second in (
            ("Main Gate", "Management Block"), ("Management Block", "Plaza"),
            ("Plaza", "Library"), ("Plaza", "Main Academic Block"),
            ("Plaza", "IT Block"), ("Library", "Hostel"),
            ("Main Academic Block", "Auditorium"), ("IT Block", "Parking"),
            ("Parking", "Canteen"), ("Parking", "Garden"),
            ("Garden", "Sports Ground"), ("Plaza", "Administration"),
            ("Main Gate", "Vehicle Parking"), ("Vehicle Parking", "Main Academic Block"),
            ("Main Academic Block", "Cricket Practice Net"),
            ("Main Gate", "Shuttle Stop"), ("Shuttle Stop", "Information Kiosk"),
            ("Information Kiosk", "Main Gate"), ("Nescafé", "Food Street"),
            ("Library", "Campus Bookstore"), ("Main Academic Block", "Campus Stationery"),
            ("Campus Stationery", "Print & Copy"),
        ):
            self.assertIn(f'from: "{first}", to: "{second}"', world)
        self.assertIn("setLocations(locations)", frontend)
        self.assertIn("campusWorld?.movePlayerTo(location)", frontend)
        self.assertIn("map-panel-toggle", frontend)
        self.assertIn('id="map-panel-close"', template)
        self.assertIn('class="campus-location-accessible"', template)


if __name__ == "__main__":
    unittest.main()
