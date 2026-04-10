import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut, LogIn } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, SignOutButton } from "@clerk/clerk-react";
import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/Navbar.css';

function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 100;
            setScrolled(isScrolled);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleMenu = () => {
        setIsOpen((prev) => !prev);
    };

    const handleNavigation = (path) => {
        navigate(path);
        setIsOpen(false);
    };

    const navItems = [
        { label: 'Home', path: '/' },
        { label: 'Content Generator', path: '/content-gen' },
        { label: 'PPT Generator', path: '/ppt-generator' },
        { label: 'Video Generator', path: '/video-gen' },
        { label: 'My Video Library', path: '/video-gallery' },
        { label: 'My Dashboard', path: '/quiz/result' },
    ];

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="navbar-container">
                {/* Logo */}
                <Link to="/" className="navbar-logo">
                    <Logo size="md" />
                </Link>

                {/* Desktop Menu */}
                <div className="navbar-menu">
                    <div className="navbar-links">
                        {navItems.map((item) => (
                            <button
                                key={item.path}
                                className="nav-link-button"
                                onClick={() => handleNavigation(item.path)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Theme Toggle */}
                    <div className="navbar-actions">
                        <ThemeToggle />
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="sign-in-button">
                                    <LogIn size={18} />
                                    <span>Sign In</span>
                                </button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <div className="user-actions">
                                <UserButton afterSignOutUrl="/" />
                                <SignOutButton>
                                    <button className="sign-out-button" title="Sign Out">
                                        <LogOut size={18} />
                                    </button>
                                </SignOutButton>
                            </div>
                        </SignedIn>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <button className="navbar-toggle" onClick={toggleMenu}>
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="navbar-mobile">
                        <div className="mobile-links">
                            {navItems.map((item) => (
                                <button
                                    key={item.path}
                                    className="mobile-link"
                                    onClick={() => handleNavigation(item.path)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <div className="mobile-actions">
                            <ThemeToggle />
                            <SignedOut>
                                <SignInButton mode="modal">
                                    <button className="sign-in-button">
                                        <LogIn size={18} />
                                        <span>Sign In</span>
                                    </button>
                                </SignInButton>
                            </SignedOut>
                            <SignedIn>
                                <div className="mobile-user-actions">
                                    <UserButton afterSignOutUrl="/" />
                                    <SignOutButton>
                                        <button className="mobile-sign-out-button">
                                            <LogOut size={18} />
                                            <span>Logout</span>
                                        </button>
                                    </SignOutButton>
                                </div>
                            </SignedIn>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;