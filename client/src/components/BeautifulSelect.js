import React, { useState } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip
} from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';

const BeautifulSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select an option",
  disabled = false,
  className = "",
  style = {},
  selectClass = "",
  size = "medium", // small, medium, large
  variant = "default" // default, pagination
}) => {
  const [open, setOpen] = useState(false);

  const handleChange = (event) => {
    onChange(event.target.value);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const selectedOption = options.find(option => option.value === value);

  const sizeMap = {
    small: 'small',
    medium: 'medium', 
    large: 'large'
  };

  return (
    
      <Select
        value={value || ''}
        onChange={handleChange}
        onOpen={handleOpen}
        onClose={handleClose}
        className={selectClass}
        open={open}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) {
            return <span style={{ color: '#6b7280' }}>{placeholder}</span>;
          }
          return selectedOption ? selectedOption.label : selected;
        }}
        IconComponent={KeyboardArrowDown}
        sx={{
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: variant === 'pagination' ? '4px 8px' : '8px 12px',
            fontSize: variant === 'pagination' ? '13px' : '14px',
            fontWeight: 500,
            color: '#374151',
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            transition: 'all 0.2s',
            minHeight: variant === 'pagination' ? '32px' : 'auto',
            '&:hover': {
              borderColor: '#9ca3af',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            },
            '&:focus': {
              borderColor: '#3b82f6',
              boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
            }
          },
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            border: 'none'
          },
          '& .MuiSelect-icon': {
            color: '#9ca3af',
            transition: 'transform 0.2s'
          },
          '&.Mui-open .MuiSelect-icon': {
            transform: 'rotate(180deg)'
          }
        }}
        disabled={disabled}
      >
        {options.map((option) => (
          <MenuItem 
            key={option.value} 
            value={option.value}
            sx={{
              fontSize: variant === 'pagination' ? '13px' : '14px',
              padding: variant === 'pagination' ? '6px 8px' : '8px 12px',
              '&:hover': {
                backgroundColor: '#f3f4f6'
              },
              '&.Mui-selected': {
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                '&:hover': {
                  backgroundColor: '#bfdbfe'
                }
              }
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
  );
};

export default BeautifulSelect; 