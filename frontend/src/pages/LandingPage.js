import React, { useState } from 'react';
import { Flame, Target, Users, TrendingUp, Clock, Award, Zap, BarChart3, Calendar, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export const LandingPage = () => {
    const { login, register } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isSignUp) {
                await register(formData.name, formData.username, formData.email, formData.password);
                toast.success('Account created successfully!');
            } else {
                await login(formData.email, formData.password);
                toast.success('Welcome back!');
            }
        } catch (error) {
            toast.error(error.message || 'Authentication failed');
        }
    };

    // Scroll to auth form and activate signup
    const scrollToSignup = () => {
        setIsSignUp(true);
        const formElement = document.getElementById('auth-form');
        if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                const emailInput = document.getElementById('email');
                if (emailInput) emailInput.focus();
            }, 500);
        }
    };

    const features = [
        {
            icon: Target,
            title: 'Focus Sessions',
            description: 'Track your deep work with precision timers and stay in the zone.',
            color: 'text-primary',
            bg: 'bg-primary/10'
        },
        {
            icon: Users,
            title: 'Collaborative Rooms',
            description: 'Join focus rooms with teammates and build accountability.',
            color: 'text-accent',
            bg: 'bg-accent/10'
        },
        {
            icon: TrendingUp,
            title: 'Smart Insights',
            description: 'AI-powered recommendations to optimize your productivity.',
            color: 'text-violet',
            bg: 'bg-violet/10'
        },
        {
            icon: Award,
            title: 'Streak Tracking',
            description: 'Build consistent habits with daily streak counters.',
            color: 'text-success',
            bg: 'bg-success/10'
        },
        {
            icon: BarChart3,
            title: 'Analytics Dashboard',
            description: 'Visualize your progress with beautiful heatmaps and charts.',
            color: 'text-warning',
            bg: 'bg-warning/10'
        },
        {
            icon: Shield,
            title: 'Privacy First',
            description: 'Your data is yours. Secure, private, and fully encrypted.',
            color: 'text-destructive',
            bg: 'bg-destructive/10'
        }
    ];

    const values = [
        {
            icon: Flame,
            value: 'Focus Deeply',
            label: 'Eliminate distractions',
            color: 'text-primary'
        },
        {
            icon: Award,
            value: 'Build Habits',
            label: 'Daily consistency',
            color: 'text-success'
        },
        {
            icon: TrendingUp,
            value: 'Track Progress',
            label: 'Real-time insights',
            color: 'text-accent'
        },
        {
            icon: Zap,
            value: 'Stay Motivated',
            label: 'Gamified experience',
            color: 'text-violet'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-card overflow-hidden">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-violet/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Navigation */}
            <nav className="relative z-10 border-b border-border/50 backdrop-blur-sm bg-background/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Flame className="w-8 h-8 text-primary" />
                                <div className="absolute inset-0 blur-lg bg-primary/50"></div>
                            </div>
                            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                DevFocus
                            </span>
                        </div>
                        <div className="flex items-center gap-6">
                            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors hidden md:block">Features</a>
                            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors hidden md:block">About</a>
                            <Button
                                variant={isSignUp ? "outline" : "default"}
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="min-w-[100px]"
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Column - Content */}
                    <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-primary">Boost Your Productivity</span>
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                            Focus Like
                            <span className="block bg-gradient-to-r from-primary via-accent to-violet bg-clip-text text-transparent">
                                Never Before
                            </span>
                        </h1>

                        <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                            Track your deep work, build streaks, collaborate with teams, and unlock AI-powered insights to maximize your productivity.
                        </p>

                        {/* Value Propositions */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8">
                            {values.map((item, index) => (
                                <div key={index} className="text-center group">
                                    <div className="flex justify-center mb-3">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <item.icon className={`w-6 h-6 ${item.color}`} />
                                        </div>
                                    </div>
                                    <div className="text-lg font-bold">{item.value}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <Button
                                size="lg"
                                className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/20"
                                onClick={scrollToSignup}
                            >
                                <Flame className="w-5 h-5 mr-2" />
                                Get Started Free
                            </Button>
                            <Button size="lg" variant="outline" onClick={() => {
                                const featuresSection = document.getElementById('features');
                                if (featuresSection) featuresSection.scrollIntoView({ behavior: 'smooth' });
                            }}>
                                <Calendar className="w-5 h-5 mr-2" />
                                View Features
                            </Button>
                        </div>
                    </div>

                    {/* Right Column - Auth Form */}
                    <div className="animate-in fade-in slide-in-from-right duration-700" id="auth-form">
                        <Card className="border-border/50 shadow-2xl shadow-primary/5 backdrop-blur-sm bg-card/80">
                            <CardContent className="p-8">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-bold mb-2">
                                        {isSignUp ? 'Create Your Account' : 'Welcome Back'}
                                    </h2>
                                    <p className="text-muted-foreground">
                                        {isSignUp ? 'Start your productivity journey today' : 'Continue your focus streak'}
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {isSignUp && (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="name">Name</Label>
                                                <Input
                                                    id="name"
                                                    placeholder="John Doe"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    required
                                                    className="bg-secondary/50 border-border"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="username">Username</Label>
                                                <Input
                                                    id="username"
                                                    placeholder="johndoe"
                                                    value={formData.username}
                                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                    required
                                                    className="bg-secondary/50 border-border"
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="bg-secondary/50 border-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                            className="bg-secondary/50 border-border"
                                        />
                                    </div>

                                    <Button type="submit" className="w-full bg-primary hover:bg-primary-hover" size="lg">
                                        {isSignUp ? 'Create Account' : 'Sign In'}
                                    </Button>
                                </form>

                                <div className="text-center mt-6">
                                    <button
                                        onClick={() => setIsSignUp(!isSignUp)}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                                        <span className="text-primary font-medium">
                                            {isSignUp ? 'Sign In' : 'Sign Up'}
                                        </span>
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="text-center mb-16 animate-in fade-in duration-700">
                    <h2 className="text-4xl font-bold mb-4">Everything You Need to Focus</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Powerful features designed to help you achieve deep work and build lasting productivity habits.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <Card
                            key={index}
                            className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border/50 backdrop-blur-sm bg-card/80 hover:scale-105"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <CardContent className="p-6">
                                <div className={`w-12 h-12 rounded-lg ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                <p className="text-muted-foreground">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div id="about" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm">
                    <CardContent className="p-12 text-center">
                        <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Productivity?</h2>
                        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                            Join thousands of developers who have already supercharged their focus and achieved their goals.
                        </p>
                        <Button
                            size="lg"
                            className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/30"
                            onClick={scrollToSignup}
                        >
                            <Flame className="w-5 h-5 mr-2" />
                            Start Your Journey Today
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Footer */}
            <footer className="relative z-10 border-t border-border/50 backdrop-blur-sm bg-background/50 mt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Flame className="w-6 h-6 text-primary" />
                            <span className="font-bold">DevFocus</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            © 2026 DevFocus. Developed by{' '}
                            <a
                                href="https://github.com/AgarwalChetan"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary-hover font-medium transition-colors"
                            >
                                Chetan Agarwal
                            </a>
                        </p>
                        <div className="flex gap-6 text-sm text-muted-foreground">
                            <button
                                onClick={() => window.open('/privacy', '_blank')}
                                className="hover:text-foreground transition-colors"
                            >
                                Privacy
                            </button>
                            <button
                                onClick={() => window.open('/terms', '_blank')}
                                className="hover:text-foreground transition-colors"
                            >
                                Terms
                            </button>
                            <button
                                onClick={() => window.open('/contact', '_blank')}
                                className="hover:text-foreground transition-colors"
                            >
                                Contact
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
