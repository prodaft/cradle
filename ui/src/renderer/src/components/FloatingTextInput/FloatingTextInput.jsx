import React, { useEffect, useState } from 'react';

const FloatingTextInput = ({
  title,
  onSubmit,
  placeholder = 'Enter text...',
  open,
  setOpen,
  initialValue = '',
}) => {
  const handleOpen = () => setOpen(!open);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value);
      setValue(initialValue);
    }
    handleOpen();
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-60 transition-opacity"
            onClick={handleOpen}
          ></div>

          {/* Modal content */}
          <div className='bg-cradle3 p-2 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl relative z-10 w-full max-w-lg mx-auto'>
            <div className="p-6">
              <div className='mb-4 text-xl font-bold'>{title}</div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-500 rounded-md"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={placeholder}
                  autoFocus
                />

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleOpen}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingTextInput;
