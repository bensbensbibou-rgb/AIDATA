import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Search, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    label?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    addNewLabel?: string;
    onAddNew?: () => void;
    className?: string;
    disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'Sélectionner...',
    addNewLabel,
    onAddNew,
    className = '',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);

            if (isOutsideContainer && isOutsideDropdown) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update position on scroll/resize
    useEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width
                });
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true); // true for capturing scroll in parents

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    // Update search term when value changes externally (or initial load)
    useEffect(() => {
        if (!isOpen) {
            const selectedOption = options.find((opt) => opt.value === value || opt.label === value);
            if (selectedOption) {
                setSearchTerm(selectedOption.label);
            } else if (value) {
                setSearchTerm(value);
            } else {
                setSearchTerm('');
            }
        }
    }, [value, options, isOpen]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter((opt) =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    const handleSelect = (optionValue: string, optionLabel: string) => {
        onChange(optionValue);
        setSearchTerm(optionLabel);
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
        onChange(e.target.value);
    };

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(true);
        }
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <div className="flex items-center">
                    <input
                        ref={inputRef}
                        type="text"
                        className={`w-full rounded-xl border border-gray-200 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'
                            }`}
                        placeholder={placeholder}
                        value={searchTerm}
                        onChange={handleInputChange}
                        onClick={handleInputClick}
                        disabled={disabled}
                    />
                    {searchTerm && !disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSearchTerm('');
                                onChange('');
                                inputRef.current?.focus();
                            }}
                            className="absolute right-8 text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <div className="absolute right-3 pointer-events-none text-gray-400">
                        <ChevronDown size={16} />
                    </div>
                </div>

                {isOpen && !disabled && coords && createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'absolute',
                            top: coords.top + 4, // Add a little gap
                            left: coords.left,
                            width: coords.width,
                            zIndex: 9999,
                        }}
                        className="max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black ring-opacity-5"
                    >
                        {onAddNew && (
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-gray-100"
                                onClick={() => {
                                    onAddNew();
                                    setIsOpen(false);
                                }}
                            >
                                <Plus size={14} />
                                {addNewLabel || 'Créer une option'}
                            </button>
                        )}

                        {filteredOptions.length > 0 ? (
                            <div className="py-1">
                                {filteredOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`flex w-full items-center justify-between px-4 py-2 text-sm text-left hover:bg-blue-50 hover:text-blue-700 ${value === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                                            }`}
                                        onClick={() => handleSelect(option.value, option.label)}
                                    >
                                        <span>{option.label}</span>
                                        {option.subLabel && (
                                            <span className="text-xs text-gray-400 font-normal ml-2">{option.subLabel}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-3 text-sm text-gray-500">
                                Aucun résultat trouvé pour "{searchTerm}"
                            </div>
                        )}
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};

export default SearchableSelect;
