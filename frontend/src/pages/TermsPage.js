import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { FileText, CheckCircle, XCircle, AlertCircle, Scale } from 'lucide-react';
import { Button } from '../components/ui/button';

export const TermsPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText className="w-10 h-10 text-accent" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4">Terms of Service</h1>
                    <p className="text-muted-foreground">Last updated: January 13, 2026</p>
                </div>

                <Card className="border-border/50 mb-6">
                    <CardContent className="p-8 space-y-6">
                        <section>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-success" />
                                </div>
                                <h2 className="text-2xl font-bold">Acceptance of Terms</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                By accessing and using DevFocus, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our service.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <Scale className="w-5 h-5 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold">Use License</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed mb-3">
                                Permission is granted to temporarily use DevFocus for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                            </p>
                            <ul className="text-muted-foreground space-y-2 ml-4">
                                <li>• Modify or copy the materials</li>
                                <li>• Use the materials for commercial purposes</li>
                                <li>• Attempt to reverse engineer any software</li>
                                <li>• Remove any copyright or proprietary notations</li>
                            </ul>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-violet/10 rounded-lg flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-violet" />
                                </div>
                                <h2 className="text-2xl font-bold">Disclaimer</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                The materials on DevFocus are provided on an 'as is' basis. DevFocus makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                                    <XCircle className="w-5 h-5 text-warning" />
                                </div>
                                <h2 className="text-2xl font-bold">Limitations</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                In no event shall DevFocus or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use DevFocus.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-accent" />
                                </div>
                                <h2 className="text-2xl font-bold">User Accounts</h2>
                            </div>
                            <ul className="text-muted-foreground space-y-2 ml-4">
                                <li>• You are responsible for maintaining account security</li>
                                <li>• You must provide accurate registration information</li>
                                <li>• You are responsible for all activities under your account</li>
                                <li>• You must notify us immediately of any unauthorized use</li>
                            </ul>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-destructive" />
                                </div>
                                <h2 className="text-2xl font-bold">Modifications</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                DevFocus may revise these terms of service at any time without notice. By using this service, you are agreeing to be bound by the current version of these terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">Contact</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                For any questions regarding these Terms of Service, please contact us at{' '}
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
