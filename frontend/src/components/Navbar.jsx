import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
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
        { label: 'Video Generator', path: '/video-gen' },
        { label: 'PPT Generator', path: '/ppt-generator' },
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
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;