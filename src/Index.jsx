import { useEffect, useRef, useState } from "react";
import "./index.css";
import Logo from "./assets/Images/Logo.png";
import Login from "./Components/Login/Login.jsx";

function Index({ users = [], onLogin, onRegister, onBack }) {

    const [activeMenu, setActiveMenu] = useState(null);
    const [activePage, setActivePage] = useState(null);

    const menuRef = useRef(null);

    const menus = {
        Company: [
            "Create Company",
            "Open Company",
            "Edit Company",
            "Delete Company",
            "Company Details"
        ],

        Administration: [
            "Users",
            "Roles & Permissions",
            "Backup",
            "Restore",
            "Settings"
        ],

        Transactions: [
            "Create Transaction",
            "View Transactions",
            "Edit Transaction",
            "Delete Transaction",
            "Search Transaction"
        ],

        Display: [
            "Dashboard",
            "All Transactions",
            "Company Details",
            "Reports"
        ],

        "Print/Email/SMS": [
            "Print Invoice",
            "Email Invoice",
            "Send SMS",
            "Download PDF"
        ],

        "House-Keeping": [
            "Data Backup",
            "Data Restore",
            "Clear Temporary Data",
            "Database Maintenance",
            "System Cleanup"
        ],

        Favourites: [
            "Add to Favourites",
            "View Favourites",
            "Remove Favourite",
            "Manage Favourites"
        ],

        Help: [
            "Help Center",
            "User Guide",
            "Keyboard Shortcuts",
            "Login",
            "About Tread"
        ]
    };

    // Pages connected to menu options
    const pages = {
        Login: () => (
            <Login
                users={users}
                onLogin={onLogin}
                onRegister={onRegister}
                onBack={() => {
                    setActivePage(null);

                    if (onBack) {
                        onBack();
                    }
                }}
            />
        )
    };

    // Close dropdown when clicking outside
    useEffect(() => {

        const handleClickOutside = (event) => {

            if (
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setActiveMenu(null);
            }

        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };

    }, []);

    useEffect(() => {

        const handleKeyDown = (event) => {

            if (event.key === "Escape") {
                setActiveMenu(null);
            }

        };

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };

    }, []);

    // Top menu click
    const handleMenuClick = (menu) => {

        setActiveMenu(
            activeMenu === menu
                ? null
                : menu
        );

    };

    // Dropdown option click
    const handleOptionClick = (option) => {

        console.log("Selected:", option);

        // Open the selected JSX page
        if (pages[option]) {
            setActivePage(option);
        }

        // Close dropdown
        setActiveMenu(null);
    };

    // Get active component
    const ActivePage = activePage
        ? pages[activePage]
        : null;

    return (

        <div
            className="container-fluid menu-container"
            ref={menuRef}
        >

            {/* ================= TOP NAVIGATION ================= */}

            <div id="box">

                {Object.keys(menus).map((menu) => (

                    <div
                        className="menu-wrapper"
                        key={menu}
                    >

                        <button
                            className={`top-button ${
                                activeMenu === menu
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                handleMenuClick(menu)
                            }
                        >

                            {menu}

                            <span className="arrow">
                                {activeMenu === menu
                                    ? "▲"
                                    : "▼"}
                            </span>

                        </button>


                        {/* ================= DROPDOWN ================= */}

                        {activeMenu === menu && (

                            <div className="dropdown-menu-custom">

                                {menus[menu].map(
                                    (option, index) => (

                                        <button
                                            key={index}
                                            className="dropdown-item-custom"
                                            onClick={() =>
                                                handleOptionClick(
                                                    option
                                                )
                                            }
                                        >

                                            <span className="item-icon">

                                                {index === 0
                                                    ? "＋"
                                                    : index === 1
                                                    ? "◉"
                                                    : index === 2
                                                    ? "✎"
                                                    : index === 3
                                                    ? "✕"
                                                    : "☰"}

                                            </span>

                                            {option}

                                        </button>

                                    )
                                )}

                            </div>

                        )}

                    </div>

                ))}

            </div>


            {/* ================= PAGE CONTENT ================= */}

            <div className="content-area">

                {ActivePage ? (

                    <ActivePage />

                ) : (

                    <>
                        <h2>
                            Welcome to Tread
                        </h2>

                        <p>
                            Select an option from the
                            menu above.
                        </p>

                        {activeMenu && (

                            <div className="selected-menu">

                                Current Menu:
                                {" "}
                                <strong>
                                    {activeMenu}
                                </strong>

                            </div>

                        )}

                    </>

                )}

            </div>


            {/* ================= LOGO ================= */}

            <div className="logo-section">

                <img
                    src={Logo}
                    alt="Tread Logo"
                    className="tread-logo"
                />

            </div>

        </div>
    );
}

export default Index;