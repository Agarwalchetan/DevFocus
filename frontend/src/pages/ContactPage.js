import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Mail, Github, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';

export const ContactPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4">Get in Touch</h1>
                    <p className="text-xl text-muted-foreground">
                        Have questions or feedback? We'd love to hear from you!
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Email Card */}
                    <Card className="border-border/50 hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Email</h2>
                            <p className="text-muted-foreground mb-4">Send us a message anytime</p>
                            <a
                                href="mailto:agar.chetan1@gmail.com"
                                className="text-primary hover:text-primary-hover transition-colors font-medium"
                            >
                                agar.chetan1@gmail.com
                            </a>
                        </CardContent>
                    </Card>

                    {/* GitHub Card */}
                    <Card className="border-border/50 hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Github className="w-8 h-8 text-accent" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">GitHub</h2>
                            <p className="text-muted-foreground mb-4">Check out the code</p>
                            <a
                                href="https://github.com/AgarwalChetan"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:text-accent-hover transition-colors font-medium"
                            >
                                @AgarwalChetan
                            </a>
                        </CardContent>
                    </Card>
                </div>

                {/* Developer Info */}
                <Card className="mt-12 border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10">
                    <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Developed by Chetan Agarwal</h2>
                        <p className="text-muted-foreground mb-6">
                            DevFocus is built with ❤️ for developers who love to focus and be productive.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <Button
                                variant="outline"
                                onClick={() => window.open('https://github.com/AgarwalChetan', '_blank')}
                            >
                                <Github className="w-4 h-4 mr-2" />
                                Follow on GitHub
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = 'mailto:agar.chetan1@gmail.com'}
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Send Email
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Back Button */}
                <div className="text-center mt-12">
                    <Button
                        variant="ghost"
                        onClick={() => window.location.href = '/'}
                    >
                        ← Back to Home
                    </Button>
                </div>
            </div>
        </div>
    );
};
