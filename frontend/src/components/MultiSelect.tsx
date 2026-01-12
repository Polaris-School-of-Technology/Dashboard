import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './MultiSelect.css';

interface Option {
    value: string;
    label: string;
}

interface MultiSelectProps {
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    className?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
    options,
    selectedValues,
    onChange,
    placeholder = 'Select items...',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleOption = (value: string) => {
        if (value === 'all') {
            // Logic for "All" selection
            if (selectedValues.includes('all')) {
                onChange([]);
            } else {
                onChange(['all']);
            }
            return;
        }

        let newValues: string[];

        // If "all" was selected, clear it when selecting specific items
        const currentWithoutAll = selectedValues.filter(v => v !== 'all');

        if (currentWithoutAll.includes(value)) {
            newValues = currentWithoutAll.filter(v => v !== value);
        } else {
            newValues = [...currentWithoutAll, value];
        }

        // Check if we effectively selected everything or nothing
        if (newValues.length === 0) {
            newValues = ['all'];
        }

        onChange(newValues);
    };

    const isAllSelected = selectedValues.includes('all');

    const getDisplayLabel = () => {
        if (isAllSelected) return 'All Faculty';
        if (selectedValues.length === 0) return placeholder;
        if (selectedValues.length === 1) {
            const option = options.find(o => o.value === selectedValues[0]);
            return option?.label || selectedValues[0];
        }
        return `${selectedValues.length} Faculty Selected`;
    };

    return (
        <div className={`multiselect-container ${className}`} ref={containerRef}>
            <div
                className={`multiselect-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="multiselect-label">{getDisplayLabel()}</span>
                <ChevronDown size={16} className={`multiselect-arrow ${isOpen ? 'rotate' : ''}`} />
            </div>

            {isOpen && (
                <div className="multiselect-dropdown">
                    <div
                        className={`multiselect-option ${isAllSelected ? 'selected' : ''}`}
                        onClick={() => onChange(['all'])}
                    >
                        <div className="checkbox">
                            {(isAllSelected) && <Check size={12} color="white" />}
                        </div>
                        <span>All Faculty</span>
                    </div>

                    <div className="multiselect-divider" />

                    {options.map(option => {
                        const isSelected = !isAllSelected && selectedValues.includes(option.value);
                        return (
                            <div
                                key={option.value}
                                className={`multiselect-option ${isSelected ? 'selected' : ''}`}
                                onClick={() => toggleOption(option.value)}
                            >
                                <div className="checkbox">
                                    {isSelected && <Check size={12} color="white" />}
                                </div>
                                <span>{option.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
