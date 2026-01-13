import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Flame, Code2, Activity } from 'lucide-react';
import { toast } from 'sonner';

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        await register(formData.name, formData.username, formData.email, formData.password);
        toast.success('Account created successfully!');
        // Redirect to new profile
        window.location.href = `/u/${formData.username}`;
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 border-border bg-card">
        <CardHeader className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="relative">
              <Flame className="w-10 h-10 text-primary" />
              <Activity className="w-5 h-5 text-accent absolute -bottom-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            {isLogin ? 'Welcome Back' : 'Join DevFocus'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin
              ? 'Sign in to continue your productivity streak'
              : 'Start tracking your focus time and build together'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                  className="bg-secondary/50 border-border"
                />
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="coolcoder123"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required={!isLogin}
                  className="bg-secondary/50 border-border"
                  pattern="[a-zA-Z0-9_-]+"
                  title="Alphanumeric characters, underscores, and hyphens only"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="dev@example.com"
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

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                <>{isLogin ? 'Sign In' : 'Create Account'}</>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-primary font-medium">
                {isLogin ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
