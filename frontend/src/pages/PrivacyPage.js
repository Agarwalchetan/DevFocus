import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Shield, Lock, Eye, Database, UserCheck, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';

export const PrivacyPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4">Privacy Policy</h1>
                    <p className="text-muted-foreground">Last updated: January 13, 2026</p>
                </div>

                <Card className="border-border/50 mb-6">
                    <CardContent className="p-8 space-y-6">
                        <section>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <Eye className="w-5 h-5 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold">Information We Collect</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                We collect information you provide directly to us, including your name, email address, username, and productivity data. This data helps us provide personalized insights and improve your focus tracking experience.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                                    <Database className="w-5 h-5 text-accent" />
                                </div>
                                <h2 className="text-2xl font-bold">How We Use Your Data</h2>
                            </div>
                            <ul className="text-muted-foreground space-y-2 ml-4">
                                <li>• To provide and maintain our focus tracking services</li>
                                <li>• To generate personalized productivity insights</li>
                                <li>• To improve and optimize the application</li>
                                <li>• To communicate with you about updates and features</li>
                            </ul>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-success" />
                                </div>
                                <h2 className="text-2xl font-bold">Data Security</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                We implement industry-standard security measures to protect your personal information. Your data is encrypted in transit and at rest. We never sell your data to third parties.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-violet/10 rounded-lg flex items-center justify-center">
                                    <UserCheck className="w-5 h-5 text-violet" />
                                </div>
                                <h2 className="text-2xl font-bold">Your Rights</h2>
                            </div>
                            <ul className="text-muted-foreground space-y-2 ml-4">
                                <li>• Access your personal data at any time</li>
                                <li>• Request data deletion</li>
                                <li>• Export your productivity data</li>
                                <li>• Opt-out of analytics tracking</li>
                            </ul>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-warning" />
                                </div>
                                <h2 className="text-2xl font-bold">Contact Us</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                If you have any questions about this Privacy Policy, please contact us at{' '}
                                <a href="mailto:agar.chetan1@gmail.com" className="text-primary hover:text-primary-hover">
                                    agar.chetan1@gmail.com
                                </a>
                            </p>
                        </section>
                    </CardContent>
                </Card>

                <div className="text-center">
                    <Button variant="ghost" onClick={() => window.location.href = '/'}>
                        ← Back to Home
                    </Button>
                </div>
            </div>
        </div>
    );
};
