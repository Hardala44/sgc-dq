// import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
    onSearch: (query: string) => void;
    placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = "Buscar productos, proveedores..." }) => {
    return (
        <div className="relative w-full max-w-2xl group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-navy-600 transition-colors" />
            </div>
            <input
                type="text"
                className="block w-full pl-12 pr-4 py-4 border-0 rounded-2xl text-navy-900 placeholder-flint-400 bg-white shadow-soft-xl focus:ring-2 focus:ring-navy-100 transition-all font-medium text-lg"
                placeholder={placeholder}
                onChange={(e) => onSearch(e.target.value)}
            />
        </div>
    );
};

export default SearchBar;
