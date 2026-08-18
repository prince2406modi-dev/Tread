import Logo from '../../assets/Images/Logo.png'

function Menu({ currentUser, onLogout }) {

    return (
        <header className="mb-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">

                <div className="text-center text-md-start">

                    <div className="d-flex justify-content-center justify-content-md-start mb-3">
                        <img
                            src={Logo}
                            alt="Website logo"
                            className="app-logo"
                        />
                    </div>

                    <div className="brand-hero mb-2">
                        <div className="brand-title">
                            Tread
                        </div>

                        <div className="brand-tagline">
                            GST Invoice Billing Made Simple
                        </div>
                    </div>

                    <p className="text-muted mb-0">
                        Create, manage, and save GST invoice bills with voice commands.
                    </p>

                </div>

                <div className="text-center text-md-end">

                    <div className="fw-semibold mb-2">
                        Signed in as {currentUser.username}
                    </div>

                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={onLogout}
                    >
                        Logout
                    </button>

                </div>

            </div>
        </header>
    )
}

export default Menu