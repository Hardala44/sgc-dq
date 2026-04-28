import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
    return (
        <div className="flex h-screen bg-[#F7F7F7] font-sans text-black overflow-hidden selection:bg-klein-600/30">
            {/* The Sidebar component manages its own width and responsiveness */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                
                {/* Removed Heavy Blur Divs for Performance */}

                <Header />

                {/* Scrollable Page Canvas */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto w-full bg-[#F7F7F7] pb-16">
                    <div className="w-full px-6 md:px-8 lg:px-10">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
