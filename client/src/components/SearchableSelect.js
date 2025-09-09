import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

const SearchableSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  disabled = false,
  className = "",
  style = {},
  size = "md" // sm, md, lg
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const selectRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.value.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
      setHighlightedIndex(-1);
    }
  }, [searchTerm, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0) {
            handleSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          setSearchTerm('');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 100);
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    }
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const selectedOption = options.find(option => option.value === value);

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-4 py-3 text-base"
  };

  console.log(filteredOptions)
  return (
    <div className={`relative ${className}`} ref={selectRef} onClick={handleToggle}>
      {/* Main Select Container */}
      <div
        className={`
          w-full bg-white border border-gray-300 rounded-lg 
          ${sizeClasses[size]}
          font-medium text-gray-700 
          hover:border-gray-400 focus-within:ring-2 
          focus-within:ring-blue-500 focus-within:border-blue-500 
          transition-all duration-200 cursor-pointer
          shadow-sm hover:shadow-md
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-between
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-500' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={style}
      >
        <button
          type="button"
          disabled={disabled}
          className="flex-1 text-left h-full"
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-in slide-in-from-top-2 duration-200"
        >
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    w-full px-4 py-2 text-left text-sm
                    transition-all duration-150
                    flex items-center justify-between
                    ${highlightedIndex === index 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'hover:bg-gray-50 text-gray-700'
                    }
                    ${option.value === value ? 'bg-blue-100 text-blue-700' : ''}
                  `}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No options found matching "{searchTerm}"
              </div>
            )}
          </div>

          {/* Results Count */}
          {searchTerm && (
            <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
              Showing {filteredOptions.length} of {options.length} options
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
