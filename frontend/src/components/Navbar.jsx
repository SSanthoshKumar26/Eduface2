import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeLink, setActiveLink] = useState('home');

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 100;
            setScrolled(isScrolled);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLinkClick = (linkName) => {
        setActiveLink(linkName);
        setIsOpen(false);
    };

    const toggleMobileMenu = () => {
        setIsOpen(!isOpen);
    };

    const handleOutsideClick = (e) => {
        if (!e.target.closest('.quantum-navbar')) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    return (
        <nav className={`quantum-navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="quantum-particles">
                {[...Array(5)].map((_, index) => (
                    <div
                        key={index}
                        className="quantum-particle"
                        style={{
                            left: `${20 + index * 20}%`,
                            animationDelay: `${index}s`
                        }}
                    />
                ))}
            </div>

            <Link
                to="/"
                className="quantum-logo"
                onClick={() => handleLinkClick('home')}
            >
                EduFace
            </Link>

            <ul className={`quantum-nav-links ${isOpen ? 'active' : ''}`}>
                <li className="quantum-nav-item">
                    <Link
                        to="/"
                        className={`quantum-link ${activeLink === 'home' ? 'active' : ''}`}
                        onClick={() => handleLinkClick('home')}
                    >
                        Home
                    </Link>
                </li>
                <li className="quantum-nav-item">
                    <Link
                        to="/video-generator"
                        className={`quantum-link ${activeLink === 'videogenerator' ? 'active' : ''}`}
                        onClick={() => handleLinkClick('videogenerator')}
                    >
                        Video Generator
                    </Link>
                </li>
                <li className="quantum-nav-item">
                    <Link
                        to="/signup"
                        className={`quantum-link ${activeLink === 'signup' ? 'active' : ''}`}
                        onClick={() => handleLinkClick('signup')}
                    >
                        Signup / Login
                    </Link>
                </li>
            </ul>

            <div
                className={`quantum-mobile-toggle ${isOpen ? 'active' : ''}`}
                onClick={toggleMobileMenu}
            >
                <div className="quantum-bar"></div>
                <div className="quantum-bar"></div>
                <div className="quantum-bar"></div>
            </div>
        </nav>
    );
}

export default Navbar;