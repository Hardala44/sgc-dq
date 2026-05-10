import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden selection:bg-[#00a7e1]/20">

            {/* Collapsible sidebar — white panel, self-manages width */}
            <Sidebar />

            {/* Right column: sticky header + scrollable content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header />

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
                    <div className="w-full px-6 md:px-8 lg:px-10 py-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
