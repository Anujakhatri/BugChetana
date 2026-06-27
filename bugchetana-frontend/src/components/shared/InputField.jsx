import React from 'react';

export default function InputField({ label, type = 'text', placeholder, value, onChange, required, rightElement }) {
  return (
    <div className="space-y-1 w-full">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`border border-gray-200 rounded-lg py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 ${rightElement ? 'pl-4 pr-10' : 'px-4'}`}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}
