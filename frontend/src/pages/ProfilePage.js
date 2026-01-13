import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Flame, Calendar, TrendingUp, Clock, User, Award, Search, Pencil, Check, X, Users, UserPlus, UserMinus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export const ProfilePage = ({ username, onNavigate }) => {
    const { user: currentUser, token, refreshUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Social Dialog State
    const [socialModalOpen, setSocialModalOpen] = useState(false);
    const [socialModalTitle, setSocialModalTitle] = useState("");
    const [socialUsers, setSocialUsers] = useState([]);

    // Edit State
    const [iseditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', bio: '' });

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchRef = useRef(null);

    const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';



    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length > 0) {
                try {
                    const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`);
                    const data = await res.json();
                    setSearchResults(Array.isArray(data) ? data : []);
                } catch (e) { setSearchResults([]); }
            } else {
                setSearchResults([]);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [searchQuery, API_URL]);

    const handleShowAllUsers = () => {
        window.location.href = '/community';
    };

    const fetchProfile = useCallback(async (uname) => {
        setLoading(true);
        try {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(`${API_URL}/api/users/${uname}`, { headers });
            if (!res.ok) throw new Error("User not found");
            const data = await res.json();
            setProfile(data);
            setEditForm({ name: data.name, bio: data.bio || '' });
        } catch (error) {
            toast.error("User not found");
        } finally {
            setLoading(false);
        }
    }, [API_URL, token]);

    useEffect(() => {
        if (username) fetchProfile(username);
    }, [username, fetchProfile]);

    const handleFollow = async () => {
        if (!currentUser) return toast.error("Please login to follow");

        // Optimistic Update
        const isFollowing = profile.is_following;
        setProfile(prev => ({
            ...prev,
            is_following: !isFollowing,
            followers_count: isFollowing ? prev.followers_count - 1 : prev.followers_count + 1
        }));

        try {
            const res = await fetch(`${API_URL}/api/users/${profile.username}/follow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            toast.success(data.message);
        } catch (e) {
            toast.error("Action failed");
            // Revert
            fetchProfile(profile.username);
        }
    };

    const openSocialModal = async (type) => { // type: 'followers' | 'following'
        setSocialModalTitle(type === 'followers' ? 'Followers' : 'Following');
        setSocialUsers([]);
        setSocialModalOpen(true);

        try {
            const res = await fetch(`${API_URL}/api/users/${profile.username}/${type}`);
            const data = await res.json();
            setSocialUsers(data);
        } catch (e) {
            toast.error("Failed to load list");
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/users/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });

            if (res.ok) {
                const updated = await res.json();
                setProfile(prev => ({ ...prev, ...updated }));
                toast.success("Profile updated");
                setIsEditOpen(false);
                refreshUser();
            } else {
                toast.error("Failed to update profile");
            }
        } catch (e) { toast.error("Error updating profile"); }
    };

    const isOwner = currentUser && profile && (currentUser.username === profile.username || currentUser.email === profile.username);

    // --- Helpers ---
    const getLast365Days = () => {
        const days = [];
        const today = new Date();
        for (let i = 364; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }
        return days;
    };

    const getIntensity = (date) => {
        if (!profile) return 0;
        const entry = profile.heatmap_data.find((d) => d.date === date);
        if (!entry) return 0;
        const minutes = entry.count;

        if (minutes === 0) return 0;
        if (minutes < 30) return 1;
        if (minutes < 60) return 2;
        if (minutes < 120) return 3;
        return 4;
    };

    const getIntensityColor = (intensity) => {
        const colors = ['bg-secondary', 'bg-primary/20', 'bg-primary/40', 'bg-primary/70', 'bg-primary'];
        return colors[intensity];
    };

    if (loading) return <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
    if (!profile) return <div className="text-center p-10 text-muted-foreground">Profile not found</div>;

    const days365 = getLast365Days();
    const weeks = [];
    for (let i = 0; i < days365.length; i += 7) weeks.push(days365.slice(i, i + 7));

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">

            {/* Search Bar - Top Section */}
            <div className="flex justify-center md:justify-end relative mb-8" ref={searchRef}>
                <div className="relative w-full md:w-96 z-50 flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Find a developer..."
                            className="pl-9 h-10 bg-card border-border shadow-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                if (!isSearchFocused) setIsSearchFocused(true);
                            }}
                            onFocus={() => setIsSearchFocused(true)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setIsSearchFocused(true); }}
                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0 bg-card hover:bg-secondary border-border"
                        onClick={handleShowAllUsers}
                        title="Show All Users"
                    >
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    {/* Search Dropdown - Same as before */}
                    {isSearchFocused && searchQuery.length > 0 && (
                        <div className="absolute top-12 left-0 right-0 bg-popover text-popover-foreground border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2">
                            {searchResults.length > 0 ? (
                                <>
                                    <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/30">Users</div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {searchResults.map(u => (
                                            <div
                                                key={u.username}
                                                className="px-4 py-3 hover:bg-accent cursor-pointer flex items-center gap-3 transition-colors border-b border-border/50 last:border-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.location.href = `/u/${u.username}`;
                                                }}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 border border-primary/20">{u.name ? u.name[0].toUpperCase() : '?'}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate text-foreground">{u.name}</div>
                                                    <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="p-4 text-center text-sm text-muted-foreground">No users found matching "{searchQuery}"</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Profile Card */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-card border rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

                <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center text-primary text-4xl font-bold border-4 border-primary/10 shadow-lg shrink-0 z-10">
                    {profile.avatar ? <img src={profile.avatar} className="w-full h-full rounded-full" /> : profile.name.charAt(0)}
                </div>

                <div className="text-center md:text-left space-y-1 flex-1 z-10 w-full md:w-auto">
                    <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
                                {isOwner && (
                                    <Dialog open={iseditOpen} onOpenChange={setIsEditOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
                                            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4">
                                                <div className="space-y-2"><Label>Display Name</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                                                <div className="space-y-2"><Label>Bio</Label><Input value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Tell us about yourself..." /></div>
                                                <Button type="submit" className="w-full">Save Changes</Button>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                            <p className="text-lg text-muted-foreground font-medium">@{profile.username}</p>
                        </div>

                        {/* Follow Button */}
                        {!isOwner && currentUser && (
                            <Button
                                variant={profile.is_following ? "outline" : "default"}
                                onClick={handleFollow}
                                className="min-w-[100px]"
                            >
                                {profile.is_following ? <><UserCheck className="w-4 h-4 mr-2" /> Following</> : <><UserPlus className="w-4 h-4 mr-2" /> Follow</>}
                            </Button>
                        )}
                    </div>

                    {profile.bio && <p className="text-sm text-foreground/80 max-w-lg mx-auto md:mx-0 py-2 leading-relaxed">{profile.bio}</p>}

                    {/* Social Stats */}
                    <div className="flex items-center justify-center md:justify-start gap-6 py-2">
                        <button onClick={() => openSocialModal('followers')} className="flex items-center gap-1 hover:text-primary transition-colors group">
                            <span className="font-bold text-foreground group-hover:text-primary">{profile.followers_count}</span>
                            <span className="text-sm text-muted-foreground">Followers</span>
                        </button>
                        <button onClick={() => openSocialModal('following')} className="flex items-center gap-1 hover:text-primary transition-colors group">
                            <span className="font-bold text-foreground group-hover:text-primary">{profile.following_count}</span>
                            <span className="text-sm text-muted-foreground">Following</span>
                        </button>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground border-l pl-4 border-border">
                            <Calendar className="w-3 h-3" /> Joined {new Date(profile.joined_at).toLocaleDateString()}
                        </div>
                    </div>

                </div>

                <div className="flex flex-col items-center p-4 bg-secondary/30 rounded-xl border border-border/50 min-w-[120px] backdrop-blur z-10">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Streak</span>
                    <div className="flex items-baseline gap-1 mt-1"><span className="text-3xl font-bold text-primary">{profile.streak}</span><span className="text-sm font-medium text-muted-foreground">days</span></div>
                    <div className="flex gap-1 mt-1">{[1, 2, 3].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i <= (profile.streak > 3 ? 3 : profile.streak) ? 'bg-orange-500' : 'bg-muted'}`} />)}</div>
                </div>
            </div>

            {/* Social Modal */}
            <Dialog open={socialModalOpen} onOpenChange={setSocialModalOpen}>
                <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{socialModalTitle}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto min-h-[300px] pr-2">
                        {socialUsers.length > 0 ? (
                            <div className="space-y-2">
                                {socialUsers.map(u => (
                                    <div key={u.username} onClick={() => window.location.href = `/u/${u.username}`} className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">{u.name ? u.name[0].toUpperCase() : '?'}</div>
                                        <div>
                                            <div className="font-medium text-sm">{u.name}</div>
                                            <div className="text-xs text-muted-foreground">@{u.username}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">No users found.</div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Stats Grid (Existing) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="hover:shadow-md transition-shadow group cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Today's Focus</CardTitle>
                        <div className="p-2 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors"><Clock className="w-4 h-4 text-green-500" /></div>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{profile.stats.today_minutes}m</div><p className="text-xs text-muted-foreground">Minutes focused today</p></CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow group cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
                        <div className="p-2 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors"><TrendingUp className="w-4 h-4 text-blue-500" /></div>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{Math.floor(profile.stats.week_minutes / 60)}h {profile.stats.week_minutes % 60}m</div><p className="text-xs text-muted-foreground">Total time since Monday</p></CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow group cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Top Tech</CardTitle>
                        <div className="p-2 bg-yellow-500/10 rounded-full group-hover:bg-yellow-500/20 transition-colors"><Award className="w-4 h-4 text-yellow-500" /></div>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold truncate">{profile.top_tech}</div><p className="text-xs text-muted-foreground">Most used tag this week</p></CardContent>
                </Card>
            </div>

            {/* Heatmap (Existing) */}
            <Card className="border-border bg-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Activity Map</CardTitle>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><span>Less</span>{[0, 1, 2, 3, 4].map((i) => (<div key={i} className={`w-3 h-3 rounded-sm ${getIntensityColor(i)}`} />))}<span>More</span></div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto pb-2">
                        <div className="inline-flex flex-col gap-1 min-w-max">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIdx) => (
                                <div key={day} className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground w-6">{day}</span>
                                    {weeks.map((week, weekIdx) => {
                                        const date = week[dayIdx];
                                        if (!date) return <div key={`empty-${weekIdx}`} className="w-3 h-3" />;
                                        const intensity = getIntensity(date);
                                        return (<div key={date} className={`w-3 h-3 rounded-sm ${getIntensityColor(intensity)} transition-all hover:ring-2 hover:ring-offset-1 hover:ring-primary cursor-default`} title={`${date}: ${profile.heatmap_data.find(d => d.date === date)?.count || 0}m`} />);
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
