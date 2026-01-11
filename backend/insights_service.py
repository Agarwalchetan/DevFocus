import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

load_dotenv()

# AI Configuration
USE_AI_INSIGHTS = os.environ.get('USE_AI_INSIGHTS', 'true').lower() == 'true'
AI_PRIMARY_PROVIDER = os.environ.get('AI_PRIMARY_PROVIDER', 'openai')
AI_PRIMARY_MODEL = os.environ.get('AI_PRIMARY_MODEL', 'gpt-5.2')
AI_SECONDARY_PROVIDER = os.environ.get('AI_SECONDARY_PROVIDER', 'anthropic')
AI_SECONDARY_MODEL = os.environ.get('AI_SECONDARY_MODEL', 'claude-4-sonnet-20250514')
AI_TERTIARY_PROVIDER = os.environ.get('AI_TERTIARY_PROVIDER', 'gemini')
AI_TERTIARY_MODEL = os.environ.get('AI_TERTIARY_MODEL', 'gemini-2.5-pro')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')


class InsightsService:
    """Service for generating insights from user data"""
    
    def __init__(self, db):
        self.db = db
    
    async def generate_ai_description(self, insight_data: Dict, context: str) -> str:
        """Generate personalized insight description using AI with fallback"""
        
        if not USE_AI_INSIGHTS or not EMERGENT_LLM_KEY:
            return self._generate_rule_based_description(insight_data, context)
        
        prompt = f"""Based on the following developer productivity data, generate a brief, personalized insight (2-3 sentences max). Be encouraging and actionable.

Context: {context}
Data: {json.dumps(insight_data, indent=2)}

Generate a friendly, encouraging insight that helps the developer understand their productivity pattern and what they can do about it."""
        
        # Try primary AI provider
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"insight_{datetime.utcnow().timestamp()}",
                system_message="You are a productivity coach helping developers understand their work patterns."
            ).with_model(AI_PRIMARY_PROVIDER, AI_PRIMARY_MODEL)
            
            response = await chat.send_message(UserMessage(text=prompt))
            if response and len(response.strip()) > 20:
                return response.strip()
        except Exception as e:
            print(f"Primary AI provider failed: {e}")
        
        # Try secondary AI provider
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"insight_{datetime.utcnow().timestamp()}",
                system_message="You are a productivity coach helping developers understand their work patterns."
            ).with_model(AI_SECONDARY_PROVIDER, AI_SECONDARY_MODEL)
            
            response = await chat.send_message(UserMessage(text=prompt))
            if response and len(response.strip()) > 20:
                return response.strip()
        except Exception as e:
            print(f"Secondary AI provider failed: {e}")
        
        # Try tertiary AI provider
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"insight_{datetime.utcnow().timestamp()}",
                system_message="You are a productivity coach helping developers understand their work patterns."
            ).with_model(AI_TERTIARY_PROVIDER, AI_TERTIARY_MODEL)
            
            response = await chat.send_message(UserMessage(text=prompt))
            if response and len(response.strip()) > 20:
                return response.strip()
        except Exception as e:
            print(f"Tertiary AI provider failed: {e}")
        
        # Fallback to rule-based
        return self._generate_rule_based_description(insight_data, context)
    
    def _generate_rule_based_description(self, insight_data: Dict, context: str) -> str:
        """Generate rule-based description as fallback"""
        
        if context == "best_focus_time":
            hour = insight_data.get("hour", 0)
            minutes = insight_data.get("total_minutes", 0)
            if hour < 12:
                time_of_day = "morning"
            elif hour < 17:
                time_of_day = "afternoon"
            else:
                time_of_day = "evening"
            return f"Your peak productivity is in the {time_of_day} around {hour}:00. You've logged {minutes} minutes during this time. Try scheduling your most challenging tasks then!"
        
        elif context == "task_completion_efficiency":
            task_type = insight_data.get("task_type", "tasks")
            ratio = insight_data.get("efficiency_ratio", 1.0)
            if ratio < 0.8:
                return f"Your {task_type} tasks are taking longer than estimated. Consider breaking them into smaller chunks or adjusting your estimates for better planning."
            elif ratio > 1.2:
                return f"Great job! You're completing {task_type} tasks faster than expected. Your estimation skills are improving, and you're building momentum."
            else:
                return f"Your {task_type} tasks are on track with estimates. Keep up the consistent pace and continue refining your planning process."
        
        elif context == "tech_productivity":
            tech = insight_data.get("tech", "N/A")
            completion_rate = insight_data.get("completion_rate", 0)
            return f"You have a {completion_rate:.0f}% completion rate with {tech}. This shows your comfort level with this technology. Keep building on this strength!"
        
        elif context == "session_fatigue":
            sessions = insight_data.get("sessions_per_day", 0)
            return f"You average {sessions:.1f} focus sessions per day. Studies show productivity peaks at 3-4 sessions daily. Adjust your workload to find your sweet spot."
        
        else:
            return "Keep tracking your focus sessions to unlock more personalized insights about your productivity patterns!"
    
    async def calculate_weekly_insights(self, user_id: str) -> List[Dict]:
        """Calculate insights for the past week"""
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        # Get heatmap data for the week
        heatmap_data = await self.db.heatmap_entries.find({
            "userId": user_id,
            "date": {"$gte": start_date.date().isoformat(), "$lte": end_date.date().isoformat()}
        }).to_list(100)
        
        # Get focus sessions for the week
        sessions = await self.db.focus_sessions.find({
            "userId": user_id,
            "startTime": {"$gte": start_date.isoformat()}
        }).to_list(500)
        
        # Get tasks for the week
        tasks = await self.db.tasks.find({
            "userId": user_id,
            "createdAt": {"$gte": start_date.isoformat()}
        }).to_list(100)
        
        insights = []
        
        # Insight 1: Best focus time window
        if sessions:
            hour_distribution = {}
            for session in sessions:
                if session.get("startTime"):
                    hour = datetime.fromisoformat(session["startTime"]).hour
                    hour_distribution[hour] = hour_distribution.get(hour, 0) + session.get("duration", 0)
            
            if hour_distribution:
                best_hour = max(hour_distribution.items(), key=lambda x: x[1])
                insight_data = {
                    "hour": best_hour[0],
                    "total_minutes": best_hour[1]
                }
                description = await self.generate_ai_description(insight_data, "best_focus_time")
                
                insights.append({
                    "type": "best_focus_time",
                    "title": "Peak Productivity Window",
                    "description": description,
                    "data": insight_data,
                    "icon": "clock"
                })
        
        # Insight 2: Task completion efficiency
        if tasks:
            task_types_efficiency = {}
            for task in tasks:
                task_type = task.get("type", "Coding")
                estimated = task.get("estimatedTime", 0)
                actual = task.get("totalFocusedTime", 0)
                
                if estimated > 0 and actual > 0:
                    if task_type not in task_types_efficiency:
                        task_types_efficiency[task_type] = {"estimated": 0, "actual": 0}
                    task_types_efficiency[task_type]["estimated"] += estimated
                    task_types_efficiency[task_type]["actual"] += actual
            
            for task_type, data in task_types_efficiency.items():
                if data["estimated"] > 0:
                    ratio = data["actual"] / data["estimated"]
                    insight_data = {
                        "task_type": task_type,
                        "efficiency_ratio": ratio,
                        "estimated_time": data["estimated"],
                        "actual_time": data["actual"]
                    }
                    description = await self.generate_ai_description(insight_data, "task_completion_efficiency")
                    
                    insights.append({
                        "type": "task_efficiency",
                        "title": f"{task_type} Task Efficiency",
                        "description": description,
                        "data": insight_data,
                        "icon": "target"
                    })
                    break  # Only show one efficiency insight
        
        # Insight 3: Session fatigue analysis
        if len(sessions) >= 3:
            sessions_by_day = {}
            for session in sessions:
                if session.get("startTime"):
                    date = datetime.fromisoformat(session["startTime"]).date().isoformat()
                    sessions_by_day[date] = sessions_by_day.get(date, 0) + 1
            
            avg_sessions = sum(sessions_by_day.values()) / max(len(sessions_by_day), 1)
            
            insight_data = {
                "sessions_per_day": avg_sessions,
                "total_days": len(sessions_by_day)
            }
            description = await self.generate_ai_description(insight_data, "session_fatigue")
            
            insights.append({
                "type": "session_fatigue",
                "title": "Daily Session Pattern",
                "description": description,
                "data": insight_data,
                "icon": "activity"
            })
        
        # Insight 4: Tech stack productivity
        if tasks:
            tech_stats = {}
            for task in tasks:
                for tech in task.get("techTags", []):
                    if tech not in tech_stats:
                        tech_stats[tech] = {"total": 0, "completed": 0}
                    tech_stats[tech]["total"] += 1
                    if task.get("status") == "completed":
                        tech_stats[tech]["completed"] += 1
            
            if tech_stats:
                best_tech = max(tech_stats.items(), key=lambda x: x[1]["completed"])
                if best_tech[1]["total"] > 0:
                    completion_rate = (best_tech[1]["completed"] / best_tech[1]["total"]) * 100
                    insight_data = {
                        "tech": best_tech[0],
                        "completion_rate": completion_rate,
                        "completed_tasks": best_tech[1]["completed"],
                        "total_tasks": best_tech[1]["total"]
                    }
                    description = await self.generate_ai_description(insight_data, "tech_productivity")
                    
                    insights.append({
                        "type": "tech_productivity",
                        "title": "Tech Stack Strength",
                        "description": description,
                        "data": insight_data,
                        "icon": "code"
                    })
        
        return insights[:4]  # Return top 4 insights
    
    async def calculate_monthly_insights(self, user_id: str) -> List[Dict]:
        """Calculate insights for the past month"""
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        # Get heatmap data for the month
        heatmap_data = await self.db.heatmap_entries.find({
            "userId": user_id,
            "date": {"$gte": start_date.date().isoformat(), "$lte": end_date.date().isoformat()}
        }).to_list(100)
        
        # Get all tasks for analysis
        tasks = await self.db.tasks.find({"userId": user_id}).to_list(200)
        
        insights = []
        
        # Insight 1: Monthly consistency
        active_days = len(heatmap_data)
        total_minutes = sum(day.get("totalMinutes", 0) for day in heatmap_data)
        
        if active_days > 0:
            avg_daily_minutes = total_minutes / 30  # Average over 30 days
            
            insight_data = {
                "active_days": active_days,
                "total_minutes": total_minutes,
                "avg_daily_minutes": avg_daily_minutes,
                "consistency_score": (active_days / 30) * 100
            }
            
            description = await self.generate_ai_description(insight_data, "monthly_consistency")
            if description == self._generate_rule_based_description(insight_data, "monthly_consistency"):
                # Custom rule-based for monthly
                if active_days >= 20:
                    description = f"Outstanding consistency! You've been active {active_days} days this month with {total_minutes} total minutes. You're building a strong productivity habit."
                elif active_days >= 10:
                    description = f"Good progress! {active_days} active days this month. Try to increase consistency to see even better results in your productivity journey."
                else:
                    description = f"You have {active_days} active days this month. Building consistency is key. Try setting a goal to focus at least 3-4 times per week."
            
            insights.append({
                "type": "monthly_consistency",
                "title": "Monthly Consistency Score",
                "description": description,
                "data": insight_data,
                "icon": "trending-up"
            })
        
        # Insight 2: Task completion trends
        completed_tasks = [t for t in tasks if t.get("status") == "completed"]
        completion_rate = (len(completed_tasks) / len(tasks) * 100) if tasks else 0
        
        if tasks:
            insight_data = {
                "total_tasks": len(tasks),
                "completed_tasks": len(completed_tasks),
                "completion_rate": completion_rate
            }
            
            description = await self.generate_ai_description(insight_data, "completion_trend")
            if description == self._generate_rule_based_description(insight_data, "completion_trend"):
                if completion_rate >= 70:
                    description = f"Excellent! You've completed {len(completed_tasks)} of {len(tasks)} tasks ({completion_rate:.0f}%). Your follow-through is strong."
                elif completion_rate >= 40:
                    description = f"You're completing {completion_rate:.0f}% of tasks. Focus on finishing what you start to build momentum and confidence."
                else:
                    description = f"Only {completion_rate:.0f}% task completion rate. Consider creating smaller, more achievable tasks to build success momentum."
            
            insights.append({
                "type": "completion_trend",
                "title": "Task Completion Rate",
                "description": description,
                "data": insight_data,
                "icon": "check-circle"
            })
        
        # Insight 3: Category focus distribution
        if heatmap_data:
            category_totals = {}
            for day in heatmap_data:
                breakdown = day.get("categoryBreakdown", {})
                for category, minutes in breakdown.items():
                    category_totals[category] = category_totals.get(category, 0) + minutes
            
            if category_totals:
                dominant_category = max(category_totals.items(), key=lambda x: x[1])
                
                insight_data = {
                    "dominant_category": dominant_category[0],
                    "minutes": dominant_category[1],
                    "percentage": (dominant_category[1] / total_minutes * 100) if total_minutes > 0 else 0
                }
                
                description = await self.generate_ai_description(insight_data, "category_focus")
                if description == self._generate_rule_based_description(insight_data, "category_focus"):
                    description = f"You've spent {dominant_category[1]} minutes on {dominant_category[0]} ({insight_data['percentage']:.0f}% of your time). This is your primary focus area this month."
                
                insights.append({
                    "type": "category_focus",
                    "title": "Primary Focus Area",
                    "description": description,
                    "data": insight_data,
                    "icon": "pie-chart"
                })
        
        return insights[:3]  # Return top 3 monthly insights
    
    async def detect_burnout(self, user_id: str) -> Optional[Dict]:
        """Detect burnout patterns"""
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        # Get last 7 days of data
        heatmap_data = await self.db.heatmap_entries.find({
            "userId": user_id,
            "date": {"$gte": start_date.date().isoformat(), "$lte": end_date.date().isoformat()}
        }).sort("date", 1).to_list(100)
        
        sessions = await self.db.focus_sessions.find({
            "userId": user_id,
            "startTime": {"$gte": start_date.isoformat()}
        }).to_list(500)
        
        tasks = await self.db.tasks.find({
            "userId": user_id,
            "updatedAt": {"$gte": start_date.isoformat()}
        }).to_list(100)
        
        burnout_signals = []
        severity = 0
        
        # Signal 1: Consecutive high-intensity days (5+ days with 2+ hours)
        high_intensity_days = sum(1 for day in heatmap_data if day.get("totalMinutes", 0) >= 120)
        if high_intensity_days >= 5:
            burnout_signals.append("consecutive_high_intensity")
            severity += 2
        
        # Signal 2: Late-night sessions (after 10 PM)
        late_night_sessions = 0
        for session in sessions:
            if session.get("startTime"):
                hour = datetime.fromisoformat(session["startTime"]).hour
                if hour >= 22 or hour <= 5:  # 10 PM to 5 AM
                    late_night_sessions += 1
        
        if late_night_sessions >= 3:
            burnout_signals.append("late_night_work")
            severity += 2
        
        # Signal 3: Increasing session durations
        if len(sessions) >= 6:
            first_half = sessions[:len(sessions)//2]
            second_half = sessions[len(sessions)//2:]
            
            avg_first = sum(s.get("duration", 0) for s in first_half) / len(first_half) if first_half else 0
            avg_second = sum(s.get("duration", 0) for s in second_half) / len(second_half) if second_half else 0
            
            if avg_second > avg_first * 1.3:  # 30% increase
                burnout_signals.append("increasing_session_length")
                severity += 1
        
        # Signal 4: Decreasing completion rate
        recent_tasks = [t for t in tasks if t.get("status") == "completed"]
        total_recent = len(tasks)
        
        if total_recent >= 5:
            completion_rate = len(recent_tasks) / total_recent
            if completion_rate < 0.3:  # Less than 30% completion
                burnout_signals.append("low_completion_rate")
                severity += 2
        
        # Signal 5: Very high daily focus time (4+ hours per day for 3+ days)
        very_high_days = sum(1 for day in heatmap_data if day.get("totalMinutes", 0) >= 240)
        if very_high_days >= 3:
            burnout_signals.append("excessive_daily_hours")
            severity += 1
        
        if not burnout_signals:
            return None
        
        # Generate AI-powered burnout message
        insight_data = {
            "signals": burnout_signals,
            "severity": severity,
            "high_intensity_days": high_intensity_days,
            "late_night_sessions": late_night_sessions
        }
        
        description = await self.generate_ai_description(insight_data, "burnout_detection")
        if description == self._generate_rule_based_description(insight_data, "burnout_detection"):
            # Custom rule-based burnout message
            if severity >= 5:
                description = f"⚠️ High burnout risk detected. You've had {high_intensity_days} high-intensity days and {late_night_sessions} late-night sessions this week. Consider taking a day off to recharge."
            elif severity >= 3:
                description = f"You've been pushing hard with {high_intensity_days} intense days this week. Consider scheduling lighter work tomorrow to maintain sustainable productivity."
            else:
                description = f"Some burnout signals detected. Remember to take breaks and maintain work-life balance for long-term productivity."
        
        return {
            "detected": True,
            "severity": severity,  # 1-8 scale
            "level": "high" if severity >= 5 else "medium" if severity >= 3 else "low",
            "signals": burnout_signals,
            "description": description,
            "data": insight_data
        }
    
    async def generate_smart_plan(self, user_id: str) -> Dict:
        """Generate smart daily plan based on historical data"""
        
        # Get user's tasks
        tasks = await self.db.tasks.find({
            "userId": user_id,
            "status": {"$ne": "completed"}
        }).sort("createdAt", 1).to_list(50)
        
        # Get historical performance data
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=14)
        
        heatmap_data = await self.db.heatmap_entries.find({
            "userId": user_id,
            "date": {"$gte": start_date.date().isoformat()}
        }).to_list(100)
        
        sessions = await self.db.focus_sessions.find({
            "userId": user_id,
            "startTime": {"$gte": start_date.isoformat()}
        }).to_list(500)
        
        # Find best performance time
        best_hour = 10  # Default to 10 AM
        if sessions:
            hour_performance = {}
            for session in sessions:
                if session.get("startTime") and session.get("completed"):
                    hour = datetime.fromisoformat(session["startTime"]).hour
                    hour_performance[hour] = hour_performance.get(hour, 0) + 1
            
            if hour_performance:
                best_hour = max(hour_performance.items(), key=lambda x: x[1])[0]
        
        # Calculate average daily capacity
        if heatmap_data:
            total_minutes = sum(day.get("totalMinutes", 0) for day in heatmap_data)
            avg_daily_capacity = total_minutes / len(heatmap_data)
        else:
            avg_daily_capacity = 120  # Default 2 hours
        
        # Select 2-3 tasks for today based on priority and estimated time
        suggested_tasks = []
        total_estimated_time = 0
        
        for task in tasks[:5]:  # Consider top 5 incomplete tasks
            estimated_time = task.get("estimatedTime", 60)
            if total_estimated_time + estimated_time <= avg_daily_capacity * 1.2:  # Allow 20% buffer
                suggested_tasks.append({
                    "id": task.get("id", str(task.get("_id", ""))),
                    "title": task["title"],
                    "type": task["type"],
                    "estimatedTime": estimated_time,
                    "techTags": task.get("techTags", [])
                })
                total_estimated_time += estimated_time
            
            if len(suggested_tasks) >= 3:
                break
        
        # Generate suggestion for new task if list is short
        new_task_suggestion = None
        if len(suggested_tasks) < 2:
            # Suggest based on incomplete tech areas
            new_task_suggestion = {
                "title": "Review and plan upcoming tasks",
                "type": "Planning",
                "estimatedTime": 30,
                "reason": "Planning helps maintain clarity and reduces decision fatigue"
            }
        
        # Generate AI-powered plan description
        plan_data = {
            "suggested_tasks": suggested_tasks,
            "best_time_window": f"{best_hour:02d}:00-{(best_hour+2):02d}:00",
            "estimated_duration": total_estimated_time,
            "capacity": avg_daily_capacity
        }
        
        description = await self.generate_ai_description(plan_data, "smart_daily_plan")
        if description == self._generate_rule_based_description(plan_data, "smart_daily_plan"):
            description = f"Based on your patterns, tackle these tasks between {best_hour:02d}:00-{(best_hour+2):02d}:00 when you're most productive. Total estimated time: {total_estimated_time} minutes."
        
        return {
            "suggested_tasks": suggested_tasks,
            "new_task_suggestion": new_task_suggestion,
            "best_time_window": {
                "start_hour": best_hour,
                "end_hour": best_hour + 2,
                "formatted": f"{best_hour:02d}:00-{(best_hour+2):02d}:00"
            },
            "estimated_total_duration": total_estimated_time,
            "recommended_capacity": avg_daily_capacity,
            "description": description
        }
    
    async def cache_insights(self, user_id: str):
        """Calculate and cache all insights"""
        
        weekly_insights = await self.calculate_weekly_insights(user_id)
        monthly_insights = await self.calculate_monthly_insights(user_id)
        burnout_data = await self.detect_burnout(user_id)
        smart_plan = await self.generate_smart_plan(user_id)
        
        # Store in cache collection
        cache_data = {
            "userId": user_id,
            "weekly_insights": weekly_insights,
            "monthly_insights": monthly_insights,
            "burnout_detection": burnout_data,
            "smart_plan": smart_plan,
            "generated_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(hours=6)).isoformat()  # Cache for 6 hours
        }
        
        # Upsert cache
        await self.db.insights_cache.update_one(
            {"userId": user_id},
            {"$set": cache_data},
            upsert=True
        )
        
        return cache_data
    
    async def get_cached_insights(self, user_id: str, force_refresh: bool = False):
        """Get cached insights or regenerate if expired"""
        
        if not force_refresh:
            cached = await self.db.insights_cache.find_one({"userId": user_id})
            
            if cached and cached.get("expires_at"):
                expires_at = datetime.fromisoformat(cached["expires_at"])
                if expires_at > datetime.utcnow():
                    return cached
        
        # Cache expired or force refresh
        return await self.cache_insights(user_id)
