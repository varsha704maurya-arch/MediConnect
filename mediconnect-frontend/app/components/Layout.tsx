export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Navbar */}
            <div className="bg-gradient-to-r from-teal-500 to-blue-600 p-6 text-white flex justify-between">
                <span className="text-xl font-bold">MediConnect</span>
                <div className="space-x-6">
                    <a href="/login">Login</a>
                    <a href="/patient">Patient</a>
                    <a href="/doctor">Doctor</a>
                    <a href="/guardian">Guardian</a>
                </div>
            </div>

            {/* Page Content */}
            <div className="p-8">{children}</div>
        </div>
    );
}
