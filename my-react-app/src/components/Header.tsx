import React from 'react';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
    return (
        <header>
            <h1>{title}</h1>
            {subtitle && <h2>{subtitle}</h2>}
        </header>
    );
};

export default Header;