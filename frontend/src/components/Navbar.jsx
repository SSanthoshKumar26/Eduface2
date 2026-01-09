import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut } from 'lucide-react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import {
    SignedIn,
    SignedOut,
    SignInButton,
    UserButton,
    useUser,
    useClerk
} from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/Navbar.css';

function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const { isSignedIn, user } = useUser();
    const { signOut } = useClerk();

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 100;
            setScrolled(isScrolled);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Show welcome message when user signs in
    useEffect(() => {
        if (isSignedIn && user) {
            showLoginSuccess();
        }
    }, [isSignedIn, user]);

    const showLoginSuccess = () => {
        toast.success(
            `🎉 Welcome back, ${user?.firstName || user?.username || 'User'}!`,
            {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
                style: {
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.9) 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    backdropFilter: 'blur(10px)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(34, 197, 94, 0.2)'
                }
            }
        );
    };

    const handleSignOut = async () => {
        await signOut();
        toast.info(
            '👋 Successfully signed out!',
            {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
                style: {
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.9) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    backdropFilter: 'blur(10px)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2)'
                }
            }
        );
    };

    const toggleMenu = () => {
        setIsOpen((prev) => !prev);
    };

    const handleNavigation = (path) => {
        if (!isSignedIn && path !== '/') {
            toast.error(
                '🔐 Please sign in to access this feature!',
                {
                    position: "top-center",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "dark",
                    style: {
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.9) 100%)',
                        border: '1px solid rgba(248, 113, 113, 0.3)',
                        backdropFilter: 'blur(10px)',
                        color: '#FFFFFF',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(248, 113, 113, 0.2)'
                    }
                }
            );
            return;
        }
        navigate(path);
        setIsOpen(false);
    };

    const navItems = [
        { label: 'Home', path: '/' },
        { label: 'Content Generator', path: '/content-gen', requiresAuth: true },
        { label: 'Video Generator', path: '/video-gen', requiresAuth: true },
        { label: 'PPT Generator', path: '/ppt-generator', requiresAuth: true },
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

                    {/* Auth & Theme Toggle */}
                    <div className="navbar-actions">
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
                                <UserButton
                                    appearance={{
                                        elements: {
                                            userButtonAvatarBox: "w-8 h-8",
                                            userButtonPopoverActionButton__signOut: {
                                                display: 'none'
                                            }
                                        }
                                    }}
                                />
                                <button
                                    className="sign-out-button"
                                    onClick={handleSignOut}
                                    title="Sign Out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </SignedIn>
                        <ThemeToggle />
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
                            <SignedOut>
                                <SignInButton mode="modal">
                                    <button className="mobile-sign-in-button">
                                        <LogIn size={18} />
                                        <span>Sign In</span>
                                    </button>
                                </SignInButton>
                            </SignedOut>
                            <SignedIn>
                                <div className="mobile-user-actions">
                                    <UserButton
                                        appearance={{
                                            elements: {
                                                userButtonAvatarBox: "w-8 h-8",
                                                userButtonPopoverActionButton__signOut: {
                                                    display: 'none'
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        className="mobile-sign-out-button"
                                        onClick={handleSignOut}
                                        title="Sign Out"
                                    >
                                        <LogOut size={18} />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </SignedIn>
                            <ThemeToggle />
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;