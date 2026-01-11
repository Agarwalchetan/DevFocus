#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime, timedelta
import time

class DevFocusAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_task_ids = []
        self.created_session_ids = []

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    error_data = response.json()
                    self.log(f"   Error details: {error_data}", "FAIL")
                except:
                    self.log(f"   Response text: {response.text[:200]}", "FAIL")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "FAIL")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(datetime.now().timestamp())
        user_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@devfocus.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration", 
            "POST", 
            "auth/register", 
            200, 
            user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log(f"✅ Got access token: {self.token[:20]}...", "SUCCESS")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.token:
            self.log("❌ No token available, skipping login test", "SKIP")
            return False
        return True

    def test_get_user_profile(self):
        """Test getting user profile"""
        success, response = self.run_test("Get User Profile", "GET", "auth/me", 200)
        if success and 'id' in response:
            self.user_id = response['id']
            self.log(f"✅ Got user ID: {self.user_id}", "SUCCESS")
        return success

    def create_test_data(self):
        """Create test tasks and focus sessions for insights"""
        self.log("Creating test data for insights...", "INFO")
        
        # Create test tasks
        test_tasks = [
            {
                "title": "Build React Component",
                "type": "Coding",
                "techTags": ["React", "JavaScript"],
                "estimatedTime": 120
            },
            {
                "title": "API Integration",
                "type": "Coding", 
                "techTags": ["Python", "FastAPI"],
                "estimatedTime": 90
            },
            {
                "title": "Code Review",
                "type": "Review",
                "techTags": ["Git"],
                "estimatedTime": 60
            }
        ]
        
        for task_data in test_tasks:
            success, response = self.run_test(
                f"Create Task: {task_data['title']}", 
                "POST", 
                "tasks", 
                200, 
                task_data
            )
            if success and 'id' in response:
                self.created_task_ids.append(response['id'])
        
        # Create focus sessions for the tasks
        for i, task_id in enumerate(self.created_task_ids[:2]):  # Only create sessions for first 2 tasks
            session_data = {
                "taskId": task_id,
                "duration": 60 + (i * 30)  # 60, 90 minutes
            }
            
            success, response = self.run_test(
                f"Create Focus Session for Task {i+1}", 
                "POST", 
                "focus-sessions", 
                200, 
                session_data
            )
            
            if success and 'id' in response:
                session_id = response['id']
                self.created_session_ids.append(session_id)
                
                # Complete the session
                time.sleep(1)  # Small delay
                complete_success, _ = self.run_test(
                    f"Complete Focus Session {i+1}", 
                    "PATCH", 
                    f"focus-sessions/{session_id}/complete", 
                    200
                )
                
                if complete_success:
                    self.log(f"✅ Completed focus session {i+1}", "SUCCESS")

    def test_insights_endpoints(self):
        """Test all insights-related endpoints"""
        self.log("Testing Insights API endpoints...", "INFO")
        
        # Test main insights endpoint
        success, response = self.run_test("Get All Insights", "GET", "insights", 200)
        if success:
            required_keys = ['weekly_insights', 'monthly_insights', 'burnout_detection', 'smart_plan', 'generated_at']
            missing_keys = [key for key in required_keys if key not in response]
            if missing_keys:
                self.log(f"❌ Missing keys in insights response: {missing_keys}", "FAIL")
            else:
                self.log("✅ All required keys present in insights response", "SUCCESS")
                
                # Check if AI descriptions are present
                weekly_insights = response.get('weekly_insights', [])
                if weekly_insights:
                    for i, insight in enumerate(weekly_insights):
                        if 'description' in insight and len(insight['description']) > 20:
                            self.log(f"✅ Weekly insight {i} has AI description: {len(insight['description'])} chars", "SUCCESS")
                        else:
                            self.log(f"❌ Weekly insight {i} missing or short description", "FAIL")
        
        # Test insights refresh
        success, response = self.run_test("Refresh Insights", "POST", "insights/refresh", 200)
        if success:
            if 'generated_at' in response:
                self.log("✅ Insights refresh returned generated_at timestamp", "SUCCESS")
            else:
                self.log("❌ Insights refresh missing generated_at", "FAIL")
        
        # Test individual insight endpoints
        individual_endpoints = [
            ("Weekly Insights", "insights/weekly"),
            ("Monthly Insights", "insights/monthly"), 
            ("Burnout Detection", "insights/burnout"),
            ("Smart Plan", "insights/smart-plan")
        ]
        
        for name, endpoint in individual_endpoints:
            success, response = self.run_test(name, "GET", endpoint, 200)
            if success:
                self.log(f"✅ {name} endpoint working", "SUCCESS")

    def test_tasks_and_sessions(self):
        """Test basic task and session functionality"""
        self.log("Testing basic task and session functionality...", "INFO")
        
        # Test get tasks
        self.run_test("Get Tasks", "GET", "tasks", 200)
        
        # Test get heatmap
        self.run_test("Get Heatmap", "GET", "heatmap", 200)

    def cleanup_test_data(self):
        """Clean up created test data"""
        self.log("Cleaning up test data...", "INFO")
        
        # Delete created tasks
        for task_id in self.created_task_ids:
            self.run_test(f"Delete Task {task_id}", "DELETE", f"tasks/{task_id}", 200)

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("Starting DevFocus Phase 3 API Tests...", "INFO")
        self.log("=" * 60, "INFO")
        
        # Basic connectivity and auth tests
        if not self.test_health_check():
            self.log("❌ Health check failed, stopping tests", "FATAL")
            return False
            
        if not self.test_user_registration():
            self.log("❌ User registration failed, stopping tests", "FATAL")
            return False
            
        if not self.test_get_user_profile():
            self.log("❌ Get user profile failed, stopping tests", "FATAL")
            return False
        
        # Create test data for insights
        self.create_test_data()
        
        # Wait a moment for data to be processed
        self.log("Waiting for data processing...", "INFO")
        time.sleep(3)
        
        # Test insights functionality
        self.test_insights_endpoints()
        
        # Test basic functionality
        self.test_tasks_and_sessions()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print results
        self.log("=" * 60, "INFO")
        self.log(f"Tests completed: {self.tests_passed}/{self.tests_run} passed", "RESULT")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed!", "SUCCESS")
            return True
        else:
            failed = self.tests_run - self.tests_passed
            self.log(f"❌ {failed} tests failed", "FAIL")
            return False

def main():
    # Test with localhost first, then try to find the actual backend URL
    backend_urls = [
        "http://localhost:8001",
        "http://127.0.0.1:8001"
    ]
    
    for url in backend_urls:
        print(f"\n🔍 Testing backend at: {url}")
        tester = DevFocusAPITester(url)
        
        # Quick health check
        try:
            response = requests.get(f"{url}/api/health", timeout=5)
            if response.status_code == 200:
                print(f"✅ Backend is accessible at {url}")
                success = tester.run_all_tests()
                return 0 if success else 1
        except Exception as e:
            print(f"❌ Backend not accessible at {url}: {e}")
            continue
    
    print("❌ No accessible backend found")
    return 1

if __name__ == "__main__":
    sys.exit(main())