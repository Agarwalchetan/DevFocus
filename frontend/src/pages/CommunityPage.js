import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, Search, Users } from 'lucide-react';
import { Input } from '../components/ui/input';

export const CommunityPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    const fetchUsers = useCallback(async (query = '') => {
        setLoading(true);
        try {
            // If query is empty, backend returns recent 50 users.
            const url = query
                ? `${API_URL}/api/users/search?q=${encodeURIComponent(query)}`
                : `${API_URL}/api/users/search`;

            const res = await fetch(url);
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    }, [API_URL]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Filter users client-side for instant feedback on this page, 
    // or verify if we should hit API. Since we fetched "all" (limit 50), client side filter of that 50 is fine, 
    // but if we want real search we should hit API. 
    // Let's implement active search on this page too.
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, fetchUsers]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        Community
                    </h1>
                    <p className="text-muted-foreground mt-1">Discover and connect with other developers.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search community..."
                        className="pl-9 bg-card"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.length > 0 ? users.map(user => (
                        <Card
                            key={user.username}
                            className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50 overflow-hidden"
                            onClick={() => window.location.href = `/u/${user.username}`}
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0 group-hover:scale-110 transition-transform">
                                    {user.name ? user.name[0].toUpperCase() : '?'}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <h3 className="font-semibold text-lg leading-none truncate group-hover:text-primary transition-colors">{user.name}</h3>
                                    <p className="text-sm text-muted-foreground font-medium">@{user.username}</p>
                                    {user.bio && (
                                        <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-2 pt-2 border-t border-border/50">
                                            {user.bio}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )) : (
                        <div className="col-span-full text-center py-20 text-muted-foreground">
                            No users found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
